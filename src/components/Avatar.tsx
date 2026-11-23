import React from 'react';
import { Gem } from 'lucide-react';
import type { AvatarDecorationId, UserStatus } from '../types/halka';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: UserStatus;
  showStatus?: boolean;
  speaking?: boolean;
  ringBg?: string;
  decoration?: AvatarDecorationId;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const DOT_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-2 h-2 border',
  sm: 'w-3 h-3 border-2',
  md: 'w-3.5 h-3.5 border-2',
  lg: 'w-4 h-4 border-[3px]',
  xl: 'w-5 h-5 border-[3px]',
};

const STATUS_COLOR: Record<UserStatus, string> = {
  online: 'bg-[#23A55A]',
  idle: 'bg-[#F0B232]',
  dnd: 'bg-[#F23F43]',
  offline: 'bg-[#80848E]',
};

const DECO_CLASS: Record<AvatarDecorationId, string> = {
  none: '',
  'cyber-ring': 'deco-cyber-ring',
  'emerald-flame': 'deco-emerald-flame',
  'crimson-pulse': 'deco-crimson-pulse',
  'gold-halo': 'deco-gold-halo',
  'aurora-orbit': 'deco-aurora-orbit',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'H';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getBgColor(name: string): string {
  const colors = ['#5865F2', '#248046', '#DA373C', '#9B59B6', '#E67E22', '#1ABC9C'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status = 'offline',
  showStatus = false,
  speaking = false,
  ringBg = 'var(--bg-sidebar)',
  decoration = 'none',
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const dotClass = DOT_CLASSES[size];
  const decoClass = decoration && decoration !== 'none' ? DECO_CLASS[decoration] : '';

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${sizeClass} ${decoClass} ${
        speaking ? 'ring-2 ring-[#23A55A] ring-offset-2 ring-offset-[#111216]' : ''
      }`}
    >
      {src && !imgFailed ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          style={{ backgroundColor: getBgColor(name) }}
          className="w-full h-full rounded-full flex items-center justify-center font-semibold text-white font-display"
        >
          {getInitials(name)}
        </div>
      )}

      {showStatus && (
        <span
          aria-label={`Durum: ${status}`}
          style={{ borderColor: ringBg }}
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ${dotClass} ${STATUS_COLOR[status]}`}
        />
      )}
    </div>
  );
};

export const ClanTagBadge: React.FC<{ tag?: string }> = ({ tag }) => {
  if (!tag) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#23252D] border border-[#323540] text-[10px] font-bold tracking-wider text-[#DBDEE1] uppercase shrink-0">
      <Gem className="w-2.5 h-2.5 text-[#5865F2]" />
      <span>{tag}</span>
    </span>
  );
};
