import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Gem,
  Globe,
  Hash,
  Info,
  Link2,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  Mic,
  Palette,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import type {
  AppearanceTheme,
  ChannelType,
  MemberRole,
  PublicProfile,
  ServerDoc,
  ServerMember,
  UserConnection,
  UserStatus,
} from '../types/halka';
import { fetchPublicServers, ROLE_LABELS, updateUserPreferences } from '../lib/halkaService';
import { Avatar } from './Avatar';

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
  onCreate: (input: { name: string; type: ChannelType; category: string; topic: string }) => Promise<void>;
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      await onCreate({ name, type, category, topic });
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
              { id: 'text', label: 'Metin Kanalı', desc: 'Mesaj, görsel ve dosya paylaş', icon: Hash },
              { id: 'voice', label: 'Sesli Kanal', desc: 'Ses, kamera ve ekran paylaşımı', icon: Volume2 },
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
interface ServerSettingsModalProps {
  server: ServerDoc;
  members: ServerMember[];
  myRole: MemberRole;
  onClose: () => void;
  onSave: (updates: { name: string; description: string; iconEmoji: string; iconColor: string; isPublic: boolean }) => Promise<void>;
  onChangeRole: (member: ServerMember, role: Exclude<MemberRole, 'owner'>) => Promise<void>;
  onKick: (member: ServerMember) => Promise<void>;
  onDeleteServer: () => Promise<void>;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  server,
  members,
  myRole,
  onClose,
  onSave,
  onChangeRole,
  onKick,
  onDeleteServer,
}) => {
  const [tab, setTab] = useState<'general' | 'members'>('general');
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description);
  const [iconEmoji, setIconEmoji] = useState(server.iconEmoji);
  const [iconColor, setIconColor] = useState(server.iconColor);
  const [isPublic, setIsPublic] = useState(server.isPublic);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name, description, iconEmoji, iconColor, isPublic });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Sunucu Ayarları" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <button
            onClick={() => setTab('general')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              tab === 'general' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            Genel Ayarlar
          </button>
          <button
            onClick={() => setTab('members')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              tab === 'members' ? 'bg-[#5865F2] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Üyeler &amp; Roller ({members.length})</span>
          </button>
        </div>

        {tab === 'general' ? (
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
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.uid}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[var(--bg-card)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={m.avatarUrl} name={m.displayName} size="sm" />
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
        )}
      </div>
    </ModalShell>
  );
};

// 6. Categorized Discord Onyx User Settings Modal (Screenshots 1-5)
type SettingsSubPage = 'menu' | 'account' | 'connections' | 'appearance' | 'voice' | 'chat' | 'notifications';

interface UserSettingsModalProps {
  profile: PublicProfile;
  unreadNotificationsCount: number;
  onClose: () => void;
  onOpenShop: (tab: 'shop' | 'quests') => void;
  onOpenNotifications: () => void;
  onSave: (updates: {
    displayName: string;
    username: string;
    bio: string;
    status: UserStatus;
    customStatus: string;
    bannerColor: string;
    avatarUrl: string;
    clanTag?: string;
    connections?: UserConnection[];
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  profile,
  unreadNotificationsCount,
  onClose,
  onOpenShop,
  onOpenNotifications,
  onSave,
  onSignOut,
}) => {
  const [subPage, setSubPage] = useState<SettingsSubPage>('menu');
  const [search, setSearch] = useState('');

  // Editable Profile State
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [status, setStatus] = useState<UserStatus>(profile.status);
  const [customStatus, setCustomStatus] = useState(profile.customStatus);
  const [bannerColor, setBannerColor] = useState(profile.bannerColor || '#5865F2');
  const [clanTag, setClanTag] = useState(profile.clanTag || '');
  const [connections, setConnections] = useState<UserConnection[]>(profile.connections || []);
  const [newConnPlatform, setNewConnPlatform] = useState<UserConnection['platform']>('Spotify');
  const [newConnHandle, setNewConnHandle] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [testingMic, setTestingMic] = useState(false);

  const activeTheme: AppearanceTheme = profile.theme || 'oniks';
  const showTyping = profile.showTypingIndicator ?? true;
  const mentionNotifs = profile.mentionNotifs ?? true;

  useEffect(() => {
    if (!testingMic) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let timer = 0;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(s);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
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
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      setMicLevel(0);
    };
  }, [testingMic]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        displayName,
        username,
        bio,
        status,
        customStatus,
        bannerColor,
        avatarUrl: profile.avatarUrl,
        clanTag,
        connections,
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
    connections: 'Bağlantılar',
    appearance: 'Görünüm',
    voice: 'Ses ve Görüntü',
    chat: 'Sohbet & Yazıyor Göstergesi',
    notifications: 'Bildirimler',
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
                  placeholder="Ara"
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

              {/* Topluluk & Mağaza */}
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-[var(--text-muted)]">Ödüller &amp; Özelleştirme</p>
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
                  {matches('Ses ve Görüntü') && (
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
                  {matches('Görünüm Oniks Koyu Gece') && (
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
                        <span>Yazıyor Göstergesi &amp; Sohbet</span>
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
                      onClick={() => {
                        onClose();
                        onOpenNotifications();
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 text-sm text-white">
                        <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
                        <span>Bildirimler</span>
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
                  Halka Platformu
                </span>
                <span>Web Sürümü</span>
              </div>
            </>
          )}

          {subPage === 'account' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Çevrimiçi Durum
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
                    Klan Etiketi
                  </label>
                  <input
                    type="text"
                    value={clanTag}
                    onChange={(e) => setClanTag(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="Örn: CİX"
                    maxLength={8}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white font-mono uppercase outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                  Özel Durum (Düşünce Balonu)
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="Son zamanlarda ne dinliyorsun veya oynuyorsun?"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none"
                />
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

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                  Banner Rengi
                </label>
                <div className="flex gap-2">
                  {['#E9D5FF', '#5865F2', '#248046', '#DA373C', '#F59E0B', '#0EA5E9'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setBannerColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-lg cursor-pointer ${
                        bannerColor === col ? 'ring-2 ring-white' : ''
                      }`}
                    />
                  ))}
                </div>
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

          {subPage === 'appearance' && (
            <div className="space-y-3">
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
            </div>
          )}

          {subPage === 'voice' && (
            <div className="space-y-4">
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
                <p className="text-xs text-[var(--text-muted)]">
                  Konuştuğunda yeşil çubuk hareket ediyorsa mikrofonun sesli kanallar için hazırdır.
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
        </div>
      </div>
    </div>
  );
};
