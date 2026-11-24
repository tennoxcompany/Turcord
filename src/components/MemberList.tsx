import React, { useMemo } from 'react';
import type { MemberRole, ServerMember, UserStatus } from '../types/halka';
import { ROLE_COLORS, ROLE_LABELS } from '../lib/halkaService';
import { getNameplateMeta } from '../lib/cosmetics';
import { Avatar, ClanTagBadge } from './Avatar';

interface MemberListProps {
  members: ServerMember[];
  currentUid: string;
  currentUserStatus?: UserStatus;
  onlineUsers: Record<string, { status: string; displayName: string; avatarUrl: string }>;
  onSelectMemberUid: (uid: string) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentUid,
  currentUserStatus = 'online',
  onlineUsers,
  onSelectMemberUid,
}) => {
  const getStatus = (uid: string): UserStatus => {
    if (uid === currentUid) return currentUserStatus;
    const entry = onlineUsers[uid];
    if (!entry) return 'offline';
    return (entry.status as UserStatus) || 'online';
  };

  const groups = useMemo(() => {
    const order: MemberRole[] = ['owner', 'admin', 'moderator', 'member'];
    const onlineBuckets: Record<MemberRole, ServerMember[]> = {
      owner: [],
      admin: [],
      moderator: [],
      member: [],
    };
    const offline: ServerMember[] = [];

    for (const m of members) {
      const st = getStatus(m.uid);
      if (st === 'offline') {
        offline.push(m);
      } else {
        onlineBuckets[m.role || 'member'].push(m);
      }
    }

    const result: Array<{ label: string; items: ServerMember[]; isOffline?: boolean }> = [];
    for (const r of order) {
      if (onlineBuckets[r].length > 0) {
        result.push({ label: `${ROLE_LABELS[r].toUpperCase()} — ${onlineBuckets[r].length}`, items: onlineBuckets[r] });
      }
    }
    if (offline.length > 0) {
      result.push({ label: `ÇEVRİMDIŞI — ${offline.length}`, items: offline, isOffline: true });
    }
    return result;
  }, [members, onlineUsers, currentUid, currentUserStatus]);

  return (
    <aside className="w-[240px] h-full min-h-0 shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border-subtle)] overflow-y-auto px-2 py-4 space-y-5 select-none hidden md:block">
      {groups.map((grp) => (
        <div key={grp.label} className="space-y-1">
          <h3 className="px-2 text-[11px] font-semibold tracking-wide text-[var(--text-muted)] tabular-nums">
            {grp.label}
          </h3>
          {grp.items.map((m) => {
            const st = getStatus(m.uid);
            const nameplate = getNameplateMeta(m.nameplate);
            return (
              <button
                key={m.uid}
                onClick={() => onSelectMemberUid(m.uid)}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left cursor-pointer ${
                  nameplate.className
                } ${grp.isOffline ? 'opacity-55 hover:opacity-100' : ''}`}
              >
                <Avatar
                  src={m.avatarUrl}
                  name={m.displayName}
                  size="sm"
                  status={st}
                  showStatus
                  ringBg="var(--bg-sidebar)"
                  decoration={m.avatarDecoration}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <p
                      style={{ color: m.roleColor || ROLE_COLORS[m.role] || '#DBDEE1' }}
                      className="text-[14px] font-medium truncate leading-tight"
                    >
                      {m.displayName}
                    </p>
                    <ClanTagBadge tag={m.clanTag} />
                  </div>
                  <p
                    className={`text-[11px] truncate leading-tight ${
                      m.activityText && !grp.isOffline ? 'text-[#23A55A]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {m.activityText && !grp.isOffline ? m.activityText : `@${m.username}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
};
