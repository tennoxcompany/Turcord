import React, { useState } from 'react';
import {
  Award,
  Check,
  Crown,
  Flower2,
  Gem,
  Image as ImageIcon,
  Layers,
  Shield,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import type {
  AvatarDecorationId,
  NameplateId,
  ProfileEffectId,
  PublicProfile,
} from '../types/halka';
import {
  ANIMATED_BANNERS,
  AVATAR_DECORATIONS,
  CLAN_TAGS,
  DISCORD_BADGES,
  NAMEPLATES,
  PROFILE_EFFECTS,
  type CosmeticCategory,
} from '../lib/cosmetics';
import { syncUserVisualsToServers, updateUserPreferences } from '../lib/halkaService';
import { Avatar, ClanTagBadge } from './Avatar';
import { BadgesStrip, ProfileBanner, ProfileEffectOverlay } from './ProfileEffects';

interface ShopAndQuestsModalProps {
  profile: PublicProfile;
  initialTab?: 'shop' | 'quests';
  serversCount: number;
  friendsCount: number;
  joinedServerIds?: string[];
  onClose: () => void;
}

type ShopCategory = 'frames' | 'effects' | 'banners' | 'badges';
type SubFilter = 'Tümü' | CosmeticCategory;

export const ShopAndQuestsModal: React.FC<ShopAndQuestsModalProps> = ({
  profile,
  initialTab = 'shop',
  serversCount,
  friendsCount,
  joinedServerIds = [],
  onClose,
}) => {
  const [tab, setTab] = useState<'shop' | 'quests'>(initialTab);
  const [shopCat, setShopCat] = useState<ShopCategory>('frames');
  const [subFilter, setSubFilter] = useState<SubFilter>('Tümü');
  const [saving, setSaving] = useState(false);
  const [customTag, setCustomTag] = useState(profile.clanTag || '');

  const orbs = profile.orbsBalance ?? 1500;
  const unlocked = new Set(profile.unlockedCosmetics || []);
  const claimedSet = new Set(profile.claimedQuests || []);
  const activeDeco = profile.avatarDecoration || 'none';
  const activeEffect = profile.profileEffect || 'none';
  const activeNameplate = profile.nameplate || 'none';
  const activeBanner = profile.bannerColor || '#5865F2';
  const currentBadges = profile.badges || ['turcord-pioneer'];

  const unlockAndAward = async (
    itemKey: string,
    cost: number,
    updates: Parameters<typeof updateUserPreferences>[1],
    serverSync?: Parameters<typeof syncUserVisualsToServers>[2]
  ) => {
    if (saving) return;
    const isOwned = cost === 0 || unlocked.has(itemKey);
    if (!isOwned && orbs < cost) return;
    setSaving(true);
    try {
      const nextUnlocked = isOwned
        ? Array.from(unlocked)
        : Array.from(new Set([...unlocked, itemKey])).slice(0, 60);
      const nextBadges =
        cost > 0
          ? Array.from(new Set([...currentBadges, 'nitro-orb']))
          : currentBadges;
      const nextOrbs = isOwned ? orbs : Math.max(0, orbs - cost);

      await updateUserPreferences(profile.uid, {
        ...updates,
        unlockedCosmetics: nextUnlocked,
        badges: nextBadges,
        orbsBalance: nextOrbs,
      });

      if (serverSync && joinedServerIds.length > 0) {
        await syncUserVisualsToServers(profile.uid, joinedServerIds, serverSync);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetClanTag = async (tag: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const clean = tag.trim().toUpperCase().slice(0, 8);
      await updateUserPreferences(profile.uid, { clanTag: clean });
      if (joinedServerIds.length > 0) {
        await syncUserVisualsToServers(profile.uid, joinedServerIds, { clanTag: clean });
      }
      setCustomTag(clean);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectHouse = async (houseId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const filtered = currentBadges.filter((b) => !b.startsWith('hypesquad-'));
      await updateUserPreferences(profile.uid, {
        badges: [...filtered, houseId].slice(0, 12),
      });
    } finally {
      setSaving(false);
    }
  };

  const todayKey = `q_daily_${new Date().toISOString().slice(0, 10)}`;
  const quests = [
    {
      id: 'q_daily',
      title: 'Günlük Giriş Ödülü',
      desc: 'Her gün Turcord Mağaza üzerinden ücretsiz Orbs al.',
      reward: 200,
      done: true,
      claimKey: todayKey,
    },
    {
      id: 'q_profile',
      title: 'Profilini Özelleştir',
      desc: 'Biyografi, zamirler veya özel durum ekleyerek kendini tanıt.',
      reward: 250,
      done: Boolean(profile.bio || profile.customStatus || profile.pronouns),
      claimKey: 'q_profile',
    },
    {
      id: 'q_server',
      title: 'Topluluğa Katıl',
      desc: 'En az bir sunucuya katıl veya kendi sunucunu oluştur.',
      reward: 350,
      done: serversCount > 0,
      claimKey: 'q_server',
    },
    {
      id: 'q_friend',
      title: 'Arkadaş Çevreni Genişlet',
      desc: 'En az 1 arkadaş ekleyerek DM ve sesli arama başlat.',
      reward: 300,
      done: friendsCount > 0,
      claimKey: 'q_friend',
    },
    {
      id: 'q_avatar_deco',
      title: 'Hareketli Tarz',
      desc: 'Bir avatar çerçevesi, profil efekti veya isimlik kuşan.',
      reward: 400,
      done: activeDeco !== 'none' || activeEffect !== 'none' || activeNameplate !== 'none',
      claimKey: 'q_avatar_deco',
    },
    {
      id: 'q_activity',
      title: 'Etkinlik Paylaşımı',
      desc: 'Oynuyor/Dinliyor etkinlik durumu veya bağlantı hesabı ekle.',
      reward: 300,
      done: Boolean(profile.activity?.name || (profile.connections && profile.connections.length > 0)),
      claimKey: 'q_activity',
    },
  ];

  const handleClaimQuest = async (claimKey: string, reward: number) => {
    if (claimedSet.has(claimKey) || saving) return;
    setSaving(true);
    try {
      const nextClaimed = Array.from(new Set([...claimedSet, claimKey])).slice(-30);
      const completedCount = nextClaimed.length;
      const nextBadges =
        completedCount >= 3
          ? Array.from(new Set([...currentBadges, 'early-supporter']))
          : currentBadges;
      await updateUserPreferences(profile.uid, {
        orbsBalance: orbs + reward,
        claimedQuests: nextClaimed,
        badges: nextBadges,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredDecorations =
    subFilter === 'Tümü'
      ? AVATAR_DECORATIONS
      : AVATAR_DECORATIONS.filter((d) => d.category === subFilter);

  const filteredEffects =
    subFilter === 'Tümü'
      ? PROFILE_EFFECTS
      : PROFILE_EFFECTS.filter((e) => e.category === subFilter);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-lg font-bold text-white">
              {tab === 'shop' ? 'Nitro & Kozmetik Mağazası' : 'Orbs Görevleri'}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1">
              <button
                onClick={() => setTab('shop')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  tab === 'shop' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Mağaza
              </button>
              <button
                onClick={() => setTab('quests')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  tab === 'quests' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Görevler
              </button>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold text-white tabular-nums">
              <Gem className="w-4 h-4 text-[#A855F7]" />
              <span>{orbs}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {tab === 'shop' ? (
            <>
              {/* Live Interactive Preview Card */}
              <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <ProfileEffectOverlay effect={activeEffect} />
                <ProfileBanner bannerColor={activeBanner} bannerUrl={profile.bannerUrl} className="h-20" />
                <div className="px-5 pb-4 -mt-9 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="flex items-end gap-4">
                    <Avatar
                      src={profile.avatarUrl}
                      name={profile.displayName}
                      size="xl"
                      decoration={activeDeco}
                      status={profile.status}
                      showStatus
                      ringBg="var(--bg-card)"
                    />
                    <div className="pb-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-lg font-bold text-white">
                          {profile.displayName}
                        </span>
                        <ClanTagBadge tag={profile.clanTag} />
                        <BadgesStrip badges={currentBadges} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Canlı Önizleme · Güllü, anime &amp; kozmik efektleri deneyip Orbs ile aç.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shop Category Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'frames', label: 'Çerçeveler', icon: Flower2 },
                  { id: 'effects', label: 'Profil Efektleri', icon: Sparkles },
                  { id: 'banners', label: 'Banner & İsimlik', icon: ImageIcon },
                  { id: 'badges', label: 'Klan & Rozet', icon: Shield },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setShopCat(c.id as ShopCategory)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                        shopCat === c.id
                          ? 'bg-[#5865F2] border-[#5865F2] text-white'
                          : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-filter for Frames & Effects */}
              {(shopCat === 'frames' || shopCat === 'effects') && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['Tümü', 'Güllü & Doğa', 'Anime & Oyun', 'Kozmik & Neon'] as SubFilter[]).map(
                    (f) => (
                      <button
                        key={f}
                        onClick={() => setSubFilter(f)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
                          subFilter === f
                            ? 'bg-white text-black'
                            : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    )
                  )}
                </div>
              )}

              {/* FRAMES TAB */}
              {shopCat === 'frames' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* None option */}
                  <div
                    className={`p-4 rounded-2xl bg-[var(--bg-card)] border flex flex-col items-center text-center gap-3 ${
                      activeDeco === 'none' ? 'border-[#5865F2]' : 'border-[var(--border-subtle)]'
                    }`}
                  >
                    <Avatar src={profile.avatarUrl} name={profile.displayName} size="lg" decoration="none" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Çerçevesiz</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Sade klasik avatar</p>
                    </div>
                    <button
                      onClick={() =>
                        unlockAndAward(
                          'deco:none',
                          0,
                          { avatarDecoration: 'none' },
                          { avatarDecoration: 'none' }
                        )
                      }
                      disabled={activeDeco === 'none' || saving}
                      className={`w-full py-2 rounded-xl text-xs font-medium cursor-pointer ${
                        activeDeco === 'none'
                          ? 'bg-[#23A55A]/20 text-[#23A55A]'
                          : 'bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white'
                      }`}
                    >
                      {activeDeco === 'none' ? 'Kuşanıldı' : 'Çıkar'}
                    </button>
                  </div>

                  {filteredDecorations.map((item) => {
                    const key = `deco:${item.id}`;
                    const owned = unlocked.has(key);
                    const equipped = activeDeco === item.id;
                    const canAfford = owned || orbs >= item.cost;
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl bg-[var(--bg-card)] border flex flex-col items-center text-center gap-3 ${
                          equipped ? 'border-[#5865F2]' : 'border-[var(--border-subtle)]'
                        }`}
                      >
                        <div className="pt-1">
                          <Avatar
                            src={profile.avatarUrl}
                            name={profile.displayName}
                            size="lg"
                            decoration={item.id as AvatarDecorationId}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <p className="text-sm font-semibold text-white">{item.name}</p>
                            {item.animated && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#A855F7]/20 text-[#D8B4FE]">
                                HAREKETLİ
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          onClick={() =>
                            unlockAndAward(
                              key,
                              item.cost,
                              { avatarDecoration: item.id },
                              { avatarDecoration: item.id }
                            )
                          }
                          disabled={equipped || !canAfford || saving}
                          className={`w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            equipped
                              ? 'bg-[#23A55A]/20 text-[#23A55A]'
                              : owned
                              ? 'bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white'
                              : canAfford
                              ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Kuşanıldı</span>
                            </>
                          ) : owned ? (
                            <span>Kuşan</span>
                          ) : (
                            <>
                              <Gem className="w-3.5 h-3.5" />
                              <span className="tabular-nums">{item.cost} Orbs</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PROFILE EFFECTS TAB */}
              {shopCat === 'effects' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={`p-4 rounded-2xl bg-[var(--bg-card)] border flex items-center justify-between gap-3 ${
                      activeEffect === 'none' ? 'border-[#5865F2]' : 'border-[var(--border-subtle)]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">Efekt Yok</p>
                      <p className="text-xs text-[var(--text-muted)]">Profil kartında partikül gösterme</p>
                    </div>
                    <button
                      onClick={() =>
                        unlockAndAward('fx:none', 0, { profileEffect: 'none' })
                      }
                      disabled={activeEffect === 'none' || saving}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                        activeEffect === 'none'
                          ? 'bg-[#23A55A]/20 text-[#23A55A]'
                          : 'bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white'
                      }`}
                    >
                      {activeEffect === 'none' ? 'Aktif' : 'Kapat'}
                    </button>
                  </div>

                  {filteredEffects.map((fx) => {
                    const key = `fx:${fx.id}`;
                    const owned = unlocked.has(key);
                    const equipped = activeEffect === fx.id;
                    const canAfford = owned || orbs >= fx.cost;
                    return (
                      <div
                        key={fx.id}
                        className={`relative overflow-hidden p-4 rounded-2xl bg-[var(--bg-card)] border flex flex-col justify-between gap-3 ${
                          equipped ? 'border-[#5865F2]' : 'border-[var(--border-subtle)]'
                        }`}
                      >
                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{fx.name}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{fx.desc}</p>
                          </div>
                          <span
                            style={{ backgroundColor: `${fx.accent}25`, color: fx.accent }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                          >
                            {fx.category.split(' ')[0]}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            unlockAndAward(key, fx.cost, {
                              profileEffect: fx.id as ProfileEffectId,
                            })
                          }
                          disabled={equipped || !canAfford || saving}
                          className={`relative z-10 w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                            equipped
                              ? 'bg-[#23A55A]/20 text-[#23A55A]'
                              : owned
                              ? 'bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white'
                              : canAfford
                              ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {equipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Kuşanıldı</span>
                            </>
                          ) : owned ? (
                            <span>Uygula</span>
                          ) : (
                            <>
                              <Gem className="w-3.5 h-3.5" />
                              <span>{fx.cost} Orbs</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BANNERS & NAMEPLATES TAB */}
              {shopCat === 'banners' && (
                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#EC4899]" />
                      <span>Hareketli Profil Bannerları</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {ANIMATED_BANNERS.map((b) => {
                        const key = `banner:${b.id}`;
                        const owned = unlocked.has(key);
                        const equipped = activeBanner === b.id;
                        const canAfford = owned || orbs >= b.cost;
                        return (
                          <div
                            key={b.id}
                            className={`rounded-2xl overflow-hidden bg-[var(--bg-card)] border ${
                              equipped ? 'border-[#5865F2]' : 'border-[var(--border-subtle)]'
                            }`}
                          >
                            <div className={`h-16 ${b.className}`} />
                            <div className="p-3 space-y-2">
                              <p className="text-xs font-semibold text-white">{b.name}</p>
                              <button
                                onClick={() =>
                                  unlockAndAward(key, b.cost, { bannerColor: b.id })
                                }
                                disabled={equipped || !canAfford || saving}
                                className={`w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer ${
                                  equipped
                                    ? 'bg-[#23A55A]/20 text-[#23A55A]'
                                    : owned
                                    ? 'bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white'
                                    : canAfford
                                    ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-60'
                                }`}
                              >
                                {equipped ? 'Aktif' : owned ? 'Kullan' : `${b.cost} Orbs`}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#22D3EE]" />
                      <span>Üye Listesi İsimlikleri (Nameplates)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {NAMEPLATES.map((np) => {
                        const key = `np:${np.id}`;
                        const owned = np.cost === 0 || unlocked.has(key);
                        const equipped = activeNameplate === np.id;
                        const canAfford = owned || orbs >= np.cost;
                        return (
                          <div
                            key={np.id}
                            className={`p-3 rounded-2xl bg-[var(--bg-card)] border flex items-center justify-between gap-3 ${
                              equipped ? 'border-[#5865F2]' : 'border-[var(--border-subtle)]'
                            }`}
                          >
                            <div className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl ${np.className}`}>
                              <p className="text-xs font-semibold text-white truncate">{np.name}</p>
                              <p className="text-[11px] text-[var(--text-muted)] truncate">{np.desc}</p>
                            </div>
                            <button
                              onClick={() =>
                                unlockAndAward(
                                  key,
                                  np.cost,
                                  { nameplate: np.id as NameplateId },
                                  { nameplate: np.id as NameplateId }
                                )
                              }
                              disabled={equipped || !canAfford || saving}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer ${
                                equipped
                                  ? 'bg-[#23A55A]/20 text-[#23A55A]'
                                  : owned
                                  ? 'bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white'
                                  : canAfford
                                  ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-60'
                              }`}
                            >
                              {equipped ? 'Aktif' : owned ? 'Seç' : `${np.cost} Orbs`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CLAN TAG & HYPESQUAD BADGES TAB */}
              {shopCat === 'badges' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#5865F2]" />
                      <span>Klan Etiketi (Ücretsiz)</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {CLAN_TAGS.map((t) => (
                        <button
                          key={t}
                          onClick={() => handleSetClanTag(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider border cursor-pointer ${
                            profile.clanTag === t
                              ? 'bg-[#5865F2] border-[#5865F2] text-white'
                              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="text"
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value.toUpperCase().slice(0, 8))}
                          placeholder="ÖZEL"
                          maxLength={8}
                          className="w-24 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-white font-mono uppercase outline-none"
                        />
                        <button
                          onClick={() => handleSetClanTag(customTag)}
                          className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium cursor-pointer"
                        >
                          Uygula
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-[#F59E0B]" />
                      <span>HypeSquad Hanesi Seç (Ücretsiz Rozet)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {['hypesquad-bravery', 'hypesquad-brilliance', 'hypesquad-balance'].map((hid) => {
                        const def = DISCORD_BADGES[hid];
                        const active = currentBadges.includes(hid);
                        return (
                          <button
                            key={hid}
                            onClick={() => handleSelectHouse(hid)}
                            disabled={saving}
                            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#5865F2]/15 border-[#5865F2]'
                                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{def.emoji}</span>
                              <span className="text-xs font-bold text-white">{def.label}</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)]">{def.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {quests.map((q) => {
                const claimed = claimedSet.has(q.claimKey);
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#5865F2]/15 text-[#5865F2] flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{q.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">{q.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaimQuest(q.claimKey, q.reward)}
                      disabled={!q.done || claimed || saving}
                      className={`px-4 py-2 rounded-xl text-xs font-medium shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        claimed
                          ? 'bg-[#23A55A]/20 text-[#23A55A]'
                          : q.done
                          ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Gem className="w-3.5 h-3.5" />
                      <span className="tabular-nums">
                        {claimed ? 'Alındı' : q.done ? `+${q.reward} Al` : `+${q.reward}`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
