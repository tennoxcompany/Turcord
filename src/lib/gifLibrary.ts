import ggGif from '../assets/gifs/gg.gif?inline';
import hahaGif from '../assets/gifs/haha.gif?inline';
import alkisGif from '../assets/gifs/alkis.gif?inline';
import kalpGif from '../assets/gifs/kalp.gif?inline';
import atesGif from '../assets/gifs/ates.gif?inline';
import naberGif from '../assets/gifs/naber.gif?inline';
import dansGif from '../assets/gifs/dans.gif?inline';
import saskinGif from '../assets/gifs/saskin.gif?inline';
import onayGif from '../assets/gifs/onay.gif?inline';
import kralGif from '../assets/gifs/kral.gif?inline';
import uykuGif from '../assets/gifs/uyku.gif?inline';
import uzgunGif from '../assets/gifs/uzgun.gif?inline';

export type GifCategory = 'Tümü' | 'Tepki' | 'Oyun' | 'Sevgi' | 'Eğlence';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  category: Exclude<GifCategory, 'Tümü'>;
  tags: string[];
  isRemote?: boolean;
}

export const GIF_CATEGORIES: GifCategory[] = ['Tümü', 'Tepki', 'Oyun', 'Sevgi', 'Eğlence'];

export const BUILTIN_GIFS: GifItem[] = [
  {
    id: 'builtin_gg',
    title: 'GG!',
    url: ggGif,
    previewUrl: ggGif,
    category: 'Oyun',
    tags: ['gg', 'oyun', 'kazandık', 'zafer', 'iyi oyun', 'turcord'],
  },
  {
    id: 'builtin_haha',
    title: 'HAHA!',
    url: hahaGif,
    previewUrl: hahaGif,
    category: 'Eğlence',
    tags: ['haha', 'gülme', 'komik', 'kahkaha', 'lol', 'xd'],
  },
  {
    id: 'builtin_alkis',
    title: 'Bravo / Alkış',
    url: alkisGif,
    previewUrl: alkisGif,
    category: 'Tepki',
    tags: ['alkış', 'bravo', 'tebrik', 'harika', 'helal', 'kutlama'],
  },
  {
    id: 'builtin_kalp',
    title: 'Kalp',
    url: kalpGif,
    previewUrl: kalpGif,
    category: 'Sevgi',
    tags: ['kalp', 'aşk', 'sevgi', 'teşekkür', 'canım', 'love'],
  },
  {
    id: 'builtin_ates',
    title: 'Ateş / Fire',
    url: atesGif,
    previewUrl: atesGif,
    category: 'Tepki',
    tags: ['ateş', 'fire', 'efso', 'mükemmel', 'süper', 'alev'],
  },
  {
    id: 'builtin_naber',
    title: 'Naber?',
    url: naberGif,
    previewUrl: naberGif,
    category: 'Tepki',
    tags: ['naber', 'selam', 'merhaba', 'slm', 'nasılsın', 'hi'],
  },
  {
    id: 'builtin_dans',
    title: 'Vibe / Dans',
    url: dansGif,
    previewUrl: dansGif,
    category: 'Eğlence',
    tags: ['dans', 'vibe', 'müzik', 'parti', 'ritim', 'eğlence'],
  },
  {
    id: 'builtin_saskin',
    title: 'Ne?! / Şaşkın',
    url: saskinGif,
    previewUrl: saskinGif,
    category: 'Tepki',
    tags: ['ne', 'şaşkın', 'şok', 'nasıl', 'wtf', 'ciddi mi'],
  },
  {
    id: 'builtin_onay',
    title: 'Tamam / Onay',
    url: onayGif,
    previewUrl: onayGif,
    category: 'Tepki',
    tags: ['tamam', 'ok', 'onay', 'evet', 'katılıyorum', 'olur'],
  },
  {
    id: 'builtin_kral',
    title: 'Kral',
    url: kralGif,
    previewUrl: kralGif,
    category: 'Oyun',
    tags: ['kral', 'king', 'mvp', 'efsane', 'lider', 'taç'],
  },
  {
    id: 'builtin_uyku',
    title: 'Uyku / Zzz',
    url: uykuGif,
    previewUrl: uykuGif,
    category: 'Eğlence',
    tags: ['uyku', 'zzz', 'iyi geceler', 'yorgun', 'gece', 'uyu'],
  },
  {
    id: 'builtin_uzgun',
    title: 'Ah Be / Üzgün',
    url: uzgunGif,
    previewUrl: uzgunGif,
    category: 'Sevgi',
    tags: ['üzgün', 'ah be', 'ağla', 'yağmur', 'sad', 'tüh'],
  },
];

const FAVORITES_KEY = 'turcord_favorite_gifs_v1';

export function isSafeMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= 280000;
  }
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && trimmed.length <= 2000;
  } catch {
    return false;
  }
}

export function getFavoriteGifs(): GifItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GifItem =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.url === 'string' &&
        isSafeMediaUrl(item.url)
    );
  } catch {
    return [];
  }
}

export function toggleFavoriteGif(gif: GifItem): GifItem[] {
  const current = getFavoriteGifs();
  const exists = current.some((g) => g.url === gif.url || g.id === gif.id);
  const next = exists
    ? current.filter((g) => g.url !== gif.url && g.id !== gif.id)
    : [gif, ...current].slice(0, 36);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Storage quota full
    }
  }
  return next;
}

export function filterBuiltinGifs(query: string, category: GifCategory): GifItem[] {
  const q = query.trim().toLowerCase();
  return BUILTIN_GIFS.filter((g) => {
    if (category !== 'Tümü' && g.category !== category) return false;
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

let remoteGifSupport: 'unknown' | 'available' | 'unavailable' = 'unknown';

export async function fetchRemoteGifs(query: string): Promise<GifItem[]> {
  if (typeof window === 'undefined') return [];
  if (window.location.hostname.endsWith('github.io')) return [];
  if (remoteGifSupport === 'unavailable') return [];

  try {
    const res = await fetch(`/api/gifs?q=${encodeURIComponent(query.trim().slice(0, 60))}`);
    if (!res.ok) {
      remoteGifSupport = 'unavailable';
      return [];
    }
    const data = (await res.json()) as { configured?: boolean; results?: GifItem[] };
    if (data.configured === false) {
      remoteGifSupport = 'unavailable';
      return [];
    }
    remoteGifSupport = 'available';
    return Array.isArray(data.results)
      ? data.results.filter((r) => r && typeof r.url === 'string' && isSafeMediaUrl(r.url))
      : [];
  } catch {
    remoteGifSupport = 'unavailable';
    return [];
  }
}
