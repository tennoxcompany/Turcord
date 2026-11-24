import React, { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Headphones,
  Inbox,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Search,
  Settings,
  UserCheck,
  UserPlus,
  Users,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  ChatMessage,
  ChatPoll,
  DmThreadDoc,
  FriendRequestDoc,
  PublicProfile,
  UserStatus,
  VoiceParticipant,
} from '../types/halka';
import type { SoundboardEvent } from '../hooks/useRealtimeSocket';
import { ACTIVITY_LABELS } from '../lib/cosmetics';
import { isOfficialBotUid } from '../lib/turcordBots';
import { Avatar, ClanTagBadge, VerifiedBotBadge } from './Avatar';
import { ChatArea } from './ChatArea';
import { VoiceStage } from './VoiceStage';

const BOT_QUICK_PROMPTS = [
  'Sesli odada mikrofonum çalışmıyor, ne yapmalıyım?',
  'Yeni sunucu ve bot komutları nasıl kullanılır?',
  '/durum',
  '/yardim',
];

interface FriendsHomeProps {
  profile: PublicProfile;
  friendRequests: FriendRequestDoc[];
  dmThreads: DmThreadDoc[];
  activeDmThreadId: string | null;
  dmMessages: ChatMessage[];
  onlineUsers: Record<string, { status: string; displayName: string; avatarUrl: string }>;
  typingUsers: Array<{ uid: string; displayName: string }>;
  activeVoiceRoomKey: string | null;
  activeVoiceLabel: string;
  roomParticipants: VoiceParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  voiceError: string | null;
  activeSoundboardEvent?: SoundboardEvent | null;
  onBroadcastSoundboard?: (soundId: string) => void;
  unreadNotificationsCount: number;
  unreadDmIds?: Set<string>;
  botThinking?: boolean;
  onRunBotDiagnostics?: () => void;
  onSelectFriendsTab: () => void;
  onSelectDmThread: (threadId: string) => void;
  onOpenDmWithUser: (other: { uid: string; displayName: string; username: string; avatarUrl: string }) => Promise<void>;
  onCreateGroupDm: (
    others: Array<{ uid: string; displayName: string; username: string; avatarUrl: string }>,
    groupName: string
  ) => Promise<void>;
  onSendFriendRequest: (username: string) => Promise<void>;
  onAcceptFriendRequest: (reqId: string) => Promise<void>;
  onRemoveFriendOrRequest: (reqId: string) => Promise<void>;
  onSendDmMessage: (payload: {
    content: string;
    attachmentUrl?: string;
    attachmentName?: string;
    replyTo?: ChatMessage | null;
    poll?: ChatPoll;
  }) => Promise<void>;
  onEditDmMessage: (msgId: string, newContent: string) => Promise<void>;
  onDeleteDmMessage: (msgId: string) => Promise<void>;
  onToggleDmReaction: (msg: ChatMessage, emoji: string) => Promise<void>;
  onVoteDmPoll?: (msg: ChatMessage, optionIndex: number) => Promise<void>;
  onBookmarkMessage: (msg: ChatMessage, channelLabel: string) => Promise<void>;
  onTyping: (channelKey: string, isTyping: boolean) => void;
  onStartDmCall: (otherUid: string, otherName: string, threadId: string, video: boolean) => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onOpenUserSettings: () => void;
  onOpenProfile: (uid?: string) => void;
  onOpenNotifications: () => void;
}

export const FriendsHome: React.FC<FriendsHomeProps> = ({
  profile,
  friendRequests,
  dmThreads,
  activeDmThreadId,
  dmMessages,
  onlineUsers,
  typingUsers,
  activeVoiceRoomKey,
  activeVoiceLabel,
  roomParticipants,
  localStream,
  remoteStreams,
  muted,
  deafened,
  cameraOn,
  screenSharing,
  voiceError,
  activeSoundboardEvent,
  onBroadcastSoundboard,
  unreadNotificationsCount,
  unreadDmIds,
  botThinking = false,
  onRunBotDiagnostics,
  onSelectFriendsTab,
  onSelectDmThread,
  onOpenDmWithUser,
  onCreateGroupDm,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRemoveFriendOrRequest,
  onSendDmMessage,
  onEditDmMessage,
  onDeleteDmMessage,
  onToggleDmReaction,
  onVoteDmPoll,
  onBookmarkMessage,
  onTyping,
  onStartDmCall,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
  onOpenUserSettings,
  onOpenProfile,
  onOpenNotifications,
}) => {
  const [mainSection, setMainSection] = useState<'friends' | 'requests'>('friends');
  const [friendsTab, setFriendsTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [requestsTab, setRequestsTab] = useState<'istekler' | 'spam'>('istekler');
  const [usernameInput, setUsernameInput] = useState('');
  const [addFeedback, setAddFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // DM Search Modal ("DM'lerde ara")
  const [dmSearchOpen, setDmSearchOpen] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [dmSearchFilter, setDmSearchFilter] = useState<'tumu' | 'kisiler' | 'medya' | 'sabitlemeler' | 'baglantilar' | 'dosyalar'>('tumu');

  // New Message / Group DM Modal ("Yeni Mesaj")
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupUids, setSelectedGroupUids] = useState<string[]>([]);
  const [newMsgFilter, setNewMsgFilter] = useState('');

  const acceptedFriends = useMemo(() => {
    return friendRequests
      .filter((r) => r.status === 'accepted')
      .map((r) => {
        const isFromMe = r.fromUid === profile.uid;
        return {
          reqId: r.id,
          uid: isFromMe ? r.toUid : r.fromUid,
          displayName: isFromMe ? r.toName : r.fromName,
          username: isFromMe ? r.toUsername : r.fromUsername,
          avatarUrl: isFromMe ? r.toAvatar : r.fromAvatar,
        };
      });
  }, [friendRequests, profile.uid]);

  const pendingRequests = useMemo(
    () => friendRequests.filter((r) => r.status === 'pending'),
    [friendRequests]
  );

  const incomingRequests = useMemo(
    () => pendingRequests.filter((r) => r.toUid === profile.uid),
    [pendingRequests, profile.uid]
  );

  const getStatus = (uid: string): UserStatus => {
    const entry = onlineUsers[uid];
    return entry ? (entry.status as UserStatus) || 'online' : 'offline';
  };

  const onlineFriends = useMemo(
    () => acceptedFriends.filter((f) => getStatus(f.uid) !== 'offline'),
    [acceptedFriends, onlineUsers]
  );

  const sortedDmThreads = useMemo(() => {
    return [...dmThreads].sort((a, b) => {
      if (a.isBotThread && !b.isBotThread) return -1;
      if (!a.isBotThread && b.isBotThread) return 1;
      return 0;
    });
  }, [dmThreads]);

  const activeThread = useMemo(
    () => sortedDmThreads.find((t) => t.id === activeDmThreadId) || null,
    [sortedDmThreads, activeDmThreadId]
  );

  const activeThreadTitle = useMemo(() => {
    if (!activeThread) return '';
    if (activeThread.isGroup) return activeThread.groupName || 'Grup Sohbeti';
    const otherUid = activeThread.participants.find((id) => id !== profile.uid) || '';
    return activeThread.participantProfiles[otherUid]?.displayName || 'Kullanıcı';
  }, [activeThread, profile.uid]);

  const activeOtherUser = useMemo(() => {
    if (!activeThread || activeThread.isGroup) return null;
    const otherUid = activeThread.participants.find((id) => id !== profile.uid) || '';
    const p = activeThread.participantProfiles[otherUid];
    return {
      uid: otherUid,
      displayName: p?.displayName || 'Kullanıcı',
      username: p?.username || 'user',
      avatarUrl: p?.avatarUrl || '',
    };
  }, [activeThread, profile.uid]);

  const isDmCallActive = Boolean(activeThread && activeVoiceRoomKey === `dm:${activeThread.id}`);

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || submitting) return;
    setSubmitting(true);
    setAddFeedback(null);
    try {
      await onSendFriendRequest(usernameInput);
      setAddFeedback({ type: 'ok', text: `@${usernameInput.trim()} kullanıcısına arkadaşlık isteği gönderildi!` });
      setUsernameInput('');
    } catch (err) {
      setAddFeedback({ type: 'err', text: err instanceof Error ? err.message : 'İstek gönderilemedi.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGroupSubmit = async () => {
    const chosen = acceptedFriends.filter((f) => selectedGroupUids.includes(f.uid));
    if (chosen.length === 0) return;
    await onCreateGroupDm(chosen, groupName);
    setNewMsgOpen(false);
    setGroupMode(false);
    setGroupName('');
    setSelectedGroupUids([]);
  };

  const dmSearchResults = useMemo(() => {
    const q = dmSearchQuery.trim().toLowerCase();
    const matchedThreads = dmThreads.filter((t) => {
      if (dmSearchFilter === 'medya' || dmSearchFilter === 'sabitlemeler' || dmSearchFilter === 'baglantilar' || dmSearchFilter === 'dosyalar') {
        return false;
      }
      if (!q) return true;
      if (t.isGroup && t.groupName?.toLowerCase().includes(q)) return true;
      return t.participants.some((id) => {
        const prof = t.participantProfiles[id];
        return prof?.displayName.toLowerCase().includes(q) || prof?.username.toLowerCase().includes(q);
      }) || t.lastMessage.toLowerCase().includes(q);
    });

    const matchedMsgs = dmMessages.filter((m) => {
      if (dmSearchFilter === 'kisiler') return false;
      if (dmSearchFilter === 'medya' && !m.attachmentUrl) return false;
      if (dmSearchFilter === 'sabitlemeler' && !m.pinned) return false;
      if (dmSearchFilter === 'baglantilar' && !/https?:\/\//i.test(m.content)) return false;
      if (dmSearchFilter === 'dosyalar' && !m.attachmentName) return false;
      if (!q) return dmSearchFilter !== 'tumu';
      return m.content.toLowerCase().includes(q) || m.authorName.toLowerCase().includes(q);
    });

    return { matchedThreads, matchedMsgs };
  }, [dmThreads, dmMessages, dmSearchQuery, dmSearchFilter]);

  return (
    <div className="flex-1 flex min-w-0 min-h-0 h-full overflow-hidden">
      {/* Left DM Sidebar (260px Onyx Style) */}
      <aside className="w-[256px] shrink-0 h-full min-h-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col select-none">
        {/* Mesajlar Header + Quick Actions */}
        <div className="px-3 pt-3 pb-2.5 border-b border-[var(--border-subtle)] space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-lg font-bold text-white">Mesajlar</h2>
            <span className="text-[11px] text-[var(--text-muted)]">@{profile.username}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDmSearchOpen(true)}
              title="DM'lerde ara"
              className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onSelectFriendsTab();
                setMainSection('requests');
              }}
              title="Mesaj İstekleri"
              className={`relative w-9 h-9 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                !activeDmThreadId && mainSection === 'requests'
                  ? 'bg-[#5865F2] border-[#5865F2] text-white'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4" />
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#F23F43] text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                  {incomingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onSelectFriendsTab();
                setMainSection('friends');
              }}
              className={`flex-1 h-9 px-3 rounded-full border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                !activeDmThreadId && mainSection === 'friends'
                  ? 'bg-[var(--bg-elevated)] border-[#5865F2]/60 text-white'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Arkadaşlar</span>
            </button>

            <button
              onClick={() => {
                setGroupMode(false);
                setNewMsgOpen(true);
              }}
              title="Yeni Mesaj / Grup Oluştur"
              className="w-9 h-9 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white flex items-center justify-center shrink-0 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Direct Messages List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              Direkt Mesajlar
            </span>
            <button
              onClick={() => {
                onSelectFriendsTab();
                setMainSection('friends');
                setFriendsTab('add');
              }}
              title="Arkadaş Ekle"
              className="text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {sortedDmThreads.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[var(--text-muted)]">
              Henüz direkt mesaj yok. Yukarıdaki + butonundan yeni mesaj veya grup başlatabilirsin.
            </p>
          ) : (
            sortedDmThreads.map((t) => {
              const otherUid = t.participants.find((id) => id !== profile.uid) || '';
              const p = t.participantProfiles[otherUid];
              const isBot = Boolean(t.isBotThread) || isOfficialBotUid(otherUid);
              const name = t.isGroup ? t.groupName || 'Grup Sohbeti' : p?.displayName || (isBot ? 'Turcord' : 'Kullanıcı');
              const isActive = activeDmThreadId === t.id;
              const isUnread = !isActive && Boolean(unreadDmIds?.has(t.id));
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectDmThread(t.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-[var(--bg-elevated)] text-white'
                      : isUnread
                      ? 'bg-[var(--bg-card)]/70 text-white hover:bg-[var(--bg-hover)]'
                      : isBot
                      ? 'bg-[#5865F2]/8 text-[var(--text-primary)] hover:bg-[#5865F2]/15'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'
                  }`}
                >
                  {t.isGroup ? (
                    <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  ) : (
                    <Avatar
                      src={p?.avatarUrl}
                      name={name}
                      size="sm"
                      status={isBot ? 'online' : getStatus(otherUid)}
                      showStatus
                      ringBg="var(--bg-sidebar)"
                      botId={isBot ? otherUid : undefined}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`text-sm truncate ${isUnread ? 'font-bold text-white' : 'font-medium'}`}>
                          {name}
                        </p>
                        {isBot && <VerifiedBotBadge />}
                      </div>
                      {isUnread ? (
                        <span
                          aria-label="Okunmamış mesaj"
                          className="w-2 h-2 rounded-full bg-[#5865F2] shrink-0"
                        />
                      ) : t.isGroup ? (
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums shrink-0">
                          {t.participants.length} kişi
                        </span>
                      ) : null}
                    </div>
                    {t.lastMessage && (
                      <p className={`text-[11px] truncate ${isUnread ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                        {t.lastMessage}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Active Voice Connection Panel */}
        {activeVoiceRoomKey && (
          <div className="px-3 py-2.5 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#23A55A]">Ses Bağlantısı Kuruldu</p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">{activeVoiceLabel}</p>
            </div>
            <button
              onClick={onLeaveVoice}
              title="Aramayı Sonlandır"
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-rose-500/20 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User Control Dock */}
        <div className="h-[56px] px-2 bg-[var(--bg-rail)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
          <button
            onClick={() => onOpenProfile(profile.uid)}
            className="flex items-center gap-2 min-w-0 px-1.5 py-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left cursor-pointer flex-1"
          >
            <Avatar
              src={profile.avatarUrl}
              name={profile.displayName}
              size="sm"
              status={profile.status}
              showStatus
              ringBg="var(--bg-rail)"
              decoration={profile.avatarDecoration}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">
                  {profile.displayName}
                </p>
                <ClanTagBadge tag={profile.clanTag} />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                {profile.statusEmoji ? `${profile.statusEmoji} ` : ''}
                {profile.customStatus ||
                  (profile.activity?.name
                    ? `${ACTIVITY_LABELS[profile.activity.type]}: ${profile.activity.name}`
                    : `@${profile.username}`)}
              </p>
            </div>
          </button>

          <div className="flex items-center shrink-0">
            <button
              onClick={onOpenNotifications}
              title="Bildirimler"
              className="relative p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#F23F43] text-[9px] font-bold text-white flex items-center justify-center tabular-nums">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
            <button
              onClick={onToggleMute}
              title={muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
              className={`p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer ${
                muted ? 'text-rose-400' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggleDeafen}
              title={deafened ? 'Sesi Aç' : 'Sağırlaştır'}
              className={`p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer ${
                deafened ? 'text-rose-400' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {deafened ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            </button>
            <button
              onClick={onOpenUserSettings}
              title="Kullanıcı Ayarları"
              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      {activeThread ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
          {isDmCallActive && (
            <div className="h-72 shrink-0 border-b border-[var(--border-subtle)]">
              <VoiceStage
                channelName={`${activeThreadTitle} ile Arama`}
                isJoined
                currentUid={profile.uid}
                participants={roomParticipants}
                localStream={localStream}
                remoteStreams={remoteStreams}
                muted={muted}
                deafened={deafened}
                cameraOn={cameraOn}
                screenSharing={screenSharing}
                voiceError={voiceError}
                activeSoundboardEvent={activeSoundboardEvent}
                onBroadcastSoundboard={onBroadcastSoundboard}
                onJoin={() => {}}
                onLeave={onLeaveVoice}
                onToggleMute={onToggleMute}
                onToggleDeafen={onToggleDeafen}
                onToggleCamera={onToggleCamera}
                onToggleScreenShare={onToggleScreenShare}
              />
            </div>
          )}
          <ChatArea
            mode="dm"
            title={activeThreadTitle}
            subtitle={
              activeThread.isBotThread
                ? 'Resmi Turcord Botu · Yapay Zeka & Sistem Desteği'
                : activeThread.isGroup
                ? `${activeThread.participants.length} katılımcı`
                : activeOtherUser
                ? `@${activeOtherUser.username}`
                : undefined
            }
            channelKey={`dm:${activeThread.id}`}
            messages={dmMessages}
            currentUid={profile.uid}
            currentUsername={profile.username}
            currentUserDecoration={profile.avatarDecoration}
            canModerate={Boolean(activeThread.isBotThread)}
            canPin={false}
            compactMode={Boolean(profile.compactMode)}
            isBotThread={Boolean(activeThread.isBotThread)}
            enableSlashCommands={Boolean(activeThread.isBotThread)}
            botThinking={Boolean(activeThread.isBotThread && botThinking)}
            quickPrompts={activeThread.isBotThread ? BOT_QUICK_PROMPTS : undefined}
            onRunDiagnostics={activeThread.isBotThread ? onRunBotDiagnostics : undefined}
            showTypingIndicator={profile.showTypingIndicator ?? true}
            typingUsers={typingUsers}
            onTyping={onTyping}
            onSendMessage={onSendDmMessage}
            onEditMessage={onEditDmMessage}
            onDeleteMessage={onDeleteDmMessage}
            onToggleReaction={onToggleDmReaction}
            onVotePoll={onVoteDmPoll}
            onBookmark={(msg) => onBookmarkMessage(msg, activeThreadTitle)}
            onAuthorClick={(uid) => onOpenProfile(uid)}
            onStartDmCall={
              activeOtherUser && !activeThread.isBotThread
                ? (video) =>
                    onStartDmCall(activeOtherUser.uid, activeOtherUser.displayName, activeThread.id, video)
                : undefined
            }
          />
        </div>
      ) : mainSection === 'requests' ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full bg-[var(--bg-surface)]">
          <header className="h-12 shrink-0 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2 font-display font-semibold text-[15px] text-white">
              <Inbox className="w-5 h-5 text-[var(--text-muted)]" />
              <span>Mesaj İstekleri</span>
            </div>
            <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1">
              <button
                onClick={() => setRequestsTab('istekler')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  requestsTab === 'istekler' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                İstekler ({incomingRequests.length})
              </button>
              <button
                onClick={() => setRequestsTab('spam')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  requestsTab === 'spam' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Spam
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {requestsTab === 'spam' ? (
              <div className="py-16 text-center space-y-2 max-w-md mx-auto">
                <Inbox className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
                <h3 className="text-base font-semibold text-white">Spam kutun temiz</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Güvenlik filtresine takılan şüpheli mesaj istekleri burada görünür.
                </p>
              </div>
            ) : incomingRequests.length === 0 ? (
              <div className="py-16 text-center space-y-2 max-w-md mx-auto">
                <Inbox className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
                <h3 className="text-base font-semibold text-white">Bekleyen mesaj veya arkadaşlık isteği yok</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Ortak sunucuda olmadığın veya yeni tanıştığın kişilerden gelen istekler burada listelenir.
                </p>
              </div>
            ) : (
              <div className="max-w-2xl space-y-2.5">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={req.fromAvatar} name={req.fromName} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{req.fromName}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          @{req.fromUsername} · Arkadaşlık &amp; DM isteği
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onAcceptFriendRequest(req.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium cursor-pointer"
                      >
                        Kabul et
                      </button>
                      <button
                        onClick={() => onRemoveFriendOrRequest(req.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-rose-500/20 text-[var(--text-secondary)] hover:text-rose-300 text-xs font-medium cursor-pointer"
                      >
                        Yoksay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full bg-[var(--bg-surface)]">
          {/* Friends Top Bar */}
          <header className="h-12 shrink-0 px-4 border-b border-[var(--border-subtle)] flex items-center gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 font-display font-semibold text-[15px] text-white whitespace-nowrap shrink-0">
              <Users className="w-5 h-5 text-[var(--text-muted)]" />
              <span>Arkadaşlar</span>
            </div>
            <span className="text-[var(--border-subtle)]" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'online', label: `Çevrimiçi (${onlineFriends.length})` },
                  { id: 'all', label: `Tümü (${acceptedFriends.length})` },
                  { id: 'pending', label: `Bekleyen (${pendingRequests.length})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFriendsTab(t.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    friendsTab === t.id
                      ? 'bg-[var(--bg-elevated)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => setFriendsTab('add')}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  friendsTab === 'add'
                    ? 'bg-[#248046] text-white'
                    : 'bg-[#248046]/85 hover:bg-[#248046] text-white'
                }`}
              >
                Arkadaş Ekle
              </button>
            </div>
          </header>

          {/* Friends Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {friendsTab === 'add' && (
              <div className="max-w-xl space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-white">Arkadaş Ekle</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Turcord kullanıcı adıyla arkadaşını bul ve istek gönder. (Senin kullanıcı adın: <strong className="text-white">@{profile.username}</strong>)
                  </p>
                </div>
                <form onSubmit={handleAddFriendSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Örn: kagan_22"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[#5865F2] text-sm text-white placeholder-[var(--text-muted)] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!usernameInput.trim() || submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? 'Gönderiliyor...' : 'İstek Gönder'}
                  </button>
                </form>
                {addFeedback && (
                  <p className={`text-sm ${addFeedback.type === 'ok' ? 'text-[#23A55A]' : 'text-rose-400'}`}>
                    {addFeedback.text}
                  </p>
                )}
              </div>
            )}

            {friendsTab === 'pending' && (
              <div className="max-w-2xl space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-3">
                  Bekleyen İstekler — {pendingRequests.length}
                </h3>
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-8">Bekleyen arkadaşlık isteği yok.</p>
                ) : (
                  pendingRequests.map((req) => {
                    const isIncoming = req.toUid === profile.uid;
                    const otherName = isIncoming ? req.fromName : req.toName;
                    const otherUsername = isIncoming ? req.fromUsername : req.toUsername;
                    const otherAvatar = isIncoming ? req.fromAvatar : req.toAvatar;
                    return (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={otherAvatar} name={otherName} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{otherName}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              @{otherUsername} · {isIncoming ? 'Gelen arkadaşlık isteği' : 'Gönderilen istek'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isIncoming && (
                            <button
                              onClick={() => onAcceptFriendRequest(req.id)}
                              title="Kabul Et"
                              className="p-2 rounded-full bg-[var(--bg-surface)] text-[#23A55A] hover:bg-[#23A55A] hover:text-white transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onRemoveFriendOrRequest(req.id)}
                            title="İptal Et / Reddet"
                            className="p-2 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {(friendsTab === 'online' || friendsTab === 'all') && (
              <div className="max-w-2xl space-y-2">
                {(() => {
                  const list = friendsTab === 'online' ? onlineFriends : acceptedFriends;
                  if (list.length === 0) {
                    return (
                      <div className="py-16 text-center space-y-3">
                        <UserCheck className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
                        <p className="text-sm text-[var(--text-muted)]">
                          {friendsTab === 'online'
                            ? 'Şu anda çevrimiçi arkadaşın görünmüyor.'
                            : 'Henüz arkadaş eklemedin. Kullanıcı adıyla arkadaş ekleyerek hemen mesajlaşabilirsin.'}
                        </p>
                        <button
                          onClick={() => setFriendsTab('add')}
                          className="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium cursor-pointer"
                        >
                          Arkadaş Ekle
                        </button>
                      </div>
                    );
                  }

                  return list.map((f) => {
                    const st = getStatus(f.uid);
                    return (
                      <div
                        key={f.reqId}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-colors"
                      >
                        <button
                          onClick={() => onOpenProfile(f.uid)}
                          className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
                        >
                          <Avatar src={f.avatarUrl} name={f.displayName} size="md" status={st} showStatus ringBg="var(--bg-surface)" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{f.displayName}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              @{f.username} · {st === 'offline' ? 'Çevrimdışı' : 'Çevrimiçi'}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenDmWithUser(f)}
                            title="Mesaj Gönder"
                            className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              await onOpenDmWithUser(f);
                              const tid = profile.uid < f.uid ? `${profile.uid}_${f.uid}` : `${f.uid}_${profile.uid}`;
                              onStartDmCall(f.uid, f.displayName, tid, false);
                            }}
                            title="Sesli Ara"
                            className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[#23A55A] cursor-pointer"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DM'lerde Ara Modal */}
      {dmSearchOpen && (
        <div
          onClick={() => setDmSearchOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden max-h-[82vh] flex flex-col"
          >
            <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={dmSearchQuery}
                  onChange={(e) => setDmSearchQuery(e.target.value)}
                  placeholder="DM'lerde ara"
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-white placeholder-[var(--text-muted)] outline-none"
                />
                <button onClick={() => setDmSearchOpen(false)} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {[
                  { id: 'tumu', label: 'Tümü' },
                  { id: 'kisiler', label: 'Kişiler' },
                  { id: 'medya', label: 'Medya' },
                  { id: 'sabitlemeler', label: 'Sabitlemeler' },
                  { id: 'baglantilar', label: 'Bağlantılar' },
                  { id: 'dosyalar', label: 'Dosyalar' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDmSearchFilter(f.id as typeof dmSearchFilter)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                      dmSearchFilter === f.id
                        ? 'bg-[#5865F2] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {dmSearchResults.matchedThreads.map((t) => {
                const otherUid = t.participants.find((id) => id !== profile.uid) || '';
                const p = t.participantProfiles[otherUid];
                const label = t.isGroup ? t.groupName || 'Grup Sohbeti' : p?.displayName || 'Kullanıcı';
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectDmThread(t.id);
                      setDmSearchOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-left cursor-pointer"
                  >
                    <Avatar src={p?.avatarUrl} name={label} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{label}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{t.lastMessage || 'Direkt Mesaj'}</p>
                    </div>
                  </button>
                );
              })}
              {dmSearchResults.matchedMsgs.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1"
                >
                  <p className="text-xs font-semibold text-white">{m.authorName}</p>
                  <p className="text-xs text-[var(--text-secondary)] break-words">{m.content || m.attachmentName}</p>
                </div>
              ))}
              {dmSearchResults.matchedThreads.length === 0 && dmSearchResults.matchedMsgs.length === 0 && (
                <p className="text-center text-xs text-[var(--text-muted)] py-8">
                  Eşleşen DM veya mesaj sonucu bulunamadı.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yeni Mesaj & Grup DM Modal */}
      {newMsgOpen && (
        <div
          onClick={() => setNewMsgOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden max-h-[82vh] flex flex-col"
          >
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">
                {groupMode ? 'Yeni Grup Oluştur' : 'Yeni Mesaj'}
              </h2>
              <button onClick={() => setNewMsgOpen(false)} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGroupMode((g) => !g)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium cursor-pointer ${
                    groupMode
                      ? 'bg-[#5865F2] border-[#5865F2] text-white'
                      : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-white hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Yeni Grup</span>
                </button>
                <button
                  onClick={() => {
                    setNewMsgOpen(false);
                    onSelectFriendsTab();
                    setMainSection('friends');
                    setFriendsTab('add');
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-white hover:bg-[var(--bg-hover)] text-xs font-medium cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Bir Arkadaş Ekle</span>
                </button>
              </div>

              {groupMode && (
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Grup adı (opsiyonel)"
                  maxLength={60}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                />
              )}

              <input
                type="text"
                value={newMsgFilter}
                onChange={(e) => setNewMsgFilter(e.target.value)}
                placeholder="Arkadaşlarında ara..."
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
              />

              <div className="space-y-1.5">
                <p className="px-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                  Önerilen
                </p>
                {acceptedFriends
                  .filter(
                    (f) =>
                      !newMsgFilter.trim() ||
                      f.displayName.toLowerCase().includes(newMsgFilter.toLowerCase()) ||
                      f.username.toLowerCase().includes(newMsgFilter.toLowerCase())
                  )
                  .map((f) => {
                    const selected = selectedGroupUids.includes(f.uid);
                    return (
                      <button
                        key={f.uid}
                        onClick={async () => {
                          if (groupMode) {
                            setSelectedGroupUids((prev) =>
                              prev.includes(f.uid) ? prev.filter((id) => id !== f.uid) : [...prev, f.uid]
                            );
                          } else {
                            await onOpenDmWithUser(f);
                            setNewMsgOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                          selected ? 'bg-[#5865F2]/20 border border-[#5865F2]' : 'hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={f.avatarUrl} name={f.displayName} size="sm" status={getStatus(f.uid)} showStatus />
                          <div className="text-left min-w-0">
                            <p className="text-sm font-medium text-white truncate">{f.displayName}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">@{f.username}</p>
                          </div>
                        </div>
                        {groupMode && selected && <Check className="w-4 h-4 text-[#5865F2]" />}
                      </button>
                    );
                  })}
                {acceptedFriends.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                    Henüz arkadaşın yok. Önce "Bir Arkadaş Ekle" ile arkadaş ekleyebilirsin.
                  </p>
                )}
              </div>

              {groupMode && selectedGroupUids.length > 0 && (
                <button
                  onClick={handleCreateGroupSubmit}
                  className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium cursor-pointer"
                >
                  Grup Sohbetini Başlat ({selectedGroupUids.length} kişi)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
