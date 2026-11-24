import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Ban,
  Bell,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Compass,
  Copy,
  Cpu,
  Gamepad2,
  Gem,
  Globe,
  Hash,
  Image as ImageIcon,
  Info,
  Link2,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  Mic,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Smile,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import type {
  ActivityType,
  AppearanceTheme,
  BotId,
  ChannelDoc,
  ChannelType,
  MemberRole,
  PublicProfile,
  ServerAuditLog,
  ServerBan,
  ServerDoc,
  ServerEmoji,
  ServerMember,
  UserActivity,
  UserConnection,
  UserStatus,
} from '../types/halka';
import {
  fetchPublicServers,
  fetchServerAuditLogs,
  fetchServerBans,
  ROLE_LABELS,
  updateUserPreferences,
} from '../lib/halkaService';
import { getAudioPrefs, setAudioPrefs } from '../lib/audioPrefs';
import {
  ACTIVITY_PRESETS,
  ANIMATED_AVATAR_PRESETS,
  ANIMATED_BANNERS,
  isSafeMediaUrl,
  SOLID_BANNER_COLORS,
} from '../lib/cosmetics';
import { OFFICIAL_BOTS } from '../lib/turcordBots';
import { Avatar, VerifiedBotBadge } from './Avatar';
import { ProfileBanner } from './ProfileEffects';

const SERVER_COLORS = ['#5865F2', '#248046', '#DA373C', '#9B59B6', '#E67E22', '#0EA5E9'];
const SERVER_EMOJIS = ['⚡', '🎮', '💻', '🎧', '🚀', '☕', '🛡️', '🇹🇷'];

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

const ModalShell: React.FC<ModalShellProps> = ({ title, onClose, children, maxWidth = 'max-w-md' }) => (
  <div
    onClick={onClose}
    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className={`w-full ${maxWidth} bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden`}
    >
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-white">{title}</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

// 1. Create Server Modal
interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    iconEmoji: string;
    iconColor: string;
    isPublic: boolean;
    template: 'community' | 'gaming' | 'coding' | 'study';
  }) => Promise<void>;
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconEmoji, setIconEmoji] = useState('⚡');
  const [iconColor, setIconColor] = useState('#5865F2');
  const [isPublic, setIsPublic] = useState(true);
  const [template, setTemplate] = useState<'community' | 'gaming' | 'coding' | 'study'>('community');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate({ name, description, iconEmoji, iconColor, isPublic, template });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sunucu oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Sunucunu Oluştur" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Şablon Seç</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'community', label: 'Genel Topluluk' },
              { id: 'gaming', label: 'Oyun & Espor' },
              { id: 'coding', label: 'Yazılım & Kodlama' },
              { id: 'study', label: 'Çalışma & Odak' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id as typeof template)}
                className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-colors cursor-pointer ${
                  template === t.id
                    ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Simge</label>
            <div className="flex flex-wrap gap-1.5">
              {SERVER_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIconEmoji(em)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer ${
                    iconEmoji === em ? 'bg-[#5865F2] text-white' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Renk</label>
            <div className="flex flex-wrap gap-1.5">
              {SERVER_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setIconColor(col)}
                  style={{ backgroundColor: col }}
                  className={`w-8 h-8 rounded-lg cursor-pointer ${
                    iconColor === col ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-surface)]' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Sunucu Adı</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: İstanbul Geliştiricileri"
            maxLength={60}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[#5865F2] text-sm text-white outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Açıklama</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bu topluluk ne hakkında?"
            maxLength={300}
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[#5865F2] text-sm text-white outline-none resize-none"
          />
        </div>

        <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] cursor-pointer">
          <div className="flex items-center gap-2.5">
            {isPublic ? <Globe className="w-4 h-4 text-[#23A55A]" /> : <Lock className="w-4 h-4 text-[var(--text-muted)]" />}
            <div>
              <p className="text-sm font-medium text-white">Keşfet Listesinde Görünsün</p>
              <p className="text-xs text-[var(--text-muted)]">
                {isPublic ? 'Herkes topluluğu görüp katılabilir' : 'Yalnızca davet koduyla katılınabilir'}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 accent-[#5865F2]"
          />
        </label>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          {loading ? 'Oluşturuluyor...' : 'Sunucu Oluştur'}
        </button>
      </form>
    </ModalShell>
  );
};

// 2. Explore & Join by Invite Code Modal
interface ExploreJoinModalProps {
  joinedServerIds: string[];
  onClose: () => void;
  onJoinByCode: (code: string) => Promise<void>;
  onJoinPublic: (server: ServerDoc) => Promise<void>;
}

export const ExploreJoinModal: React.FC<ExploreJoinModalProps> = ({
  joinedServerIds,
  onClose,
  onJoinByCode,
  onJoinPublic,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [publicServers, setPublicServers] = useState<ServerDoc[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  useEffect(() => {
    fetchPublicServers()
      .then(setPublicServers)
      .catch(() => {})
      .finally(() => setLoadingPublic(false));
  }, []);

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || joining) return;
    setJoining(true);
    setError(null);
    try {
      await onJoinByCode(code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Katılınamadı.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ModalShell title="Toplulukları Keşfet & Katıl" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-6">
        <form onSubmit={handleJoinCode} className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
            Davet Koduyla Katıl
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Örn: X7K9M2P4"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[#5865F2] text-sm text-white font-mono uppercase outline-none"
            />
            <button
              type="submit"
              disabled={!code.trim() || joining}
              className="px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
            >
              {joining ? 'Katılıyor...' : 'Katıl'}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] uppercase">
            <Compass className="w-4 h-4 text-[#23A55A]" />
            <span>Herkese Açık Topluluklar</span>
          </div>

          {loadingPublic ? (
            <p className="text-sm text-[var(--text-muted)] py-4">Topluluklar yükleniyor...</p>
          ) : publicServers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4">
              Henüz herkese açık topluluk bulunmuyor. İlk sunucuyu sen oluşturabilirsin!
            </p>
          ) : (
            <div className="space-y-2">
              {publicServers.map((srv) => {
                const isJoined = joinedServerIds.includes(srv.id);
                return (
                  <div
                    key={srv.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{ backgroundColor: srv.iconColor }}
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 text-white"
                      >
                        {srv.iconEmoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{srv.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {srv.description || 'Topluluk sunucusu'} ·{' '}
                          <span className="tabular-nums">{srv.memberCount} üye</span>
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={joining}
                      onClick={async () => {
                        setJoining(true);
                        setError(null);
                        try {
                          await onJoinPublic(srv);
                          onClose();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Sunucuya katılınamadı.');
                        } finally {
                          setJoining(false);
                        }
                      }}
                      className={`px-4 py-1.5 rounded-xl text-xs font-medium shrink-0 cursor-pointer disabled:opacity-50 ${
                        isJoined
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'
                          : 'bg-[#248046] hover:bg-[#1E6E3B] text-white'
                      }`}
                    >
                      {isJoined ? 'Aç' : 'Katıl'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

// 3. Invite Modal
export const InviteModal: React.FC<{ server: ServerDoc; onClose: () => void }> = ({ server, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(server.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell title={`${server.name} Sunucusuna Davet Et`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Arkadaşların aşağıdaki davet kodunu kullanarak <strong className="text-white">Toplulukları Keşfet</strong> menüsünden sunucuya anında katılabilir:
        </p>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
          <code className="flex-1 px-2 font-mono text-base font-semibold text-white tracking-wider">
            {server.inviteCode}
          </code>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

// 4. Create Channel Modal
interface CreateChannelModalProps {
  defaultType: ChannelType;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    type: ChannelType;
    category: string;
    topic: string;
    slowmodeSeconds?: number;
    nsfw?: boolean;
  }) => Promise<void>;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  defaultType,
  onClose,
  onCreate,
}) => {
  const [type, setType] = useState<ChannelType>(defaultType);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(
    defaultType === 'voice' ? 'SESLİ KANALLAR' : 'METİN KANALLARI'
  );
  const [topic, setTopic] = useState('');
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0);
  const [nsfw, setNsfw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      await onCreate({ name, type, category, topic, slowmodeSeconds, nsfw });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Kanal Oluştur" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Kanal Türü</label>
          <div className="space-y-2">
            {[
              { id: 'text', label: 'Metin Kanalı', desc: 'Mesaj, anket, GIF ve dosya paylaş', icon: Hash },
              { id: 'voice', label: 'Sesli Kanal', desc: 'Ses, ses tahtası, kamera ve ekran paylaşımı', icon: Volume2 },
              { id: 'announcement', label: 'Duyuru Kanalı', desc: 'Önemli topluluk güncellemeleri', icon: Megaphone },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const nextType = item.id as ChannelType;
                    setType(nextType);
                    setCategory(nextType === 'voice' ? 'SESLİ KANALLAR' : 'METİN KANALLARI');
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                    type === item.id
                      ? 'bg-[var(--bg-elevated)] border-[#5865F2] text-white'
                      : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Kanal Adı</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'voice' ? 'Oyun Odası' : 'yeni-sohbet'}
            maxLength={50}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[#5865F2] text-sm text-white outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Kategori</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={40}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[#5865F2] text-sm text-white outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Kanal Konusu</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Kısa açıklama..."
            maxLength={200}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[#5865F2] text-sm text-white outline-none"
          />
        </div>

        {type !== 'voice' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Yavaş Mod</label>
              <select
                value={slowmodeSeconds}
                onChange={(e) => setSlowmodeSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
              >
                <option value={0}>Kapalı</option>
                <option value={5}>5 saniye</option>
                <option value={15}>15 saniye</option>
                <option value={30}>30 saniye</option>
                <option value={60}>1 dakika</option>
                <option value={120}>2 dakika</option>
              </select>
            </div>
            <label className="flex items-center justify-between px-3 py-2 mt-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] cursor-pointer">
              <span className="text-xs font-medium text-white">NSFW (+18)</span>
              <input
                type="checkbox"
                checked={nsfw}
                onChange={(e) => setNsfw(e.target.checked)}
                className="w-4 h-4 accent-[#5865F2]"
              />
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
        >
          {loading ? 'Oluşturuluyor...' : 'Kanalı Oluştur'}
        </button>
      </form>
    </ModalShell>
  );
};

// 5. Server Settings Modal
async function prepareCustomEmojiDataUrl(file: File): Promise<string> {
  if (file.type === 'image/gif') {
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('GIF dosyası okunamadı.'));
      reader.readAsDataURL(file);
    });
    if (raw.length > 150000) {
      throw new Error('Hareketli GIF emoji en fazla ~110 KB olabilir.');
    }
    return raw;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 128;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Görsel işlenemedi.'));
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/webp', 0.86);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/png');
        }
        if (dataUrl.length > 150000) {
          dataUrl = canvas.toDataURL('image/webp', 0.65);
        }
        if (dataUrl.length > 150000) {
          return reject(new Error('Emoji görseli 150 KB sınırını aşıyor.'));
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Geçerli bir görsel seçin.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

interface ServerSettingsModalProps {
  server: ServerDoc;
  members: ServerMember[];
  channels: ChannelDoc[];
  serverEmojis: ServerEmoji[];
  myRole: MemberRole;
  currentUid?: string;
  userOrbs: number;
  initialTab?: 'general' | 'members' | 'bots' | 'emojis' | 'bans' | 'audit' | 'boost';
  onClose: () => void;
  onSave: (updates: {
    name: string;
    description: string;
    iconEmoji: string;
    iconColor: string;
    bannerColor?: string;
    isPublic: boolean;
    enabledBots?: string[];
  }) => Promise<void>;
  onBoostServer: () => Promise<void>;
  onUpdateChannel: (
    channelId: string,
    updates: { slowmodeSeconds?: number; nsfw?: boolean }
  ) => Promise<void>;
  onChangeRole: (member: ServerMember, role: Exclude<MemberRole, 'owner'>) => Promise<void>;
  onKick: (member: ServerMember) => Promise<void>;
  onBan?: (member: ServerMember, reason: string) => Promise<void>;
  onUnban?: (ban: ServerBan) => Promise<void>;
  onDeleteServer: () => Promise<void>;
  onAddEmoji: (input: { name: string; imageUrl: string }) => Promise<void>;
  onDeleteEmoji: (emojiId: string) => Promise<void>;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  server,
  members,
  channels,
  serverEmojis,
  myRole,
  currentUid,
  userOrbs,
  initialTab,
  onClose,
  onSave,
  onBoostServer,
  onUpdateChannel,
  onChangeRole,
  onKick,
  onBan,
  onUnban,
  onDeleteServer,
  onAddEmoji,
  onDeleteEmoji,
}) => {
  const canManageGeneral = myRole === 'owner' || myRole === 'admin';
  const canManageMod = myRole === 'owner' || myRole === 'admin' || myRole === 'moderator';
  const [tab, setTab] = useState<'general' | 'members' | 'bots' | 'emojis' | 'bans' | 'audit' | 'boost'>(
    initialTab || (canManageGeneral ? 'general' : canManageMod ? 'emojis' : 'boost')
  );
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description);
  const [iconEmoji, setIconEmoji] = useState(server.iconEmoji);
  const [iconColor, setIconColor] = useState(server.iconColor);
  const [bannerColor, setBannerColor] = useState(server.bannerColor || 'anim:anime-night');
  const [isPublic, setIsPublic] = useState(server.isPublic);
  const [enabledBots, setEnabledBots] = useState<string[]>(
    server.enabledBots && server.enabledBots.length > 0
      ? server.enabledBots
      : ['turcord_bot', 'mod_bot', 'music_bot']
  );
  const [saving, setSaving] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [boostError, setBoostError] = useState<string | null>(null);

  // Bans & Audit Logs state
  const [bans, setBans] = useState<ServerBan[]>([]);
  const [bansLoading, setBansLoading] = useState(false);
  const [bansError, setBansError] = useState<string | null>(null);
  const [banTargetUid, setBanTargetUid] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banning, setBanning] = useState(false);

  const [auditLogs, setAuditLogs] = useState<ServerAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  // Custom Emoji upload state
  const [emojiName, setEmojiName] = useState('');
  const [emojiImageUrl, setEmojiImageUrl] = useState('');
  const [emojiError, setEmojiError] = useState<string | null>(null);
  const [emojiSaving, setEmojiSaving] = useState(false);

  const boostCount = server.boostCount || 0;
  const boostLevel = boostCount >= 7 ? 3 : boostCount >= 3 ? 2 : boostCount >= 1 ? 1 : 0;

  const loadBans = async () => {
    setBansLoading(true);
    setBansError(null);
    try {
      const list = await fetchServerBans(server.id);
      setBans(list);
    } catch (err) {
      setBansError(err instanceof Error ? err.message : 'Yasaklılar yüklenemedi.');
    } finally {
      setBansLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const list = await fetchServerAuditLogs(server.id);
      setAuditLogs(list);
    } catch {
      // Ignore transient permission errors
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'bans' && canManageGeneral) {
      void loadBans();
    } else if (tab === 'audit' && canManageMod) {
      void loadAuditLogs();
    }
  }, [tab, server.id, canManageGeneral, canManageMod]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name, description, iconEmoji, iconColor, bannerColor, isPublic, enabledBots });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleBot = async (botId: BotId) => {
    const exists = enabledBots.includes(botId);
    const next = exists ? enabledBots.filter((b) => b !== botId) : [...enabledBots, botId];
    setEnabledBots(next);
    await onSave({
      name,
      description,
      iconEmoji,
      iconColor,
      bannerColor,
      isPublic,
      enabledBots: next,
    });
  };

  const handleBoost = async () => {
    if (boosting) return;
    setBoosting(true);
    setBoostError(null);
    try {
      await onBoostServer();
    } catch (err) {
      setBoostError(err instanceof Error ? err.message : 'Takviye yapılamadı.');
    } finally {
      setBoosting(false);
    }
  };

  const handleEmojiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEmojiError(null);
    try {
      const url = await prepareCustomEmojiDataUrl(file);
      setEmojiImageUrl(url);
      if (!emojiName.trim()) {
        const base = file.name
          .replace(/\.[^.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 24);
        if (base.length >= 2) setEmojiName(base);
      }
    } catch (err) {
      setEmojiError(err instanceof Error ? err.message : 'Görsel yüklenemedi.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddEmojiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emojiSaving) return;
    setEmojiError(null);
    setEmojiSaving(true);
    try {
      await onAddEmoji({ name: emojiName, imageUrl: emojiImageUrl });
      setEmojiName('');
      setEmojiImageUrl('');
    } catch (err) {
      setEmojiError(err instanceof Error ? err.message : 'Emoji eklenemedi.');
    } finally {
      setEmojiSaving(false);
    }
  };

  const normalizedEmojiPreview = emojiName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return (
    <ModalShell title="Sunucu Ayarları" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 overflow-x-auto">
          {canManageGeneral && (
            <>
              <button
                onClick={() => setTab('general')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                  tab === 'general' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                Genel
              </button>
              <button
                onClick={() => setTab('members')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                  tab === 'members' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Üyeler ({members.length})</span>
              </button>
              <button
                onClick={() => setTab('bots')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                  tab === 'bots' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Botlar</span>
              </button>
            </>
          )}
          {canManageMod && (
            <button
              onClick={() => setTab('emojis')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                tab === 'emojis' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emojiler ({serverEmojis.length})</span>
            </button>
          )}
          {canManageGeneral && (
            <button
              onClick={() => setTab('bans')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                tab === 'bans' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Yasaklılar</span>
            </button>
          )}
          {canManageMod && (
            <button
              onClick={() => setTab('audit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                tab === 'audit' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Denetim Kaydı</span>
            </button>
          )}
          <button
            onClick={() => setTab('boost')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
              tab === 'boost'
                ? 'bg-gradient-to-r from-[#EC4899] to-[#A855F7] text-white'
                : 'text-[#F472B6] hover:bg-[var(--bg-card)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Takviye ({boostCount})</span>
          </button>
        </div>

        {tab === 'general' && canManageGeneral ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Sunucu Adı</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Simge</label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVER_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setIconEmoji(em)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                        iconEmoji === em ? 'bg-[#5865F2]' : 'bg-[var(--bg-card)]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Renk</label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVER_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setIconColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-8 h-8 rounded-lg cursor-pointer ${
                        iconColor === col ? 'ring-2 ring-white' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">Sunucu Bannerı</label>
              <div className="grid grid-cols-3 gap-2">
                {ANIMATED_BANNERS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBannerColor(b.id)}
                    className={`h-10 rounded-xl ${b.className} border cursor-pointer flex items-end p-1.5 ${
                      bannerColor === b.id ? 'border-white ring-2 ring-[#5865F2]' : 'border-white/10'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-white drop-shadow truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Channel Slowmode Quick Settings */}
            {channels.filter((c) => c.type !== 'voice').length > 0 && (
              <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Kanal Yavaş Mod &amp; +18 Ayarı</span>
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {channels
                    .filter((c) => c.type !== 'voice')
                    .map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-white truncate">#{ch.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={ch.slowmodeSeconds || 0}
                            onChange={(e) =>
                              onUpdateChannel(ch.id, { slowmodeSeconds: Number(e.target.value) })
                            }
                            className="px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-white outline-none"
                          >
                            <option value={0}>Yavaş Mod: Yok</option>
                            <option value={5}>5 sn</option>
                            <option value={15}>15 sn</option>
                            <option value={30}>30 sn</option>
                            <option value={60}>1 dk</option>
                          </select>
                          <label className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(ch.nsfw)}
                              onChange={(e) => onUpdateChannel(ch.id, { nsfw: e.target.checked })}
                              className="w-3.5 h-3.5 accent-[#5865F2]"
                            />
                            <span>+18</span>
                          </label>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] cursor-pointer">
              <span className="text-sm text-white">Herkese Açık Keşfet Listesinde Göster</span>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-[#5865F2]"
              />
            </label>

            <div className="flex items-center justify-between pt-2">
              {myRole === 'owner' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteServer();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sunucuyu Sil</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium cursor-pointer"
              >
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        ) : tab === 'members' && canManageGeneral ? (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.uid}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--bg-card)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={m.avatarUrl}
                    name={m.displayName}
                    size="sm"
                    decoration={m.avatarDecoration}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.displayName}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      @{m.username} · {ROLE_LABELS[m.role]}
                    </p>
                  </div>
                </div>
                {m.role !== 'owner' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={m.role}
                      onChange={(e) => onChangeRole(m, e.target.value as Exclude<MemberRole, 'owner'>)}
                      className="px-2 py-1 rounded bg-[var(--bg-input)] text-xs text-white border border-[var(--border-subtle)] outline-none"
                    >
                      <option value="admin">Yönetici</option>
                      <option value="moderator">Moderatör</option>
                      <option value="member">Üye</option>
                    </select>
                    <button
                      onClick={() => onKick(m)}
                      title="Sunucudan Çıkar"
                      className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : tab === 'bots' && canManageGeneral ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Sunucunda aktif olacak resmi Turcord botlarını yönetebilirsin. Kanalda <code className="px-1 py-0.5 rounded bg-[var(--bg-card)] text-white">/</code> yazarak tüm komutlara erişilebilir.
            </p>
            {(Object.values(OFFICIAL_BOTS) as Array<(typeof OFFICIAL_BOTS)[BotId]>).map((bot) => {
              const active = enabledBots.includes(bot.id);
              return (
                <div
                  key={bot.id}
                  className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={bot.name} size="md" botId={bot.id} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white">{bot.name}</span>
                          <VerifiedBotBadge />
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{bot.tagline}</p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleBot(bot.id)}
                        className="w-4 h-4 accent-[#5865F2]"
                      />
                      <span className="text-xs font-medium text-white">{active ? 'Aktif' : 'Kapalı'}</span>
                    </label>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{bot.description}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bot.commands.map((c) => (
                      <span
                        key={c.cmd}
                        title={c.desc}
                        className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[#A5B4FC]"
                      >
                        {c.cmd}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : tab === 'emojis' && canManageMod ? (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Sunucuna PNG, WebP veya hareketli GIF formatında özel emojiler yükle. Üyeler emoji seçiciden veya sohbete{' '}
              <code className="px-1 py-0.5 rounded bg-[var(--bg-card)] text-white">:emoji_adi:</code> yazarak kullanabilir.
            </p>

            <form
              onSubmit={handleAddEmojiSubmit}
              className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-elevated)] border border-dashed border-[var(--border-subtle)] text-xs font-medium text-white cursor-pointer shrink-0">
                  <Upload className="w-4 h-4 text-[#949CF7]" />
                  <span>{emojiImageUrl ? 'Görseli Değiştir' : 'Görsel / GIF Seç'}</span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/gif,image/jpeg"
                    onChange={handleEmojiFileChange}
                    className="hidden"
                  />
                </label>

                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <input
                    type="text"
                    value={emojiName}
                    onChange={(e) => setEmojiName(e.target.value)}
                    placeholder="Kısa ad (örn: turcord_gg)"
                    maxLength={24}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white placeholder-[var(--text-muted)] outline-none"
                  />
                </div>
              </div>

              {emojiImageUrl && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={emojiImageUrl}
                      alt={normalizedEmojiPreview || 'Önizleme'}
                      className="w-9 h-9 object-contain rounded"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        :{normalizedEmojiPreview || 'emoji_adi'}:
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">Sohbette ve tepkilerde görünüm</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmojiImageUrl('')}
                    className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {emojiError && <p className="text-xs text-rose-400">{emojiError}</p>}

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Kullanılan yuva: {serverEmojis.length} / 50
                </span>
                <button
                  type="submit"
                  disabled={!emojiImageUrl || normalizedEmojiPreview.length < 2 || emojiSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-45 text-white text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{emojiSaving ? 'Ekleniyor...' : 'Emoji Ekle'}</span>
                </button>
              </div>
            </form>

            {serverEmojis.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                Bu sunucuda henüz özel emoji yok. İlk özel emojini yukarıdan yükleyebilirsin!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {serverEmojis.map((em) => (
                  <div
                    key={em.id}
                    className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={em.imageUrl}
                        alt={`:${em.name}:`}
                        className="w-8 h-8 object-contain rounded shrink-0 bg-[var(--bg-surface)] p-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold text-white truncate">:{em.name}:</p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          Ekleyen: {em.creatorName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteEmoji(em.id)}
                      title="Emojiyi Sil"
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'bans' && canManageGeneral ? (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Yasaklanan kullanıcılar sunucudan çıkarılır ve yasağı kaldırılana kadar davet kodu veya keşfet üzerinden tekrar katılamaz.
            </p>

            {onBan && members.some((m) => m.role !== 'owner' && m.uid !== currentUid) && (
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2.5">
                <p className="text-xs font-semibold text-white">Hızlı Üye Yasakla</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={banTargetUid}
                    onChange={(e) => setBanTargetUid(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
                  >
                    <option value="">Üye seç...</option>
                    {members
                      .filter((m) => m.role !== 'owner' && m.uid !== currentUid)
                      .map((m) => (
                        <option key={m.uid} value={m.uid}>
                          {m.displayName} (@{m.username})
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    value={banReasonInput}
                    onChange={(e) => setBanReasonInput(e.target.value)}
                    placeholder="Sebep (opsiyonel)"
                    maxLength={200}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!banTargetUid || banning}
                    onClick={async () => {
                      const target = members.find((m) => m.uid === banTargetUid);
                      if (!target || !onBan) return;
                      setBanning(true);
                      setBansError(null);
                      try {
                        await onBan(target, banReasonInput);
                        setBanTargetUid('');
                        setBanReasonInput('');
                        await loadBans();
                      } catch (err) {
                        setBansError(err instanceof Error ? err.message : 'Yasaklanamadı.');
                      } finally {
                        setBanning(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-45 text-white text-xs font-medium cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{banning ? 'Yasaklanıyor...' : 'Üyeyi Yasakla'}</span>
                  </button>
                </div>
              </div>
            )}

            {bansError && <p className="text-xs text-rose-400">{bansError}</p>}

            {bansLoading ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">Yasaklı listesi yükleniyor...</p>
            ) : bans.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                Bu sunucuda yasaklanmış kullanıcı bulunmuyor.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {bans.map((b) => (
                  <div
                    key={b.uid}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={b.avatarUrl} name={b.displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {b.displayName}{' '}
                          <span className="text-xs text-[var(--text-muted)] font-normal">@{b.username}</span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          Sebep: {b.reason || 'Belirtilmedi'} · Yetkili: {b.bannedByName}
                        </p>
                      </div>
                    </div>
                    {onUnban && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onUnban(b);
                          setBans((prev) => prev.filter((item) => item.uid !== b.uid));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[#23A55A] text-xs font-medium text-white border border-[var(--border-subtle)] cursor-pointer shrink-0 transition-colors"
                      >
                        Yasağı Kaldır
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === 'audit' && canManageMod ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  placeholder="Eylem, yetkili veya hedef ara..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-[var(--text-muted)] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void loadAuditLogs()}
                disabled={auditLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-white cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
            </div>

            {auditLoading ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">Denetim kayıtları yükleniyor...</p>
            ) : (
              (() => {
                const fq = auditFilter.trim().toLowerCase();
                const filtered = auditLogs.filter(
                  (log) =>
                    !fq ||
                    log.action.toLowerCase().includes(fq) ||
                    log.actorName.toLowerCase().includes(fq) ||
                    log.targetName.toLowerCase().includes(fq) ||
                    (log.details || '').toLowerCase().includes(fq)
                );
                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                      Henüz eşleşen denetim kaydı yok. Kanal, rol, emoji veya yasaklama işlemleri otomatik olarak burada kayıt altına alınır.
                    </div>
                  );
                }
                return (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filtered.map((log) => {
                      const timeStr =
                        log.createdAt && typeof log.createdAt.toDate === 'function'
                          ? log.createdAt.toDate().toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Az önce';
                      return (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                              <span className="px-2 py-0.5 rounded bg-[#5865F2]/20 text-[#A5B4FC] text-[10px]">
                                {log.action}
                              </span>
                              {log.targetName && <span className="truncate">{log.targetName}</span>}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">
                              {timeStr}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Yetkili: <strong className="text-white font-medium">{log.actorName}</strong>
                            {log.details ? ` · ${log.details}` : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-[#F472B6]/35 bg-[var(--bg-card)]">
              <ProfileBanner bannerColor={bannerColor} className="h-20 flex items-center px-5">
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-black/35 flex items-center justify-center text-2xl">
                    {server.iconEmoji}
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-white">{server.name}</p>
                    <p className="text-xs text-white/85">
                      Seviye {boostLevel} · {boostCount} Takviye
                    </p>
                  </div>
                </div>
              </ProfileBanner>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { lvl: 1, req: 1, title: 'Seviye 1', perk: 'Hareketli Simge & Rozet' },
                    { lvl: 2, req: 3, title: 'Seviye 2', perk: 'Özel Banner & HD Ses' },
                    { lvl: 3, req: 7, title: 'Seviye 3', perk: 'Maksimum Topluluk Gücü' },
                  ].map((tier) => (
                    <div
                      key={tier.lvl}
                      className={`p-2.5 rounded-xl border ${
                        boostLevel >= tier.lvl
                          ? 'bg-[#EC4899]/15 border-[#EC4899] text-white'
                          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      <p className="font-bold">{tier.title}</p>
                      <p className="text-[10px] mt-0.5">{tier.req} Takviye</p>
                      <p className="text-[10px] mt-1 opacity-85">{tier.perk}</p>
                    </div>
                  ))}
                </div>

                {boostError && <p className="text-xs text-rose-400">{boostError}</p>}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-[var(--text-muted)]">
                    Bakiyen: <strong className="text-white tabular-nums">{userOrbs} Orbs</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleBoost}
                    disabled={boosting || userOrbs < 500}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] hover:opacity-95 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{boosting ? 'Takviye Yapılıyor...' : '500 Orbs ile Takviye Et'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

// 6. Categorized Discord Onyx User Settings Modal
type SettingsSubPage =
  | 'menu'
  | 'account'
  | 'privacy'
  | 'connections'
  | 'bot'
  | 'appearance'
  | 'voice'
  | 'chat'
  | 'notifications'
  | 'advanced';

async function prepareCompactProfileMedia(file: File, kind: 'avatar' | 'banner'): Promise<string> {
  if (file.type === 'image/gif') {
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('GIF okunamadı.'));
      reader.readAsDataURL(file);
    });
    if (raw.length <= 11800) return raw;
    throw new Error('GIF dosyası çok büyük (~9 KB altı GIF yükleyin veya https:// GIF linki yapıştırın).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const targetW = kind === 'avatar' ? 96 : 320;
        const targetH = kind === 'avatar' ? 96 : 110;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Görsel işlenemedi.'));
        const scale = Math.max(targetW / img.width, targetH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (targetW - w) / 2, (targetH - h) / 2, w, h);
        let dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (!dataUrl.startsWith('data:image/webp') || dataUrl.length > 11800) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.68);
        }
        if (dataUrl.length > 11800) {
          return reject(new Error('Görsel sıkıştırılamadı, daha küçük bir görsel seçin.'));
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Geçerli bir görsel seçin.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

interface UserSettingsModalProps {
  profile: PublicProfile;
  unreadNotificationsCount: number;
  wsConnected?: boolean;
  onClose: () => void;
  onOpenShop: (tab: 'shop' | 'quests') => void;
  onOpenNotifications: () => void;
  onOpenBotDm?: () => void;
  onRunDiagnostics?: () => Promise<void> | void;
  onSave: (updates: {
    displayName: string;
    username: string;
    bio: string;
    pronouns?: string;
    status: UserStatus;
    statusEmoji?: string;
    customStatus: string;
    bannerColor: string;
    bannerUrl?: string;
    avatarUrl: string;
    clanTag?: string;
    connections?: UserConnection[];
    activity?: UserActivity;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  profile,
  unreadNotificationsCount,
  wsConnected = false,
  onClose,
  onOpenShop,
  onOpenNotifications,
  onOpenBotDm,
  onRunDiagnostics,
  onSave,
  onSignOut,
}) => {
  const [subPage, setSubPage] = useState<SettingsSubPage>('menu');
  const [search, setSearch] = useState('');

  // Editable Profile State
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [pronouns, setPronouns] = useState(profile.pronouns || '');
  const [status, setStatus] = useState<UserStatus>(profile.status);
  const [statusEmoji, setStatusEmoji] = useState(profile.statusEmoji || '');
  const [customStatus, setCustomStatus] = useState(profile.customStatus);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [bannerColor, setBannerColor] = useState(profile.bannerColor || '#5865F2');
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || '');
  const [clanTag, setClanTag] = useState(profile.clanTag || '');
  const [activityType, setActivityType] = useState<ActivityType>(
    profile.activity?.type || 'playing'
  );
  const [activityName, setActivityName] = useState(profile.activity?.name || '');
  const [activityDetails, setActivityDetails] = useState(profile.activity?.details || '');
  const [connections, setConnections] = useState<UserConnection[]>(profile.connections || []);
  const [newConnPlatform, setNewConnPlatform] = useState<UserConnection['platform']>('Spotify');
  const [newConnHandle, setNewConnHandle] = useState('');

  const initialAudioPrefs = getAudioPrefs();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [testingMic, setTestingMic] = useState(false);
  const [loopbackTest, setLoopbackTest] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState(initialAudioPrefs.micId);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(initialAudioPrefs.speakerId);
  const [inputGain, setInputGain] = useState(initialAudioPrefs.inputGain);
  const [echoCancellation, setEchoCancellation] = useState(initialAudioPrefs.echoCancellation);
  const [autoGainControl, setAutoGainControl] = useState(initialAudioPrefs.autoGainControl);
  const [refreshingDevices, setRefreshingDevices] = useState(false);
  const [diagSent, setDiagSent] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const testGainNodeRef = useRef<GainNode | null>(null);
  const testLoopbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeTheme: AppearanceTheme = profile.theme || 'oniks';
  const showTyping = profile.showTypingIndicator ?? true;
  const mentionNotifs = profile.mentionNotifs ?? true;
  const botAlerts = profile.botAlerts ?? true;
  const compactMode = profile.compactMode ?? false;
  const noiseSuppression = profile.noiseSuppression ?? true;

  const enumerateAudioDevices = async (requestPermission = false) => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    setRefreshingDevices(true);
    let tempStream: MediaStream | null = null;
    try {
      if (requestPermission && navigator.mediaDevices.getUserMedia) {
        tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      const outputs = devices.filter((d) => d.kind === 'audiooutput');
      setAudioInputs(inputs);
      setAudioOutputs(outputs);
      if (!selectedMicId && inputs[0]?.deviceId) {
        setSelectedMicId(inputs[0].deviceId);
        setAudioPrefs({ micId: inputs[0].deviceId });
      }
      if (!selectedSpeakerId && outputs[0]?.deviceId) {
        setSelectedSpeakerId(outputs[0].deviceId);
        setAudioPrefs({ speakerId: outputs[0].deviceId });
      }
    } catch {
      if (requestPermission) {
        setError('Ses aygıtlarını listelemek için mikrofon izni gerekli.');
      }
    } finally {
      tempStream?.getTracks().forEach((t) => t.stop());
      setRefreshingDevices(false);
    }
  };

  useEffect(() => {
    if (subPage !== 'voice') return;
    void enumerateAudioDevices(false);
  }, [subPage]);

  useEffect(() => {
    if (testGainNodeRef.current) {
      testGainNodeRef.current.gain.value = Math.max(0, Math.min(2, inputGain / 100));
    }
  }, [inputGain]);

  useEffect(() => {
    const el = testLoopbackAudioRef.current as
      | (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
      | null;
    if (el && typeof el.setSinkId === 'function' && selectedSpeakerId) {
      el.setSinkId(selectedSpeakerId).catch(() => {});
    }
  }, [selectedSpeakerId, testingMic, loopbackTest]);

  useEffect(() => {
    if (!testingMic) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let loopbackEl: HTMLAudioElement | null = null;
    let timer = 0;

    navigator.mediaDevices
      .getUserMedia({
        audio: selectedMicId
          ? {
              deviceId: { exact: selectedMicId },
              noiseSuppression,
              echoCancellation,
              autoGainControl,
            }
          : { noiseSuppression, echoCancellation, autoGainControl },
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(s);
        const gainNode = ctx.createGain();
        gainNode.gain.value = Math.max(0, Math.min(2, inputGain / 100));
        testGainNodeRef.current = gainNode;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(gainNode);
        gainNode.connect(analyser);

        if (loopbackTest) {
          const dest = ctx.createMediaStreamDestination();
          gainNode.connect(dest);
          const audio = document.createElement('audio') as HTMLAudioElement & {
            setSinkId?: (id: string) => Promise<void>;
          };
          audio.autoplay = true;
          audio.srcObject = dest.stream;
          if (selectedSpeakerId && typeof audio.setSinkId === 'function') {
            audio.setSinkId(selectedSpeakerId).catch(() => {});
          }
          void audio.play().catch(() => {});
          loopbackEl = audio;
          testLoopbackAudioRef.current = audio;
        }

        const data = new Uint8Array(analyser.frequencyBinCount);
        timer = window.setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicLevel(Math.min(100, Math.round(avg * 1.8)));
        }, 80);
      })
      .catch(() => {
        setError('Mikrofon test edilemedi (izin verilmedi).');
        setTestingMic(false);
      });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      testGainNodeRef.current = null;
      if (loopbackEl) {
        loopbackEl.pause();
        loopbackEl.srcObject = null;
      }
      testLoopbackAudioRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      setMicLevel(0);
    };
  }, [testingMic, loopbackTest, selectedMicId, selectedSpeakerId, noiseSuppression, echoCancellation, autoGainControl]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    if (!isSafeMediaUrl(avatarUrl.trim()) || !isSafeMediaUrl(bannerUrl.trim())) {
      setError('Avatar veya Banner linki https://, preset: veya geçerli görsel olmalıdır.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        displayName,
        username,
        bio,
        pronouns,
        status,
        statusEmoji,
        customStatus,
        bannerColor,
        bannerUrl: bannerUrl.trim(),
        avatarUrl: avatarUrl.trim(),
        clanTag,
        connections,
        activity: {
          type: activityType,
          name: activityName.trim(),
          details: activityDetails.trim(),
        },
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const matches = (label: string) => !q || label.toLowerCase().includes(q);

  const subTitles: Record<SettingsSubPage, string> = {
    menu: 'Ayarlar',
    account: 'Hesap & Profil',
    privacy: 'Gizlilik & Güvenlik',
    connections: 'Bağlantılar',
    bot: 'Turcord Resmi Botu & Destek',
    appearance: 'Görünüm',
    voice: 'Ses ve Görüntü',
    chat: 'Sohbet & Yazıyor Göstergesi',
    notifications: 'Bildirimler',
    advanced: 'Gelişmiş & Sistem',
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
      >
        {/* Top Bar */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subPage === 'menu' ? (
              <button onClick={onClose} className="relative text-[var(--text-muted)] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -bottom-1.5 -right-2 px-1 min-w-[16px] h-4 rounded-full bg-[#F23F43] text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setSubPage('menu')}
                className="text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-display text-lg font-bold text-white">{subTitles[subPage]}</h2>
          </div>

          {subPage !== 'menu' && (
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {subPage === 'menu' && (
            <>
              {/* Search Bar */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ayarlarda ara"
                  className="flex-1 bg-transparent text-sm text-white placeholder-[var(--text-muted)] outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Hesap Ayarları */}
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-[var(--text-muted)]">Hesap Ayarları</p>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                  {matches('Hesap ve Profil') && (
                    <button
                      onClick={() => setSubPage('account')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <User className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Hesap &amp; Profil</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>@{profile.username}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                  {matches('Gizlilik ve Güvenlik') && (
                    <button
                      onClick={() => setSubPage('privacy')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Shield className="w-4 h-4 text-[#23A55A]" />
                        <span>Gizlilik &amp; Güvenlik</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  )}
                  {matches('Bağlantılar') && (
                    <button
                      onClick={() => setSubPage('connections')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Link2 className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Bağlantılar</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="tabular-nums">{connections.length} hesap</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Turcord Resmi Bot & Destek */}
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-[var(--text-muted)]">Turcord Bot &amp; Destek</p>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                  {matches('Turcord Resmi Bot Uyarı Yapay Zeka Destek') && (
                    <button
                      onClick={() => setSubPage('bot')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Bot className="w-4 h-4 text-[#5865F2]" />
                        <span>Turcord Resmi Botu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <VerifiedBotBadge />
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Topluluk & Mağaza */}
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-[var(--text-muted)]">Faturalandırma &amp; Özelleştirme</p>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                  {matches('Mağaza') && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenShop('shop');
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Sparkles className="w-4 h-4 text-[#A855F7]" />
                        <span>Mağaza (Avatar Çerçeveleri &amp; Etiketler)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white tabular-nums">
                        <Gem className="w-3.5 h-3.5 text-[#A855F7]" />
                        <span>{profile.orbsBalance ?? 1500}</span>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </button>
                  )}
                  {matches('Görevler') && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenShop('quests');
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Gem className="w-4 h-4 text-[#5865F2]" />
                        <span>Görevler</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Uygulama Ayarları */}
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-[var(--text-muted)]">Uygulama Ayarları</p>
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                  {matches('Ses ve Görüntü Mikrofon Gürültü Engelleme') && (
                    <button
                      onClick={() => setSubPage('voice')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Mic className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Ses ve Görüntü</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>Ses Etkinliği</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                  {matches('Görünüm Oniks Koyu Gece Kompakt') && (
                    <button
                      onClick={() => setSubPage('appearance')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Palette className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Görünüm</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>
                          {activeTheme === 'oniks' ? 'Oniks' : activeTheme === 'koyu' ? 'Koyu' : 'Gece'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                  {matches('Dil Türkçe') && (
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Dil</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">Türkçe</span>
                    </div>
                  )}
                  {matches('Sohbet Yazıyor Göstergesi') && (
                    <button
                      onClick={() => setSubPage('chat')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <MessageSquare className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Sohbet &amp; Yazıyor Göstergesi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#A855F7] text-[10px] font-bold text-white">
                          YENİ
                        </span>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </button>
                  )}
                  {matches('Bildirimler') && (
                    <button
                      onClick={() => setSubPage('notifications')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Bildirimler</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  )}
                  {matches('Gelişmiş Sistem Tanısı Sürüm') && (
                    <button
                      onClick={() => setSubPage('advanced')}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Cpu className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Gelişmiş</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Çıkış Yap Card */}
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-rose-500/10 text-rose-400 text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Çıkış Yap</span>
              </button>

              <div className="px-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Turcord Platformu
                </span>
                <span>Web v2.4</span>
              </div>
            </>
          )}

          {subPage === 'account' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Live Profile Mini Card */}
              <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <ProfileBanner bannerColor={bannerColor} bannerUrl={bannerUrl} className="h-20" />
                <div className="px-4 pb-3 -mt-8 flex items-end justify-between gap-3">
                  <div className="flex items-end gap-3 min-w-0">
                    <Avatar
                      src={avatarUrl}
                      name={displayName}
                      size="lg"
                      status={status}
                      showStatus
                      ringBg="var(--bg-card)"
                      decoration={profile.avatarDecoration}
                    />
                    <div className="min-w-0 pb-0.5">
                      <p className="text-sm font-bold text-white truncate">{displayName || username}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        @{username} {pronouns ? `· ${pronouns}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenShop('shop');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#A855F7]/20 hover:bg-[#A855F7]/30 text-[#E9D5FF] text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Çerçeve &amp; Efekt</span>
                  </button>
                </div>
              </div>

              {/* Avatar Picker: Device Upload + Preset Animated + URL/GIF */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Profil Fotoğrafı / Hareketli Avatar
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-medium cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>Fotoğraf Yükle</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        setError(null);
                        try {
                          const dataUrl = await prepareCompactProfileMedia(f, 'avatar');
                          setAvatarUrl(dataUrl);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Fotoğraf yüklenemedi.');
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {ANIMATED_AVATAR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.name}
                      onClick={() => setAvatarUrl(p.id)}
                      className={`p-0.5 rounded-full border-2 cursor-pointer transition-transform hover:scale-105 ${
                        avatarUrl === p.id ? 'border-[#5865F2]' : 'border-transparent'
                      }`}
                    >
                      <Avatar src={p.id} name={p.name} size="sm" />
                    </button>
                  ))}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-2 py-1 rounded-lg bg-[var(--bg-surface)] text-[11px] text-[var(--text-muted)] hover:text-white cursor-pointer"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Veya hareketli GIF / resim linki yapıştır (https://...)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white placeholder-[var(--text-muted)] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Görünen Ad
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    maxLength={32}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Durum
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                  >
                    <option value="online">Çevrimiçi</option>
                    <option value="idle">Boşta</option>
                    <option value="dnd">Rahatsız Etmeyin</option>
                    <option value="offline">Görünmez</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Zamirler (Pronouns)
                  </label>
                  <input
                    type="text"
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="Örn: o / they"
                    maxLength={30}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Klan Etiketi
                  </label>
                  <input
                    type="text"
                    value={clanTag}
                    onChange={(e) => setClanTag(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="Örn: GÜL"
                    maxLength={8}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white font-mono uppercase outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[72px_1fr] gap-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={statusEmoji}
                    onChange={(e) => setStatusEmoji(e.target.value)}
                    placeholder="🌹"
                    maxLength={16}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-center text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Özel Durum (Düşünce Balonu)
                  </label>
                  <input
                    type="text"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    placeholder="Şu an ne yapıyorsun?"
                    maxLength={100}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Rich Presence / Activity */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>Etkinlik / Oynuyor Durumu</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as ActivityType)}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
                  >
                    <option value="playing">Oynuyor</option>
                    <option value="listening">Dinliyor</option>
                    <option value="watching">İzliyor</option>
                    <option value="streaming">Yayında</option>
                  </select>
                  <input
                    type="text"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="Oyun veya aktivite adı..."
                    maxLength={50}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={activityDetails}
                  onChange={(e) => setActivityDetails(e.target.value)}
                  placeholder="Detay (örn: Dereceli · Takım 2/5)"
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setActivityType(p.type);
                        setActivityName(p.name);
                        setActivityDetails(p.details);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[11px] text-[var(--text-secondary)] hover:text-white cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                  {activityName && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivityName('');
                        setActivityDetails('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[11px] cursor-pointer"
                    >
                      Temizle
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                  Biyografi
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Kendinden bahset..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none resize-none"
                />
              </div>

              {/* Banner Colors, Animated Banners & Banner GIF URL */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>Banner Teması &amp; GIF</span>
                  </label>
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[#5865F2] text-white text-[11px] cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>Banner Yükle</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        setError(null);
                        try {
                          const dataUrl = await prepareCompactProfileMedia(f, 'banner');
                          setBannerUrl(dataUrl);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Banner yüklenemedi.');
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SOLID_BANNER_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        setBannerColor(col);
                        setBannerUrl('');
                      }}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-lg cursor-pointer ${
                        bannerColor === col && !bannerUrl ? 'ring-2 ring-white' : ''
                      }`}
                    />
                  ))}
                  {ANIMATED_BANNERS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      title={b.name}
                      onClick={() => {
                        setBannerColor(b.id);
                        setBannerUrl('');
                      }}
                      className={`px-2.5 h-7 rounded-lg ${b.className} text-[10px] font-semibold text-white cursor-pointer ${
                        bannerColor === b.id && !bannerUrl ? 'ring-2 ring-white' : ''
                      }`}
                    >
                      {b.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <input
                  type="url"
                  value={bannerUrl.startsWith('data:') ? '' : bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="Veya hareketli GIF banner linki yapıştır (https://...)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white placeholder-[var(--text-muted)] outline-none"
                />
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}
              {savedNotice && <p className="text-xs text-[#23A55A]">Profil güncellendi!</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium cursor-pointer"
              >
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </form>
          )}

          {subPage === 'connections' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                Spotify, Steam, GitHub veya Roblox kullanıcı adlarını profiline ekleyebilirsin.
              </p>

              <div className="flex gap-2">
                <select
                  value={newConnPlatform}
                  onChange={(e) => setNewConnPlatform(e.target.value as UserConnection['platform'])}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                >
                  <option value="Spotify">Spotify</option>
                  <option value="Steam">Steam</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Roblox">Roblox</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Twitch">Twitch</option>
                </select>
                <input
                  type="text"
                  value={newConnHandle}
                  onChange={(e) => setNewConnHandle(e.target.value)}
                  placeholder="Kullanıcı adı"
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newConnHandle.trim() || connections.length >= 6) return;
                    const updated = [
                      ...connections,
                      { platform: newConnPlatform, handle: newConnHandle.trim().slice(0, 40) },
                    ];
                    setConnections(updated);
                    setNewConnHandle('');
                    await updateUserPreferences(profile.uid, { connections: updated });
                  }}
                  className="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Ekle
                </button>
              </div>

              <div className="space-y-2">
                {connections.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                    Henüz eklenmiş hesap bağlantısı yok.
                  </p>
                ) : (
                  connections.map((c, idx) => (
                    <div
                      key={`${c.platform}-${idx}`}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-[#5865F2]">{c.platform}</span>
                        <span className="text-sm text-white">{c.handle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const updated = connections.filter((_, i) => i !== idx);
                          setConnections(updated);
                          await updateUserPreferences(profile.uid, { connections: updated });
                        }}
                        className="text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {subPage === 'privacy' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Shield className="w-4 h-4 text-[#23A55A]" />
                  <span>Oturum ve Güvenlik</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Turcord hesabın Google doğrulaması ve Firestore güvenlik kuralları ile korunur. Sunucu mesajları ve DM&apos;ler yalnızca yetkili katılımcılara açıktır.
                </p>
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Doğrulanmış Kimlik</span>
                  <span className="text-[#23A55A] font-medium">Aktif</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-white">Turcord Bot Güvenlik &amp; Hata Uyarıları</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Bağlantı veya ses izin sorunlarında resmi bottan anlık mesaj al
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={botAlerts}
                    onChange={(e) => updateUserPreferences(profile.uid, { botAlerts: e.target.checked })}
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>
              </div>
            </div>
          )}

          {subPage === 'bot' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name="Turcord" size="lg" status="online" showStatus ringBg="var(--bg-card)" botId="turcord_bot" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-bold text-white">Turcord</h3>
                      <VerifiedBotBadge label="ONAYLI UYGULAMA" />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Resmi platform destek ve yapay zeka asistan botu
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Turcord botu her türlü bağlantı, mikrofon veya kamera hatasında sana otomatik olarak DM gönderir. Ayrıca DM üzerinden veya sunucu kanallarında <code className="px-1 py-0.5 rounded bg-[var(--bg-surface)] text-white">/turcord</code> yazarak onunla sohbet edebilirsin.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {onOpenBotDm && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBotDm();
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Turcord Bot ile Konuş</span>
                    </button>
                  )}
                  {onRunDiagnostics && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onRunDiagnostics();
                        setDiagSent(true);
                        setTimeout(() => setDiagSent(false), 2500);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[#5865F2] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Activity className="w-4 h-4 text-[#23A55A]" />
                      <span>{diagSent ? 'Rapor DM’e Gönderildi' : 'Sistem Tanısı Gönder'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-white">Otomatik Sorun Bildirimleri</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Mikrofon, kamera veya çağrı hatalarında Turcord botundan otomatik uyarı al
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={botAlerts}
                    onChange={(e) => updateUserPreferences(profile.uid, { botAlerts: e.target.checked })}
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>
              </div>
            </div>
          )}

          {subPage === 'appearance' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                Uygulama temasını seç — değişiklik tüm arayüzde anında uygulanır.
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'oniks',
                    name: 'Oniks (AMOLED Siyah)',
                    desc: 'Ultra koyu, yüksek kontrastlı saf siyah görünüm',
                    swatch: '#09090C',
                  },
                  {
                    id: 'koyu',
                    name: 'Koyu (Klasik)',
                    desc: 'Standart gri-arduaz sohbet arayüzü',
                    swatch: '#313338',
                  },
                  {
                    id: 'gece',
                    name: 'Gece Mavisi',
                    desc: 'Derin lacivert tonlu gece modu',
                    swatch: '#0F131C',
                  },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => updateUserPreferences(profile.uid, { theme: th.id as AppearanceTheme })}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                      activeTheme === th.id
                        ? 'bg-[#5865F2]/15 border-[#5865F2]'
                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[#404249]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        style={{ backgroundColor: th.swatch }}
                        className="w-9 h-9 rounded-full border border-white/20 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{th.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{th.desc}</p>
                      </div>
                    </div>
                    {activeTheme === th.id && <Check className="w-5 h-5 text-[#5865F2]" />}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-white">Kompakt Mesaj Modu</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Kanallarda daha sıkı satır aralığı ve daha küçük avatar göster
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={(e) => updateUserPreferences(profile.uid, { compactMode: e.target.checked })}
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>
              </div>
            </div>
          )}

          {subPage === 'voice' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Ses Aygıtları
                  </span>
                  <button
                    type="button"
                    onClick={() => void enumerateAudioDevices(true)}
                    disabled={refreshingDevices}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-medium text-white cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingDevices ? 'animate-spin' : ''}`} />
                    <span>Cihazları Yenile</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Giriş Aygıtı (Mikrofon)
                  </label>
                  <select
                    value={selectedMicId}
                    onChange={(e) => {
                      setSelectedMicId(e.target.value);
                      setAudioPrefs({ micId: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
                  >
                    {audioInputs.length === 0 ? (
                      <option value="">Varsayılan Mikrofon</option>
                    ) : (
                      audioInputs.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Mikrofon ${idx + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Çıkış Aygıtı (Hoparlör / Kulaklık)
                  </label>
                  <select
                    value={selectedSpeakerId}
                    onChange={(e) => {
                      setSelectedSpeakerId(e.target.value);
                      setAudioPrefs({ speakerId: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-white outline-none"
                  >
                    {audioOutputs.length === 0 ? (
                      <option value="">Varsayılan Ses Çıkışı</option>
                    ) : (
                      audioOutputs.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Hoparlör ${idx + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">Giriş Sesi Seviyesi (Kazanç)</span>
                    <span className="font-mono text-[#949CF7] tabular-nums">{inputGain}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={inputGain}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setInputGain(val);
                      setAudioPrefs({ inputGain: val });
                    }}
                    className="w-full accent-[#5865F2] cursor-pointer"
                  />
                </div>

                <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-white">Gürültü Engelleme</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Arka plan klavye ve ortam sesini azaltır
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={noiseSuppression}
                      onChange={(e) => updateUserPreferences(profile.uid, { noiseSuppression: e.target.checked })}
                      className="w-4 h-4 accent-[#5865F2]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-white">Yankı Engelleme</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Hoparlör sesinin mikrofona geri dönmesini engeller
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={echoCancellation}
                      onChange={(e) => {
                        setEchoCancellation(e.target.checked);
                        setAudioPrefs({ echoCancellation: e.target.checked });
                      }}
                      className="w-4 h-4 accent-[#5865F2]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-white">Otomatik Ses Kontrolü (AGC)</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Ses yüksekliğini konuşma mesafene göre dengeler
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoGainControl}
                      onChange={(e) => {
                        setAutoGainControl(e.target.checked);
                        setAudioPrefs({ autoGainControl: e.target.checked });
                      }}
                      className="w-4 h-4 accent-[#5865F2]"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#23A55A]" />
                    Mikrofon Testi
                  </span>
                  <button
                    type="button"
                    onClick={() => setTestingMic((t) => !t)}
                    className="px-4 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium cursor-pointer"
                  >
                    {testingMic ? 'Testi Durdur' : 'Test Et'}
                  </button>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                  <div
                    style={{ width: `${micLevel}%` }}
                    className="h-full bg-[#23A55A] transition-all duration-75"
                  />
                </div>
                <label className="flex items-center justify-between pt-1 cursor-pointer">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Sesimi Geri Dinle (Loopback)
                  </span>
                  <input
                    type="checkbox"
                    checked={loopbackTest}
                    onChange={(e) => setLoopbackTest(e.target.checked)}
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>
                <p className="text-xs text-[var(--text-muted)]">
                  Konuştuğunda yeşil çubuk hareket ediyorsa mikrofonun sesli kanallar için hazırdır. Kazanç ve cihaz seçimleri aktif görüşmelere anında uygulanır.
                </p>
              </div>
            </div>
          )}

          {subPage === 'chat' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-white">Yazıyor Göstergesi</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Kanal ve DM sohbetlerinde kimlerin yazdığını göster
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showTyping}
                    onChange={(e) =>
                      updateUserPreferences(profile.uid, { showTypingIndicator: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-[var(--border-subtle)]">
                  <div>
                    <p className="text-sm font-medium text-white">Bahsetme &amp; Yanıt Bildirimleri</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Mesajına yanıt geldiğinde Bildirimler kutusuna ekle
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={mentionNotifs}
                    onChange={(e) => updateUserPreferences(profile.uid, { mentionNotifs: e.target.checked })}
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>
              </div>
            </div>
          )}

          {subPage === 'notifications' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-white">Yanıt ve Bahsetme Bildirimleri</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Kanallarda yanıt veya bahsetme aldığında bildirim kutusuna düşsün
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={mentionNotifs}
                    onChange={(e) => updateUserPreferences(profile.uid, { mentionNotifs: e.target.checked })}
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-[var(--border-subtle)]">
                  <div>
                    <p className="text-sm font-medium text-white">Turcord Bot Sistem Bildirimleri</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Teknik uyarı ve sistem tanısı mesajlarını bildir
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={botAlerts}
                    onChange={(e) => updateUserPreferences(profile.uid, { botAlerts: e.target.checked })}
                    className="w-4 h-4 accent-[#5865F2]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNotifications();
                }}
                className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium cursor-pointer"
              >
                Bildirimler &amp; İşaretler Kutusunu Aç
              </button>
            </div>
          )}

          {subPage === 'advanced' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Uygulama Sürümü</span>
                  <span className="font-mono text-white">Turcord Web v2.4</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Gerçek Zamanlı Ses/Yazıyor Sunucusu</span>
                  <span className={wsConnected ? 'text-[#23A55A] font-medium' : 'text-amber-400 font-medium'}>
                    {wsConnected ? 'Bağlı' : 'Çevrimdışı / Statik Mod'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Kullanıcı Kimliği (UID)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(profile.uid).catch(() => {});
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-white cursor-pointer"
                  >
                    <span>{copiedId ? 'Kopyalandı' : `${profile.uid.slice(0, 10)}...`}</span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {onRunDiagnostics && (
                <button
                  type="button"
                  onClick={async () => {
                    await onRunDiagnostics();
                    setDiagSent(true);
                    setTimeout(() => setDiagSent(false), 2500);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#5865F2] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-[#23A55A]" />
                  <span>{diagSent ? 'Tanı Raporu Turcord DM’e Gönderildi' : 'Tam Sistem Tanısı Çalıştır'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
