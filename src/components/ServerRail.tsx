import React from 'react';
import { Compass, MessageCircle, Plus } from 'lucide-react';
import type { UserMembership } from '../types/halka';

interface ServerRailProps {
  memberships: UserMembership[];
  activeView: 'home' | 'server';
  activeServerId: string | null;
  pendingRequestsCount: number;
  hasUnreadDms?: boolean;
  unreadServerIds?: Set<string>;
  onSelectHome: () => void;
  onSelectServer: (serverId: string) => void;
  onOpenCreateServer: () => void;
  onOpenExploreJoin: () => void;
}

export const ServerRail: React.FC<ServerRailProps> = ({
  memberships,
  activeView,
  activeServerId,
  pendingRequestsCount,
  hasUnreadDms = false,
  unreadServerIds,
  onSelectHome,
  onSelectServer,
  onOpenCreateServer,
  onOpenExploreJoin,
}) => {
  return (
    <nav
      aria-label="Sunucular"
      className="w-[72px] h-full min-h-0 shrink-0 bg-[var(--bg-rail)] flex flex-col items-center py-3 gap-2 overflow-y-auto border-r border-[var(--border-subtle)] select-none"
    >
      {/* Home / Direct Messages */}
      <div className="relative group flex items-center justify-center w-full">
        <span
          className={`absolute left-0 w-1 rounded-r-full bg-white transition-all duration-150 ${
            activeView === 'home' ? 'h-10' : hasUnreadDms ? 'h-2.5 group-hover:h-5' : 'h-0 group-hover:h-5'
          }`}
        />
        <button
          onClick={onSelectHome}
          title="Direkt Mesajlar & Arkadaşlar"
          aria-label="Direkt Mesajlar ve Arkadaşlar"
          className={`relative w-12 h-12 flex items-center justify-center transition-all duration-150 cursor-pointer ${
            activeView === 'home'
              ? 'rounded-2xl bg-[#5865F2] text-white'
              : 'rounded-3xl bg-[var(--bg-card)] text-[var(--text-secondary)] hover:rounded-2xl hover:bg-[#5865F2] hover:text-white'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          {pendingRequestsCount > 0 ? (
            <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F23F43] text-white text-[11px] font-bold flex items-center justify-center border-2 border-[var(--bg-rail)] tabular-nums">
              {pendingRequestsCount}
            </span>
          ) : hasUnreadDms && activeView !== 'home' ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#5865F2] border-2 border-[var(--bg-rail)]" />
          ) : null}
        </button>
      </div>

      <div className="w-8 h-[2px] rounded-full bg-[var(--border-subtle)] my-0.5" />

      {/* Joined Servers */}
      <div className="flex flex-col items-center gap-2 w-full">
        {memberships.map((m) => {
          const isActive = activeView === 'server' && activeServerId === m.serverId;
          const isUnread = !isActive && Boolean(unreadServerIds?.has(m.serverId));
          return (
            <div key={m.serverId} className="relative group flex items-center justify-center w-full">
              <span
                className={`absolute left-0 w-1 rounded-r-full bg-white transition-all duration-150 ${
                  isActive ? 'h-10' : isUnread ? 'h-2.5 group-hover:h-5' : 'h-0 group-hover:h-5'
                }`}
              />
              <button
                onClick={() => onSelectServer(m.serverId)}
                title={m.serverName}
                aria-label={m.serverName}
                style={{ backgroundColor: isActive ? m.serverColor : undefined }}
                className={`w-12 h-12 flex items-center justify-center text-lg font-bold font-display transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'rounded-2xl text-white'
                    : isUnread
                    ? 'rounded-2xl bg-[var(--bg-card)] text-white hover:text-white'
                    : 'rounded-3xl bg-[var(--bg-card)] text-[var(--text-secondary)] hover:rounded-2xl hover:text-white'
                }`}
              >
                <span className="leading-none">{m.serverIcon || m.serverName.slice(0, 2).toUpperCase()}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Server */}
      <div className="relative group flex items-center justify-center w-full pt-1">
        <button
          onClick={onOpenCreateServer}
          title="Sunucu Oluştur"
          aria-label="Sunucu Oluştur"
          className="w-12 h-12 rounded-3xl bg-[var(--bg-card)] text-[#23A55A] hover:bg-[#23A55A] hover:text-white hover:rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Explore & Join by Code */}
      <div className="relative group flex items-center justify-center w-full">
        <button
          onClick={onOpenExploreJoin}
          title="Toplulukları Keşfet / Davet Koduyla Katıl"
          aria-label="Toplulukları Keşfet veya Davet Koduyla Katıl"
          className="w-12 h-12 rounded-3xl bg-[var(--bg-card)] text-[#23A55A] hover:bg-[#23A55A] hover:text-white hover:rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
};
