import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AtSign,
  Bot,
  Hash,
  ImagePlus,
  Megaphone,
  Phone,
  Pin,
  Search,
  SendHorizontal,
  Smile,
  Sparkles,
  Star,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { ChatMessage, ServerEmoji } from '../types/halka';
import {
  fetchRemoteGifs,
  filterBuiltinGifs,
  getFavoriteGifs,
  GIF_CATEGORIES,
  isSafeMediaUrl,
  toggleFavoriteGif,
  type GifCategory,
  type GifItem,
} from '../lib/gifLibrary';
import { OFFICIAL_BOTS, SLASH_COMMANDS } from '../lib/turcordBots';
import { Avatar, VerifiedBotBadge } from './Avatar';
import { MessageItem } from './MessageItem';

const COMPOSER_EMOJIS = [
  '😀', '😂', '🥹', '😍', '😎', '🤯', '😭', '😡',
  '🔥', '❤️', '👍', '👎', '👏', '🎉', '🏆', '🎮',
  '💻', '🚀', '👀', '✅', '⚡', '💀', '🤝', '🫡',
  '🇹🇷', '☕', '🎧', '🍕', '🎵', '💯', '✨', '🌟',
];

interface ChatAreaProps {
  mode: 'channel' | 'dm';
  title: string;
  subtitle?: string;
  channelType?: 'text' | 'voice' | 'announcement';
  channelKey: string;
  messages: ChatMessage[];
  currentUid: string;
  canModerate: boolean;
  canPin: boolean;
  serverEmojis?: ServerEmoji[];
  showMemberList?: boolean;
  showTypingIndicator?: boolean;
  compactMode?: boolean;
  isBotThread?: boolean;
  enableSlashCommands?: boolean;
  enabledBots?: string[];
  botThinking?: boolean;
  quickPrompts?: string[];
  onRunDiagnostics?: () => void;
  onOpenEmojiSettings?: () => void;
  onToggleMemberList?: () => void;
  typingUsers: Array<{ uid: string; displayName: string }>;
  onTyping: (channelKey: string, isTyping: boolean) => void;
  onSendMessage: (payload: {
    content: string;
    attachmentUrl?: string;
    attachmentName?: string;
    replyTo?: ChatMessage | null;
  }) => Promise<void>;
  onEditMessage: (msgId: string, newContent: string) => Promise<void>;
  onDeleteMessage: (msgId: string) => Promise<void>;
  onToggleReaction: (msg: ChatMessage, emoji: string) => Promise<void>;
  onTogglePin?: (msg: ChatMessage) => Promise<void>;
  onBookmark?: (msg: ChatMessage) => Promise<void>;
  onAuthorClick?: (uid: string) => void;
  onStartDmCall?: (video: boolean) => void;
}

async function compressImageToDataUrl(file: File): Promise<string> {
  if (file.type === 'image/gif') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('GIF dosyası okunamadı.'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas hatası'));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.78);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  mode,
  title,
  subtitle,
  channelType = 'text',
  channelKey,
  messages,
  currentUid,
  canModerate,
  canPin,
  serverEmojis = [],
  showMemberList,
  showTypingIndicator = true,
  compactMode = false,
  isBotThread = false,
  enableSlashCommands = false,
  enabledBots,
  botThinking = false,
  quickPrompts,
  onRunDiagnostics,
  onOpenEmojiSettings,
  onToggleMemberList,
  typingUsers,
  onTyping,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onTogglePin,
  onBookmark,
  onAuthorClick,
  onStartDmCall,
}) => {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinsOpen, setPinsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifCategory, setGifCategory] = useState<GifCategory | 'Favoriler'>('Tümü');
  const [favoriteGifs, setFavoriteGifs] = useState<GifItem[]>(() => getFavoriteGifs());
  const [remoteGifs, setRemoteGifs] = useState<GifItem[]>([]);
  const [gifCustomUrl, setGifCustomUrl] = useState('');
  const [gifUrlError, setGifUrlError] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [emojiAutoIndex, setEmojiAutoIndex] = useState(0);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const el = feedRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, channelKey]);

  useEffect(() => {
    setReplyTo(null);
    setSearchOpen(false);
    setSearchQuery('');
    setPinsOpen(false);
    setEmojiOpen(false);
    setGifOpen(false);
    setUploadError(null);
  }, [channelKey]);

  useEffect(() => {
    if (!gifOpen || gifCategory === 'Favoriler') return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const remote = await fetchRemoteGifs(gifQuery);
      if (!cancelled) setRemoteGifs(remote);
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [gifOpen, gifQuery, gifCategory]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.authorName.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned), [messages]);

  const activeSlashMatches = useMemo(() => {
    if (!enableSlashCommands) return [];
    if (!text.startsWith('/') || text.includes(' ')) return [];
    const needle = text.toLowerCase();
    return SLASH_COMMANDS.filter((c) => {
      if (mode === 'dm' && c.serverOnly) return false;
      if (enabledBots && !enabledBots.includes(c.botId)) return false;
      return c.cmd.toLowerCase().startsWith(needle);
    });
  }, [enableSlashCommands, text, mode, enabledBots]);

  const emojiShortcodeMatch = useMemo(() => {
    if (serverEmojis.length === 0) return null;
    const m = /(?:^|\s):([a-z0-9_]{1,24})$/i.exec(text);
    if (!m) return null;
    const needle = m[1].toLowerCase();
    const list = serverEmojis.filter((e) => e.name.toLowerCase().includes(needle)).slice(0, 8);
    return list.length > 0 ? { query: m[1], list } : null;
  }, [serverEmojis, text]);

  const displayedGifs = useMemo(() => {
    if (gifCategory === 'Favoriler') {
      const q = gifQuery.trim().toLowerCase();
      return favoriteGifs.filter(
        (g) => !q || g.title.toLowerCase().includes(q) || g.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    const builtins = filterBuiltinGifs(gifQuery, gifCategory);
    if (gifCategory === 'Tümü' && remoteGifs.length > 0) {
      const seen = new Set(builtins.map((b) => b.url));
      return [...builtins, ...remoteGifs.filter((r) => !seen.has(r.url))];
    }
    return builtins;
  }, [gifCategory, gifQuery, favoriteGifs, remoteGifs]);

  const filteredServerEmojis = useMemo(() => {
    const q = emojiSearch.trim().toLowerCase();
    if (!q) return serverEmojis;
    return serverEmojis.filter((e) => e.name.toLowerCase().includes(q));
  }, [serverEmojis, emojiSearch]);

  useEffect(() => {
    setSlashIndex(0);
  }, [activeSlashMatches.length, text]);

  useEffect(() => {
    setEmojiAutoIndex(0);
  }, [emojiShortcodeMatch?.list.length, text]);

  const handleSelectSlashCommand = (usage: string) => {
    setText(usage);
    inputRef.current?.focus();
  };

  const handleSelectAutocompleteEmoji = (emojiName: string) => {
    setText((prev) => prev.replace(/:([a-z0-9_]{1,24})$/i, `:${emojiName}: `));
    inputRef.current?.focus();
  };

  const handleSendGif = async (gif: GifItem) => {
    if (sending) return;
    setSending(true);
    setGifOpen(false);
    setUploadError(null);
    onTyping(channelKey, false);
    try {
      await onSendMessage({
        content: text.trim(),
        attachmentUrl: gif.url,
        attachmentName: `${gif.title || 'gif'}.gif`.slice(0, 120),
        replyTo,
      });
      setText('');
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleSendCustomGifUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setGifUrlError(null);
    const trimmed = gifCustomUrl.trim();
    if (!isSafeMediaUrl(trimmed)) {
      setGifUrlError('Geçerli bir https:// GIF bağlantısı yapıştırın.');
      return;
    }
    const item: GifItem = {
      id: `url_${Date.now()}`,
      title: 'Özel GIF',
      url: trimmed,
      previewUrl: trimmed,
      category: 'Tepki',
      tags: ['url'],
      isRemote: true,
    };
    setGifCustomUrl('');
    await handleSendGif(item);
  };

  const handleInputChange = (val: string) => {
    setText(val);
    if (!showTypingIndicator) return;
    if (val.trim().length > 0) {
      onTyping(channelKey, true);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        onTyping(channelKey, false);
      }, 2500);
    } else {
      onTyping(channelKey, false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !attachmentUrl) || sending) return;
    setSending(true);
    setUploadError(null);
    onTyping(channelKey, false);
    try {
      await onSendMessage({
        content: text,
        attachmentUrl,
        attachmentName,
        replyTo,
      });
      setText('');
      setReplyTo(null);
      setAttachmentUrl('');
      setAttachmentName('');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const compressed = await compressImageToDataUrl(file);
      if (compressed.length > 260000) {
        setUploadError('Görsel boyutu çok büyük, lütfen daha küçük bir görsel seçin.');
        return;
      }
      setAttachmentUrl(compressed);
      setAttachmentName(file.name);
    } catch {
      setUploadError('Görsel işlenemedi.');
    } finally {
      e.target.value = '';
    }
  };

  const isGrouped = (idx: number) => {
    if (idx === 0) return false;
    const prev = filteredMessages[idx - 1];
    const curr = filteredMessages[idx];
    if (curr.replyToId) return false;
    if (prev.authorId !== curr.authorId) return false;
    const prevMs = prev.createdAt?.toMillis ? prev.createdAt.toMillis() : 0;
    const currMs = curr.createdAt?.toMillis ? curr.createdAt.toMillis() : 0;
    return currMs - prevMs < 5 * 60 * 1000;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-[var(--bg-surface)]">
      {/* Top Bar */}
      <header className="h-12 shrink-0 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {isBotThread ? (
            <Bot className="w-5 h-5 text-[#5865F2] shrink-0" />
          ) : mode === 'dm' ? (
            <AtSign className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
          ) : channelType === 'announcement' ? (
            <Megaphone className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
          ) : (
            <Hash className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
          )}
          <h1 className="font-display font-semibold text-[15px] text-white whitespace-nowrap shrink-0">
            {title}
          </h1>
          {isBotThread && <VerifiedBotBadge />}
          {subtitle && (
            <>
              <span className="text-[var(--border-subtle)] hidden sm:inline" aria-hidden="true">|</span>
              <p className="text-xs text-[var(--text-muted)] truncate hidden sm:block">{subtitle}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isBotThread && onRunDiagnostics && (
            <button
              onClick={onRunDiagnostics}
              title="Sistem Tanısı Çalıştır"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/40 hover:bg-[#5865F2]/25 text-xs font-medium text-[#A5B4FC] transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sistem Tanısı</span>
            </button>
          )}
          {mode === 'dm' && !isBotThread && onStartDmCall && (
            <>
              <button
                onClick={() => onStartDmCall(false)}
                title="Sesli Arama Başlat"
                className="p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartDmCall(true)}
                title="Görüntülü Arama Başlat"
                className="p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {mode === 'channel' && (
            <div className="relative">
              <button
                onClick={() => setPinsOpen((p) => !p)}
                title="Sabitlenmiş Mesajlar"
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  pinsOpen ? 'bg-[var(--bg-elevated)] text-white' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Pin className="w-4 h-4" />
              </button>
              {pinsOpen && (
                <div className="absolute right-0 top-10 w-80 max-h-96 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-3 z-30 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <span className="text-sm font-semibold text-white">Sabitlenmiş Mesajlar</span>
                    <button onClick={() => setPinsOpen(false)} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {pinnedMessages.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-4 text-center">Bu kanalda henüz sabitlenmiş mesaj yok.</p>
                  ) : (
                    pinnedMessages.map((pm) => (
                      <div key={pm.id} className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{pm.authorName}</span>
                          {canPin && onTogglePin && (
                            <button
                              onClick={() => onTogglePin(pm)}
                              className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                            >
                              Kaldır
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] break-words">{pm.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setSearchOpen((s) => !s)}
            title="Mesajlarda Ara"
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              searchOpen ? 'bg-[var(--bg-elevated)] text-white' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {searchOpen && (
            <div className="flex items-center bg-[var(--bg-input)] rounded-md px-2.5 py-1 border border-[var(--border-subtle)]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mesaj ara..."
                autoFocus
                className="w-36 bg-transparent text-xs text-white placeholder-[var(--text-muted)] outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {mode === 'channel' && onToggleMemberList && (
            <button
              onClick={onToggleMemberList}
              title="Üye Listesi"
              className={`p-2 rounded-md transition-colors cursor-pointer ${
                showMemberList ? 'bg-[var(--bg-elevated)] text-white' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Message Feed */}
      <div ref={feedRef} className="flex-1 min-h-0 overflow-y-auto py-4">
        <div className="px-4 pb-4 mb-2 border-b border-[var(--border-subtle)]">
          {isBotThread ? (
            <div className="mb-3">
              <Avatar name="Turcord" size="lg" botId="turcord_bot" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center mb-3 text-white">
              {mode === 'dm' ? <AtSign className="w-7 h-7" /> : <Hash className="w-7 h-7" />}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-2xl font-bold text-white">
              {mode === 'dm' ? `${title}` : `#${title} kanalına hoş geldin!`}
            </h2>
            {isBotThread && <VerifiedBotBadge label="ONAYLI UYGULAMA" />}
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {isBotThread
              ? 'Resmi Turcord Botu: Platform sorunlarında otomatik uyarılar gönderir ve tüm sorularını yanıtlar.'
              : mode === 'dm'
              ? `${title} sohbet geçmişinin başlangıcı.`
              : subtitle || `Burası #${title} kanalının başlangıcıdır.`}
          </p>
          {isBotThread && quickPrompts && quickPrompts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {quickPrompts.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  disabled={sending || botThinking}
                  onClick={() => onSendMessage({ content: qp })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#5865F2] text-xs font-medium text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 text-[#5865F2]" />
                  <span>{qp}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredMessages.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
            {searchQuery ? 'Aramayla eşleşen mesaj bulunamadı.' : 'Henüz mesaj yok. İlk mesajı sen gönder!'}
          </div>
        ) : (
          filteredMessages.map((msg, idx) => (
            <MessageItem
              key={msg.id}
              message={msg}
              grouped={isGrouped(idx)}
              compactMode={compactMode}
              currentUid={currentUid}
              canModerate={canModerate}
              canPin={canPin}
              serverEmojis={serverEmojis}
              onReply={setReplyTo}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onToggleReaction={onToggleReaction}
              onTogglePin={onTogglePin}
              onBookmark={onBookmark}
              onAuthorClick={onAuthorClick}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-4 pb-4 pt-1 shrink-0 relative">
        {/* Slash Command Autocomplete Popup */}
        {activeSlashMatches.length > 0 && (
          <div className="mb-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden z-30">
            <div className="px-3.5 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase">
              <span>Bot Komutları</span>
              <span>↑↓ Seç · Tab / Enter Uygula</span>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)]/50">
              {activeSlashMatches.map((item, idx) => {
                const bot = OFFICIAL_BOTS[item.botId];
                const selected = idx === slashIndex;
                return (
                  <button
                    key={item.cmd}
                    type="button"
                    onClick={() => handleSelectSlashCommand(item.usage)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      selected ? 'bg-[#5865F2]/20' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={bot.name} size="xs" botId={bot.id} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-white">{item.cmd}</span>
                          <span className="text-[11px] text-[var(--text-muted)] truncate">{bot.name}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{item.desc}</p>
                      </div>
                    </div>
                    <VerifiedBotBadge />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Emoji :shortcode: Autocomplete Popup */}
        {!activeSlashMatches.length && emojiShortcodeMatch && (
          <div className="mb-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden z-30">
            <div className="px-3.5 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase">
              <span>Sunucu Emojileri</span>
              <span>↑↓ Seç · Tab Ekle</span>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-[var(--border-subtle)]/40">
              {emojiShortcodeMatch.list.map((em, idx) => {
                const selected = idx === emojiAutoIndex;
                return (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => handleSelectAutocompleteEmoji(em.name)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors cursor-pointer ${
                      selected ? 'bg-[#5865F2]/20' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={em.imageUrl} alt={`:${em.name}:`} className="w-6 h-6 object-contain shrink-0" />
                      <span className="font-mono text-sm font-medium text-white truncate">:{em.name}:</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">Özel Emoji</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="text-rose-200 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {replyTo && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-t-lg bg-[var(--bg-card)] border border-b-0 border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <span className="truncate">
              <strong className="text-white">{replyTo.authorName}</strong> kişisine yanıt veriliyor
            </span>
            <button onClick={() => setReplyTo(null)} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {attachmentUrl && (
          <div className="flex items-center gap-3 p-2.5 rounded-t-lg bg-[var(--bg-card)] border border-b-0 border-[var(--border-subtle)]">
            <img
              src={attachmentUrl}
              alt={attachmentName}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded object-cover border border-[var(--border-subtle)]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{attachmentName}</p>
              <p className="text-[11px] text-[var(--text-muted)]">Gönderilmeye hazır görsel eki</p>
            </div>
            <button
              onClick={() => {
                setAttachmentUrl('');
                setAttachmentName('');
              }}
              className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`relative flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] ${
            replyTo || attachmentUrl ? 'rounded-b-xl' : 'rounded-xl'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Görsel Yükle"
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors cursor-pointer shrink-0"
          >
            <ImagePlus className="w-5 h-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (activeSlashMatches.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSlashIndex((i) => (i + 1) % activeSlashMatches.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSlashIndex((i) => (i - 1 + activeSlashMatches.length) % activeSlashMatches.length);
                  return;
                }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const chosen = activeSlashMatches[slashIndex];
                  if (chosen) handleSelectSlashCommand(chosen.usage);
                  return;
                }
              }
              if (emojiShortcodeMatch && emojiShortcodeMatch.list.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setEmojiAutoIndex((i) => (i + 1) % emojiShortcodeMatch.list.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setEmojiAutoIndex(
                    (i) => (i - 1 + emojiShortcodeMatch.list.length) % emojiShortcodeMatch.list.length
                  );
                  return;
                }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const chosen = emojiShortcodeMatch.list[emojiAutoIndex];
                  if (chosen) handleSelectAutocompleteEmoji(chosen.name);
                  return;
                }
              }
            }}
            placeholder={
              isBotThread
                ? 'Turcord botuna bir soru yaz veya /durum komutunu dene...'
                : mode === 'dm'
                ? `${title} sohbetine mesaj gönder`
                : enableSlashCommands
                ? `#${title} kanalına mesaj veya /komut yaz`
                : `#${title} kanalına mesaj gönder`
            }
            maxLength={2000}
            className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none min-w-0"
          />

          {/* GIF Picker Button & Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setGifOpen((o) => !o);
                setEmojiOpen(false);
              }}
              title="GIF Gönder"
              className={`px-2 py-1 rounded-md text-[11px] font-bold tracking-wide border transition-colors cursor-pointer ${
                gifOpen
                  ? 'bg-[#5865F2] border-[#5865F2] text-white'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)]'
              }`}
            >
              GIF
            </button>
            {gifOpen && (
              <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 bottom-20 sm:bottom-11 sm:w-[360px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[420px]">
                <div className="p-3 border-b border-[var(--border-subtle)] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                      <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <input
                        type="text"
                        value={gifQuery}
                        onChange={(e) => setGifQuery(e.target.value)}
                        placeholder="GIF ara (ör: gg, kalp, haha, dans)..."
                        autoFocus
                        className="w-full bg-transparent text-xs text-white placeholder-[var(--text-muted)] outline-none"
                      />
                      {gifQuery && (
                        <button
                          type="button"
                          onClick={() => setGifQuery('')}
                          className="text-[var(--text-muted)] hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGifOpen(false)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    {(['Favoriler', ...GIF_CATEGORIES] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setGifCategory(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                          gifCategory === cat
                            ? 'bg-[#5865F2] text-white'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        {cat === 'Favoriler' && <Star className="w-3 h-3" />}
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 overflow-y-auto flex-1">
                  {displayedGifs.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[var(--text-muted)] space-y-1">
                      <p>
                        {gifCategory === 'Favoriler'
                          ? 'Henüz favori GIF eklemedin. Beğendiğin GIF’lerin yıldızına dokunabilirsin.'
                          : 'Eşleşen GIF bulunamadı.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {displayedGifs.map((gif) => {
                        const isFav = favoriteGifs.some((f) => f.url === gif.url || f.id === gif.id);
                        return (
                          <div
                            key={gif.id}
                            className="group/gif relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] aspect-[16/10]"
                          >
                            <button
                              type="button"
                              onClick={() => void handleSendGif(gif)}
                              className="w-full h-full block cursor-pointer"
                            >
                              <img
                                src={gif.previewUrl}
                                alt={gif.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/gif:scale-105 transition-transform"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2 py-1 text-left">
                                <span className="text-[11px] font-medium text-white truncate block">
                                  {gif.title}
                                </span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFavoriteGifs(toggleFavoriteGif(gif));
                              }}
                              title={isFav ? 'Favorilerden Kaldır' : 'Favorilere Ekle'}
                              className={`absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer ${
                                isFav
                                  ? 'text-amber-400 opacity-100'
                                  : 'text-white/75 opacity-0 group-hover/gif:opacity-100 hover:text-amber-300'
                              }`}
                            >
                              <Star className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom GIF URL Input */}
                <form
                  onSubmit={handleSendCustomGifUrl}
                  className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={gifCustomUrl}
                      onChange={(e) => {
                        setGifCustomUrl(e.target.value);
                        setGifUrlError(null);
                      }}
                      placeholder="Veya https://... GIF linki yapıştır"
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-white placeholder-[var(--text-muted)] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!gifCustomUrl.trim() || sending}
                      className="px-2.5 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-45 text-white text-[11px] font-medium cursor-pointer shrink-0"
                    >
                      Gönder
                    </button>
                  </div>
                  {gifUrlError && <p className="text-[11px] text-rose-400">{gifUrlError}</p>}
                </form>
              </div>
            )}
          </div>

          {/* Emoji Picker Button & Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setEmojiOpen((o) => !o);
                setGifOpen(false);
              }}
              title="Emoji Seç"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                emojiOpen
                  ? 'bg-[#5865F2] text-white'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>
            {emojiOpen && (
              <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 bottom-20 sm:bottom-11 sm:w-80 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-2xl z-40 space-y-3 max-h-[380px] flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <input
                      type="text"
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                      placeholder="Emoji ara (:kisa_ad:)..."
                      className="w-full bg-transparent text-xs text-white placeholder-[var(--text-muted)] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmojiOpen(false)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-3 pr-0.5">
                  {mode === 'channel' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Sunucu Emojileri ({filteredServerEmojis.length})
                        </span>
                        {onOpenEmojiSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmojiOpen(false);
                              onOpenEmojiSettings();
                            }}
                            className="text-[11px] font-medium text-[#949CF7] hover:underline cursor-pointer"
                          >
                            + Emoji Ekle
                          </button>
                        )}
                      </div>
                      {filteredServerEmojis.length === 0 ? (
                        <p className="text-[11px] text-[var(--text-muted)] py-2">
                          {serverEmojis.length === 0
                            ? 'Bu sunucuda henüz özel emoji yok.'
                            : 'Aramayla eşleşen özel emoji bulunamadı.'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-6 gap-1">
                          {filteredServerEmojis.map((se) => (
                            <button
                              key={se.id}
                              type="button"
                              title={`:${se.name}:`}
                              onClick={() => {
                                setText((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}:${se.name}: `);
                                setEmojiOpen(false);
                                inputRef.current?.focus();
                              }}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer"
                            >
                              <img src={se.imageUrl} alt={`:${se.name}:`} className="w-7 h-7 object-contain" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Standart Emojiler
                    </span>
                    <div className="grid grid-cols-8 gap-1">
                      {COMPOSER_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setText((t) => t + em);
                            setEmojiOpen(false);
                            inputRef.current?.focus();
                          }}
                          className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-lg cursor-pointer flex items-center justify-center"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={(!text.trim() && !attachmentUrl) || sending}
            title="Gönder"
            className="p-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </form>

        {/* Live Typing & Bot Thinking Indicator */}
        <div className="h-5 mt-1 px-1 flex items-center text-xs text-[var(--text-secondary)] gap-2">
          {botThinking ? (
            <span className="inline-flex items-center gap-1.5 text-[#8B9BFF]">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
              <strong>Turcord</strong> yanıt hazırlıyor...
            </span>
          ) : (
            showTypingIndicator &&
            typingUsers.length > 0 && (
              <span>
                <strong className="text-white">
                  {typingUsers.map((t) => t.displayName).join(', ')}
                </strong>{' '}
                yazıyor...
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
};
