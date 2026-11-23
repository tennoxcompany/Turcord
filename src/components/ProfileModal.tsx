import React, { useEffect, useState } from 'react';
import {
  Award,
  BadgeCheck,
  Calendar,
  ExternalLink,
  Gem,
  MessageSquare,
  Pencil,
  Plus,
  Shield,
  Sparkles,
  StickyNote,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import type { MemberRole, PublicProfile } from '../types/halka';
import { getUserNote, getUserProfileByUid, ROLE_LABELS, saveUserNote } from '../lib/halkaService';
import { isOfficialBotUid, OFFICIAL_BOTS } from '../lib/turcordBots';
import { Avatar, ClanTagBadge, VerifiedBotBadge } from './Avatar';

interface ProfileModalProps {
  targetUid: string;
  currentProfile: PublicProfile;
  fallbackMember?: {
    displayName: string;
    username: string;
    avatarUrl: string;
    role?: MemberRole;
    roleLabel?: string;
    roleColor?: string;
  };
  moderation?: {
    canManageRoles: boolean;
    onChangeRole: (role: Exclude<MemberRole, 'owner'>) => Promise<void>;
    onKick: () => Promise<void>;
  };
  friendsCount?: number;
  onClose: () => void;
  onEditOwnProfile: () => void;
  onOpenShop: () => void;
  onOpenBotDm?: () => void;
  onStartDm?: (user: { uid: string; displayName: string; username: string; avatarUrl: string }) => void;
  onAddFriend?: (uid: string) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  targetUid,
  currentProfile,
  fallbackMember,
  moderation,
  friendsCount = 0,
  onClose,
  onEditOwnProfile,
  onOpenShop,
  onOpenBotDm,
  onStartDm,
  onAddFriend,
}) => {
  const isOfficialBot = isOfficialBotUid(targetUid);
  const isMe = targetUid === currentProfile.uid;
  const [loadedProfile, setLoadedProfile] = useState<PublicProfile | null>(
    isMe ? currentProfile : null
  );
  const [tab, setTab] = useState<'home' | 'activity' | 'wishlist'>('home');
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [friendSent, setFriendSent] = useState(false);

  useEffect(() => {
    if (isOfficialBot) return;
    if (isMe) {
      setLoadedProfile(currentProfile);
    } else {
      getUserProfileByUid(targetUid).then((p) => {
        if (p) setLoadedProfile(p);
      });
    }
    getUserNote(currentProfile.uid, targetUid).then(setNote).catch(() => {});
  }, [targetUid, isMe, isOfficialBot, currentProfile]);

  if (isOfficialBot) {
    const bot = OFFICIAL_BOTS[targetUid];
    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[440px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div style={{ backgroundColor: bot.bannerColor }} className="h-28 relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/45 text-white hover:bg-black/70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-6 overflow-y-auto flex-1">
            <div className="-mt-11 mb-3 flex items-end justify-between gap-3">
              <Avatar
                name={bot.name}
                size="xl"
                status="online"
                showStatus
                ringBg="var(--bg-surface)"
                botId={bot.id}
              />
              <VerifiedBotBadge label="ONAYLI UYGULAMA" />
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-bold text-white leading-tight">{bot.name}</h2>
                <VerifiedBotBadge />
              </div>
              <p className="text-xs text-[var(--text-muted)]">@{bot.username} · {bot.tagline}</p>
            </div>

            {onOpenBotDm && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBotDm();
                }}
                className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer mb-4"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Turcord Resmi Bot DM&apos;ini Aç</span>
              </button>
            )}

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Hakkında</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{bot.description}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2.5">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                  Desteklenen Komutlar
                </p>
                <div className="space-y-2">
                  {bot.commands.map((c) => (
                    <div
                      key={c.cmd}
                      className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                    >
                      <p className="font-mono text-xs font-semibold text-[#8B9BFF]">{c.cmd}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = loadedProfile?.displayName || fallbackMember?.displayName || 'Kullanıcı';
  const username = loadedProfile?.username || fallbackMember?.username || 'user';
  const avatarUrl = loadedProfile?.avatarUrl ?? fallbackMember?.avatarUrl ?? '';
  const bannerColor = loadedProfile?.bannerColor || '#E9D5FF';
  const clanTag = loadedProfile?.clanTag || '';
  const bio = loadedProfile?.bio || '';
  const customStatus = loadedProfile?.customStatus || '';
  const orbs = loadedProfile?.orbsBalance ?? 1500;
  const connections = loadedProfile?.connections || [];
  const decoration = loadedProfile?.avatarDecoration || 'none';

  const memberSince = loadedProfile?.createdAt?.toDate
    ? loadedProfile.createdAt.toDate().toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '2026';

  const handleNoteBlur = async () => {
    await saveUserNote(currentProfile.uid, targetUid, note);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 1600);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Top Banner */}
        <div
          style={{ backgroundColor: bannerColor }}
          className="h-28 relative shrink-0"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/45 text-white hover:bg-black/70 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-5 pb-6 overflow-y-auto flex-1">
          {/* Avatar + Thought Bubble Row */}
          <div className="-mt-11 mb-3 flex items-end gap-3">
            <Avatar
              src={avatarUrl}
              name={displayName}
              size="xl"
              status={loadedProfile?.status || 'online'}
              showStatus
              ringBg="var(--bg-surface)"
              decoration={decoration}
            />
            {(customStatus || isMe) && (
              <button
                type="button"
                onClick={() => isMe && onEditOwnProfile()}
                className="mb-1 px-3 py-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center gap-1.5 max-w-[230px] truncate cursor-pointer hover:border-[#5865F2]"
              >
                {!customStatus && <Plus className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />}
                <span className="truncate italic">
                  {customStatus || 'Durum düşüncesi ekle...'}
                </span>
              </button>
            )}
          </div>

          {/* Name, Username, Clan Tag & Badges */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl font-bold text-white leading-tight">
                {displayName}
              </h2>
              {fallbackMember?.roleLabel && (
                <span
                  style={{ color: fallbackMember.roleColor }}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                >
                  {fallbackMember.roleLabel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--text-muted)]">@{username}</span>
              <ClanTagBadge tag={clanTag} />
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[#5865F2]">
                <Shield className="w-3 h-3 text-[#23A55A]" />
                <Sparkles className="w-3 h-3 text-[#A855F7]" />
                <Award className="w-3 h-3 text-[#F59E0B]" />
              </div>
            </div>
          </div>

          {/* Primary Action Button(s) */}
          {isMe ? (
            <button
              onClick={() => {
                onClose();
                onEditOwnProfile();
              }}
              className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer mb-4"
            >
              <Pencil className="w-4 h-4" />
              <span>Profili Düzenle</span>
            </button>
          ) : (
            <div className="space-y-2.5 mb-4">
              <div className="grid grid-cols-2 gap-2">
                {onStartDm && (
                  <button
                    onClick={() => {
                      onStartDm({ uid: targetUid, displayName, username, avatarUrl });
                      onClose();
                    }}
                    className="py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Mesaj Gönder</span>
                  </button>
                )}
                {onAddFriend && (
                  <button
                    onClick={async () => {
                      await onAddFriend(targetUid);
                      setFriendSent(true);
                    }}
                    disabled={friendSent}
                    className="py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] disabled:opacity-60 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{friendSent ? 'İstek Gönderildi' : 'Arkadaş Ekle'}</span>
                  </button>
                )}
              </div>

              {moderation?.canManageRoles && fallbackMember?.role && fallbackMember.role !== 'owner' && (
                <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Yetki Yönetimi
                  </p>
                  <div className="flex items-center gap-1.5">
                    {(['admin', 'moderator', 'member'] as const).map((role) => (
                      <button
                        key={role}
                        onClick={() => moderation.onChangeRole(role)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          fallbackMember.role === role
                            ? 'bg-[#5865F2] text-white'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      await moderation.onKick();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Sunucudan Çıkar</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Profile Tabs */}
          <div className="flex items-center border-b border-[var(--border-subtle)] mb-4">
            {[
              { id: 'home', label: 'Ana Sayfa' },
              { id: 'activity', label: 'Etkinlik' },
              { id: 'wishlist', label: 'Rozetler & Eşya' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'border-[#5865F2] text-white'
                    : 'border-transparent text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'home' && (
            <div className="space-y-3">
              {/* Orbs Balance Card */}
              {isMe && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenShop();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#5865F2] transition-colors cursor-pointer"
                >
                  <span className="text-sm font-medium text-white">Orbs Bakiyesi</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-sm font-semibold text-white tabular-nums">
                    <Gem className="w-4 h-4 text-[#A855F7]" />
                    {orbs}
                  </span>
                </button>
              )}

              {/* Bio & Member Since */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Biyografi
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {bio || 'Henüz biyografi eklenmemiş.'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">
                    Şu Tarihten Beri Üye
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>{memberSince}</span>
                  </p>
                </div>

                {connections.length > 0 && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                      Bağlantılar
                    </p>
                    <div className="space-y-1.5">
                      {connections.map((c, idx) => (
                        <div
                          key={`${c.platform}-${idx}`}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-semibold text-[#5865F2]">{c.platform}</span>
                            <span className="text-sm font-medium text-white truncate">{c.handle}</span>
                            <BadgeCheck className="w-3.5 h-3.5 text-[#23A55A] shrink-0" />
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isMe && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <span className="text-sm font-medium text-white">Arkadaşlar</span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums">{friendsCount} arkadaş</span>
                </div>
              )}

              {/* Private Note */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5" />
                    <span>Not (sadece sana görünür)</span>
                  </label>
                  {noteSaved && <span className="text-[11px] text-[#23A55A]">Kaydedildi</span>}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Bu kullanıcı hakkında özel bir not ekle..."
                  rows={2}
                  maxLength={500}
                  className="w-full bg-transparent text-xs text-white placeholder-[var(--text-muted)] outline-none resize-none"
                />
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-[#5865F2]" />
              <p className="text-sm font-medium text-white">
                {customStatus || 'Şu an aktif bir oyun veya müzik etkinliği yok'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Özel durum veya bağlantı ekleyerek etkinliğini burada paylaşabilirsin.
              </p>
            </div>
          )}

          {tab === 'wishlist' && (
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                  Aktif Avatar Çerçevesi
                </span>
                <span className="text-xs font-medium text-white">
                  {decoration === 'none' ? 'Yok' : decoration}
                </span>
              </div>
              {isMe && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenShop();
                  }}
                  className="w-full py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Mağazaya Git &amp; Çerçeve Seç
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
