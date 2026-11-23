import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Menu, Phone, PhoneOff, Plus, Compass, X } from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import {
  acceptFriendRequest,
  addBookmark,
  createChannel,
  createGroupDmThread,
  createServer,
  deleteChannel,
  deleteChannelMessage,
  deleteDmMessage,
  deleteServer,
  editChannelMessage,
  editDmMessage,
  ensureUserProfile,
  getOrCreateDmThread,
  joinServer,
  joinServerByCode,
  kickMember,
  leaveServer,
  removeFriendOrRequest,
  ROLE_LABELS,
  sendChannelMessage,
  sendDmMessage,
  sendFriendRequestByUid,
  sendFriendRequestByUsername,
  toggleChannelReaction,
  toggleDmReaction,
  togglePinMessage,
  updateMemberRole,
  updateServerSettings,
  updateUserProfile,
} from './lib/halkaService';
import { useRealtimeSocket } from './hooks/useRealtimeSocket';
import type {
  ChannelDoc,
  ChannelType,
  ChatMessage,
  DmThreadDoc,
  FriendRequestDoc,
  MemberRole,
  PublicProfile,
  ServerDoc,
  ServerMember,
  UserBookmark,
  UserMembership,
  UserNotification,
} from './types/halka';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { ServerRail } from './components/ServerRail';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChatArea } from './components/ChatArea';
import { VoiceStage } from './components/VoiceStage';
import { MemberList } from './components/MemberList';
import { FriendsHome } from './components/FriendsHome';
import { Avatar } from './components/Avatar';
import { ProfileModal } from './components/ProfileModal';
import { ShopAndQuestsModal } from './components/ShopAndQuestsModal';
import { NotificationsModal } from './components/NotificationsModal';
import {
  CreateChannelModal,
  CreateServerModal,
  ExploreJoinModal,
  InviteModal,
  ServerSettingsModal,
  UserSettingsModal,
} from './components/Modals';

function HalkaApp() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  // Navigation State
  const [activeView, setActiveView] = useState<'home' | 'server'>('home');
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmThreadId, setActiveDmThreadId] = useState<string | null>(null);
  const [showMemberList, setShowMemberList] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);

  // Firestore Live Data
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [activeServer, setActiveServer] = useState<ServerDoc | null>(null);
  const [channels, setChannels] = useState<ChannelDoc[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [channelMessages, setChannelMessages] = useState<ChatMessage[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestDoc[]>([]);
  const [dmThreads, setDmThreads] = useState<DmThreadDoc[]>([]);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);

  // Modals
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState<ChannelType | null>(null);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [shopTab, setShopTab] = useState<'shop' | 'quests' | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Determine focused channelKey for typing indicators
  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) || null,
    [channels, activeChannelId]
  );

  const activeChannelKey = useMemo(() => {
    if (activeView === 'server' && activeServerId && activeChannel && activeChannel.type !== 'voice') {
      return `server:${activeServerId}:${activeChannel.id}`;
    }
    if (activeView === 'home' && activeDmThreadId) {
      return `dm:${activeDmThreadId}`;
    }
    return null;
  }, [activeView, activeServerId, activeChannel, activeDmThreadId]);

  const rt = useRealtimeSocket(
    profile,
    activeView === 'server' ? activeServerId : null,
    activeChannelKey
  );

  // Apply Appearance Theme (Oniks / Koyu / Gece)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile?.theme || 'oniks');
  }, [profile?.theme]);

  // 1. Auth Listener & Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(null);
        setAuthReady(true);
        return;
      }
      try {
        const p = await ensureUserProfile(user);
        setProfile(p);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Profil yüklenemedi.');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Live Profile Listener
  useEffect(() => {
    if (!profile?.uid) return;
    const path = `users/${profile.uid}`;
    return onSnapshot(
      doc(db, 'users', profile.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as PublicProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, path)
    );
  }, [profile?.uid]);

  // 3. Memberships, Friends, DM Threads, Notifications & Bookmarks Listeners
  useEffect(() => {
    if (!profile?.uid) {
      setMemberships([]);
      setFriendRequests([]);
      setDmThreads([]);
      setNotifications([]);
      setBookmarks([]);
      return;
    }

    const uid = profile.uid;
    const unsubMemberships = onSnapshot(
      query(collection(db, 'users', uid, 'memberships')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as UserMembership);
        setMemberships(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/memberships`)
    );

    const unsubFriends = onSnapshot(
      query(collection(db, 'friendRequests'), where('participants', 'array-contains', uid)),
      (snap) => {
        setFriendRequests(snap.docs.map((d) => d.data() as FriendRequestDoc));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'friendRequests')
    );

    const unsubDms = onSnapshot(
      query(collection(db, 'dmThreads'), where('participants', 'array-contains', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as DmThreadDoc);
        list.sort((a, b) => {
          const am = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
          const bm = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
          return bm - am;
        });
        setDmThreads(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'dmThreads')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        setNotifications(snap.docs.map((d) => d.data() as UserNotification));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/notifications`)
    );

    const unsubBookmarks = onSnapshot(
      query(collection(db, 'users', uid, 'bookmarks'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        setBookmarks(snap.docs.map((d) => d.data() as UserBookmark));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/bookmarks`)
    );

    return () => {
      unsubMemberships();
      unsubFriends();
      unsubDms();
      unsubNotifs();
      unsubBookmarks();
    };
  }, [profile?.uid]);

  // 4. Active Server, Channels & Members Listeners
  useEffect(() => {
    if (activeView !== 'server' || !activeServerId || !profile?.uid) {
      setActiveServer(null);
      setChannels([]);
      setMembers([]);
      return;
    }

    const unsubServer = onSnapshot(
      doc(db, 'servers', activeServerId),
      (snap) => {
        if (snap.exists()) {
          setActiveServer(snap.data() as ServerDoc);
        } else {
          setActiveServer(null);
          setActiveView('home');
          setActiveServerId(null);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `servers/${activeServerId}`)
    );

    const unsubChannels = onSnapshot(
      query(collection(db, 'servers', activeServerId, 'channels'), orderBy('position', 'asc')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ChannelDoc);
        setChannels(list);
        setActiveChannelId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          const firstText = list.find((c) => c.type !== 'voice') || list[0];
          return firstText ? firstText.id : null;
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `servers/${activeServerId}/channels`)
    );

    const unsubMembers = onSnapshot(
      collection(db, 'servers', activeServerId, 'members'),
      (snap) => {
        setMembers(snap.docs.map((d) => d.data() as ServerMember));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `servers/${activeServerId}/members`)
    );

    return () => {
      unsubServer();
      unsubChannels();
      unsubMembers();
    };
  }, [activeView, activeServerId, profile?.uid]);

  // 5. Active Channel Messages Listener
  useEffect(() => {
    if (activeView !== 'server' || !activeServerId || !activeChannelId || activeChannel?.type === 'voice') {
      setChannelMessages([]);
      return;
    }

    const path = `servers/${activeServerId}/channels/${activeChannelId}/messages`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'), limit(150));
    return onSnapshot(
      q,
      (snap) => {
        setChannelMessages(snap.docs.map((d) => d.data() as ChatMessage));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
  }, [activeView, activeServerId, activeChannelId, activeChannel?.type]);

  // 6. Active DM Messages Listener
  useEffect(() => {
    if (activeView !== 'home' || !activeDmThreadId || !profile?.uid) {
      setDmMessages([]);
      return;
    }

    const path = `dmThreads/${activeDmThreadId}/messages`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'), limit(150));
    return onSnapshot(
      q,
      (snap) => {
        setDmMessages(snap.docs.map((d) => d.data() as ChatMessage));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
  }, [activeView, activeDmThreadId, profile?.uid]);

  const myMemberRecord = useMemo(
    () => members.find((m) => m.uid === profile?.uid) || null,
    [members, profile?.uid]
  );
  const myRole: MemberRole = myMemberRecord?.role || 'member';
  const canModerate = myRole === 'owner' || myRole === 'admin' || myRole === 'moderator';
  const canManageRoles = myRole === 'owner' || myRole === 'admin';

  const incomingFriendRequests = useMemo(
    () => friendRequests.filter((r) => r.status === 'pending' && r.toUid === profile?.uid),
    [friendRequests, profile?.uid]
  );

  const acceptedFriendsCount = useMemo(
    () => friendRequests.filter((r) => r.status === 'accepted').length,
    [friendRequests]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length + incomingFriendRequests.length,
    [notifications, incomingFriendRequests.length]
  );

  const selectedServerMember = useMemo(
    () => (selectedProfileUid ? members.find((m) => m.uid === selectedProfileUid) || null : null),
    [members, selectedProfileUid]
  );

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google ile giriş yapılamadı.');
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[var(--bg-rail)] text-[var(--text-muted)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#5865F2] animate-pulse" />
          <p className="text-sm font-medium">Halka başlatılıyor...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <LoginScreen onGoogleLogin={handleGoogleLogin} error={authError} />;
  }

  const handleSelectServer = (serverId: string) => {
    setActiveView('server');
    setActiveServerId(serverId);
    setActiveChannelId(null);
    setMobileNavOpen(false);
  };

  const handleOpenDmWithUser = async (other: {
    uid: string;
    displayName: string;
    username: string;
    avatarUrl: string;
  }) => {
    const thread = await getOrCreateDmThread(profile, other);
    setActiveView('home');
    setActiveDmThreadId(thread.id);
    setMobileNavOpen(false);
  };

  const handleCreateGroupDm = async (
    others: Array<{ uid: string; displayName: string; username: string; avatarUrl: string }>,
    groupName: string
  ) => {
    const thread = await createGroupDmThread(profile, others, groupName);
    setActiveView('home');
    setActiveDmThreadId(thread.id);
    setMobileNavOpen(false);
  };

  const handleStartDmCall = (otherUid: string, otherName: string, threadId: string, video: boolean) => {
    const roomKey = `dm:${threadId}`;
    rt.joinVoice(roomKey, `${otherName} ile Arama`, video);
    rt.ringUser(otherUid, roomKey, video);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bg-rail)] text-[var(--text-primary)] flex flex-col">
      {/* Mobile Top Drawer Toggle */}
      <div className="md:hidden h-11 px-3 bg-[var(--bg-rail)] border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          className="inline-flex items-center gap-2 text-sm font-medium text-white"
        >
          <Menu className="w-5 h-5" />
          <span>{activeView === 'server' && activeServer ? activeServer.name : 'Halka'}</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateServerOpen(true)}
            className="p-1.5 rounded bg-[var(--bg-card)] text-[#23A55A]"
            title="Sunucu Oluştur"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExploreOpen(true)}
            className="p-1.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)]"
            title="Toplulukları Keşfet"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 4-Column Discord Layout */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Navigation Wrapper (Always visible on md+, slide-over on mobile) */}
        <div
          className={`${
            mobileNavOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'
          } md:static md:flex shrink-0`}
        >
          <ServerRail
            memberships={memberships}
            activeView={activeView}
            activeServerId={activeServerId}
            pendingRequestsCount={incomingFriendRequests.length}
            onSelectHome={() => {
              setActiveView('home');
              setMobileNavOpen(false);
            }}
            onSelectServer={handleSelectServer}
            onOpenCreateServer={() => setCreateServerOpen(true)}
            onOpenExploreJoin={() => setExploreOpen(true)}
          />

          {activeView === 'server' && activeServer && (
            <ChannelSidebar
              server={activeServer}
              channels={channels}
              activeChannelId={activeChannelId}
              myRole={myRole}
              profile={profile}
              voiceChannelsState={rt.serverVoiceChannels}
              activeVoiceRoomKey={rt.activeVoiceRoomKey}
              activeVoiceLabel={rt.activeVoiceLabel}
              muted={rt.muted}
              deafened={rt.deafened}
              cameraOn={rt.cameraOn}
              screenSharing={rt.screenSharing}
              wsConnected={rt.wsConnected}
              unreadNotificationsCount={unreadNotificationsCount}
              onSelectChannel={(ch) => {
                setActiveChannelId(ch.id);
                setMobileNavOpen(false);
              }}
              onJoinVoiceChannel={(ch) => {
                rt.joinVoice(`server:${activeServer.id}:${ch.id}`, `${ch.name} / ${activeServer.name}`, false);
              }}
              onLeaveVoice={rt.leaveVoice}
              onToggleMute={rt.toggleMute}
              onToggleDeafen={rt.toggleDeafen}
              onToggleCamera={rt.toggleCamera}
              onToggleScreenShare={rt.toggleScreenShare}
              onOpenInvite={() => setInviteOpen(true)}
              onOpenCreateChannel={(defType) => setCreateChannelType(defType || 'text')}
              onOpenServerSettings={() => setServerSettingsOpen(true)}
              onOpenUserSettings={() => setUserSettingsOpen(true)}
              onOpenProfile={() => setSelectedProfileUid(profile.uid)}
              onOpenNotifications={() => setNotificationsOpen(true)}
              onLeaveServer={async () => {
                await leaveServer(profile.uid, activeServer);
                setActiveView('home');
                setActiveServerId(null);
              }}
              onDeleteChannel={async (channelId) => {
                await deleteChannel(activeServer.id, channelId);
              }}
            />
          )}
        </div>

        {/* Mobile Backdrop */}
        {mobileNavOpen && (
          <div
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
        )}

        {/* Active View: Home (Friends + DMs) OR Server (Channel + Member List) */}
        {activeView === 'home' ? (
          <FriendsHome
            profile={profile}
            friendRequests={friendRequests}
            dmThreads={dmThreads}
            activeDmThreadId={activeDmThreadId}
            dmMessages={dmMessages}
            onlineUsers={rt.onlineUsers}
            typingUsers={rt.typingUsers}
            activeVoiceRoomKey={rt.activeVoiceRoomKey}
            activeVoiceLabel={rt.activeVoiceLabel}
            roomParticipants={rt.roomParticipants}
            localStream={rt.localStream}
            remoteStreams={rt.remoteStreams}
            muted={rt.muted}
            deafened={rt.deafened}
            cameraOn={rt.cameraOn}
            screenSharing={rt.screenSharing}
            voiceError={rt.voiceError}
            unreadNotificationsCount={unreadNotificationsCount}
            onSelectFriendsTab={() => setActiveDmThreadId(null)}
            onSelectDmThread={(tid) => setActiveDmThreadId(tid)}
            onOpenDmWithUser={handleOpenDmWithUser}
            onCreateGroupDm={handleCreateGroupDm}
            onSendFriendRequest={(uname) => sendFriendRequestByUsername(profile, uname)}
            onAcceptFriendRequest={acceptFriendRequest}
            onRemoveFriendOrRequest={removeFriendOrRequest}
            onSendDmMessage={(payload) => sendDmMessage(activeDmThreadId!, profile, payload)}
            onEditDmMessage={(msgId, content) => editDmMessage(activeDmThreadId!, msgId, content)}
            onDeleteDmMessage={(msgId) => deleteDmMessage(activeDmThreadId!, msgId)}
            onToggleDmReaction={(msg, em) => toggleDmReaction(activeDmThreadId!, msg, em, profile.uid)}
            onBookmarkMessage={(msg, label) => addBookmark(profile.uid, msg, label)}
            onTyping={rt.sendTyping}
            onStartDmCall={handleStartDmCall}
            onLeaveVoice={rt.leaveVoice}
            onToggleMute={rt.toggleMute}
            onToggleDeafen={rt.toggleDeafen}
            onToggleCamera={rt.toggleCamera}
            onToggleScreenShare={rt.toggleScreenShare}
            onOpenUserSettings={() => setUserSettingsOpen(true)}
            onOpenProfile={(uid) => setSelectedProfileUid(uid || profile.uid)}
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
        ) : activeServer && activeChannel ? (
          <>
            {activeChannel.type === 'voice' ? (
              <VoiceStage
                channelName={activeChannel.name}
                isJoined={rt.activeVoiceRoomKey === `server:${activeServer.id}:${activeChannel.id}`}
                currentUid={profile.uid}
                participants={
                  rt.activeVoiceRoomKey === `server:${activeServer.id}:${activeChannel.id}`
                    ? rt.roomParticipants
                    : rt.serverVoiceChannels[activeChannel.id] || []
                }
                localStream={rt.localStream}
                remoteStreams={rt.remoteStreams}
                muted={rt.muted}
                deafened={rt.deafened}
                cameraOn={rt.cameraOn}
                screenSharing={rt.screenSharing}
                voiceError={rt.voiceError}
                onJoin={() =>
                  rt.joinVoice(
                    `server:${activeServer.id}:${activeChannel.id}`,
                    `${activeChannel.name} / ${activeServer.name}`,
                    false
                  )
                }
                onLeave={rt.leaveVoice}
                onToggleMute={rt.toggleMute}
                onToggleDeafen={rt.toggleDeafen}
                onToggleCamera={rt.toggleCamera}
                onToggleScreenShare={rt.toggleScreenShare}
              />
            ) : (
              <ChatArea
                mode="channel"
                title={activeChannel.name}
                subtitle={activeChannel.topic}
                channelType={activeChannel.type}
                channelKey={`server:${activeServer.id}:${activeChannel.id}`}
                messages={channelMessages}
                currentUid={profile.uid}
                canModerate={canModerate}
                canPin={canModerate}
                showMemberList={showMemberList}
                showTypingIndicator={profile.showTypingIndicator ?? true}
                onToggleMemberList={() => setShowMemberList((s) => !s)}
                typingUsers={rt.typingUsers}
                onTyping={rt.sendTyping}
                onSendMessage={(payload) =>
                  sendChannelMessage(
                    activeServer.id,
                    activeChannel.id,
                    `#${activeChannel.name}`,
                    profile,
                    myMemberRecord?.roleColor || '#DBDEE1',
                    payload
                  )
                }
                onEditMessage={(msgId, content) =>
                  editChannelMessage(activeServer.id, activeChannel.id, msgId, content)
                }
                onDeleteMessage={(msgId) =>
                  deleteChannelMessage(activeServer.id, activeChannel.id, msgId)
                }
                onToggleReaction={(msg, emoji) =>
                  toggleChannelReaction(activeServer.id, activeChannel.id, msg, emoji, profile.uid)
                }
                onTogglePin={(msg) =>
                  togglePinMessage(activeServer.id, activeChannel.id, msg.id, !msg.pinned)
                }
                onBookmark={(msg) =>
                  addBookmark(profile.uid, msg, `${activeServer.name} / #${activeChannel.name}`)
                }
                onAuthorClick={(uid) => setSelectedProfileUid(uid)}
              />
            )}

            {showMemberList && (
              <MemberList
                members={members}
                currentUid={profile.uid}
                onlineUsers={rt.onlineUsers}
                onSelectMemberUid={(uid) => setSelectedProfileUid(uid)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 bg-[var(--bg-surface)] flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-sm">
              <h2 className="font-display text-xl font-bold text-white">Sunucu Yükleniyor</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Kanal listesi getiriliyor veya bu sunucuda henüz kanal yok.
              </p>
              <button
                onClick={() => setCreateServerOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#5865F2] text-white text-sm font-medium cursor-pointer"
              >
                Yeni Sunucu Oluştur
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Incoming Call Toast */}
      {rt.incomingCall && (
        <div className="fixed top-5 right-5 z-50 w-80 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar src={rt.incomingCall.fromAvatar} name={rt.incomingCall.fromName} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{rt.incomingCall.fromName}</p>
                <p className="text-xs text-[#23A55A]">
                  {rt.incomingCall.video ? 'Görüntülü arama...' : 'Sesli arama...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => rt.declineCall(rt.incomingCall!.fromUid)}
              className="text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const call = rt.incomingCall!;
                rt.setIncomingCall(null);
                const threadId = call.roomKey.replace(/^dm:/, '');
                setActiveView('home');
                setActiveDmThreadId(threadId);
                rt.joinVoice(call.roomKey, `${call.fromName} ile Arama`, call.video);
              }}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-medium cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Kabul Et</span>
            </button>
            <button
              onClick={() => rt.declineCall(rt.incomingCall!.fromUid)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#DA373C] hover:bg-[#B8282D] text-white text-xs font-medium cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Reddet</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedProfileUid && (
        <ProfileModal
          targetUid={selectedProfileUid}
          currentProfile={profile}
          fallbackMember={
            selectedServerMember
              ? {
                  displayName: selectedServerMember.displayName,
                  username: selectedServerMember.username,
                  avatarUrl: selectedServerMember.avatarUrl,
                  role: selectedServerMember.role,
                  roleLabel: ROLE_LABELS[selectedServerMember.role],
                  roleColor: selectedServerMember.roleColor,
                }
              : undefined
          }
          moderation={
            activeServer && selectedServerMember
              ? {
                  canManageRoles,
                  onChangeRole: (role) => updateMemberRole(activeServer.id, selectedServerMember, role),
                  onKick: () => kickMember(activeServer, selectedServerMember.uid),
                }
              : undefined
          }
          friendsCount={acceptedFriendsCount}
          onClose={() => setSelectedProfileUid(null)}
          onEditOwnProfile={() => setUserSettingsOpen(true)}
          onOpenShop={() => setShopTab('shop')}
          onStartDm={(user) => handleOpenDmWithUser(user)}
          onAddFriend={(uid) => sendFriendRequestByUid(profile, uid)}
        />
      )}

      {shopTab && (
        <ShopAndQuestsModal
          profile={profile}
          initialTab={shopTab}
          serversCount={memberships.length}
          friendsCount={acceptedFriendsCount}
          onClose={() => setShopTab(null)}
        />
      )}

      {notificationsOpen && (
        <NotificationsModal
          profile={profile}
          incomingRequests={incomingFriendRequests}
          notifications={notifications}
          bookmarks={bookmarks}
          onAcceptFriend={acceptFriendRequest}
          onDeclineFriend={removeFriendOrRequest}
          onClose={() => setNotificationsOpen(false)}
        />
      )}

      {createServerOpen && (
        <CreateServerModal
          onClose={() => setCreateServerOpen(false)}
          onCreate={async (input) => {
            const { serverId, firstChannelId } = await createServer(profile, input);
            setActiveView('server');
            setActiveServerId(serverId);
            setActiveChannelId(firstChannelId);
          }}
        />
      )}

      {exploreOpen && (
        <ExploreJoinModal
          joinedServerIds={memberships.map((m) => m.serverId)}
          onClose={() => setExploreOpen(false)}
          onJoinByCode={async (code) => {
            const srv = await joinServerByCode(profile, code);
            setActiveView('server');
            setActiveServerId(srv.id);
            setActiveChannelId(null);
          }}
          onJoinPublic={async (srv) => {
            await joinServer(profile, srv);
            setActiveView('server');
            setActiveServerId(srv.id);
            setActiveChannelId(null);
          }}
        />
      )}

      {inviteOpen && activeServer && (
        <InviteModal server={activeServer} onClose={() => setInviteOpen(false)} />
      )}

      {createChannelType && activeServer && (
        <CreateChannelModal
          defaultType={createChannelType}
          onClose={() => setCreateChannelType(null)}
          onCreate={async (input) => {
            const chId = await createChannel(activeServer.id, {
              ...input,
              position: channels.length,
            });
            setActiveChannelId(chId);
          }}
        />
      )}

      {serverSettingsOpen && activeServer && (
        <ServerSettingsModal
          server={activeServer}
          members={members}
          myRole={myRole}
          onClose={() => setServerSettingsOpen(false)}
          onSave={(updates) => updateServerSettings(activeServer.id, updates)}
          onChangeRole={(m, r) => updateMemberRole(activeServer.id, m, r)}
          onKick={(m) => kickMember(activeServer, m.uid)}
          onDeleteServer={async () => {
            await deleteServer(profile.uid, activeServer.id);
            setActiveView('home');
            setActiveServerId(null);
          }}
        />
      )}

      {userSettingsOpen && (
        <UserSettingsModal
          profile={profile}
          unreadNotificationsCount={unreadNotificationsCount}
          onClose={() => setUserSettingsOpen(false)}
          onOpenShop={(tab) => setShopTab(tab)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onSave={(updates) => updateUserProfile(profile.uid, profile.username, updates)}
          onSignOut={async () => {
            rt.leaveVoice();
            await signOut(auth);
            setUserSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HalkaApp />
    </ErrorBoundary>
  );
}
