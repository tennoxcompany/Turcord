import React from 'react';
import type { ProfileEffectId, UserActivity } from '../types/halka';
import { ACTIVITY_LABELS, ANIMATED_BANNERS, DISCORD_BADGES } from '../lib/cosmetics';
import { Gamepad2, Headphones, Radio, Tv } from 'lucide-react';

interface ProfileBannerProps {
  bannerColor?: string;
  bannerUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ProfileBanner: React.FC<ProfileBannerProps> = ({
  bannerColor = '#5865F2',
  bannerUrl,
  className = 'h-28',
  children,
}) => {
  const animPreset = ANIMATED_BANNERS.find((b) => b.id === bannerColor);

  return (
    <div
      style={animPreset ? undefined : { backgroundColor: bannerColor || '#5865F2' }}
      className={`relative overflow-hidden shrink-0 ${animPreset ? animPreset.className : ''} ${className}`}
    >
      {bannerUrl && (
        <img
          src={bannerUrl}
          alt="Profil Banner"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15 pointer-events-none" />
      {children}
    </div>
  );
};

interface ProfileEffectOverlayProps {
  effect?: ProfileEffectId;
}

const PARTICLE_SEEDS = [
  { left: '6%', delay: '0s', dur: '5.2s', size: 13 },
  { left: '16%', delay: '1.1s', dur: '6.1s', size: 11 },
  { left: '28%', delay: '0.4s', dur: '4.8s', size: 14 },
  { left: '41%', delay: '2.2s', dur: '5.9s', size: 10 },
  { left: '54%', delay: '0.9s', dur: '5.0s', size: 13 },
  { left: '67%', delay: '1.7s', dur: '6.3s', size: 12 },
  { left: '79%', delay: '0.3s', dur: '4.7s', size: 14 },
  { left: '91%', delay: '1.5s', dur: '5.5s', size: 11 },
];

export const ProfileEffectOverlay: React.FC<ProfileEffectOverlayProps> = ({ effect = 'none' }) => {
  if (!effect || effect === 'none') return null;

  if (effect === 'rose-petals' || effect === 'sakura-rain') {
    const color = effect === 'rose-petals' ? '#FB7185' : '#F9A8D4';
    const stroke = effect === 'rose-petals' ? '#E11D48' : '#F472B6';
    return (
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {PARTICLE_SEEDS.map((p, idx) => (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            style={{
              left: p.left,
              top: '-24px',
              width: p.size,
              height: p.size,
              animation: `turcord-petal-fall ${p.dur} linear ${p.delay} infinite`,
            }}
            className="absolute opacity-0"
          >
            <path
              d="M12 2 C18 6 20 14 12 22 C4 14 6 6 12 2 Z"
              fill={color}
              stroke={stroke}
              strokeWidth="1.2"
            />
          </svg>
        ))}
      </div>
    );
  }

  if (effect === 'hearts-float') {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {PARTICLE_SEEDS.map((p, idx) => (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            style={{
              left: p.left,
              bottom: '12px',
              width: p.size,
              height: p.size,
              animation: `turcord-spark-rise ${p.dur} ease-in ${p.delay} infinite`,
            }}
            className="absolute opacity-0"
          >
            <path
              d="M12 21 C12 21 3 14.5 3 8.5 A4.5 4.5 0 0 1 12 6.5 A4.5 4.5 0 0 1 21 8.5 C21 14.5 12 21 12 21 Z"
              fill={idx % 2 === 0 ? '#F43F5E' : '#EC4899'}
            />
          </svg>
        ))}
      </div>
    );
  }

  if (effect === 'anime-sparks') {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {PARTICLE_SEEDS.map((p, idx) => (
          <div
            key={idx}
            style={{
              left: p.left,
              bottom: '8px',
              width: idx % 2 === 0 ? 4 : 6,
              height: idx % 2 === 0 ? 16 : 6,
              backgroundColor: idx % 2 === 0 ? '#FACC15' : '#38BDF8',
              boxShadow: '0 0 8px currentColor',
              animation: `turcord-spark-rise ${p.dur} ease-out ${p.delay} infinite`,
            }}
            className="absolute rounded-full opacity-0"
          />
        ))}
      </div>
    );
  }

  if (effect === 'cyber-matrix') {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {PARTICLE_SEEDS.map((p, idx) => (
          <div
            key={idx}
            style={{
              left: p.left,
              top: '-24px',
              width: 2,
              height: 22 + (idx % 3) * 10,
              background: 'linear-gradient(to bottom, transparent, #22D3EE)',
              animation: `turcord-matrix-drop ${p.dur} linear ${p.delay} infinite`,
            }}
            className="absolute opacity-0"
          />
        ))}
      </div>
    );
  }

  if (effect === 'starfall') {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {PARTICLE_SEEDS.map((p, idx) => (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            style={{
              left: p.left,
              top: '-24px',
              width: p.size,
              height: p.size,
              animation: `turcord-petal-fall ${p.dur} linear ${p.delay} infinite`,
            }}
            className="absolute opacity-0"
          >
            <polygon
              points="12,2 14.8,9 22,9.5 16.5,14.2 18.2,21.5 12,17.5 5.8,21.5 7.5,14.2 2,9.5 9.2,9"
              fill={idx % 2 === 0 ? '#FDE047' : '#C084FC'}
            />
          </svg>
        ))}
      </div>
    );
  }

  // confetti-party
  const confettiColors = ['#5865F2', '#F43F5E', '#FACC15', '#23A55A', '#EC4899', '#22D3EE'];
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {PARTICLE_SEEDS.map((p, idx) => (
        <div
          key={idx}
          style={{
            left: p.left,
            top: '-20px',
            width: 8,
            height: 5,
            backgroundColor: confettiColors[idx % confettiColors.length],
            animation: `turcord-petal-fall ${p.dur} linear ${p.delay} infinite`,
          }}
          className="absolute rounded-sm opacity-0"
        />
      ))}
    </div>
  );
};

export const BadgesStrip: React.FC<{ badges?: string[] }> = ({ badges = [] }) => {
  const list = badges.length > 0 ? badges : ['turcord-pioneer'];
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] flex-wrap">
      {list.map((id) => {
        const def = DISCORD_BADGES[id];
        if (!def) return null;
        return (
          <span
            key={id}
            title={`${def.label}: ${def.desc}`}
            style={{ color: def.color }}
            className="inline-flex items-center text-xs leading-none cursor-help"
          >
            {def.emoji}
          </span>
        );
      })}
    </div>
  );
};

export const RichActivityCard: React.FC<{ activity?: UserActivity }> = ({ activity }) => {
  if (!activity?.name) return null;
  const Icon =
    activity.type === 'listening'
      ? Headphones
      : activity.type === 'watching'
      ? Tv
      : activity.type === 'streaming'
      ? Radio
      : Gamepad2;

  const accent =
    activity.type === 'listening'
      ? '#1DB954'
      : activity.type === 'streaming'
      ? '#9333EA'
      : activity.type === 'watching'
      ? '#EC4899'
      : '#5865F2';

  return (
    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center gap-3">
      <div
        style={{ backgroundColor: `${accent}24`, color: accent }}
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {ACTIVITY_LABELS[activity.type] || 'Etkinlik'}
        </p>
        <p className="text-sm font-semibold text-white truncate">{activity.name}</p>
        {activity.details && (
          <p className="text-xs text-[var(--text-secondary)] truncate">{activity.details}</p>
        )}
      </div>
      <div className="flex items-end gap-0.5 h-4 shrink-0" aria-hidden="true">
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            style={{
              backgroundColor: accent,
              animation: `turcord-eq 0.9s ease-in-out ${delay}s infinite`,
            }}
            className="w-1 h-full rounded-full origin-bottom"
          />
        ))}
      </div>
    </div>
  );
};
