import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Bookmark,
  Check,
  Copy,
  CornerUpLeft,
  Download,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Pin,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
import type { AvatarDecorationId, ChatMessage, LinkPreviewData, ServerEmoji } from '../types/halka';
import { isSafeMediaUrl } from '../lib/gifLibrary';
import { isOfficialBotUid } from '../lib/turcordBots';
import { Avatar, VerifiedBotBadge } from './Avatar';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👀'];

const ogPreviewCache = new Map<string, LinkPreviewData | null>();
const ogInFlight = new Map<string, Promise<LinkPreviewData | null>>();

function fetchOgPreviewOnce(url: string): Promise<LinkPreviewData | null> {
  if (ogPreviewCache.has(url)) {
    return Promise.resolve(ogPreviewCache.get(url) ?? null);
  }
  const existing = ogInFlight.get(url);
  if (existing) return existing;

  const p = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as { preview?: LinkPreviewData | null };
      return json.preview || null;
    })
    .catch(() => null)
    .then((data) => {
      ogPreviewCache.set(url, data);
      ogInFlight.delete(url);
      return data;
    });

  ogInFlight.set(url, p);
  return p;
}

function extractFirstPreviewUrl(content: string): string | null {
  if (!content) return null;
  const match = /https:\/\/[^\s<>"'`]+/i.exec(content);
  if (!match) return null;
  const candidate = match[0].replace(/[),.!?;:]+$/, '');
  if (/\.(png|jpe?g|gif|webp|mp4|webm)(\?.*)?$/i.test(candidate)) return null;
  return candidate;
}

interface MessageItemProps {
  message: ChatMessage;
  grouped: boolean;
  compactMode?: boolean;
  currentUid: string;
  currentUsername?: string;
  canModerate: boolean;
  canPin: boolean;
  serverEmojis?: ServerEmoji[];
  authorDecoration?: AvatarDecorationId;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msgId: string, newContent: string) => Promise<void>;
  onDelete: (msgId: string) => Promise<void>;
  onToggleReaction: (msg: ChatMessage, emoji: string) => Promise<void>;
  onVotePoll?: (msg: ChatMessage, optionIndex: number) => Promise<void>;
  onTogglePin?: (msg: ChatMessage) => Promise<void>;
  onBookmark?: (msg: ChatMessage) => Promise<void>;
  onAuthorClick?: (uid: string) => void;
}

type ActionMenuState =
  | { open: false }
  | { open: true; mode: 'sheet' }
  | { open: true; mode: 'popover'; x: number; y: number };

function formatTime(msg: ChatMessage): string {
  const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(msg: ChatMessage): string {
  const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Bugün ${timeStr}`;
  return `${date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${timeStr}`;
}

async function downloadAttachment(url: string, filename?: string): Promise<void> {
  const safeName = (filename || 'turcord-gorsel.webp').replace(/[/\\?%*:|"<>]/g, '_');
  const triggerLink = (href: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = safeName;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    triggerLink(url);
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    triggerLink(objUrl);
    setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
  } catch {
    triggerLink(url);
  }
}

const SpoilerText: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((r) => !r);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setRevealed((r) => !r);
        }
      }}
      title={revealed ? 'Gizlemek için tıkla' : 'Spoilerı görmek için tıkla'}
      className={`px-1 py-0.5 mx-0.5 rounded transition-colors cursor-pointer ${
        revealed
          ? 'bg-white/10 text-[#DBDEE1]'
          : 'bg-[#1E1F22] text-transparent hover:bg-[#2B2D31] select-none'
      }`}
    >
      {children}
    </span>
  );
};

function renderInlineFormatting(
  text: string,
  emojiMap: Map<string, ServerEmoji>,
  jumbo = false,
  currentUsername?: string
): React.ReactNode[] {
  const tokenRegex =
    /(\|\|[^|]+\|\||~~[^~]+~~|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s]+|:[a-z0-9_]{2,24}:|@[a-z0-9_.]{2,32})/gi;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('||') && part.endsWith('||') && part.length > 4) {
      return <SpoilerText key={idx}>{part.slice(2, -2)}</SpoilerText>;
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return (
        <del key={idx} className="line-through text-[var(--text-muted)]">
          {part.slice(2, -2)}
        </del>
      );
    }
    if (part.startsWith('@') && part.length >= 3) {
      const handle = part.slice(1).toLowerCase();
      const hitsMe =
        handle === 'everyone' ||
        (currentUsername ? handle === currentUsername.toLowerCase() : false);
      return (
        <span
          key={idx}
          className={`px-1 py-0.5 rounded font-medium ${
            hitsMe
              ? 'bg-[#F0B232]/25 text-[#FDE68A]'
              : 'bg-[#5865F2]/25 text-[#C9CDFB]'
          }`}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith(':') && part.endsWith(':') && part.length >= 4) {
      const code = part.slice(1, -1);
      const custom = emojiMap.get(code);
      if (custom && isSafeMediaUrl(custom.imageUrl)) {
        return (
          <img
            key={idx}
            src={custom.imageUrl}
            alt={part}
            title={part}
            draggable={false}
            className={`inline-block align-middle object-contain mx-0.5 rounded select-none ${
              jumbo ? 'w-11 h-11' : 'w-6 h-6'
            }`}
          />
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-[#DBDEE1]">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[#1E1F22] text-[#E5E7EB] font-mono text-[13px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00A8FC] hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function isEmojiOnlyMessage(content: string, emojiMap: Map<string, ServerEmoji>): boolean {
  const trimmed = content.trim();
  if (!trimmed || emojiMap.size === 0) return false;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 4) return false;
  return tokens.every((tok) => {
    if (!/^:[a-z0-9_]{2,24}:$/.test(tok)) return false;
    return emojiMap.has(tok.slice(1, -1));
  });
}

function renderMessageContent(
  content: string,
  emojiMap: Map<string, ServerEmoji>,
  currentUsername?: string
): React.ReactNode {
  if (!content) return null;
  const jumbo = isEmojiOnlyMessage(content, emojiMap);
  const codeBlockParts = content.split(/(```[\s\S]*?```)/g);
  return codeBlockParts.map((block, bIdx) => {
    if (block.startsWith('```') && block.endsWith('```') && block.length >= 6) {
      const inner = block.slice(3, -3).replace(/^[a-z]+\n/i, '');
      return (
        <pre
          key={bIdx}
          className="my-1.5 p-3 rounded-lg bg-[#1E1F22] border border-[#26272B] font-mono text-[13px] text-[#DBDEE1] overflow-x-auto"
        >
          <code>{inner}</code>
        </pre>
      );
    }
    const lines = block.split('\n');
    return lines.map((line, lIdx) => {
      if (line.startsWith('# ')) {
        return (
          <h3 key={`${bIdx}-${lIdx}`} className="font-display text-lg font-bold text-white leading-snug mt-0.5">
            {renderInlineFormatting(line.slice(2), emojiMap, false, currentUsername)}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h4 key={`${bIdx}-${lIdx}`} className="font-display text-base font-bold text-white leading-snug mt-0.5">
            {renderInlineFormatting(line.slice(3), emojiMap, false, currentUsername)}
          </h4>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h5 key={`${bIdx}-${lIdx}`} className="font-display text-[15px] font-semibold text-white leading-snug mt-0.5">
            {renderInlineFormatting(line.slice(4), emojiMap, false, currentUsername)}
          </h5>
        );
      }
      if (line.startsWith('> ')) {
        return (
          <div
            key={`${bIdx}-${lIdx}`}
            className="my-0.5 pl-3 border-l-2 border-[#4E5058] text-[#B5BAC1] bg-[#2B2D31]/50 rounded-r py-0.5"
          >
            {renderInlineFormatting(line.slice(2), emojiMap, false, currentUsername)}
          </div>
        );
      }
      return (
        <span key={`${bIdx}-${lIdx}`} className="block min-h-[1.35rem]">
          {renderInlineFormatting(line, emojiMap, jumbo, currentUsername)}
        </span>
      );
    });
  });
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  grouped,
  compactMode = false,
  currentUid,
  currentUsername,
  canModerate,
  canPin,
  serverEmojis = [],
  authorDecoration,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onVotePoll,
  onTogglePin,
  onBookmark,
  onAuthorClick,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMenu, setActionMenu] = useState<ActionMenuState>({ open: false });
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredLongPressRef = useRef(false);

  const isAuthor = message.authorId === currentUid;
  const isBotMsg = Boolean(message.isBot) || isOfficialBotUid(message.authorId);
  const reactionsEntries = Object.entries(message.reactions || {}).filter(
    ([emoji, uids]) => !emoji.startsWith('poll:') && uids.length > 0
  );
  const emojiMap = React.useMemo(() => {
    const map = new Map<string, ServerEmoji>();
    for (const em of serverEmojis) {
      map.set(em.name, em);
    }
    return map;
  }, [serverEmojis]);
  const safeAttachmentUrl = message.attachmentUrl && isSafeMediaUrl(message.attachmentUrl) ? message.attachmentUrl : '';

  const previewUrl = React.useMemo(
    () => (safeAttachmentUrl ? null : extractFirstPreviewUrl(message.content)),
    [message.content, safeAttachmentUrl]
  );

  useEffect(() => {
    if (!previewUrl) {
      setLinkPreview(null);
      return;
    }
    let cancelled = false;
    void fetchOgPreviewOnce(previewUrl).then((data) => {
      if (!cancelled) setLinkPreview(data);
    });
    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  const isMentionedToMe = React.useMemo(() => {
    if (isAuthor || !message.content) return false;
    const lower = message.content.toLowerCase();
    if (/(?:^|\s)@everyone\b/.test(lower)) return true;
    if (currentUsername) {
      const needle = `@${currentUsername.toLowerCase()}`;
      if (lower.includes(needle)) return true;
    }
    return false;
  }, [isAuthor, message.content, currentUsername]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearLongPressTimer();
  }, []);

  useEffect(() => {
    if (!actionMenu.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionMenu({ open: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actionMenu.open]);

  const handleSaveEdit = async () => {
    if (!draft.trim() || draft.trim() === message.content) {
      setEditing(false);
      return;
    }
    await onEdit(message.id, draft);
    setEditing(false);
  };

  const openMenuAtPoint = (clientX: number, clientY: number) => {
    if (window.innerWidth < 640) {
      setActionMenu({ open: true, mode: 'sheet' });
      return;
    }
    const menuWidth = 256;
    const menuHeight = 360;
    const x = Math.max(12, Math.min(clientX, window.innerWidth - menuWidth - 12));
    const y = Math.max(12, Math.min(clientY, window.innerHeight - menuHeight - 12));
    setActionMenu({ open: true, mode: 'popover', x, y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (editing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    triggeredLongPressRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      triggeredLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(14);
      }
      setActionMenu({ open: true, mode: 'sheet' });
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dx > 10 || dy > 10) {
      clearLongPressTimer();
    }
  };

  const handleTouchEndOrCancel = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (editing) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    e.stopPropagation();
    openMenuAtPoint(e.clientX, e.clientY);
  };

  const handleCopyText = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable
    }
    setActionMenu({ open: false });
  };

  const closeMenu = () => setActionMenu({ open: false });

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEndOrCancel}
      onTouchCancel={handleTouchEndOrCancel}
      onContextMenu={handleContextMenu}
      className={`group relative px-4 ${compactMode ? 'py-0.5' : 'py-1'} hover:bg-[var(--bg-hover)]/75 transition-colors select-none ${
        grouped ? 'mt-0.5' : compactMode ? 'mt-1.5 pt-0.5' : 'mt-3.5 pt-1'
      } ${
        isMentionedToMe
          ? 'bg-[#F0B232]/10 border-l-2 border-[#F0B232]'
          : message.pinned
          ? 'bg-[#F0B232]/5'
          : isBotMsg && !grouped
          ? 'border-l-2 border-[#5865F2]/60'
          : ''
      } ${actionMenu.open ? 'bg-[#5865F2]/12' : ''}`}
    >
      {/* Reply Reference Header */}
      {message.replyToId && (
        <div className="flex items-center gap-2 ml-12 mb-1 text-xs text-[var(--text-muted)] truncate">
          <CornerUpLeft className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="font-medium text-[var(--text-secondary)] shrink-0">@{message.replyToAuthor}</span>
          <span className="truncate opacity-80">{message.replyToContent}</span>
        </div>
      )}

      <div className={`flex items-start ${compactMode ? 'gap-3' : 'gap-4'}`}>
        {/* Left gutter: Avatar or Hover Timestamp */}
        {!grouped ? (
          <button
            type="button"
            onClick={() => onAuthorClick?.(message.authorId)}
            className="mt-0.5 shrink-0 cursor-pointer"
          >
            <Avatar
              src={message.authorAvatar}
              name={message.authorName}
              size={compactMode ? 'sm' : 'md'}
              botId={isBotMsg ? message.authorId : undefined}
              decoration={isBotMsg ? undefined : authorDecoration}
            />
          </button>
        ) : (
          <div className={`${compactMode ? 'w-8' : 'w-10'} shrink-0 flex items-center justify-end pr-1 pt-1`}>
            <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 tabular-nums select-none">
              {formatTime(message)}
            </span>
          </div>
        )}

        {/* Message Body */}
        <div className="flex-1 min-w-0">
          {!grouped && (
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAuthorClick?.(message.authorId)}
                style={{ color: message.authorRoleColor || (isBotMsg ? '#8B9BFF' : '#F2F3F5') }}
                className="font-medium text-[15px] hover:underline cursor-pointer truncate"
              >
                {message.authorName}
              </button>
              {isBotMsg && <VerifiedBotBadge />}
              <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">
                {formatFullDate(message)}
              </span>
              {message.pinned && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#F0B232]">
                  <Pin className="w-3 h-3" />
                  Sabitlendi
                </span>
              )}
            </div>
          )}

          {editing ? (
            <div className="mt-1 space-y-1.5">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') {
                    setDraft(message.content);
                    setEditing(false);
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-white outline-none focus:ring-2 focus:ring-[#5865F2]"
              />
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <button
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1 text-[#23A55A] hover:underline cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Kaydet
                </button>
                <button
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(false);
                  }}
                  className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> İptal
                </button>
              </div>
            </div>
          ) : (
            !message.poll && (
              <div className="text-[15px] text-[var(--text-primary)] leading-[1.45] break-words">
                {renderMessageContent(message.content, emojiMap, currentUsername)}
                {message.edited && (
                  <span className="ml-1.5 text-[10px] text-[var(--text-muted)] select-none">(düzenlendi)</span>
                )}
              </div>
            )
          )}

          {/* OpenGraph Link Preview Embed */}
          {linkPreview && (
            <a
              href={linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-start justify-between gap-3 max-w-md rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] border-l-4 border-l-[#5865F2] p-3 hover:border-white/25 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-1">
                {linkPreview.siteName && (
                  <p className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                    {linkPreview.siteName}
                  </p>
                )}
                {linkPreview.title && (
                  <p className="text-sm font-semibold text-[#00A8FC] leading-snug line-clamp-2">
                    {linkPreview.title}
                  </p>
                )}
                {linkPreview.description && (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                    {linkPreview.description}
                  </p>
                )}
              </div>
              {linkPreview.image && isSafeMediaUrl(linkPreview.image) && (
                <img
                  src={linkPreview.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-lg object-cover shrink-0 border border-[var(--border-subtle)]"
                />
              )}
            </a>
          )}

          {/* Interactive Poll Card */}
          {message.poll && (() => {
            const poll = message.poll;
            const totalVotes = poll.options.reduce(
              (acc, _opt, i) => acc + (message.reactions?.[`poll:${i}`]?.length || 0),
              0
            );
            return (
              <div className="mt-1.5 max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart2 className="w-4 h-4 text-[#5865F2] shrink-0" />
                    <p className="font-display font-semibold text-sm text-white leading-snug">
                      {poll.question}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {poll.options.map((opt, idx) => {
                    const voters = message.reactions?.[`poll:${idx}`] || [];
                    const voted = voters.includes(currentUid);
                    const pct = totalVotes > 0 ? Math.round((voters.length / totalVotes) * 100) : 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onVotePoll?.(message, idx)}
                        className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                          voted
                            ? 'border-[#5865F2] bg-[#5865F2]/12'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                            voted ? 'bg-[#5865F2]/30' : 'bg-white/6'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-2 font-medium text-white truncate">
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                voted
                                  ? 'bg-[#5865F2] border-[#5865F2] text-white'
                                  : 'border-[var(--text-muted)]'
                              }`}
                            >
                              {voted && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span className="truncate">{opt}</span>
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums">
                            {voters.length} · %{pct}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-0.5">
                  <span>{totalVotes} toplam oy</span>
                  <span>{poll.multiSelect ? 'Çoklu seçim açık' : 'Tek seçim'}</span>
                </div>
              </div>
            );
          })()}

          {/* Attachment */}
          {safeAttachmentUrl && (
            <div className="mt-2">
              <button
                type="button"
                onClick={(e) => {
                  if (triggeredLongPressRef.current) {
                    e.preventDefault();
                    triggeredLongPressRef.current = false;
                    return;
                  }
                  setLightboxOpen(true);
                }}
                onContextMenu={handleContextMenu}
                className="block max-w-sm rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer select-none"
              >
                <img
                  src={safeAttachmentUrl}
                  alt={message.attachmentName || 'Ek görsel'}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-h-72 w-auto object-contain pointer-events-none select-none"
                />
              </button>
            </div>
          )}

          {/* Reactions */}
          {reactionsEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {reactionsEntries.map(([emoji, uids]) => {
                const reacted = uids.includes(currentUid);
                const customMatch = /^:([a-z0-9_]{2,24}):$/.exec(emoji);
                const customEmoji = customMatch ? emojiMap.get(customMatch[1]) : undefined;
                return (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(message, emoji)}
                    title={emoji}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border transition-colors cursor-pointer ${
                      reacted
                        ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    {customEmoji && isSafeMediaUrl(customEmoji.imageUrl) ? (
                      <img
                        src={customEmoji.imageUrl}
                        alt={emoji}
                        className="w-4 h-4 object-contain"
                      />
                    ) : (
                      <span>{emoji}</span>
                    )}
                    <span className="tabular-nums font-medium">{uids.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hover Action Toolbar */}
      {!editing && (
        <div className="absolute -top-3.5 right-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg p-0.5 z-10">
          {QUICK_EMOJIS.slice(0, 3).map((em) => (
            <button
              key={em}
              onClick={() => onToggleReaction(message, em)}
              title={`${em} tepkisi ekle`}
              className="px-1.5 py-1 rounded hover:bg-[var(--bg-elevated)] text-sm cursor-pointer"
            >
              {em}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setEmojiMenuOpen((o) => !o)}
              title="Tepki Ekle"
              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <SmilePlus className="w-4 h-4" />
            </button>
            {emojiMenuOpen && (
              <div className="absolute right-0 top-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-1.5 shadow-xl z-20 min-w-[200px] space-y-1.5">
                <div className="flex items-center gap-1">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      onClick={() => {
                        setEmojiMenuOpen(false);
                        onToggleReaction(message, em);
                      }}
                      className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-base cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
                {serverEmojis.length > 0 && (
                  <div className="pt-1 border-t border-[var(--border-subtle)] flex flex-wrap gap-1 max-w-[220px] max-h-28 overflow-y-auto">
                    {serverEmojis.map((se) => (
                      <button
                        key={se.id}
                        onClick={() => {
                          setEmojiMenuOpen(false);
                          onToggleReaction(message, `:${se.name}:`);
                        }}
                        title={`:${se.name}:`}
                        className="p-1 rounded hover:bg-[var(--bg-elevated)] cursor-pointer"
                      >
                        <img
                          src={se.imageUrl}
                          alt={`:${se.name}:`}
                          className="w-5 h-5 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => onReply(message)}
            title="Yanıtla"
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <CornerUpLeft className="w-4 h-4" />
          </button>
          {safeAttachmentUrl && (
            <button
              onClick={() => downloadAttachment(safeAttachmentUrl, message.attachmentName)}
              title="Görseli İndir"
              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {onBookmark && (
            <button
              onClick={async () => {
                await onBookmark(message);
                setBookmarked(true);
                setTimeout(() => setBookmarked(false), 1500);
              }}
              title="İşaretlere Kaydet"
              className={`p-1.5 rounded hover:bg-[var(--bg-elevated)] cursor-pointer ${
                bookmarked ? 'text-[#23A55A]' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {bookmarked ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
          {canPin && onTogglePin && (
            <button
              onClick={() => onTogglePin(message)}
              title={message.pinned ? 'Sabitlemeyi Kaldır' : 'Mesajı Sabitle'}
              className={`p-1.5 rounded hover:bg-[var(--bg-elevated)] cursor-pointer ${
                message.pinned ? 'text-[#F0B232]' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Pin className="w-4 h-4" />
            </button>
          )}
          {isAuthor && !isBotMsg && (
            <button
              onClick={() => {
                setDraft(message.content);
                setEditing(true);
              }}
              title="Düzenle"
              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {(isAuthor || canModerate) && (
            <button
              onClick={() => onDelete(message.id)}
              title="Sil"
              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-rose-400 hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              openMenuAtPoint(rect.left - 180, rect.bottom + 6);
            }}
            title="Diğer İşlemler"
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Long-Press / Context Action Sheet & Popover */}
      {actionMenu.open && (
        <div
          onClick={closeMenu}
          onContextMenu={(e) => {
            e.preventDefault();
            closeMenu();
          }}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={
              actionMenu.mode === 'popover'
                ? { left: actionMenu.x, top: actionMenu.y }
                : undefined
            }
            className={
              actionMenu.mode === 'sheet'
                ? 'fixed inset-x-0 bottom-0 bg-[#18191E] border-t border-white/10 rounded-t-3xl p-4 pb-6 shadow-2xl space-y-3 max-h-[82dvh] overflow-y-auto'
                : 'fixed w-64 bg-[#18191E] border border-white/10 rounded-2xl p-2 shadow-2xl space-y-1.5'
            }
          >
            {actionMenu.mode === 'sheet' && (
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-1" />
            )}

            {/* Message Snippet Header */}
            <div className="px-2 py-1 flex items-center justify-between gap-2 border-b border-white/8 pb-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{message.authorName}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {message.content || (message.attachmentUrl ? 'Görsel Eki' : '')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Emoji Reaction Row */}
            <div className="grid grid-cols-6 gap-1.5 px-1 py-1">
              {QUICK_EMOJIS.map((em) => {
                const alreadyReacted = Boolean(message.reactions?.[em]?.includes(currentUid));
                return (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      void onToggleReaction(message, em);
                      closeMenu();
                    }}
                    className={`h-10 rounded-xl text-lg flex items-center justify-center transition-colors cursor-pointer ${
                      alreadyReacted
                        ? 'bg-[#5865F2]/30 border border-[#5865F2]'
                        : 'bg-[#25272E] hover:bg-[#31333C]'
                    }`}
                  >
                    {em}
                  </button>
                );
              })}
            </div>

            {serverEmojis.length > 0 && (
              <div className="flex items-center gap-1.5 px-1 py-1 overflow-x-auto">
                {serverEmojis.slice(0, 12).map((se) => {
                  const key = `:${se.name}:`;
                  const alreadyReacted = Boolean(message.reactions?.[key]?.includes(currentUid));
                  return (
                    <button
                      key={se.id}
                      type="button"
                      onClick={() => {
                        void onToggleReaction(message, key);
                        closeMenu();
                      }}
                      title={key}
                      className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        alreadyReacted
                          ? 'bg-[#5865F2]/30 border border-[#5865F2]'
                          : 'bg-[#25272E] hover:bg-[#31333C]'
                      }`}
                    >
                      <img src={se.imageUrl} alt={key} className="w-5 h-5 object-contain" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Actions List */}
            <div className="space-y-1 pt-0.5 text-sm">
              {safeAttachmentUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void downloadAttachment(safeAttachmentUrl, message.attachmentName);
                      closeMenu();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-white hover:bg-[#5865F2] transition-colors cursor-pointer"
                  >
                    <span>Görseli İndir</span>
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      setLightboxOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <span>Görseli Tam Ekran Aç</span>
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  onReply(message);
                  closeMenu();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>Yanıtla</span>
                <CornerUpLeft className="w-4 h-4" />
              </button>

              {isAuthor && !isBotMsg && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(true);
                    closeMenu();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>Mesajı Düzenle</span>
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              {message.content && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>{copied ? 'Kopyalandı!' : 'Metni Kopyala'}</span>
                  {copied ? <Check className="w-4 h-4 text-[#23A55A]" /> : <Copy className="w-4 h-4" />}
                </button>
              )}

              {canPin && onTogglePin && (
                <button
                  type="button"
                  onClick={() => {
                    void onTogglePin(message);
                    closeMenu();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>{message.pinned ? 'Sabitlemeyi Kaldır' : 'Mesajı Sabitle'}</span>
                  <Pin className="w-4 h-4" />
                </button>
              )}

              {onBookmark && (
                <button
                  type="button"
                  onClick={async () => {
                    await onBookmark(message);
                    setBookmarked(true);
                    setTimeout(() => setBookmarked(false), 1500);
                    closeMenu();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>Yer İşaretine Ekle</span>
                  <Bookmark className="w-4 h-4" />
                </button>
              )}

              {(isAuthor || canModerate) && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void onDelete(message.id);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                >
                  <span>Mesajı Sil</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox with Custom Download & Close Controls */}
      {lightboxOpen && safeAttachmentUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLightboxOpen(false);
            openMenuAtPoint(e.clientX, e.clientY);
          }}
          className="fixed inset-0 z-50 bg-black/88 flex flex-col items-center justify-center p-4 sm:p-6 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed top-4 right-4 z-50 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => downloadAttachment(safeAttachmentUrl, message.attachmentName)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs sm:text-sm font-medium shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>İndir</span>
            </button>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Kapat"
              className="p-2 rounded-xl bg-[#1E1F24] hover:bg-[#2B2D33] text-white border border-white/10 shadow-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={safeAttachmentUrl}
            alt={message.attachmentName || 'Tam boyut görsel'}
            referrerPolicy="no-referrer"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[86dvh] rounded-xl shadow-2xl select-none"
          />
        </div>
      )}
    </div>
  );
};
