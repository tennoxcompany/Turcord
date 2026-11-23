import React, { useState } from 'react';
import { Bookmark, Check, CornerUpLeft, Pencil, Pin, SmilePlus, Trash2, X } from 'lucide-react';
import type { ChatMessage } from '../types/halka';
import { isOfficialBotUid } from '../lib/turcordBots';
import { Avatar, VerifiedBotBadge } from './Avatar';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👀'];

interface MessageItemProps {
  message: ChatMessage;
  grouped: boolean;
  compactMode?: boolean;
  currentUid: string;
  canModerate: boolean;
  canPin: boolean;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msgId: string, newContent: string) => Promise<void>;
  onDelete: (msgId: string) => Promise<void>;
  onToggleReaction: (msg: ChatMessage, emoji: string) => Promise<void>;
  onTogglePin?: (msg: ChatMessage) => Promise<void>;
  onBookmark?: (msg: ChatMessage) => Promise<void>;
  onAuthorClick?: (uid: string) => void;
}

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

function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s]+)/g;
  const parts = text.split(tokenRegex);
  return parts.map((part, idx) => {
    if (!part) return null;
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

function renderMessageContent(content: string): React.ReactNode {
  if (!content) return null;
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
      if (line.startsWith('> ')) {
        return (
          <div
            key={`${bIdx}-${lIdx}`}
            className="my-0.5 pl-3 text-[#B5BAC1] bg-[#2B2D31]/50 rounded py-0.5"
          >
            {renderInlineFormatting(line.slice(2))}
          </div>
        );
      }
      return (
        <span key={`${bIdx}-${lIdx}`} className="block min-h-[1.35rem]">
          {renderInlineFormatting(line)}
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
  canModerate,
  canPin,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onTogglePin,
  onBookmark,
  onAuthorClick,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const isAuthor = message.authorId === currentUid;
  const isBotMsg = Boolean(message.isBot) || isOfficialBotUid(message.authorId);
  const reactionsEntries = Object.entries(message.reactions || {}).filter(([, uids]) => uids.length > 0);

  const handleSaveEdit = async () => {
    if (!draft.trim() || draft.trim() === message.content) {
      setEditing(false);
      return;
    }
    await onEdit(message.id, draft);
    setEditing(false);
  };

  return (
    <div
      className={`group relative px-4 ${compactMode ? 'py-0.5' : 'py-1'} hover:bg-[var(--bg-hover)]/75 transition-colors ${
        grouped ? 'mt-0.5' : compactMode ? 'mt-1.5 pt-0.5' : 'mt-3.5 pt-1'
      } ${message.pinned ? 'bg-[#F0B232]/5' : ''} ${
        isBotMsg && !grouped ? 'border-l-2 border-[#5865F2]/60' : ''
      }`}
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
            <div className="text-[15px] text-[var(--text-primary)] leading-[1.45] break-words">
              {renderMessageContent(message.content)}
              {message.edited && (
                <span className="ml-1.5 text-[10px] text-[var(--text-muted)] select-none">(düzenlendi)</span>
              )}
            </div>
          )}

          {/* Attachment */}
          {message.attachmentUrl && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block max-w-sm rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer"
              >
                <img
                  src={message.attachmentUrl}
                  alt={message.attachmentName || 'Ek görsel'}
                  referrerPolicy="no-referrer"
                  className="max-h-72 w-auto object-contain"
                />
              </button>
            </div>
          )}

          {/* Reactions */}
          {reactionsEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {reactionsEntries.map(([emoji, uids]) => {
                const reacted = uids.includes(currentUid);
                return (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(message, emoji)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border transition-colors cursor-pointer ${
                      reacted
                        ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <span>{emoji}</span>
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
              <div className="absolute right-0 top-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-1.5 flex items-center gap-1 shadow-xl z-20">
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
            )}
          </div>
          <button
            onClick={() => onReply(message)}
            title="Yanıtla"
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] cursor-pointer"
          >
            <CornerUpLeft className="w-4 h-4" />
          </button>
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
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxOpen && message.attachmentUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
        >
          <img
            src={message.attachmentUrl}
            alt={message.attachmentName || 'Tam boyut görsel'}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
