import type {
  ActivityType,
  AvatarDecorationId,
  NameplateId,
  ProfileEffectId,
} from '../types/halka';

export type CosmeticCategory = 'Güllü & Doğa' | 'Anime & Oyun' | 'Kozmik & Neon';

export interface DecorationItem {
  id: AvatarDecorationId;
  name: string;
  desc: string;
  cost: number;
  accent: string;
  category: CosmeticCategory;
  animated?: boolean;
}

export const AVATAR_DECORATIONS: DecorationItem[] = [
  // Güllü & Doğa
  {
    id: 'crimson-rose',
    name: 'Kızıl Gül Çelengi',
    desc: 'Dönen güller, sarmaşık yaprakları ve süzülen taç yapraklar',
    cost: 450,
    accent: '#F43F5E',
    category: 'Güllü & Doğa',
    animated: true,
  },
  {
    id: 'sakura-blossom',
    name: 'Sakura Çiçeği',
    desc: 'Kiraz çiçekleri ve pembe bahar esintisi halkası',
    cost: 400,
    accent: '#F472B6',
    category: 'Güllü & Doğa',
    animated: true,
  },
  {
    id: 'sunflower-bloom',
    name: 'Altın Ayçiçeği',
    desc: 'Işıltılı güneş taç yaprakları ve sıcak altın hale',
    cost: 350,
    accent: '#FBBF24',
    category: 'Güllü & Doğa',
    animated: true,
  },
  {
    id: 'enchanted-ivy',
    name: 'Büyülü Sarmaşık',
    desc: 'Zümrüt orman yaprakları ve parlayan ateşböcekleri',
    cost: 380,
    accent: '#10B981',
    category: 'Güllü & Doğa',
    animated: true,
  },

  // Anime & Oyun
  {
    id: 'kawaii-cat-ears',
    name: 'Neko Kedi Kulakları',
    desc: 'Anime tarzı neon pembe kedi kulakları ve ışıltılar',
    cost: 500,
    accent: '#EC4899',
    category: 'Anime & Oyun',
    animated: true,
  },
  {
    id: 'anime-ki-aura',
    name: 'Süper Ki Aurası',
    desc: 'Yükselen altın ve camgöbeği anime güç patlaması',
    cost: 650,
    accent: '#38BDF8',
    category: 'Anime & Oyun',
    animated: true,
  },
  {
    id: 'sharingan-vortex',
    name: 'Kızıl Rün Girdabı',
    desc: 'Dönen kizıl tomoe rün halkası ve gölge enerjisi',
    cost: 700,
    accent: '#EF4444',
    category: 'Anime & Oyun',
    animated: true,
  },
  {
    id: 'mecha-hud',
    name: 'Mecha Nişangah HUD',
    desc: 'Siber pilot hedefleme halkası ve tarama lazerleri',
    cost: 550,
    accent: '#06B6D4',
    category: 'Anime & Oyun',
    animated: true,
  },
  {
    id: 'arcane-sigil',
    name: 'Büyü Çemberi',
    desc: 'Dönen mor mistik rünler ve enerji kıvılcımları',
    cost: 600,
    accent: '#A855F7',
    category: 'Anime & Oyun',
    animated: true,
  },

  // Kozmik & Neon
  {
    id: 'galaxy-butterfly',
    name: 'Kozmik Kelebekler',
    desc: 'Etrafında uçuşan ışıltılı gece kelebekleri',
    cost: 580,
    accent: '#C084FC',
    category: 'Kozmik & Neon',
    animated: true,
  },
  {
    id: 'celestial-angel',
    name: 'Melek Halesi & Kanat',
    desc: 'Süzülen altın hale ve beyaz ışık tüyleri',
    cost: 720,
    accent: '#FDE047',
    category: 'Kozmik & Neon',
    animated: true,
  },
  {
    id: 'glitch-cyber',
    name: 'Glitch Siber',
    desc: 'RGB renk sapmalı dijital parazit çerçevesi',
    cost: 480,
    accent: '#22D3EE',
    category: 'Kozmik & Neon',
    animated: true,
  },
  {
    id: 'dragon-flame',
    name: 'Ejderha Alevi',
    desc: 'Kızgın kor kıvılcımları ve dönen ateş halkası',
    cost: 780,
    accent: '#F97316',
    category: 'Kozmik & Neon',
    animated: true,
  },
  {
    id: 'cyber-ring',
    name: 'Siber Halka',
    desc: 'Parlak camgöbeği neon çerçeve',
    cost: 200,
    accent: '#38BDF8',
    category: 'Kozmik & Neon',
  },
  {
    id: 'emerald-flame',
    name: 'Zümrüt Alev',
    desc: 'Canlı yeşil enerji halkası',
    cost: 220,
    accent: '#23A55A',
    category: 'Kozmik & Neon',
  },
  {
    id: 'crimson-pulse',
    name: 'Kızıl Nabız',
    desc: 'Güçlü kırmızı arena çerçevesi',
    cost: 240,
    accent: '#F23F43',
    category: 'Kozmik & Neon',
  },
  {
    id: 'gold-halo',
    name: 'Altın Hale',
    desc: 'Efsanevi altın topluluk tacı',
    cost: 300,
    accent: '#F59E0B',
    category: 'Kozmik & Neon',
  },
  {
    id: 'aurora-orbit',
    name: 'Kutup Işığı',
    desc: 'Mor aurora ışık yörüngesi',
    cost: 320,
    accent: '#A855F7',
    category: 'Kozmik & Neon',
  },
];

export interface ProfileEffectItem {
  id: ProfileEffectId;
  name: string;
  desc: string;
  cost: number;
  accent: string;
  category: CosmeticCategory;
}

export const PROFILE_EFFECTS: ProfileEffectItem[] = [
  {
    id: 'rose-petals',
    name: 'Dökülen Gül Yaprakları',
    desc: 'Profil kartında süzülen kızıl gül taç yaprakları',
    cost: 550,
    accent: '#F43F5E',
    category: 'Güllü & Doğa',
  },
  {
    id: 'sakura-rain',
    name: 'Sakura Yağmuru',
    desc: 'Rüzgarla savrulan pembe kiraz çiçeği yaprakları',
    cost: 500,
    accent: '#F472B6',
    category: 'Güllü & Doğa',
  },
  {
    id: 'hearts-float',
    name: 'Uçuşan Kalpler',
    desc: 'Parlayan pembe ve mor kalp baloncukları',
    cost: 450,
    accent: '#EC4899',
    category: 'Güllü & Doğa',
  },
  {
    id: 'anime-sparks',
    name: 'Anime Güç Kıvılcımları',
    desc: 'Yukarı fırlayan yüksek enerji kıvılcımları',
    cost: 620,
    accent: '#FBBF24',
    category: 'Anime & Oyun',
  },
  {
    id: 'cyber-matrix',
    name: 'Siber Dijital Yağmur',
    desc: 'Neon yeşil-camgöbeği veri çizgileri',
    cost: 520,
    accent: '#22D3EE',
    category: 'Anime & Oyun',
  },
  {
    id: 'starfall',
    name: 'Yıldız Kayması',
    desc: 'Kozmik parlayan yıldızlar ve kayan meteorlar',
    cost: 680,
    accent: '#A855F7',
    category: 'Kozmik & Neon',
  },
  {
    id: 'confetti-party',
    name: 'Parti Konfetisi',
    desc: 'Renkli kutlama konfeti yağmuru',
    cost: 400,
    accent: '#5865F2',
    category: 'Kozmik & Neon',
  },
];

export interface NameplateItem {
  id: NameplateId;
  name: string;
  desc: string;
  cost: number;
  accent: string;
  className: string;
}

export const NAMEPLATES: NameplateItem[] = [
  {
    id: 'none',
    name: 'Standart',
    desc: 'Klasik sade üye satırı',
    cost: 0,
    accent: '#80848E',
    className: '',
  },
  {
    id: 'sakura-mist',
    name: 'Sakura Sisi',
    desc: 'Yumuşak pembe kiraz çiçeği isimlik şeridi',
    cost: 300,
    accent: '#F472B6',
    className: 'nameplate-sakura-mist',
  },
  {
    id: 'crimson-rose',
    name: 'Kızıl Kadife',
    desc: 'Koyu yakut gül ışıltılı isimlik',
    cost: 350,
    accent: '#F43F5E',
    className: 'nameplate-crimson-rose',
  },
  {
    id: 'cyber-grid',
    name: 'Siber Izgara',
    desc: 'Neon mavi dijital tarama isimliği',
    cost: 360,
    accent: '#38BDF8',
    className: 'nameplate-cyber-grid',
  },
  {
    id: 'aurora-glow',
    name: 'Kutup Parıltısı',
    desc: 'Mor ve yeşil geçişli hareketli aurora şeridi',
    cost: 420,
    accent: '#A855F7',
    className: 'nameplate-aurora-glow',
  },
  {
    id: 'gold-royal',
    name: 'Altın Kraliyet',
    desc: 'Parlayan altın varak isimlik şeridi',
    cost: 480,
    accent: '#F59E0B',
    className: 'nameplate-gold-royal',
  },
  {
    id: 'anime-speed',
    name: 'Anime Hız Çizgisi',
    desc: 'Dinamik manga hız çizgili isimlik',
    cost: 390,
    accent: '#EC4899',
    className: 'nameplate-anime-speed',
  },
];

export interface AnimatedBannerPreset {
  id: string;
  name: string;
  className: string;
  previewGradient: string;
  cost: number;
}

export const ANIMATED_BANNERS: AnimatedBannerPreset[] = [
  {
    id: 'anim:crimson-rose',
    name: 'Kızıl Gül Gecesi',
    className: 'banner-anim-crimson-rose',
    previewGradient: 'linear-gradient(125deg, #4C0519, #9F1239, #E11D48, #4C0519)',
    cost: 300,
  },
  {
    id: 'anim:sakura',
    name: 'Sakura Rüzgarı',
    className: 'banner-anim-sakura',
    previewGradient: 'linear-gradient(125deg, #500724, #DB2777, #F9A8D4, #831843)',
    cost: 300,
  },
  {
    id: 'anim:anime-night',
    name: 'Tokyo Gece Işıkları',
    className: 'banner-anim-anime-night',
    previewGradient: 'linear-gradient(125deg, #1E1B4B, #7C3AED, #EC4899, #0F172A)',
    cost: 350,
  },
  {
    id: 'anim:cyberpunk',
    name: 'Siberpunk Neon',
    className: 'banner-anim-cyberpunk',
    previewGradient: 'linear-gradient(125deg, #083344, #06B6D4, #6366F1, #0F172A)',
    cost: 350,
  },
  {
    id: 'anim:aurora',
    name: 'Kuzey Işıkları',
    className: 'banner-anim-aurora',
    previewGradient: 'linear-gradient(125deg, #064E3B, #10B981, #8B5CF6, #1E1B4B)',
    cost: 400,
  },
  {
    id: 'anim:galaxy',
    name: 'Galaksi Bulutsusu',
    className: 'banner-anim-galaxy',
    previewGradient: 'linear-gradient(125deg, #090D16, #312E81, #9333EA, #1E1B4B)',
    cost: 400,
  },
];

export const SOLID_BANNER_COLORS = [
  '#5865F2',
  '#E11D48',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#1E2027',
];

export interface AvatarPresetItem {
  id: string;
  name: string;
  accent: string;
  bg: string;
}

export const ANIMATED_AVATAR_PRESETS: AvatarPresetItem[] = [
  { id: 'preset:sakura-neko', name: 'Sakura Neko', accent: '#F472B6', bg: '#3B0764' },
  { id: 'preset:rose-queen', name: 'Gül Kraliçesi', accent: '#FB7185', bg: '#4C0519' },
  { id: 'preset:cyber-kitsune', name: 'Siber Kitsune', accent: '#22D3EE', bg: '#082F49' },
  { id: 'preset:dragon-aura', name: 'Ejder Savaşçısı', accent: '#F97316', bg: '#431407' },
  { id: 'preset:star-witch', name: 'Yıldız Büyücüsü', accent: '#C084FC', bg: '#1E1B4B' },
  { id: 'preset:mecha-ace', name: 'Mecha Pilotu', accent: '#34D399', bg: '#064E3B' },
];

export interface BadgeDef {
  id: string;
  label: string;
  desc: string;
  color: string;
  emoji: string;
  isHouse?: boolean;
}

export const DISCORD_BADGES: Record<string, BadgeDef> = {
  'turcord-pioneer': {
    id: 'turcord-pioneer',
    label: 'Turcord Öncüsü',
    desc: 'Turcord topluluğunun erken dönem üyesi',
    color: '#5865F2',
    emoji: '🚀',
  },
  'nitro-orb': {
    id: 'nitro-orb',
    label: 'Orbs Koleksiyoncusu',
    desc: 'En az bir hareketli çerçeve veya efekt açtı',
    color: '#EC4899',
    emoji: '💎',
  },
  'server-booster': {
    id: 'server-booster',
    label: 'Sunucu Takviyecisi',
    desc: 'Bir sunucuya Orbs ile takviye yaptı',
    color: '#F472B6',
    emoji: '⚡',
  },
  'active-dev': {
    id: 'active-dev',
    label: 'Aktif Üretici',
    desc: 'Sunucu veya kanal oluşturan topluluk kurucusu',
    color: '#23A55A',
    emoji: '🛠️',
  },
  'hypesquad-bravery': {
    id: 'hypesquad-bravery',
    label: 'HypeSquad Cesaret',
    desc: 'Cesaret Hanesi üyesi',
    color: '#9C84EF',
    emoji: '🛡️',
    isHouse: true,
  },
  'hypesquad-brilliance': {
    id: 'hypesquad-brilliance',
    label: 'HypeSquad Parlaklık',
    desc: 'Parlaklık Hanesi üyesi',
    color: '#F47B67',
    emoji: '✨',
    isHouse: true,
  },
  'hypesquad-balance': {
    id: 'hypesquad-balance',
    label: 'HypeSquad Denge',
    desc: 'Denge Hanesi üyesi',
    color: '#45DDC0',
    emoji: '⚖️',
    isHouse: true,
  },
  'early-supporter': {
    id: 'early-supporter',
    label: 'İlk Destekçi',
    desc: 'Topluluk görevlerini tamamlayan destekçi',
    color: '#F59E0B',
    emoji: '👑',
  },
};

export const ACTIVITY_PRESETS: Array<{ type: ActivityType; name: string; details: string }> = [
  { type: 'playing', name: 'Valorant', details: 'Dereceli · Ascent' },
  { type: 'playing', name: 'League of Legends', details: 'Sihirdar Vadisi' },
  { type: 'playing', name: 'Minecraft', details: 'Survival Sunucusu' },
  { type: 'playing', name: 'Counter-Strike 2', details: 'Seçkin Mod' },
  { type: 'listening', name: 'Spotify', details: 'Gece Lo-Fi Beats' },
  { type: 'watching', name: 'Anime', details: 'Yeni Bölüm İzleniyor' },
  { type: 'streaming', name: 'Turcord Live', details: 'Canlı Yayın Açık' },
];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  playing: 'Oynuyor',
  listening: 'Dinliyor',
  watching: 'İzliyor',
  streaming: 'Yayında',
};

export const CLAN_TAGS = ['TR', 'CİX', 'GÜL', 'UWU', 'DEV', 'GG', 'PRO', 'ACE'];

export interface SoundboardItem {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export const SOUNDBOARD_ITEMS: SoundboardItem[] = [
  { id: 'airhorn', label: 'Korna', emoji: '📣', color: '#F43F5E' },
  { id: 'applause', label: 'Alkış', emoji: '👏', color: '#23A55A' },
  { id: 'drum', label: 'Badum Tss', emoji: '🥁', color: '#F59E0B' },
  { id: 'fanfare', label: 'Zafer', emoji: '🎺', color: '#5865F2' },
  { id: 'laser', label: 'Lazer', emoji: '⚡', color: '#22D3EE' },
  { id: 'quack', label: 'Vak Vak', emoji: '🦆', color: '#FBBF24' },
];

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Pure Web Audio API soundboard synthesizer — works offline and on static GH Pages without external MP3 assets.
 */
export function playSoundboardEffect(id: string): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const tone = (
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    delay = 0,
    gainVal = 0.16
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + delay);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + delay + duration);
    gain.gain.setValueAtTime(0.001, now + delay);
    gain.gain.linearRampToValueAtTime(gainVal, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.02);
  };

  if (id === 'airhorn') {
    tone(415, 405, 0.16, 'sawtooth', 0, 0.14);
    tone(523, 510, 0.16, 'sawtooth', 0, 0.12);
    tone(415, 390, 0.48, 'sawtooth', 0.2, 0.15);
    tone(523, 495, 0.48, 'sawtooth', 0.2, 0.13);
  } else if (id === 'fanfare') {
    tone(523.25, 523.25, 0.12, 'triangle', 0, 0.18);
    tone(659.25, 659.25, 0.12, 'triangle', 0.12, 0.18);
    tone(783.99, 783.99, 0.12, 'triangle', 0.24, 0.18);
    tone(1046.5, 1046.5, 0.45, 'triangle', 0.36, 0.22);
  } else if (id === 'drum') {
    tone(160, 75, 0.14, 'sine', 0, 0.28);
    tone(190, 85, 0.14, 'sine', 0.16, 0.28);
    // Cymbal noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now + 0.32);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.77);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now + 0.32);
  } else if (id === 'applause') {
    for (let k = 0; k < 8; k++) {
      const delay = k * 0.075;
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400 + (k % 3) * 350;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now + delay);
    }
  } else if (id === 'laser') {
    tone(1400, 180, 0.25, 'sawtooth', 0, 0.14);
    tone(1100, 140, 0.22, 'square', 0.04, 0.08);
  } else if (id === 'quack') {
    tone(420, 290, 0.14, 'sawtooth', 0, 0.14);
    tone(440, 280, 0.16, 'sawtooth', 0.18, 0.14);
  }
}

export function isSafeMediaUrl(url: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('https://') ||
    url.startsWith('preset:') ||
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url)
  );
}

export function getDecorationMeta(id?: AvatarDecorationId): DecorationItem | undefined {
  if (!id || id === 'none') return undefined;
  return AVATAR_DECORATIONS.find((d) => d.id === id);
}

export function getNameplateMeta(id?: NameplateId): NameplateItem {
  return NAMEPLATES.find((n) => n.id === id) || NAMEPLATES[0];
}
