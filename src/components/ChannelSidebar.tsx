import React, { useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Gamepad2,
  Hash,
  Headphones,
  LogOut,
  Megaphone,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Plus,
  Settings,
  Smile,
  Trash2,
  UserPlus,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type {
  ChannelDoc,
  MemberRole,
  PublicProfile,
  ServerDoc,
  UserActivity,
  UserStatus,
  VoiceParticipant,
} from '../types/halka';
import { ACTIVITY_LABELS, ACTIVITY_PRESETS } from '../lib/cosmetics';
import { Avatar, ClanTagBadge } from './Avatar';

const STATUS_OPTIONS: Array<{ id: UserStatus; label: string; color: string }> = [
  { id: 'online', label: 'Çevrimiçi', color: '#23A55A' },
  { id: 'idle', label: 'Boşta', color: '#F0B232' },
  { id: 'dnd', label: 'Rahatsız Etmeyin', color: '#F23F43' },
  { id: 'offline', label: 'Görünmez', color: '#80848E' },
];

interface ChannelSidebarProps {
  server: ServerDoc;
  channels: ChannelDoc[];
  activeChannelId: string | null;
  myRole: MemberRole;
  profile: PublicProfile;
  voiceChannelsState: Record<string, VoiceParticipant[]>;
  activeVoiceRoomKey: string | null;
  activeVoiceLabel: string;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  wsConnected: boolean;
  unreadNotificationsCount?: number;
  unreadChannelIds?: Set<string>;
  onSelectChannel: (channel: ChannelDoc) => void;
  onJoinVoiceChannel: (channel: ChannelDoc) => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onOpenInvite: () => void;
  onOpenCreateChannel: (defaultType?: 'text' | 'voice') => void;
  onOpenServerSettings: (initialTab?: 'general' | 'members' | 'bots' | 'emojis' | 'bans' | 'audit' | 'boost') => void;
  onOpenBoost?: () => void;
  onQuickStatusUpdate?: (updates: { status?: UserStatus; activity?: UserActivity }) => Promise<void>;
  onOpenUserSettings: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onLeaveServer: () => void;
  onDeleteChannel: (channelId: string) => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  server,
  channels,
  activeChannelId,
  myRole,
  profile,
  voiceChannelsState,
  activeVoiceRoomKey,
  activeVoiceLabel,
  muted,
  deafened,
  cameraOn,
  screenSharing,
  wsConnected,
  unreadNotificationsCount = 0,
  unreadChannelIds,
  onSelectChannel,
  onJoinVoiceChannel,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
  onOpenInvite,
  onOpenCreateChannel,
  onOpenServerSettings,
  onOpenBoost,
  onQuickStatusUpdate,
  onOpenUserSettings,
  onOpenProfile,
  onOpenNotifications,
  onLeaveServer,
  onDeleteChannel,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const canManageChannels = myRole === 'owner' || myRole === 'admin' || myRole === 'moderator';
  const canManageServer = myRole === 'owner' || myRole === 'admin';
  const boostCount = server.boostCount || 0;
  const boostLevel = boostCount >= 6 ? 3 : boostCount >= 3 ? 2 : boostCount >= 1 ? 1 : 0;

  const grouped = useMemo(() => {
    const map = new Map<string, ChannelDoc[]>();
    for (const ch of channels) {
      const cat = ch.category || 'KANALLAR';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(ch);
    }
    return Array.from(map.entries());
  }, [channels]);

  const toggleCategory = (cat: string) => {
    setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <aside className="w-[240px] h-full min-h-0 shrink-0 bg-[var(--bg-sidebar)] flex flex-col border-r border-[var(--border-subtle)] select-none">
      {/* Server Header */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full h-12 px-4 flex items-center justify-between border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {boostLevel > 0 && (
              <span
                title={`Takviye Seviye ${boostLevel} (${boostCount} takviye)`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/40 text-[10px] font-bold text-fuchsia-300 shrink-0"
              >
                <Zap className="w-2.5 h-2.5" />
                {boostCount}
              </span>
            )}
            <span className="font-display font-semibold text-[15px] text-white truncate">
              {server.name}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-2.5 right-2.5 top-13 z-30 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1.5 shadow-xl space-y-0.5 text-sm">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenInvite();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[#949CF7] hover:bg-[#5865F2] hover:text-white transition-colors cursor-pointer"
              >
                <span>İnsanları Davet Et</span>
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (onOpenBoost) onOpenBoost();
                  else onOpenServerSettings('boost');
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-fuchsia-300 hover:bg-fuchsia-500 hover:text-white transition-colors cursor-pointer"
              >
                <span>Sunucu Takviyesi</span>
                <Zap className="w-4 h-4" />
              </button>
              {canManageChannels && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCreateChannel('text');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[#5865F2] hover:text-white transition-colors cursor-pointer"
                >
                  <span>Kanal Oluştur</span>
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {canManageServer && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenServerSettings('general');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[#5865F2] hover:text-white transition-colors cursor-pointer"
                >
                  <span>Sunucu Ayarları</span>
                  <Settings className="w-4 h-4" />
                </button>
              )}
              {canManageChannels && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenServerSettings('emojis');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[#5865F2] hover:text-white transition-colors cursor-pointer"
                >
                  <span>Özel Emojiler</span>
                  <Smile className="w-4 h-4" />
                </button>
              )}
              {myRole !== 'owner' && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLeaveServer();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                >
                  <span>Sunucudan Ayrıl</span>
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {grouped.map(([category, list]) => {
          const isCollapsed = collapsedCats[category];
          return (
            <div key={category} className="space-y-0.5">
              <div className="flex items-center justify-between px-1 py-1 group">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-[var(--text-muted)] hover:text-white uppercase cursor-pointer truncate"
                >
                  {isCollapsed ? <ChevronRight className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
                  <span className="truncate">{category}</span>
                </button>
                {canManageChannels && (
                  <button
                    onClick={() => onOpenCreateChannel(category.includes('SES') ? 'voice' : 'text')}
                    title="Kanal Oluştur"
                    className="text-[var(--text-muted)] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!isCollapsed &&
                list.map((ch) => {
                  const isActive = activeChannelId === ch.id;
                  const isUnread = ch.type !== 'voice' && !isActive && Boolean(unreadChannelIds?.has(ch.id));
                  const roomKey = `server:${server.id}:${ch.id}`;
                  const voiceMembers = ch.type === 'voice' ? voiceChannelsState[ch.id] || [] : [];
                  const isJoinedHere = activeVoiceRoomKey === roomKey;

                  return (
                    <div key={ch.id} className="space-y-0.5 relative">
                      {isUnread && (
                        <span
                          aria-label="Okunmamış mesajlar"
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-2.5 rounded-r-full bg-white"
                        />
                      )}
                      <div
                        className={`group flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
                          isActive || isJoinedHere
                            ? 'bg-[var(--bg-elevated)] text-white'
                            : isUnread
                            ? 'text-white hover:bg-[var(--bg-hover)]'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-white'
                        }`}
                      >
                        <button
                          onClick={() => {
                            if (ch.type === 'voice') {
                              onJoinVoiceChannel(ch);
                              onSelectChannel(ch);
                            } else {
                              onSelectChannel(ch);
                            }
                          }}
                          className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                        >
                          {ch.type === 'voice' ? (
                            <Volume2 className={`w-4 h-4 shrink-0 ${isJoinedHere ? 'text-[#23A55A]' : 'text-[var(--text-muted)]'}`} />
                          ) : ch.type === 'announcement' ? (
                            <Megaphone className={`w-4 h-4 shrink-0 ${isUnread ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                          ) : (
                            <Hash className={`w-4 h-4 shrink-0 ${isUnread ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                          )}
                          <span className={`text-[14px] truncate ${isUnread ? 'font-semibold text-white' : 'font-medium'}`}>
                            {ch.name}
                          </span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ml-auto" />
                          )}
                          {ch.nsfw && (
                            <span className="px-1 py-0.2 rounded bg-rose-500/20 text-[9px] font-bold text-rose-300 shrink-0">
                              +18
                            </span>
                          )}
                          {(ch.slowmodeSeconds || 0) > 0 && (
                            <Clock
                              className="w-3 h-3 text-amber-400 shrink-0"
                              aria-label={`Yavaş mod ${ch.slowmodeSeconds}s`}
                            />
                          )}
                        </button>

                        {canManageChannels && channels.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChannel(ch.id);
                            }}
                            title="Kanalı Sil"
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-400 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Voice Participants nested under voice channel */}
                      {ch.type === 'voice' && voiceMembers.length > 0 && (
                        <div className="pl-6 pr-1 py-0.5 space-y-1">
                          {voiceMembers.map((vp) => (
                            <div
                              key={vp.uid}
                              className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar
                                  src={vp.avatarUrl}
                                  name={vp.displayName}
                                  size="xs"
                                  speaking={vp.speaking}
                                />
                                <span className="truncate">{vp.displayName}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-[var(--text-muted)]">
                                {vp.screenSharing && <Monitor className="w-3 h-3 text-[#23A55A]" />}
                                {vp.cameraOn && <Video className="w-3 h-3 text-[#23A55A]" />}
                                {vp.deafened ? (
                                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                                ) : vp.muted ? (
                                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Active Voice Connection Panel */}
      {activeVoiceRoomKey && (
        <div className="px-2.5 py-2 bg-[var(--bg-rail)] border-t border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#23A55A]">
                <span className={`w-2 h-2 rounded-full ${wsConnected || activeVoiceRoomKey ? 'bg-[#23A55A]' : 'bg-amber-400'}`} />
                <span>Ses Bağlantısı Kuruldu</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">{activeVoiceLabel}</p>
            </div>
            <button
              onClick={onLeaveVoice}
              title="Bağlantıyı Kes"
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-rose-500/20 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onToggleCamera}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                cameraOn ? 'bg-[#23A55A] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Kamera</span>
            </button>
            <button
              onClick={onToggleScreenShare}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                screenSharing ? 'bg-[#23A55A] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Ekran</span>
            </button>
          </div>
        </div>
      )}

      {/* User Control Dock */}
      <div className="relative h-[56px] px-2 bg-[var(--bg-rail)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
        {statusMenuOpen && onQuickStatusUpdate && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setStatusMenuOpen(false)} />
            <div className="absolute left-2 right-2 bottom-15 z-30 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-2.5 shadow-2xl space-y-2.5">
              <div className="space-y-1">
                <p className="px-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Çevrimiçi Durumu
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        void onQuickStatusUpdate({ status: st.id });
                        setStatusMenuOpen(false);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer ${
                        profile.status === st.id
                          ? 'bg-[#5865F2]/25 text-white border border-[#5865F2]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      <span className="truncate">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between px-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3 text-[#23A55A]" />
                    Hızlı Etkinlik
                  </p>
                  {profile.activity?.name && (
                    <button
                      type="button"
                      onClick={() => {
                        void onQuickStatusUpdate({ activity: { type: 'playing', name: '', details: '' } });
                        setStatusMenuOpen(false);
                      }}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Temizle
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {ACTIVITY_PRESETS.slice(0, 6).map((act) => {
                    const active = profile.activity?.name === act.name;
                    return (
                      <button
                        key={act.name}
                        type="button"
                        onClick={() => {
                          void onQuickStatusUpdate({ activity: act });
                          setStatusMenuOpen(false);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer ${
                          active
                            ? 'bg-[#23A55A] text-white'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        {act.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            onClick={() => (onOpenProfile ? onOpenProfile() : onOpenUserSettings())}
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

          {onQuickStatusUpdate && (
            <button
              type="button"
              onClick={() => setStatusMenuOpen((o) => !o)}
              title="Hızlı Durum & Etkinlik"
              className={`p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-white cursor-pointer shrink-0 ${
                statusMenuOpen ? 'text-white bg-[var(--bg-hover)]' : ''
              }`}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center shrink-0">
          {onOpenNotifications && (
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
          )}
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
  );
};
