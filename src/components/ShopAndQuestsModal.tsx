import React, { useState } from 'react';
import { Award, Check, Gem, Sparkles, Tag, X } from 'lucide-react';
import type { AvatarDecorationId, PublicProfile } from '../types/halka';
import { updateUserPreferences } from '../lib/halkaService';
import { Avatar, ClanTagBadge } from './Avatar';

interface ShopAndQuestsModalProps {
  profile: PublicProfile;
  initialTab?: 'shop' | 'quests';
  serversCount: number;
  friendsCount: number;
  onClose: () => void;
}

const DECORATIONS: Array<{
  id: AvatarDecorationId;
  name: string;
  desc: string;
  cost: number;
  accent: string;
}> = [
  { id: 'none', name: 'Standart', desc: 'Sade klasik görünüm', cost: 0, accent: '#80848E' },
  { id: 'cyber-ring', name: 'Siber Halka', desc: 'Parlak camgöbeği neon çerçeve', cost: 250, accent: '#38BDF8' },
  { id: 'emerald-flame', name: 'Zümrüt Alev', desc: 'Canlı yeşil enerji halkası', cost: 350, accent: '#23A55A' },
  { id: 'crimson-pulse', name: 'Kızıl Nabız', desc: 'Güçlü kırmızı arena çerçevesi', cost: 400, accent: '#F23F43' },
  { id: 'gold-halo', name: 'Altın Hale', desc: 'Efsanevi altın topluluk tacı', cost: 600, accent: '#F59E0B' },
  { id: 'aurora-orbit', name: 'Kutup Işığı', desc: 'Mor aurora ışık yörüngesi', cost: 750, accent: '#A855F7' },
];

const CLAN_TAGS = ['TR', 'CİX', 'DEV', 'GG', 'PRO', 'HALKA'];

export const ShopAndQuestsModal: React.FC<ShopAndQuestsModalProps> = ({
  profile,
  initialTab = 'shop',
  serversCount,
  friendsCount,
  onClose,
}) => {
  const [tab, setTab] = useState<'shop' | 'quests'>(initialTab);
  const [saving, setSaving] = useState(false);
  const [claimedQuests, setClaimedQuests] = useState<Record<string, boolean>>({});
  const [customTag, setCustomTag] = useState(profile.clanTag || '');

  const orbs = profile.orbsBalance ?? 1500;
  const activeDeco = profile.avatarDecoration || 'none';

  const handleEquipDecoration = async (item: (typeof DECORATIONS)[number]) => {
    if (saving) return;
    if (activeDeco === item.id) return;
    if (item.cost > orbs && item.id !== 'none') return;
    setSaving(true);
    try {
      await updateUserPreferences(profile.uid, {
        avatarDecoration: item.id,
        orbsBalance: item.cost > 0 ? Math.max(0, orbs - item.cost) : orbs,
      });
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
      setCustomTag(clean);
    } finally {
      setSaving(false);
    }
  };

  const quests = [
    {
      id: 'q_profile',
      title: 'Profilini Özelleştir',
      desc: 'Biyografi veya özel durum ekleyerek kendini tanıt.',
      reward: 250,
      done: Boolean(profile.bio || profile.customStatus),
    },
    {
      id: 'q_server',
      title: 'Topluluğa Katıl',
      desc: 'En az bir sunucuya katıl veya kendi sunucunu oluştur.',
      reward: 350,
      done: serversCount > 0,
    },
    {
      id: 'q_friend',
      title: 'Arkadaş Çevreni Genişlet',
      desc: 'En az 1 arkadaş ekleyerek DM ve sesli arama başlat.',
      reward: 300,
      done: friendsCount > 0,
    },
  ];

  const handleClaimQuest = async (qId: string, reward: number) => {
    if (claimedQuests[qId] || saving) return;
    setSaving(true);
    try {
      await updateUserPreferences(profile.uid, {
        orbsBalance: orbs + reward,
      });
      setClaimedQuests((prev) => ({ ...prev, [qId]: true }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-lg font-bold text-white">
              {tab === 'shop' ? 'Mağaza' : 'Görevler'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
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
        <div className="p-6 overflow-y-auto space-y-6">
          {tab === 'shop' ? (
            <>
              {/* Featured Preview */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5865F2]/25 via-[var(--bg-card)] to-[#A855F7]/20 border border-[var(--border-subtle)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={profile.avatarUrl}
                    name={profile.displayName}
                    size="xl"
                    decoration={activeDeco}
                    status={profile.status}
                    showStatus
                    ringBg="var(--bg-card)"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-white">
                        {profile.displayName}
                      </span>
                      <ClanTagBadge tag={profile.clanTag} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Ücretsiz Orbs bakiyenle avatar çerçevelerini aç ve profilini özelleştir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Avatar Decorations Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#A855F7]" />
                  <span>Avatar Dekorasyonları</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {DECORATIONS.map((item) => {
                    const equipped = activeDeco === item.id;
                    const canAfford = orbs >= item.cost || item.id === 'none';
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl bg-[var(--bg-card)] border flex flex-col items-center text-center gap-3 ${
                          equipped ? 'border-[#5865F2]' : 'border-[var(--border-subtle)]'
                        }`}
                      >
                        <Avatar
                          src={profile.avatarUrl}
                          name={profile.displayName}
                          size="lg"
                          decoration={item.id}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">{item.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => handleEquipDecoration(item)}
                          disabled={equipped || (!canAfford && !equipped) || saving}
                          className={`w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            equipped
                              ? 'bg-[#23A55A]/20 text-[#23A55A]'
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
                          ) : item.cost === 0 ? (
                            <span>Seç</span>
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
              </div>

              {/* Clan Tag Selector */}
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
            </>
          ) : (
            <div className="space-y-3">
              {quests.map((q) => {
                const claimed = Boolean(claimedQuests[q.id]);
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
                      onClick={() => handleClaimQuest(q.id, q.reward)}
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
