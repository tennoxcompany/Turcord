import type { BotId } from '../types/halka';

export interface BotDefinition {
  id: BotId;
  name: string;
  username: string;
  tagline: string;
  description: string;
  roleColor: string;
  bannerColor: string;
  verified: boolean;
  commands: Array<{ cmd: string; desc: string }>;
}

export const OFFICIAL_BOTS: Record<BotId, BotDefinition> = {
  turcord_bot: {
    id: 'turcord_bot',
    name: 'Turcord',
    username: 'turcord',
    tagline: 'Resmi Platform Botu & Yapay Zeka Asistanı',
    description:
      'Turcord platformunun resmi onaylı botu. Teknik sorunlarda anında bildirim gönderir, DM veya kanallardan sorularını yanıtlar, oylama ve duyurular oluşturur.',
    roleColor: '#5865F2',
    bannerColor: '#5865F2',
    verified: true,
    commands: [
      { cmd: '/turcord <soru>', desc: 'Turcord yapay zeka asistanına soru sor' },
      { cmd: '/yardim', desc: 'Tüm bot komutlarını ve ipuçlarını listele' },
      { cmd: '/oylama <konu>', desc: 'Kanalda hızlı 👍/👎 oylaması başlat' },
      { cmd: '/duyuru <metin>', desc: 'Resmi biçimlendirilmiş sunucu duyurusu paylaş' },
      { cmd: '/durum', desc: 'Ses, veritabanı ve bağlantı sistem durumunu kontrol et' },
    ],
  },
  mod_bot: {
    id: 'mod_bot',
    name: 'Turcord Muhafız',
    username: 'muhafiz',
    tagline: 'Moderasyon & Güvenlik Botu',
    description:
      'Sunucu kanallarını temiz tutar, moderatörlerin /temizle komutuyla toplu mesaj silmesini sağlar ve güvenlik hatırlatmaları yapar.',
    roleColor: '#23A55A',
    bannerColor: '#248046',
    verified: true,
    commands: [
      { cmd: '/temizle <sayı>', desc: 'Kanaldaki son mesajları toplu temizle (Yetkili)' },
    ],
  },
  music_bot: {
    id: 'music_bot',
    name: 'Turcord Eğlence',
    username: 'eglence',
    tagline: 'Mini Oyunlar & Topluluk Araçları',
    description:
      'Sohbete enerji katan zar atma, yazı-tura ve sihirli küre komutlarını çalıştırır.',
    roleColor: '#F59E0B',
    bannerColor: '#E67E22',
    verified: true,
    commands: [
      { cmd: '/zar [üst]', desc: '1-6 veya belirtilen üst sınıra kadar zar at' },
      { cmd: '/yazi-tura', desc: 'Yazı mı Tura mı çevir' },
      { cmd: '/8ball <soru>', desc: 'Sihirli küreye evet/hayır sorusu sor' },
    ],
  },
};

export interface SlashCommandItem {
  cmd: string;
  usage: string;
  desc: string;
  botId: BotId;
  serverOnly?: boolean;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  { cmd: '/turcord', usage: '/turcord ', desc: 'Turcord Resmi Bota soru sor veya yardım iste', botId: 'turcord_bot' },
  { cmd: '/yardim', usage: '/yardim', desc: 'Kullanılabilir tüm komutları göster', botId: 'turcord_bot' },
  { cmd: '/durum', usage: '/durum', desc: 'Bağlantı ve sistem durumunu kontrol et', botId: 'turcord_bot' },
  { cmd: '/oylama', usage: '/oylama ', desc: 'Hızlı oylama mesajı oluştur', botId: 'turcord_bot', serverOnly: true },
  { cmd: '/duyuru', usage: '/duyuru ', desc: 'Biçimli duyuru kartı gönder', botId: 'turcord_bot', serverOnly: true },
  { cmd: '/zar', usage: '/zar ', desc: 'Zar at (Örn: /zar 100)', botId: 'music_bot', serverOnly: true },
  { cmd: '/yazi-tura', usage: '/yazi-tura', desc: 'Yazı mı Tura mı at', botId: 'music_bot', serverOnly: true },
  { cmd: '/8ball', usage: '/8ball ', desc: 'Sihirli küreye soru sor', botId: 'music_bot', serverOnly: true },
  { cmd: '/temizle', usage: '/temizle 5', desc: 'Son N mesajı temizle (Moderatör)', botId: 'mod_bot', serverOnly: true },
];

export function isOfficialBotUid(uid: string): uid is BotId {
  return uid === 'turcord_bot' || uid === 'mod_bot' || uid === 'music_bot';
}

export function getBotThreadId(uid: string): string {
  return `bot_turcord_${uid}`;
}

export async function requestTurcordBotReply(params: {
  prompt: string;
  userDisplayName: string;
  contextType: 'dm' | 'channel';
  serverName?: string;
  channelName?: string;
  history?: Array<{ author: string; content: string }>;
}): Promise<string> {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const res = await fetch(`${apiBase}/api/bot/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 404 || !data) {
      throw new Error(
        'Turcord yapay zeka API sunucusu bu statik adreste aktif değil. Tam bot sohbeti için uygulama sunucusu üzerinden bağlan.'
      );
    }
    throw new Error(data.error || 'Turcord Bot yanıt veremedi.');
  }
  return String(data.reply || '').trim();
}
