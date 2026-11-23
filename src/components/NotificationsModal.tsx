import React, { useState } from 'react';
import { AtSign, Bell, Bookmark, Check, Reply, Trash2, X } from 'lucide-react';
import type {
  FriendRequestDoc,
  PublicProfile,
  UserBookmark,
  UserNotification,
} from '../types/halka';
import {
  deleteNotification,
  markNotificationRead,
  removeBookmark,
  updateUserPreferences,
} from '../lib/halkaService';
import { Avatar } from './Avatar';

interface NotificationsModalProps {
  profile: PublicProfile;
  incomingRequests: FriendRequestDoc[];
  notifications: UserNotification[];
  bookmarks: UserBookmark[];
  onAcceptFriend: (reqId: string) => Promise<void>;
  onDeclineFriend: (reqId: string) => Promise<void>;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  profile,
  incomingRequests,
  notifications,
  bookmarks,
  onAcceptFriend,
  onDeclineFriend,
  onClose,
}) => {
  const [tab, setTab] = useState<'activity' | 'bookmarks' | 'prefs'>('activity');
  const mentionNotifs = profile.mentionNotifs ?? true;
  const showTyping = profile.showTypingIndicator ?? true;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl max-h-[86vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-lg font-bold text-white">Bildirimler</h2>
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1">
            {[
              { id: 'activity', label: 'Son Etkinlik', icon: Bell },
              { id: 'bookmarks', label: `İşaretler (${bookmarks.length})`, icon: Bookmark },
              { id: 'prefs', label: 'Ayarlar', icon: AtSign },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  tab === t.id ? 'bg-[#5865F2] text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {tab === 'activity' && (
            <>
              {/* Incoming Friend Requests */}
              {incomingRequests.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Arkadaşlık İstekleri
                  </p>
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={req.fromAvatar} name={req.fromName} size="md" />
                        <p className="text-sm text-[var(--text-secondary)]">
                          <strong className="text-white">{req.fromName}</strong> sana bir arkadaşlık isteği gönderdi.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pl-12">
                        <button
                          onClick={() => onAcceptFriend(req.id)}
                          className="px-4 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium cursor-pointer"
                        >
                          Kabul et
                        </button>
                        <button
                          onClick={() => onDeclineFriend(req.id)}
                          className="px-4 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[#2B2D31] text-[var(--text-secondary)] text-xs font-medium cursor-pointer"
                        >
                          Yoksay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Replies & Mentions */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                  Son Etkinlik
                </p>
                {notifications.length === 0 && incomingRequests.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Bell className="w-9 h-9 mx-auto text-[var(--text-muted)]" />
                    <p className="text-sm text-[var(--text-muted)]">Henüz yeni bildirim yok.</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4">Yanıt veya bahsetme bildirimi yok.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                        n.isRead
                          ? 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
                          : 'bg-[#5865F2]/10 border-[#5865F2]/40'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar
                          src={n.fromAvatar}
                          name={n.fromName}
                          size="md"
                          botId={n.fromUid === 'turcord_bot' ? 'turcord_bot' : undefined}
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs text-[var(--text-secondary)]">
                            <strong className="text-white">{n.fromName}</strong> ·{' '}
                            <span className="text-white">{n.channelLabel}</span>{' '}
                            {n.type === 'reply'
                              ? 'kanalında sana yanıt verdi:'
                              : n.type === 'system'
                              ? 'sistem uyarısı gönderdi:'
                              : 'seni etiketledi:'}
                          </p>
                          <p className="text-sm text-[#DBDEE1] break-words pl-2.5 border-l-2 border-[#3F4147]">
                            {n.preview}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={() => markNotificationRead(profile.uid, n.id)}
                            title="Okundu İşaretle"
                            className="p-1.5 rounded-lg text-[#23A55A] hover:bg-[var(--bg-elevated)] cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(profile.uid, n.id)}
                          title="Bildirimi Sil"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--bg-elevated)] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'bookmarks' && (
            <div className="space-y-2.5">
              {bookmarks.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Bookmark className="w-9 h-9 mx-auto text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">
                    Mesajların üzerindeki yer imi ikonuna tıklayarak önemli mesajları buraya kaydedebilirsin.
                  </p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="font-semibold text-white">{bm.authorName}</span>
                        <span>·</span>
                        <span>{bm.channelLabel}</span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] break-words">{bm.content}</p>
                    </div>
                    <button
                      onClick={() => removeBookmark(profile.uid, bm.id)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'prefs' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-white">Yanıt ve Bahsetme Bildirimleri</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Biri mesajına yanıt verdiğinde bildirim kutusuna düşsün
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
                    <p className="text-sm font-medium text-white">Yazıyor Göstergesi</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Sohbette diğer kişilerin yazdığını canlı göster
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
