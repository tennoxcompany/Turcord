import React from 'react';
import { Bot, Check, Gem, Music, Shield } from 'lucide-react';
import type { AvatarDecorationId, BotId, UserStatus } from '../types/halka';
import { isOfficialBotUid, OFFICIAL_BOTS } from '../lib/turcordBots';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: UserStatus;
  showStatus?: boolean;
  speaking?: boolean;
  ringBg?: string;
  decoration?: AvatarDecorationId;
  botId?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const BOT_ICON_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
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

const SIMPLE_RING_CLASS: Partial<Record<AvatarDecorationId, string>> = {
  'cyber-ring': 'deco-cyber-ring',
  'emerald-flame': 'deco-emerald-flame',
  'crimson-pulse': 'deco-crimson-pulse',
  'gold-halo': 'deco-gold-halo',
  'aurora-orbit': 'deco-aurora-orbit',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'T';
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

function renderBotAvatar(botId: BotId, size: NonNullable<AvatarProps['size']>) {
  const bot = OFFICIAL_BOTS[botId];
  const iconCls = BOT_ICON_CLASSES[size];
  const Icon = botId === 'mod_bot' ? Shield : botId === 'music_bot' ? Music : Bot;
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${bot.bannerColor}, #1E1F22)`,
      }}
      className="w-full h-full rounded-full flex items-center justify-center text-white border border-white/15"
    >
      <Icon className={iconCls} />
    </div>
  );
}

function renderPresetAvatar(presetId: string) {
  switch (presetId) {
    case 'preset:sakura-neko':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <linearGradient id="pNekoBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4A0D3A" />
              <stop offset="100%" stopColor="#BE185D" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="50" fill="url(#pNekoBg)" />
          <polygon points="22,42 28,16 44,32" fill="#F9A8D4" />
          <polygon points="78,42 72,16 56,32" fill="#F9A8D4" />
          <polygon points="26,38 30,23 40,33" fill="#EC4899" />
          <polygon points="74,38 70,23 60,33" fill="#EC4899" />
          <circle cx="50" cy="56" r="24" fill="#FCE7F3" />
          <ellipse cx="40" cy="54" rx="4.2" ry="5.5" fill="#1F2937" />
          <ellipse cx="60" cy="54" rx="4.2" ry="5.5" fill="#1F2937" />
          <circle cx="38.5" cy="52" r="1.6" fill="#FFFFFF" />
          <circle cx="58.5" cy="52" r="1.6" fill="#FFFFFF" />
          <ellipse cx="33" cy="61" rx="4" ry="2" fill="#F472B6" opacity="0.6" />
          <ellipse cx="67" cy="61" rx="4" ry="2" fill="#F472B6" opacity="0.6" />
          <path d="M45 63 Q50 67 55 63" stroke="#DB2777" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="80" cy="24" r="3" fill="#FDE047" className="turcord-pulse-ring" />
          <circle cx="18" cy="76" r="2.5" fill="#F9A8D4" className="turcord-pulse-ring" />
        </svg>
      );
    case 'preset:rose-queen':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <radialGradient id="pRoseBg" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#3B0718" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" rx="50" fill="url(#pRoseBg)" />
          <g className="turcord-spin-slow" style={{ transformOrigin: '50px 50px' }}>
            <circle cx="50" cy="50" r="34" fill="none" stroke="#FDA4AF" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" />
          </g>
          <circle cx="50" cy="50" r="18" fill="#FB7185" />
          <circle cx="43" cy="46" r="11" fill="#F43F5E" />
          <circle cx="57" cy="46" r="11" fill="#E11D48" />
          <circle cx="50" cy="56" r="11" fill="#BE123C" />
          <circle cx="50" cy="49" r="7" fill="#FFE4E6" opacity="0.9" />
          <circle cx="50" cy="49" r="3.5" fill="#9F1239" />
          <path d="M35 72 Q50 82 65 72" stroke="#34D399" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'preset:cyber-kitsune':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <linearGradient id="pKitBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#082F49" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="50" fill="url(#pKitBg)" />
          <polygon points="20,46 25,14 45,35" fill="#F8FAFC" />
          <polygon points="80,46 75,14 55,35" fill="#F8FAFC" />
          <polygon points="24,42 27,22 41,36" fill="#22D3EE" />
          <polygon points="76,42 73,22 59,36" fill="#22D3EE" />
          <path d="M25 50 L50 82 L75 50 L62 34 L38 34 Z" fill="#F8FAFC" />
          <path d="M34 52 L44 55 L38 59 Z" fill="#06B6D4" />
          <path d="M66 52 L56 55 L62 59 Z" fill="#06B6D4" />
          <path d="M30 44 L44 48 M70 44 L56 48" stroke="#F43F5E" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="50" cy="70" r="3" fill="#0F172A" />
        </svg>
      );
    case 'preset:dragon-aura':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <radialGradient id="pDrgBg" cx="50%" cy="55%" r="65%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#2A0A04" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" rx="50" fill="url(#pDrgBg)" />
          <g className="turcord-pulse-ring" style={{ transformOrigin: '50px 50px' }}>
            <path d="M50 14 L64 42 L84 36 L68 58 L76 82 L50 68 L24 82 L32 58 L16 36 L36 42 Z" fill="#FBBF24" opacity="0.35" />
          </g>
          <polygon points="50,24 67,62 50,76 33,62" fill="#DC2626" stroke="#FDE047" strokeWidth="2" />
          <polygon points="36,48 46,52 40,56" fill="#FEF08A" />
          <polygon points="64,48 54,52 60,56" fill="#FEF08A" />
        </svg>
      );
    case 'preset:star-witch':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <linearGradient id="pWitchBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="50" fill="url(#pWitchBg)" />
          <g className="turcord-spin-slow" style={{ transformOrigin: '50px 50px' }}>
            <circle cx="50" cy="50" r="36" fill="none" stroke="#C084FC" strokeWidth="1.2" strokeDasharray="3 5" />
          </g>
          <polygon points="50,15 68,48 32,48" fill="#312E81" stroke="#E9D5FF" strokeWidth="1.5" />
          <ellipse cx="50" cy="49" rx="30" ry="7" fill="#4C1D95" stroke="#E9D5FF" strokeWidth="1.5" />
          <circle cx="50" cy="64" r="14" fill="#FDE68A" />
          <path d="M54 54 A11 11 0 1 0 60 72 A9 9 0 1 1 54 54 Z" fill="#7C3AED" />
          <circle cx="24" cy="28" r="2.2" fill="#FDE047" />
          <circle cx="78" cy="30" r="2" fill="#F9A8D4" />
        </svg>
      );
    case 'preset:mecha-ace':
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
          <defs>
            <linearGradient id="pMechaBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#064E3B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="50" fill="url(#pMechaBg)" />
          <polygon points="26,34 50,20 74,34 74,68 50,82 26,68" fill="#1E293B" stroke="#34D399" strokeWidth="2.2" />
          <polygon points="32,46 68,46 62,56 38,56" fill="#10B981" className="turcord-pulse-ring" />
          <line x1="50" y1="20" x2="50" y2="34" stroke="#34D399" strokeWidth="3" />
          <line x1="38" y1="68" x2="62" y2="68" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}

function renderDecorationOverlay(decoration: AvatarDecorationId) {
  if (!decoration || decoration === 'none') return null;

  switch (decoration) {
    case 'crimson-rose':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-slow" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="49" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeDasharray="10 4" opacity="0.85" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="5 8" opacity="0.7" />
          </g>
          {/* Rose blossoms at top-left, top-right, bottom-left */}
          {[
            { x: 24, y: 26, s: 1 },
            { x: 95, y: 28, s: 0.9 },
            { x: 25, y: 92, s: 0.85 },
          ].map((r, i) => (
            <g key={i} transform={`translate(${r.x}, ${r.y}) scale(${r.s})`} className="turcord-float-y">
              <ellipse cx="-6" cy="2" rx="5" ry="3" fill="#10B981" transform="rotate(-30 -6 2)" />
              <ellipse cx="6" cy="2" rx="5" ry="3" fill="#059669" transform="rotate(30 6 2)" />
              <circle cx="0" cy="0" r="7.5" fill="#E11D48" />
              <circle cx="-2" cy="-2" r="4.5" fill="#FB7185" />
              <circle cx="1.5" cy="1" r="3" fill="#9F1239" />
            </g>
          ))}
        </svg>
      );

    case 'sakura-blossom':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-slow" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#F9A8D4" strokeWidth="2.4" opacity="0.85" />
            {[0, 72, 144, 216, 288].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 60 60) translate(60 11)`}>
                <circle cx="0" cy="-3.5" r="3.4" fill="#F472B6" />
                <circle cx="3.3" cy="-1" r="3.4" fill="#F9A8D4" />
                <circle cx="2" cy="2.8" r="3.4" fill="#F472B6" />
                <circle cx="-2" cy="2.8" r="3.4" fill="#F9A8D4" />
                <circle cx="-3.3" cy="-1" r="3.4" fill="#F472B6" />
                <circle cx="0" cy="0" r="2.2" fill="#FEF08A" />
              </g>
            ))}
          </g>
        </svg>
      );

    case 'sunflower-bloom':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-slow" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#FBBF24" strokeWidth="3" strokeDasharray="4 4" />
            {[15, 105, 195, 285].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 60 60) translate(60 11)`}>
                <circle cx="0" cy="0" r="6" fill="#FACC15" />
                <circle cx="0" cy="0" r="2.8" fill="#78350F" />
              </g>
            ))}
          </g>
        </svg>
      );

    case 'enchanted-ivy':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-rev" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#10B981" strokeWidth="2.6" strokeDasharray="12 5" />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 60 60) translate(60 11)`}>
                <ellipse cx="0" cy="0" rx="5.5" ry="2.8" fill="#34D399" />
                <circle cx="7" cy="2" r="1.8" fill="#BEF264" />
              </g>
            ))}
          </g>
        </svg>
      );

    case 'kawaii-cat-ears':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#EC4899" strokeWidth="3" opacity="0.9" />
          <g className="turcord-float-y">
            <polygon points="18,38 22,8 44,24" fill="#F472B6" stroke="#FCE7F3" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="23,32 25,15 38,25" fill="#831843" />
            <polygon points="102,38 98,8 76,24" fill="#F472B6" stroke="#FCE7F3" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="97,32 95,15 82,25" fill="#831843" />
          </g>
          <circle cx="14" cy="62" r="2.5" fill="#FDE047" className="turcord-pulse-ring" />
          <circle cx="106" cy="56" r="2.5" fill="#F9A8D4" className="turcord-pulse-ring" />
        </svg>
      );

    case 'anime-ki-aura':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[22%] w-[144%] h-[144%] z-10 overflow-visible">
          <g className="turcord-pulse-ring" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#38BDF8" strokeWidth="3" opacity="0.85" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#FACC15" strokeWidth="1.6" strokeDasharray="8 6" opacity="0.8" />
          </g>
          <g className="turcord-spin-med" style={{ transformOrigin: '60px 60px' }}>
            <path d="M60 6 L66 18 L54 18 Z" fill="#FACC15" />
            <path d="M114 60 L102 66 L102 54 Z" fill="#38BDF8" />
            <path d="M60 114 L54 102 L66 102 Z" fill="#FACC15" />
            <path d="M6 60 L18 54 L18 66 Z" fill="#38BDF8" />
          </g>
        </svg>
      );

    case 'sharingan-vortex':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-med" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="49" fill="none" stroke="#DC2626" strokeWidth="3" />
            <circle cx="60" cy="60" r="45" fill="none" stroke="#7F1D1D" strokeWidth="1.5" strokeDasharray="6 4" />
            {[0, 120, 240].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 60 60) translate(60 11)`}>
                <circle cx="0" cy="0" r="4.2" fill="#EF4444" stroke="#000" strokeWidth="1" />
                <path d="M0 -4 Q5 -2 4 3" stroke="#EF4444" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </g>
            ))}
          </g>
        </svg>
      );

    case 'mecha-hud':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-slow" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="49" fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeDasharray="18 8 4 8" />
          </g>
          <g className="turcord-spin-rev" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="53" fill="none" stroke="#22D3EE" strokeWidth="1.3" strokeDasharray="3 7" />
          </g>
          <path d="M16 24 L26 24 M16 24 L16 34 M104 24 L94 24 M104 24 L104 34" stroke="#38BDF8" strokeWidth="2.2" />
        </svg>
      );

    case 'arcane-sigil':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[22%] w-[144%] h-[144%] z-10 overflow-visible">
          <g className="turcord-spin-slow" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#A855F7" strokeWidth="2.2" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="#E9D5FF" strokeWidth="1.2" strokeDasharray="3 4" />
            <polygon points="60,8 104,86 16,86" fill="none" stroke="#C084FC" strokeWidth="1.2" opacity="0.7" />
            <polygon points="60,112 104,34 16,34" fill="none" stroke="#C084FC" strokeWidth="1.2" opacity="0.7" />
          </g>
        </svg>
      );

    case 'galaxy-butterfly':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-slow" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#C084FC" strokeWidth="2.2" strokeDasharray="10 6" />
          </g>
          {[
            { x: 22, y: 26, rot: -25 },
            { x: 97, y: 78, rot: 20 },
          ].map((b, i) => (
            <g key={i} transform={`translate(${b.x}, ${b.y}) rotate(${b.rot})`} className="turcord-float-y">
              <ellipse cx="-4" cy="-2" rx="5" ry="3.5" fill="#E879F9" />
              <ellipse cx="4" cy="-2" rx="5" ry="3.5" fill="#A855F7" />
              <ellipse cx="-3" cy="3" rx="3.5" ry="2.5" fill="#38BDF8" />
              <ellipse cx="3" cy="3" rx="3.5" ry="2.5" fill="#C084FC" />
              <line x1="0" y1="-4" x2="0" y2="5" stroke="#FFF" strokeWidth="1.2" />
            </g>
          ))}
        </svg>
      );

    case 'celestial-angel':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[22%] w-[144%] h-[144%] z-10 overflow-visible">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#FDE047" strokeWidth="2.4" opacity="0.85" />
          <ellipse cx="60" cy="9" rx="22" ry="5" fill="none" stroke="#FEF08A" strokeWidth="3" className="turcord-float-y" />
          <path d="M14 54 Q2 40 12 26 Q18 42 18 54 Z" fill="#F8FAFC" opacity="0.9" className="turcord-float-y" />
          <path d="M106 54 Q118 40 108 26 Q102 42 102 54 Z" fill="#F8FAFC" opacity="0.9" className="turcord-float-y" />
        </svg>
      );

    case 'glitch-cyber':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible turcord-glitch">
          <circle cx="58" cy="60" r="48" fill="none" stroke="#22D3EE" strokeWidth="2.6" opacity="0.85" />
          <circle cx="62" cy="60" r="48" fill="none" stroke="#F43F5E" strokeWidth="2.6" opacity="0.85" strokeDasharray="16 8" />
          <rect x="8" y="34" width="14" height="3" fill="#22D3EE" />
          <rect x="98" y="80" width="14" height="3" fill="#F43F5E" />
        </svg>
      );

    case 'dragon-flame':
      return (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-[20%] w-[140%] h-[140%] z-10 overflow-visible">
          <g className="turcord-spin-med" style={{ transformOrigin: '60px 60px' }}>
            <circle cx="60" cy="60" r="49" fill="none" stroke="#F97316" strokeWidth="3.2" strokeDasharray="14 6" />
            {[0, 90, 180, 270].map((deg) => (
              <path
                key={deg}
                d="M60 4 Q66 13 60 18 Q54 13 60 4 Z"
                fill="#FACC15"
                transform={`rotate(${deg} 60 60)`}
              />
            ))}
          </g>
        </svg>
      );

    default:
      return null;
  }
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
  botId,
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  React.useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const sizeClass = SIZE_CLASSES[size];
  const dotClass = DOT_CLASSES[size];
  const decoClass = decoration && decoration !== 'none' ? SIMPLE_RING_CLASS[decoration] || '' : '';
  const isOfficialBot = botId && isOfficialBotUid(botId);
  const isPreset = Boolean(src && src.startsWith('preset:'));

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${sizeClass} ${decoClass} ${
        speaking ? 'ring-2 ring-[#23A55A] ring-offset-2 ring-offset-[#111216]' : ''
      }`}
    >
      {isOfficialBot ? (
        renderBotAvatar(botId, size)
      ) : isPreset && src ? (
        renderPresetAvatar(src)
      ) : src && !imgFailed ? (
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

      {!isOfficialBot && renderDecorationOverlay(decoration)}

      {showStatus && (
        <span
          aria-label={`Durum: ${status}`}
          style={{ borderColor: ringBg }}
          className={`absolute -bottom-0.5 -right-0.5 z-20 rounded-full ${dotClass} ${STATUS_COLOR[status]}`}
        />
      )}
    </div>
  );
};

export const VerifiedBotBadge: React.FC<{ label?: string }> = ({ label = 'UYG' }) => (
  <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-[#5865F2] text-[10px] font-bold tracking-wide text-white uppercase shrink-0 leading-tight">
    <Check className="w-2.5 h-2.5 stroke-[3]" />
    <span>{label}</span>
  </span>
);

export const ClanTagBadge: React.FC<{ tag?: string }> = ({ tag }) => {
  if (!tag) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#23252D] border border-[#323540] text-[10px] font-bold tracking-wider text-[#DBDEE1] uppercase shrink-0">
      <Gem className="w-2.5 h-2.5 text-[#5865F2]" />
      <span>{tag}</span>
    </span>
  );
};
