import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  LIMITS,
  type AppearanceTheme,
  type AvatarDecorationId,
  type BotId,
  type ChannelDoc,
  type ChannelType,
  type ChatMessage,
  type DmThreadDoc,
  type FriendRequestDoc,
  type InviteDoc,
  type MemberRole,
  type PublicProfile,
  type ServerDoc,
  type ServerMember,
  type UserConnection,
  type UserStatus,
} from '../types/halka';
import { getBotThreadId, OFFICIAL_BOTS } from './turcordBots';

export function makeId(prefix = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < 14; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}_${res}` : res;
}

export function makeInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 8; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function getPairId(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

export const ROLE_COLORS: Record<MemberRole, string> = {
  owner: '#F59E0B',
  admin: '#EF4444',
  moderator: '#10B981',
  member: '#DBDEE1',
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Kurucu',
  admin: 'Yönetici',
  moderator: 'Moderatör',
  member: 'Üye',
};

function sanitizeUsernameBase(emailOrName: string): string {
  const raw = emailOrName.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '_');
  const trimmed = raw.replace(/^_+|_+$/g, '').slice(0, 22);
  return trimmed.length >= 2 ? trimmed : 'kullanici';
}

export async function getUserProfileByUid(uid: string): Promise<PublicProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as PublicProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function ensureUserProfile(user: User): Promise<PublicProfile> {
  const userPath = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const data = snap.data() as PublicProfile;
      const unameSnap = await getDoc(doc(db, 'usernames', data.username));
      if (!unameSnap.exists()) {
        await setDoc(doc(db, 'usernames', data.username), {
          uid: user.uid,
          username: data.username,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl || '',
          updatedAt: serverTimestamp(),
        });
      }
      return data;
    }

    const base = sanitizeUsernameBase(user.email || user.displayName || 'kullanici');
    let candidate = base;
    const check = await getDoc(doc(db, 'usernames', candidate));
    if (check.exists()) {
      candidate = `${base.slice(0, 24)}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const displayName = (user.displayName || base).slice(0, LIMITS.DISPLAY_NAME_MAX);
    const avatarUrl = (user.photoURL || '').slice(0, 1000);

    const profilePayload = {
      uid: user.uid,
      username: candidate,
      displayName,
      avatarUrl,
      bannerColor: '#5865F2',
      bio: '',
      status: 'online' as UserStatus,
      customStatus: '',
      clanTag: 'TR',
      avatarDecoration: 'none' as AvatarDecorationId,
      orbsBalance: 1500,
      connections: [] as UserConnection[],
      theme: 'oniks' as AppearanceTheme,
      showTypingIndicator: true,
      mentionNotifs: true,
      botAlerts: true,
      compactMode: false,
      noiseSuppression: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', user.uid), profilePayload);
    batch.set(doc(db, 'users', user.uid, 'private', 'info'), {
      uid: user.uid,
      email: (user.email || `${user.uid}@turcord.local`).slice(0, 200),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'usernames', candidate), {
      uid: user.uid,
      username: candidate,
      displayName,
      avatarUrl,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      ...profilePayload,
      createdAt: undefined,
      updatedAt: undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserProfile(
  uid: string,
  oldUsername: string,
  updates: {
    displayName: string;
    username: string;
    bio: string;
    status: UserStatus;
    customStatus: string;
    bannerColor: string;
    avatarUrl: string;
    clanTag?: string;
    connections?: UserConnection[];
  }
): Promise<void> {
  const path = `users/${uid}`;
  const cleanUsername = updates.username.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, LIMITS.USERNAME_MAX);
  if (cleanUsername.length < LIMITS.USERNAME_MIN) {
    throw new Error('Kullanıcı adı en az 2 karakter olmalıdır (a-z, 0-9, _, .).');
  }

  try {
    if (cleanUsername !== oldUsername) {
      const existing = await getDoc(doc(db, 'usernames', cleanUsername));
      if (existing.exists() && existing.data().uid !== uid) {
        throw new Error('Bu kullanıcı adı başka biri tarafından kullanılıyor.');
      }
    }

    const cleanDisplay = updates.displayName.trim().slice(0, LIMITS.DISPLAY_NAME_MAX) || cleanUsername;
    const payload: Record<string, unknown> = {
      username: cleanUsername,
      displayName: cleanDisplay,
      bio: updates.bio.slice(0, LIMITS.BIO_MAX),
      status: updates.status,
      customStatus: updates.customStatus.slice(0, LIMITS.CUSTOM_STATUS_MAX),
      bannerColor: updates.bannerColor.slice(0, 20),
      avatarUrl: updates.avatarUrl.slice(0, 1000),
      updatedAt: serverTimestamp(),
    };
    if (updates.clanTag !== undefined) {
      payload.clanTag = updates.clanTag.trim().toUpperCase().slice(0, LIMITS.CLAN_TAG_MAX);
    }
    if (updates.connections !== undefined) {
      payload.connections = updates.connections.slice(0, 6);
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), payload);

    if (cleanUsername !== oldUsername) {
      batch.delete(doc(db, 'usernames', oldUsername));
      batch.set(doc(db, 'usernames', cleanUsername), {
        uid,
        username: cleanUsername,
        displayName: cleanDisplay,
        avatarUrl: updates.avatarUrl.slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(doc(db, 'usernames', cleanUsername), {
        uid,
        username: cleanUsername,
        displayName: cleanDisplay,
        avatarUrl: updates.avatarUrl.slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    if (error instanceof Error && (error.message.includes('kullanıcı adı') || error.message.includes('en az 2'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: Partial<{
    status: UserStatus;
    customStatus: string;
    clanTag: string;
    avatarDecoration: AvatarDecorationId;
    orbsBalance: number;
    connections: UserConnection[];
    theme: AppearanceTheme;
    showTypingIndicator: boolean;
    mentionNotifs: boolean;
    botAlerts: boolean;
    compactMode: boolean;
    noiseSuppression: boolean;
  }>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function getUserNote(myUid: string, targetUid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', myUid, 'notes', targetUid));
    return snap.exists() ? String(snap.data().note || '') : '';
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${myUid}/notes/${targetUid}`);
  }
}

export async function saveUserNote(myUid: string, targetUid: string, note: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', myUid, 'notes', targetUid), {
      targetUid,
      note: note.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${myUid}/notes/${targetUid}`);
  }
}

export async function addBookmark(
  myUid: string,
  msg: ChatMessage,
  channelLabel: string
): Promise<void> {
  const id = makeId('bm');
  try {
    await setDoc(doc(db, 'users', myUid, 'bookmarks', id), {
      id,
      authorName: msg.authorName.slice(0, 40),
      content: (msg.content || msg.attachmentName || 'Medya mesajı').slice(0, 2000),
      channelLabel: channelLabel.slice(0, 80),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${myUid}/bookmarks/${id}`);
  }
}

export async function removeBookmark(myUid: string, bookmarkId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', myUid, 'bookmarks', bookmarkId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${myUid}/bookmarks/${bookmarkId}`);
  }
}

export async function sendNotification(
  targetUid: string,
  payload: {
    type: 'mention' | 'reply' | 'system';
    fromUid: string;
    fromName: string;
    fromAvatar: string;
    channelLabel: string;
    preview: string;
  }
): Promise<void> {
  if (!targetUid || (targetUid === payload.fromUid && payload.type !== 'system')) return;
  const id = makeId('ntf');
  try {
    await setDoc(doc(db, 'users', targetUid, 'notifications', id), {
      id,
      type: payload.type,
      fromUid: payload.fromUid,
      fromName: payload.fromName.slice(0, 40),
      fromAvatar: (payload.fromAvatar || '').slice(0, 1000),
      channelLabel: payload.channelLabel.slice(0, 80),
      preview: payload.preview.slice(0, 300),
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking notification failure
  }
}

export async function markNotificationRead(myUid: string, notifId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', myUid, 'notifications', notifId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${myUid}/notifications/${notifId}`);
  }
}

export async function deleteNotification(myUid: string, notifId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', myUid, 'notifications', notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${myUid}/notifications/${notifId}`);
  }
}

export async function createServer(
  profile: PublicProfile,
  input: {
    name: string;
    description: string;
    iconEmoji: string;
    iconColor: string;
    isPublic: boolean;
    template?: 'community' | 'gaming' | 'coding' | 'study';
  }
): Promise<{ serverId: string; firstChannelId: string }> {
  const serverId = makeId('srv');
  const inviteCode = makeInviteCode();
  const cleanName = input.name.trim().slice(0, LIMITS.SERVER_NAME_MAX) || 'Yeni Sunucu';
  const cleanDesc = input.description.trim().slice(0, LIMITS.SERVER_DESC_MAX);
  const cleanEmoji = (input.iconEmoji || '⚡').slice(0, 16);
  const cleanColor = (input.iconColor || '#5865F2').slice(0, 20);

  try {
    await setDoc(doc(db, 'servers', serverId), {
      id: serverId,
      name: cleanName,
      description: cleanDesc,
      iconEmoji: cleanEmoji,
      iconColor: cleanColor,
      ownerId: profile.uid,
      isPublic: input.isPublic,
      inviteCode,
      memberCount: 1,
      enabledBots: ['turcord_bot', 'mod_bot', 'music_bot'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const step2 = writeBatch(db);
    step2.set(doc(db, 'servers', serverId, 'members', profile.uid), {
      uid: profile.uid,
      serverId,
      displayName: profile.displayName.slice(0, LIMITS.DISPLAY_NAME_MAX),
      username: profile.username.slice(0, LIMITS.USERNAME_MAX),
      avatarUrl: (profile.avatarUrl || '').slice(0, 1000),
      role: 'owner',
      roleColor: ROLE_COLORS.owner,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    step2.set(doc(db, 'users', profile.uid, 'memberships', serverId), {
      serverId,
      userId: profile.uid,
      serverName: cleanName,
      serverIcon: cleanEmoji,
      serverColor: cleanColor,
      role: 'owner',
      joinedAt: serverTimestamp(),
    });
    await step2.commit();

    const templates: Record<string, Array<{ name: string; type: ChannelType; category: string; topic: string }>> = {
      community: [
        { name: 'duyurular', type: 'announcement', category: 'BİLGİ', topic: 'Sunucu duyuruları ve güncellemeler.' },
        { name: 'genel-sohbet', type: 'text', category: 'METİN KANALLARI', topic: 'Herkese merhaba! Serbest sohbet alanı.' },
        { name: 'medya-paylasim', type: 'text', category: 'METİN KANALLARI', topic: 'Görsel, klip ve link paylaşımları.' },
        { name: 'Genel Sesli', type: 'voice', category: 'SESLİ KANALLAR', topic: 'Serbest sesli ve görüntülü sohbet odası.' },
        { name: 'Müzik & Muhabbet', type: 'voice', category: 'SESLİ KANALLAR', topic: 'Sakin sohbet ve takılma odası.' },
      ],
      gaming: [
        { name: 'takim-arama', type: 'text', category: 'OYUN', topic: 'Duo, squad ve takım arkadaşı bul.' },
        { name: 'genel-sohbet', type: 'text', category: 'METİN KANALLARI', topic: 'Oyun muhabbeti ve taktikler.' },
        { name: 'Lobi 1', type: 'voice', category: 'SESLİ LOBİLER', topic: '5 kişilik ana oyun odası.' },
        { name: 'Rekabetçi Oda', type: 'voice', category: 'SESLİ LOBİLER', topic: 'Yüksek odak, düşük gecikme.' },
      ],
      coding: [
        { name: 'duyurular', type: 'announcement', category: 'TOPLULUK', topic: 'Etkinlik ve proje duyuruları.' },
        { name: 'kod-yardim', type: 'text', category: 'GELİŞTİRME', topic: 'TypeScript, React, backend ve algoritma desteği.' },
        { name: 'proje-vitrin', type: 'text', category: 'GELİŞTİRME', topic: 'Geliştirdiğin projeleri paylaş.' },
        { name: 'Pair Programming', type: 'voice', category: 'SESLİ ODALAR', topic: 'Ekran paylaşımı ve canlı kodlama.' },
      ],
      study: [
        { name: 'calisma-plani', type: 'text', category: 'ODAK', topic: 'Günlük hedeflerini yaz ve takip et.' },
        { name: 'kaynak-paylasim', type: 'text', category: 'ODAK', topic: 'Ders notları ve yararlı bağlantılar.' },
        { name: 'Sessiz Pomodoro', type: 'voice', category: 'SESLİ ODALAR', topic: 'Birlikte odaklanma odası.' },
      ],
    };

    const list = templates[input.template || 'community'] || templates.community;
    const chBatch = writeBatch(db);
    chBatch.set(doc(db, 'invites', inviteCode), {
      code: inviteCode,
      serverId,
      serverName: cleanName,
      serverDescription: cleanDesc,
      serverIcon: cleanEmoji,
      serverColor: cleanColor,
      creatorId: profile.uid,
      createdAt: serverTimestamp(),
    });
    let firstChannelId = '';
    list.forEach((ch, idx) => {
      const channelId = makeId('ch');
      if (idx === 0 || (ch.type === 'text' && !firstChannelId)) {
        if (ch.type === 'text' || !firstChannelId) firstChannelId = channelId;
      }
      chBatch.set(doc(db, 'servers', serverId, 'channels', channelId), {
        id: channelId,
        serverId,
        name: ch.name.slice(0, LIMITS.CHANNEL_NAME_MAX),
        type: ch.type,
        category: ch.category.slice(0, 40),
        topic: ch.topic.slice(0, LIMITS.CHANNEL_TOPIC_MAX),
        position: idx,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await chBatch.commit();

    return { serverId, firstChannelId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `servers/${serverId}`);
  }
}

export async function lookupInvite(code: string): Promise<InviteDoc | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;
  try {
    const snap = await getDoc(doc(db, 'invites', cleanCode));
    if (!snap.exists()) {
      const exactSnap = await getDoc(doc(db, 'invites', code.trim()));
      return exactSnap.exists() ? (exactSnap.data() as InviteDoc) : null;
    }
    return snap.data() as InviteDoc;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `invites/${cleanCode}`);
  }
}

export async function joinServer(
  profile: PublicProfile,
  server: ServerDoc,
  inviteCode?: string
): Promise<void> {
  const path = `servers/${server.id}/members/${profile.uid}`;
  try {
    const existingMember = await getDoc(doc(db, 'servers', server.id, 'members', profile.uid));
    const membershipRef = doc(db, 'users', profile.uid, 'memberships', server.id);
    if (existingMember.exists()) {
      const role = (existingMember.data().role || 'member') as MemberRole;
      const existingMembership = await getDoc(membershipRef);
      if (existingMembership.exists()) {
        await updateDoc(membershipRef, {
          serverName: server.name,
          serverIcon: server.iconEmoji,
          serverColor: server.iconColor,
          role,
        });
      } else {
        await setDoc(membershipRef, {
          serverId: server.id,
          userId: profile.uid,
          serverName: server.name,
          serverIcon: server.iconEmoji,
          serverColor: server.iconColor,
          role,
          joinedAt: serverTimestamp(),
        });
      }
      return;
    }

    const assignedRole: MemberRole = server.ownerId === profile.uid ? 'owner' : 'member';
    const existingMembership = await getDoc(membershipRef);
    const batch = writeBatch(db);
    const memberPayload: Record<string, unknown> = {
      uid: profile.uid,
      serverId: server.id,
      displayName: profile.displayName.slice(0, LIMITS.DISPLAY_NAME_MAX),
      username: profile.username.slice(0, LIMITS.USERNAME_MAX),
      avatarUrl: (profile.avatarUrl || '').slice(0, 1000),
      role: assignedRole,
      roleColor: ROLE_COLORS[assignedRole],
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (inviteCode) {
      memberPayload.inviteCode = inviteCode;
    }

    batch.set(doc(db, 'servers', server.id, 'members', profile.uid), memberPayload);
    if (existingMembership.exists()) {
      batch.update(membershipRef, {
        serverName: server.name,
        serverIcon: server.iconEmoji,
        serverColor: server.iconColor,
        role: assignedRole,
      });
    } else {
      batch.set(membershipRef, {
        serverId: server.id,
        userId: profile.uid,
        serverName: server.name,
        serverIcon: server.iconEmoji,
        serverColor: server.iconColor,
        role: assignedRole,
        joinedAt: serverTimestamp(),
      });
    }
    batch.update(doc(db, 'servers', server.id), {
      memberCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    if (assignedRole === 'owner') {
      const chSnap = await getDocs(query(collection(db, 'servers', server.id, 'channels'), limit(1)));
      if (chSnap.empty) {
        await createChannel(server.id, {
          name: 'genel-sohbet',
          type: 'text',
          category: 'METİN KANALLARI',
          topic: 'Herkese merhaba! Serbest sohbet alanı.',
          position: 0,
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function joinServerByCode(profile: PublicProfile, rawCode: string): Promise<ServerDoc> {
  const clean = rawCode.trim().split('/').pop() || '';
  const invite = await lookupInvite(clean);
  if (!invite) {
    throw new Error('Geçersiz veya süresi dolmuş davet kodu.');
  }
  const serverSnap = await getDoc(doc(db, 'servers', invite.serverId));
  if (!serverSnap.exists()) {
    throw new Error('Bu davet koduna ait sunucu artık mevcut değil.');
  }
  const server = serverSnap.data() as ServerDoc;
  await joinServer(profile, server, invite.code);
  return server;
}

export async function fetchPublicServers(): Promise<ServerDoc[]> {
  try {
    const q = query(collection(db, 'servers'), where('isPublic', '==', true), limit(25));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ServerDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'servers');
  }
}

export async function leaveServer(uid: string, server: ServerDoc): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'servers', server.id, 'members', uid));
    batch.delete(doc(db, 'users', uid, 'memberships', server.id));
    batch.update(doc(db, 'servers', server.id), {
      memberCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `servers/${server.id}/members/${uid}`);
  }
}

export async function updateServerSettings(
  serverId: string,
  updates: {
    name: string;
    description: string;
    iconEmoji: string;
    iconColor: string;
    isPublic: boolean;
    enabledBots?: string[];
  }
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      name: updates.name.trim().slice(0, LIMITS.SERVER_NAME_MAX),
      description: updates.description.trim().slice(0, LIMITS.SERVER_DESC_MAX),
      iconEmoji: updates.iconEmoji.slice(0, 16),
      iconColor: updates.iconColor.slice(0, 20),
      isPublic: updates.isPublic,
      updatedAt: serverTimestamp(),
    };
    if (updates.enabledBots !== undefined) {
      payload.enabledBots = updates.enabledBots.slice(0, 10);
    }
    await updateDoc(doc(db, 'servers', serverId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `servers/${serverId}`);
  }
}

export async function deleteServer(uid: string, serverId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid, 'memberships', serverId));
    batch.delete(doc(db, 'servers', serverId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `servers/${serverId}`);
  }
}

export async function createChannel(
  serverId: string,
  input: { name: string; type: ChannelType; category: string; topic: string; position: number }
): Promise<string> {
  const channelId = makeId('ch');
  try {
    const cleanName =
      input.type === 'voice'
        ? input.name.trim().slice(0, LIMITS.CHANNEL_NAME_MAX)
        : input.name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .slice(0, LIMITS.CHANNEL_NAME_MAX) || 'yeni-kanal';

    await setDoc(doc(db, 'servers', serverId, 'channels', channelId), {
      id: channelId,
      serverId,
      name: cleanName,
      type: input.type,
      category: (input.category.trim() || 'METİN KANALLARI').toUpperCase().slice(0, 40),
      topic: input.topic.trim().slice(0, LIMITS.CHANNEL_TOPIC_MAX),
      position: input.position,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return channelId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `servers/${serverId}/channels/${channelId}`);
  }
}

export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'servers', serverId, 'channels', channelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `servers/${serverId}/channels/${channelId}`);
  }
}

export async function updateMemberRole(
  serverId: string,
  member: ServerMember,
  newRole: Exclude<MemberRole, 'owner'>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'servers', serverId, 'members', member.uid), {
      role: newRole,
      roleColor: ROLE_COLORS[newRole],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `servers/${serverId}/members/${member.uid}`);
  }
}

export async function kickMember(server: ServerDoc, memberUid: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'servers', server.id, 'members', memberUid));
    batch.delete(doc(db, 'users', memberUid, 'memberships', server.id));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `servers/${server.id}/members/${memberUid}`);
  }
}

export async function sendChannelMessage(
  serverId: string,
  channelId: string,
  channelLabel: string,
  author: PublicProfile,
  authorRoleColor: string,
  payload: {
    content: string;
    attachmentUrl?: string;
    attachmentName?: string;
    replyTo?: ChatMessage | null;
  }
): Promise<void> {
  const messageId = makeId('msg');
  const content = payload.content.trim().slice(0, LIMITS.MESSAGE_MAX);
  const attachmentUrl = (payload.attachmentUrl || '').slice(0, LIMITS.ATTACHMENT_MAX);
  const attachmentName = (payload.attachmentName || '').slice(0, 120);
  if (!content && !attachmentUrl) return;

  try {
    await setDoc(doc(db, 'servers', serverId, 'channels', channelId, 'messages', messageId), {
      id: messageId,
      serverId,
      channelId,
      authorId: author.uid,
      authorName: author.displayName.slice(0, LIMITS.DISPLAY_NAME_MAX),
      authorAvatar: (author.avatarUrl || '').slice(0, 1000),
      authorRoleColor: authorRoleColor || '#DBDEE1',
      content,
      attachmentUrl,
      attachmentName,
      replyToId: payload.replyTo?.id || '',
      replyToAuthor: (payload.replyTo?.authorName || '').slice(0, 40),
      replyToContent: (payload.replyTo?.content || (payload.replyTo?.attachmentName ? `[Ek: ${payload.replyTo.attachmentName}]` : '')).slice(0, 200),
      reactions: {},
      pinned: false,
      edited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (payload.replyTo && payload.replyTo.authorId !== author.uid) {
      sendNotification(payload.replyTo.authorId, {
        type: 'reply',
        fromUid: author.uid,
        fromName: author.displayName,
        fromAvatar: author.avatarUrl,
        channelLabel,
        preview: content || attachmentName || 'Yanıt verdi',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `servers/${serverId}/channels/${channelId}/messages/${messageId}`);
  }
}

export async function editChannelMessage(
  serverId: string,
  channelId: string,
  messageId: string,
  newContent: string
): Promise<void> {
  const clean = newContent.trim().slice(0, LIMITS.MESSAGE_MAX);
  if (!clean) return;
  try {
    await updateDoc(doc(db, 'servers', serverId, 'channels', channelId, 'messages', messageId), {
      content: clean,
      edited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `servers/${serverId}/channels/${channelId}/messages/${messageId}`);
  }
}

export async function deleteChannelMessage(
  serverId: string,
  channelId: string,
  messageId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'servers', serverId, 'channels', channelId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `servers/${serverId}/channels/${channelId}/messages/${messageId}`);
  }
}

export async function toggleChannelReaction(
  serverId: string,
  channelId: string,
  message: ChatMessage,
  emoji: string,
  uid: string
): Promise<void> {
  const current = { ...(message.reactions || {}) };
  const list = [...(current[emoji] || [])];
  const idx = list.indexOf(uid);
  if (idx >= 0) {
    list.splice(idx, 1);
    if (list.length === 0) delete current[emoji];
    else current[emoji] = list;
  } else {
    current[emoji] = [...list, uid];
  }
  try {
    await updateDoc(doc(db, 'servers', serverId, 'channels', channelId, 'messages', message.id), {
      reactions: current,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `servers/${serverId}/channels/${channelId}/messages/${message.id}`);
  }
}

export async function togglePinMessage(
  serverId: string,
  channelId: string,
  messageId: string,
  pinned: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'servers', serverId, 'channels', channelId, 'messages', messageId), {
      pinned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `servers/${serverId}/channels/${channelId}/messages/${messageId}`);
  }
}

// --- Friends, DMs & Group DMs ---

export async function sendFriendRequestByUsername(
  me: PublicProfile,
  targetUsernameRaw: string
): Promise<void> {
  const cleanUsername = targetUsernameRaw.trim().toLowerCase().replace(/^@/, '');
  if (!cleanUsername) throw new Error('Lütfen bir kullanıcı adı gir.');
  if (cleanUsername === me.username) throw new Error('Kendine arkadaşlık isteği gönderemezsin.');

  try {
    const claimSnap = await getDoc(doc(db, 'usernames', cleanUsername));
    if (!claimSnap.exists()) {
      throw new Error(`"${cleanUsername}" kullanıcı adına sahip biri bulunamadı.`);
    }
    const target = claimSnap.data() as { uid: string; username: string; displayName: string; avatarUrl: string };
    const reqId = getPairId(me.uid, target.uid);
    const existing = await getDoc(doc(db, 'friendRequests', reqId));
    if (existing.exists()) {
      const d = existing.data() as FriendRequestDoc;
      if (d.status === 'accepted') throw new Error('Bu kişi zaten arkadaş listenizde.');
      throw new Error('Zaten bekleyen bir arkadaşlık isteği var.');
    }

    await setDoc(doc(db, 'friendRequests', reqId), {
      id: reqId,
      fromUid: me.uid,
      fromName: me.displayName.slice(0, 40),
      fromUsername: me.username.slice(0, 32),
      fromAvatar: (me.avatarUrl || '').slice(0, 1000),
      toUid: target.uid,
      toName: (target.displayName || cleanUsername).slice(0, 40),
      toUsername: target.username.slice(0, 32),
      toAvatar: (target.avatarUrl || '').slice(0, 1000),
      participants: [me.uid, target.uid],
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('bulunamadı') || error.message.includes('zaten') || error.message.includes('Zaten') || error.message.includes('Kendine') || error.message.includes('Lütfen'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'friendRequests');
  }
}

export async function sendFriendRequestByUid(me: PublicProfile, targetUid: string): Promise<void> {
  if (targetUid === me.uid) return;
  try {
    const targetSnap = await getDoc(doc(db, 'users', targetUid));
    if (!targetSnap.exists()) throw new Error('Kullanıcı bulunamadı.');
    const target = targetSnap.data() as PublicProfile;
    const reqId = getPairId(me.uid, target.uid);
    const existing = await getDoc(doc(db, 'friendRequests', reqId));
    if (existing.exists()) return;
    await setDoc(doc(db, 'friendRequests', reqId), {
      id: reqId,
      fromUid: me.uid,
      fromName: me.displayName.slice(0, 40),
      fromUsername: me.username.slice(0, 32),
      fromAvatar: (me.avatarUrl || '').slice(0, 1000),
      toUid: target.uid,
      toName: target.displayName.slice(0, 40),
      toUsername: target.username.slice(0, 32),
      toAvatar: (target.avatarUrl || '').slice(0, 1000),
      participants: [me.uid, target.uid],
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'friendRequests');
  }
}

export async function acceptFriendRequest(reqId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'friendRequests', reqId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `friendRequests/${reqId}`);
  }
}

export async function removeFriendOrRequest(reqId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'friendRequests', reqId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `friendRequests/${reqId}`);
  }
}

export async function getOrCreateDmThread(
  me: PublicProfile,
  other: { uid: string; displayName: string; username: string; avatarUrl: string }
): Promise<DmThreadDoc> {
  const threadId = getPairId(me.uid, other.uid);
  try {
    const ref = doc(db, 'dmThreads', threadId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as DmThreadDoc;
    }
    const payload = {
      id: threadId,
      participants: [me.uid, other.uid],
      participantProfiles: {
        [me.uid]: {
          displayName: me.displayName.slice(0, 40),
          username: me.username.slice(0, 32),
          avatarUrl: (me.avatarUrl || '').slice(0, 1000),
        },
        [other.uid]: {
          displayName: other.displayName.slice(0, 40),
          username: other.username.slice(0, 32),
          avatarUrl: (other.avatarUrl || '').slice(0, 1000),
        },
      },
      isGroup: false,
      groupName: '',
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    return {
      ...payload,
      lastMessageAt: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dmThreads/${threadId}`);
  }
}

export async function createGroupDmThread(
  me: PublicProfile,
  others: Array<{ uid: string; displayName: string; username: string; avatarUrl: string }>,
  groupName: string
): Promise<DmThreadDoc> {
  if (others.length < 1) throw new Error('En az 1 arkadaş seçmelisin.');
  const threadId = makeId('grp');
  const participants = [me.uid, ...others.slice(0, 9).map((o) => o.uid)];
  const participantProfiles: DmThreadDoc['participantProfiles'] = {
    [me.uid]: {
      displayName: me.displayName.slice(0, 40),
      username: me.username.slice(0, 32),
      avatarUrl: (me.avatarUrl || '').slice(0, 1000),
    },
  };
  for (const o of others.slice(0, 9)) {
    participantProfiles[o.uid] = {
      displayName: o.displayName.slice(0, 40),
      username: o.username.slice(0, 32),
      avatarUrl: (o.avatarUrl || '').slice(0, 1000),
    };
  }
  const cleanGroupName =
    groupName.trim().slice(0, 60) ||
    [me.displayName, ...others.map((o) => o.displayName)].slice(0, 3).join(', ').slice(0, 60);

  try {
    const payload = {
      id: threadId,
      participants,
      participantProfiles,
      isGroup: true,
      groupName: cleanGroupName,
      lastMessage: 'Grup sohbeti oluşturuldu',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'dmThreads', threadId), payload);
    return {
      ...payload,
      lastMessageAt: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `dmThreads/${threadId}`);
  }
}

export async function sendDmMessage(
  threadId: string,
  author: PublicProfile,
  payload: {
    content: string;
    attachmentUrl?: string;
    attachmentName?: string;
    replyTo?: ChatMessage | null;
  }
): Promise<void> {
  const messageId = makeId('dm');
  const content = payload.content.trim().slice(0, LIMITS.MESSAGE_MAX);
  const attachmentUrl = (payload.attachmentUrl || '').slice(0, LIMITS.ATTACHMENT_MAX);
  const attachmentName = (payload.attachmentName || '').slice(0, 120);
  if (!content && !attachmentUrl) return;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'dmThreads', threadId, 'messages', messageId), {
      id: messageId,
      threadId,
      authorId: author.uid,
      authorName: author.displayName.slice(0, LIMITS.DISPLAY_NAME_MAX),
      authorAvatar: (author.avatarUrl || '').slice(0, 1000),
      content,
      attachmentUrl,
      attachmentName,
      replyToId: payload.replyTo?.id || '',
      replyToAuthor: (payload.replyTo?.authorName || '').slice(0, 40),
      replyToContent: (payload.replyTo?.content || (payload.replyTo?.attachmentName ? `[Ek: ${payload.replyTo.attachmentName}]` : '')).slice(0, 200),
      reactions: {},
      edited: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'dmThreads', threadId), {
      lastMessage: (content || attachmentName || 'Dosya gönderildi').slice(0, 200),
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dmThreads/${threadId}/messages/${messageId}`);
  }
}

export async function editDmMessage(
  threadId: string,
  messageId: string,
  newContent: string
): Promise<void> {
  const clean = newContent.trim().slice(0, LIMITS.MESSAGE_MAX);
  if (!clean) return;
  try {
    await updateDoc(doc(db, 'dmThreads', threadId, 'messages', messageId), {
      content: clean,
      edited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `dmThreads/${threadId}/messages/${messageId}`);
  }
}

export async function deleteDmMessage(threadId: string, messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'dmThreads', threadId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `dmThreads/${threadId}/messages/${messageId}`);
  }
}

export async function toggleDmReaction(
  threadId: string,
  message: ChatMessage,
  emoji: string,
  uid: string
): Promise<void> {
  const current = { ...(message.reactions || {}) };
  const list = [...(current[emoji] || [])];
  const idx = list.indexOf(uid);
  if (idx >= 0) {
    list.splice(idx, 1);
    if (list.length === 0) delete current[emoji];
    else current[emoji] = list;
  } else {
    current[emoji] = [...list, uid];
  }
  try {
    await updateDoc(doc(db, 'dmThreads', threadId, 'messages', message.id), {
      reactions: current,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `dmThreads/${threadId}/messages/${message.id}`);
  }
}

export async function fetchServerChannelsOnce(serverId: string): Promise<ChannelDoc[]> {
  try {
    const q = query(collection(db, 'servers', serverId, 'channels'), orderBy('position', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ChannelDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `servers/${serverId}/channels`);
  }
}

// --- Official Turcord Bot Threads, Alerts & Channel Messages ---

export async function ensureTurcordBotThread(profile: PublicProfile): Promise<DmThreadDoc> {
  const threadId = getBotThreadId(profile.uid);
  const bot = OFFICIAL_BOTS.turcord_bot;
  const welcomeText = `Merhaba **${profile.displayName}**! Ben **Turcord** resmi botuyum.\n\nHerhangi bir bağlantı, ses veya mikrofon sorununda sana buradan otomatik bilgi veririm. Ayrıca aklına takılan her şeyi doğrudan bu sohbetten bana sorabilirsin!`;

  try {
    const ref = doc(db, 'dmThreads', threadId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as DmThreadDoc;
    }

    const threadPayload = {
      id: threadId,
      participants: [profile.uid, bot.id],
      participantProfiles: {
        [profile.uid]: {
          displayName: profile.displayName.slice(0, 40),
          username: profile.username.slice(0, 32),
          avatarUrl: (profile.avatarUrl || '').slice(0, 1000),
        },
        [bot.id]: {
          displayName: bot.name,
          username: bot.username,
          avatarUrl: '',
        },
      },
      isGroup: false,
      isBotThread: true,
      groupName: '',
      lastMessage: welcomeText.slice(0, 200),
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, threadPayload);
    await sendBotDmMessage(threadId, welcomeText, 'turcord_bot');

    return {
      ...threadPayload,
      lastMessageAt: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dmThreads/${threadId}`);
  }
}

export async function sendBotDmMessage(
  threadId: string,
  content: string,
  botId: BotId = 'turcord_bot'
): Promise<void> {
  const clean = content.trim().slice(0, LIMITS.MESSAGE_MAX);
  if (!clean) return;
  const bot = OFFICIAL_BOTS[botId] || OFFICIAL_BOTS.turcord_bot;
  const messageId = makeId('dm');

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'dmThreads', threadId, 'messages', messageId), {
      id: messageId,
      threadId,
      authorId: bot.id,
      authorName: bot.name,
      authorAvatar: '',
      content: clean,
      attachmentUrl: '',
      attachmentName: '',
      replyToId: '',
      replyToAuthor: '',
      replyToContent: '',
      reactions: {},
      edited: false,
      isBot: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'dmThreads', threadId), {
      lastMessage: clean.slice(0, 200),
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `dmThreads/${threadId}/messages/${messageId}`);
  }
}

export async function sendBotAlertToUser(
  profile: PublicProfile,
  title: string,
  detail: string
): Promise<void> {
  if (profile.botAlerts === false) return;
  try {
    const thread = await ensureTurcordBotThread(profile);
    const formatted = `⚠️ **Turcord Sistem Uyarısı — ${title}**\n${detail}\n\n_Çözüm adımları veya test için bana buradan yazabilirsin._`;
    await sendBotDmMessage(thread.id, formatted, 'turcord_bot');
    await sendNotification(profile.uid, {
      type: 'system',
      fromUid: 'turcord_bot',
      fromName: 'Turcord Resmi Bot',
      fromAvatar: '',
      channelLabel: 'Sistem Bildirimi',
      preview: `${title}: ${detail}`.slice(0, 300),
    });
  } catch {
    // Non-blocking diagnostic alert
  }
}

export async function sendBotChannelMessage(
  serverId: string,
  channelId: string,
  botId: BotId,
  content: string,
  replyTo?: ChatMessage | null
): Promise<void> {
  const clean = content.trim().slice(0, LIMITS.MESSAGE_MAX);
  if (!clean) return;
  const bot = OFFICIAL_BOTS[botId] || OFFICIAL_BOTS.turcord_bot;
  const messageId = makeId('msg');

  try {
    await setDoc(doc(db, 'servers', serverId, 'channels', channelId, 'messages', messageId), {
      id: messageId,
      serverId,
      channelId,
      authorId: bot.id,
      authorName: bot.name,
      authorAvatar: '',
      authorRoleColor: bot.roleColor,
      content: clean,
      attachmentUrl: '',
      attachmentName: '',
      replyToId: replyTo?.id || '',
      replyToAuthor: (replyTo?.authorName || '').slice(0, 40),
      replyToContent: (replyTo?.content || '').slice(0, 200),
      reactions: {},
      pinned: false,
      edited: false,
      isBot: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `servers/${serverId}/channels/${channelId}/messages/${messageId}`);
  }
}

