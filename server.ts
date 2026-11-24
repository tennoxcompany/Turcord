import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import dns from 'dns';
import net from 'net';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const BOT_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;

function isTransientGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    msg.includes('"code":503') ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

function formatGeminiErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || 'Bilinmeyen yapay zeka hatası');
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return {
      status: 503,
      message: 'Yapay zeka sunucuları şu an yoğun (503). Birkaç saniye sonra tekrar dene.',
    };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'İstek limiti geçici olarak doldu (429). Kısa bir süre sonra tekrar dene.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message: 'API anahtarı doğrulanamadı. Lütfen Ayarlar > Gizli Anahtarlar (Secrets) panelini kontrol et.',
    };
  }
  return {
    status: 500,
    message: raw.slice(0, 260),
  };
}

async function generateBotReplyWithRetry(
  client: GoogleGenAI,
  fullPrompt: string,
  systemInstruction: string
): Promise<string> {
  let lastError: unknown;
  for (const model of BOT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: fullPrompt,
          config: { systemInstruction },
        });
        const replyText = (response.text || '').trim();
        if (replyText) {
          return replyText.slice(0, 1900);
        }
        lastError = new Error('Model boş yanıt döndürdü.');
      } catch (err) {
        lastError = err;
        if (!isTransientGeminiError(err)) {
          throw err;
        }
        const delayMs = 600 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError || new Error('Yanıt alınamadı.');
}

interface ClientMeta {
  ws: WebSocket;
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  watchedServerId: string | null;
  activeChannelKey: string | null;
  voiceRoomKey: string | null;
}

interface VoiceParticipant {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  speaking: boolean;
}

const clients = new Map<WebSocket, ClientMeta>();
// uid -> Set<WebSocket> (supports multiple tabs for same user)
const userSockets = new Map<string, Set<WebSocket>>();
// roomKey (e.g. "server:srv1:ch2" or "dm:u1_u2") -> Map<uid, VoiceParticipant>
const voiceRooms = new Map<string, Map<string, VoiceParticipant>>();
// channelKey -> Map<uid, { displayName, expiresAt }>
const typingState = new Map<string, Map<string, { displayName: string; expiresAt: number }>>();

function safeSend(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastAll(payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const [ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  }
}

function getOnlineUsersSnapshot() {
  const map: Record<string, { status: string; displayName: string; avatarUrl: string }> = {};
  for (const meta of clients.values()) {
    if (meta.uid) {
      map[meta.uid] = {
        status: meta.status,
        displayName: meta.displayName,
        avatarUrl: meta.avatarUrl,
      };
    }
  }
  return map;
}

function getServerVoiceSnapshot(serverId: string) {
  const prefix = `server:${serverId}:`;
  const channels: Record<string, VoiceParticipant[]> = {};
  for (const [roomKey, members] of voiceRooms.entries()) {
    if (roomKey.startsWith(prefix)) {
      const channelId = roomKey.slice(prefix.length);
      channels[channelId] = Array.from(members.values());
    }
  }
  return channels;
}

function broadcastServerVoiceState(serverId: string) {
  const snapshot = getServerVoiceSnapshot(serverId);
  const payload = { type: 'voice:server-state', serverId, channels: snapshot };
  for (const [ws, meta] of clients.entries()) {
    if (meta.watchedServerId === serverId) {
      safeSend(ws, payload);
    }
  }
}

function broadcastRoomParticipants(roomKey: string) {
  const room = voiceRooms.get(roomKey);
  const participants = room ? Array.from(room.values()) : [];
  const payload = { type: 'voice:room-state', roomKey, participants };
  for (const [ws, meta] of clients.entries()) {
    if (meta.voiceRoomKey === roomKey) {
      safeSend(ws, payload);
    }
  }
  if (roomKey.startsWith('server:')) {
    const parts = roomKey.split(':');
    if (parts[1]) {
      broadcastServerVoiceState(parts[1]);
    }
  }
}

function removeFromVoiceRoom(meta: ClientMeta) {
  if (!meta.voiceRoomKey) return;
  const oldRoomKey = meta.voiceRoomKey;
  meta.voiceRoomKey = null;

  // Check if user still has another socket in the same room
  const sockets = userSockets.get(meta.uid);
  const stillInRoom = sockets
    ? Array.from(sockets).some((s) => s !== meta.ws && clients.get(s)?.voiceRoomKey === oldRoomKey)
    : false;

  if (!stillInRoom) {
    const room = voiceRooms.get(oldRoomKey);
    if (room) {
      room.delete(meta.uid);
      if (room.size === 0) {
        voiceRooms.delete(oldRoomKey);
      }
      // Notify peers in the room so they clean up RTCPeerConnection
      for (const [ws, peerMeta] of clients.entries()) {
        if (peerMeta.voiceRoomKey === oldRoomKey) {
          safeSend(ws, { type: 'voice:user-left', roomKey: oldRoomKey, uid: meta.uid });
        }
      }
    }
    broadcastRoomParticipants(oldRoomKey);
  }
}

function broadcastTypingForChannel(channelKey: string) {
  const now = Date.now();
  const channelMap = typingState.get(channelKey);
  const active: Array<{ uid: string; displayName: string }> = [];
  if (channelMap) {
    for (const [uid, entry] of channelMap.entries()) {
      if (entry.expiresAt > now) {
        active.push({ uid, displayName: entry.displayName });
      } else {
        channelMap.delete(uid);
      }
    }
    if (channelMap.size === 0) {
      typingState.delete(channelKey);
    }
  }
  const payload = { type: 'typing:update', channelKey, typers: active };
  for (const [ws, meta] of clients.entries()) {
    if (meta.activeChannelKey === channelKey) {
      safeSend(ws, payload);
    }
  }
}

// Periodically expire stale typing indicators
const typingSweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [channelKey, channelMap] of typingState.entries()) {
    let changed = false;
    for (const [uid, entry] of channelMap.entries()) {
      if (entry.expiresAt <= now) {
        channelMap.delete(uid);
        changed = true;
      }
    }
    if (changed) {
      broadcastTypingForChannel(channelKey);
    }
  }
}, 2000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get('/api/gifs', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
    const tenorKey = process.env.TENOR_API_KEY;
    const giphyKey = process.env.GIPHY_API_KEY;

    if (!tenorKey && !giphyKey) {
      return res.json({ configured: false, results: [] });
    }

    try {
      if (tenorKey) {
        const endpoint = q
          ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${encodeURIComponent(tenorKey)}&limit=18&media_filter=tinygif,gif&contentfilter=medium`
          : `https://tenor.googleapis.com/v2/featured?key=${encodeURIComponent(tenorKey)}&limit=18&media_filter=tinygif,gif&contentfilter=medium`;
        const upstream = await fetch(endpoint);
        if (!upstream.ok) {
          return res.status(502).json({ configured: true, results: [] });
        }
        const payload = (await upstream.json()) as {
          results?: Array<{
            id: string;
            content_description?: string;
            media_formats?: {
              tinygif?: { url?: string };
              gif?: { url?: string };
            };
          }>;
        };
        const results = (payload.results || [])
          .map((item) => {
            const url = item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || '';
            return {
              id: `tenor_${item.id}`,
              title: (item.content_description || 'GIF').slice(0, 40),
              url,
              previewUrl: url,
              category: 'Tepki',
              tags: q ? [q] : ['trend'],
              isRemote: true,
            };
          })
          .filter((r) => r.url.startsWith('https://'));
        return res.json({ configured: true, results });
      }

      const giphyEndpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyKey!)}&q=${encodeURIComponent(q)}&limit=18&rating=pg-13`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(giphyKey!)}&limit=18&rating=pg-13`;
      const upstream = await fetch(giphyEndpoint);
      if (!upstream.ok) {
        return res.status(502).json({ configured: true, results: [] });
      }
      const payload = (await upstream.json()) as {
        data?: Array<{
          id: string;
          title?: string;
          images?: {
            fixed_height_small?: { url?: string };
            fixed_height?: { url?: string };
          };
        }>;
      };
      const results = (payload.data || [])
        .map((item) => {
          const url = item.images?.fixed_height?.url || item.images?.fixed_height_small?.url || '';
          const previewUrl = item.images?.fixed_height_small?.url || url;
          return {
            id: `giphy_${item.id}`,
            title: (item.title || 'GIF').slice(0, 40),
            url,
            previewUrl,
            category: 'Tepki',
            tags: q ? [q] : ['trend'],
            isRemote: true,
          };
        })
        .filter((r) => r.url.startsWith('https://'));
      return res.json({ configured: true, results });
    } catch {
      return res.status(502).json({ configured: true, results: [] });
    }
  });

  // SSRF-hardened OpenGraph link preview endpoint
  const linkPreviewCache = new Map<string, { expiresAt: number; data: { url: string; title: string; description: string; image: string; siteName: string } | null }>();

  function isPrivateOrReservedIpv4(ip: string): boolean {
    const parts = ip.split('.').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  function isPrivateOrReservedIp(ip: string): boolean {
    const clean = ip.toLowerCase().trim();
    if (net.isIPv4(clean)) return isPrivateOrReservedIpv4(clean);
    if (!net.isIPv6(clean)) return true;
    if (clean === '::' || clean === '::1') return true;
    if (clean.startsWith('::ffff:')) {
      const mapped = clean.slice('::ffff:'.length);
      if (net.isIPv4(mapped)) return isPrivateOrReservedIpv4(mapped);
    }
    const firstSegment = clean.split(':')[0] || '';
    if (firstSegment.startsWith('fc') || firstSegment.startsWith('fd')) return true;
    if (firstSegment.startsWith('fe8') || firstSegment.startsWith('fe9') || firstSegment.startsWith('fea') || firstSegment.startsWith('feb')) return true;
    if (firstSegment.startsWith('ff')) return true;
    return false;
  }

  async function validateExternalHttpUrl(rawUrl: string): Promise<URL | null> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return null;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port && parsed.port !== '80' && parsed.port !== '443') return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;

    if (net.isIP(host)) {
      if (isPrivateOrReservedIp(host)) return null;
      return parsed;
    }

    try {
      const records = await dns.promises.lookup(host, { all: true });
      if (!records.length) return null;
      for (const rec of records) {
        if (isPrivateOrReservedIp(rec.address)) return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function decodeHtmlEntities(input: string): string {
    return input
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&#x27;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_m, dec) => {
        const code = Number(dec);
        return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractMetaContent(html: string, keys: string[]): string {
    const metaTags = html.match(/<meta\s+[^>]*>/gi) || [];
    for (const tag of metaTags) {
      const attrRegex = /([a-zA-Z0-9:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      const attrs: Record<string, string> = {};
      let m: RegExpExecArray | null;
      while ((m = attrRegex.exec(tag)) !== null) {
        attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? '';
      }
      const key = (attrs.property || attrs.name || '').toLowerCase();
      if (key && keys.includes(key) && attrs.content) {
        return decodeHtmlEntities(attrs.content);
      }
    }
    return '';
  }

  app.get('/api/link-preview', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim().slice(0, 600) : '';
    if (!rawUrl) {
      return res.status(400).json({ preview: null });
    }

    const cached = linkPreviewCache.get(rawUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ preview: cached.data });
    }

    try {
      let currentUrl = await validateExternalHttpUrl(rawUrl);
      if (!currentUrl) {
        return res.status(400).json({ preview: null });
      }

      let response: Response | null = null;
      for (let hop = 0; hop <= 2; hop++) {
        const resp = await fetch(currentUrl.toString(), {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(3500),
          headers: {
            'User-Agent': 'TurcordBot/1.0 (+https://turcord.app)',
            Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
          },
        });

        if (resp.status >= 300 && resp.status < 400) {
          const location = resp.headers.get('location');
          if (!location || hop === 2) {
            return res.json({ preview: null });
          }
          const nextRaw = new URL(location, currentUrl).toString();
          const validatedNext = await validateExternalHttpUrl(nextRaw);
          if (!validatedNext) {
            return res.status(400).json({ preview: null });
          }
          currentUrl = validatedNext;
          continue;
        }
        response = resp;
        break;
      }

      if (!response || !response.ok) {
        return res.json({ preview: null });
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return res.json({ preview: null });
      }

      const reader = response.body?.getReader();
      let html = '';
      if (reader) {
        const decoder = new TextDecoder();
        let bytesRead = 0;
        const maxBytes = 350 * 1024;
        while (bytesRead < maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          bytesRead += value.byteLength;
          html += decoder.decode(value, { stream: true });
          if (html.includes('</head>')) break;
        }
        reader.cancel().catch(() => {});
      } else {
        html = (await response.text()).slice(0, 350 * 1024);
      }

      const headSlice = html.slice(0, 120000);
      const titleMatch = headSlice.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const rawTitle = extractMetaContent(headSlice, ['og:title', 'twitter:title']) || (titleMatch ? decodeHtmlEntities(titleMatch[1]) : '');
      const rawDescription = extractMetaContent(headSlice, ['og:description', 'twitter:description', 'description']);
      const rawImage = extractMetaContent(headSlice, ['og:image', 'twitter:image']);
      const rawSiteName = extractMetaContent(headSlice, ['og:site_name']) || currentUrl.hostname;

      let safeImage = '';
      if (rawImage) {
        try {
          const resolvedImg = new URL(rawImage, currentUrl);
          if (resolvedImg.protocol === 'https:' && (await validateExternalHttpUrl(resolvedImg.toString()))) {
            safeImage = resolvedImg.toString().slice(0, 500);
          }
        } catch {
          safeImage = '';
        }
      }

      const preview =
        rawTitle || rawDescription
          ? {
              url: currentUrl.toString(),
              title: rawTitle.slice(0, 140),
              description: rawDescription.slice(0, 280),
              image: safeImage,
              siteName: rawSiteName.slice(0, 60),
            }
          : null;

      if (linkPreviewCache.size >= 200) {
        const oldestKey = linkPreviewCache.keys().next().value;
        if (oldestKey) linkPreviewCache.delete(oldestKey);
      }
      linkPreviewCache.set(rawUrl, { expiresAt: Date.now() + 10 * 60 * 1000, data: preview });

      return res.json({ preview });
    } catch {
      return res.json({ preview: null });
    }
  });

  app.post('/api/bot/reply', async (req, res) => {
    if (!geminiClient) {
      return res.status(503).json({
        error: 'Turcord Resmi Bot yanıt servisi yapılandırılmamış (GEMINI_API_KEY eksik).',
      });
    }

    const body = req.body || {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 1500) : '';
    const userDisplayName = typeof body.userDisplayName === 'string' ? body.userDisplayName.slice(0, 40) : 'Kullanıcı';
    const contextType = body.contextType === 'channel' ? 'channel' : 'dm';
    const serverName = typeof body.serverName === 'string' ? body.serverName.slice(0, 60) : '';
    const channelName = typeof body.channelName === 'string' ? body.channelName.slice(0, 50) : '';
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .map((item: { author?: string; content?: string }) => `${String(item.author || 'Üye').slice(0, 30)}: ${String(item.content || '').slice(0, 400)}`)
          .join('\n')
      : '';

    if (!prompt) {
      return res.status(400).json({ error: 'Mesaj içeriği boş olamaz.' });
    }

    const systemInstruction = [
      'Sen Turcord platformunun resmi doğrulanmış botusun (Adın: Turcord, rozet: ONAYLI UYGULAMA).',
      'Kullanıcılarla samimi, net, yardımcı ve Discord kültürüne hakim bir Türkçe ile konuşursun.',
      'Turcord özellikleri: Sunucular, metin/duyuru/sesli ve görüntülü kanallar, ekran paylaşımı, arkadaşlık sistemi, grup DM, Oniks (AMOLED)/Koyu/Gece temaları, Orbs mağazası & görevler, klan etiketleri, bildirimler, yer işaretleri ve sunucu botları (/yardim, /turcord, /oylama, /zar, /yazi-tura, /8ball, /temizle).',
      'Kullanıcı bir teknik sorun (mikrofon, kamera, bağlantı, izin, sunucu kurulumu, yetki) yaşadığında adım adım pratik çözüm öner.',
      'Yanıtların kısa, okunaklı, Discord markdown biçimlendirmeli (**kalın**, `kod`) ve gereksiz uzatmasız olsun (en fazla 1200 karakter).',
    ].join('\n');

    const fullPrompt = [
      `Kullanıcı: ${userDisplayName}`,
      contextType === 'channel' ? `Ortam: "${serverName}" sunucusundaki #${channelName} kanalı` : 'Ortam: Turcord Resmi Bot Direkt Mesaj (DM)',
      history ? `Son mesaj geçmişi:\n${history}` : '',
      `Güncel mesaj: ${prompt}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const reply = await generateBotReplyWithRetry(geminiClient, fullPrompt, systemInstruction);
      return res.json({ reply });
    } catch (err) {
      console.error('Turcord Bot Gemini error:', err);
      const formatted = formatGeminiErrorMessage(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const meta: ClientMeta = {
      ws,
      uid: '',
      displayName: '',
      username: '',
      avatarUrl: '',
      status: 'online',
      watchedServerId: null,
      activeChannelKey: null,
      voiceRoomKey: null,
    };
    clients.set(ws, meta);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!msg || typeof msg.type !== 'string') return;

        switch (msg.type) {
          case 'auth:identify': {
            if (!msg.uid || typeof msg.uid !== 'string') return;
            meta.uid = msg.uid;
            meta.displayName = String(msg.displayName || 'Kullanıcı').slice(0, 40);
            meta.username = String(msg.username || 'user').slice(0, 32);
            meta.avatarUrl = String(msg.avatarUrl || '').slice(0, 12000);
            meta.status = ['online', 'idle', 'dnd', 'offline'].includes(msg.status) ? msg.status : 'online';

            if (!userSockets.has(meta.uid)) {
              userSockets.set(meta.uid, new Set());
            }
            userSockets.get(meta.uid)!.add(ws);

            safeSend(ws, { type: 'presence:sync', users: getOnlineUsersSnapshot() });
            broadcastAll({
              type: 'presence:update',
              uid: meta.uid,
              status: meta.status,
              displayName: meta.displayName,
              avatarUrl: meta.avatarUrl,
            });
            break;
          }

          case 'presence:status': {
            if (!meta.uid) return;
            meta.status = ['online', 'idle', 'dnd', 'offline'].includes(msg.status) ? msg.status : 'online';
            if (msg.displayName) meta.displayName = String(msg.displayName).slice(0, 40);
            if (msg.avatarUrl !== undefined) meta.avatarUrl = String(msg.avatarUrl).slice(0, 12000);
            broadcastAll({
              type: 'presence:update',
              uid: meta.uid,
              status: meta.status,
              displayName: meta.displayName,
              avatarUrl: meta.avatarUrl,
            });
            break;
          }

          case 'server:watch': {
            meta.watchedServerId = typeof msg.serverId === 'string' ? msg.serverId : null;
            if (meta.watchedServerId) {
              safeSend(ws, {
                type: 'voice:server-state',
                serverId: meta.watchedServerId,
                channels: getServerVoiceSnapshot(meta.watchedServerId),
              });
            }
            break;
          }

          case 'channel:focus': {
            meta.activeChannelKey = typeof msg.channelKey === 'string' ? msg.channelKey : null;
            if (meta.activeChannelKey) {
              broadcastTypingForChannel(meta.activeChannelKey);
            }
            break;
          }

          case 'typing:start': {
            if (!meta.uid || typeof msg.channelKey !== 'string') return;
            if (!typingState.has(msg.channelKey)) {
              typingState.set(msg.channelKey, new Map());
            }
            typingState.get(msg.channelKey)!.set(meta.uid, {
              displayName: meta.displayName || meta.username,
              expiresAt: Date.now() + 4500,
            });
            broadcastTypingForChannel(msg.channelKey);
            break;
          }

          case 'typing:stop': {
            if (!meta.uid || typeof msg.channelKey !== 'string') return;
            const channelMap = typingState.get(msg.channelKey);
            if (channelMap && channelMap.delete(meta.uid)) {
              broadcastTypingForChannel(msg.channelKey);
            }
            break;
          }

          case 'voice:join': {
            if (!meta.uid || typeof msg.roomKey !== 'string') return;
            if (meta.voiceRoomKey && meta.voiceRoomKey !== msg.roomKey) {
              removeFromVoiceRoom(meta);
            }
            meta.voiceRoomKey = msg.roomKey;
            if (!voiceRooms.has(msg.roomKey)) {
              voiceRooms.set(msg.roomKey, new Map());
            }
            const room = voiceRooms.get(msg.roomKey)!;
            const existingPeers = Array.from(room.values()).filter((p) => p.uid !== meta.uid);

            const participant: VoiceParticipant = {
              uid: meta.uid,
              displayName: meta.displayName || 'Kullanıcı',
              username: meta.username || 'user',
              avatarUrl: meta.avatarUrl || '',
              muted: Boolean(msg.muted),
              deafened: Boolean(msg.deafened),
              cameraOn: Boolean(msg.cameraOn),
              screenSharing: Boolean(msg.screenSharing),
              speaking: false,
            };
            room.set(meta.uid, participant);

            // Tell joining client who is already in the room (so it initiates WebRTC offers to them)
            safeSend(ws, {
              type: 'voice:peers-init',
              roomKey: msg.roomKey,
              peers: existingPeers,
            });

            broadcastRoomParticipants(msg.roomKey);
            break;
          }

          case 'voice:leave': {
            removeFromVoiceRoom(meta);
            break;
          }

          case 'voice:state': {
            if (!meta.uid || !meta.voiceRoomKey) return;
            const room = voiceRooms.get(meta.voiceRoomKey);
            const p = room?.get(meta.uid);
            if (p) {
              if (typeof msg.muted === 'boolean') p.muted = msg.muted;
              if (typeof msg.deafened === 'boolean') p.deafened = msg.deafened;
              if (typeof msg.cameraOn === 'boolean') p.cameraOn = msg.cameraOn;
              if (typeof msg.screenSharing === 'boolean') p.screenSharing = msg.screenSharing;
              if (typeof msg.speaking === 'boolean') p.speaking = msg.speaking;
              broadcastRoomParticipants(meta.voiceRoomKey);
            }
            break;
          }

          case 'voice:soundboard': {
            if (!meta.uid || !meta.voiceRoomKey || typeof msg.soundId !== 'string') return;
            const soundId = msg.soundId.slice(0, 40);
            const roomKey = meta.voiceRoomKey;
            for (const [peerWs, peerMeta] of clients.entries()) {
              if (peerMeta.voiceRoomKey === roomKey && peerMeta.uid !== meta.uid) {
                safeSend(peerWs, {
                  type: 'voice:soundboard',
                  roomKey,
                  fromUid: meta.uid,
                  fromName: meta.displayName || meta.username || 'Üye',
                  soundId,
                });
              }
            }
            break;
          }

          case 'rtc:offer':
          case 'rtc:answer':
          case 'rtc:ice-candidate': {
            if (!meta.uid || !meta.voiceRoomKey || typeof msg.targetUid !== 'string') return;
            const targetSockets = userSockets.get(msg.targetUid);
            if (targetSockets) {
              for (const targetWs of targetSockets) {
                const targetMeta = clients.get(targetWs);
                if (targetMeta && targetMeta.voiceRoomKey === meta.voiceRoomKey) {
                  safeSend(targetWs, {
                    type: msg.type,
                    roomKey: meta.voiceRoomKey,
                    fromUid: meta.uid,
                    sdp: msg.sdp,
                    candidate: msg.candidate,
                  });
                }
              }
            }
            break;
          }

          case 'call:ring': {
            if (!meta.uid || typeof msg.targetUid !== 'string' || typeof msg.roomKey !== 'string') return;
            const targetSockets = userSockets.get(msg.targetUid);
            if (targetSockets) {
              for (const targetWs of targetSockets) {
                safeSend(targetWs, {
                  type: 'call:incoming',
                  fromUid: meta.uid,
                  fromName: meta.displayName,
                  fromAvatar: meta.avatarUrl,
                  roomKey: msg.roomKey,
                  video: Boolean(msg.video),
                });
              }
            }
            break;
          }

          case 'call:decline': {
            if (!meta.uid || typeof msg.targetUid !== 'string') return;
            const targetSockets = userSockets.get(msg.targetUid);
            if (targetSockets) {
              for (const targetWs of targetSockets) {
                safeSend(targetWs, {
                  type: 'call:declined',
                  fromUid: meta.uid,
                });
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      removeFromVoiceRoom(meta);
      if (meta.uid && meta.activeChannelKey) {
        const channelMap = typingState.get(meta.activeChannelKey);
        if (channelMap?.delete(meta.uid)) {
          broadcastTypingForChannel(meta.activeChannelKey);
        }
      }
      clients.delete(ws);
      if (meta.uid) {
        const sockets = userSockets.get(meta.uid);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            userSockets.delete(meta.uid);
            broadcastAll({
              type: 'presence:update',
              uid: meta.uid,
              status: 'offline',
              displayName: meta.displayName,
              avatarUrl: meta.avatarUrl,
            });
          }
        }
      }
    });
  });

  const PORT = 3000;
  let viteReady: Promise<void> | null = null;
  let viteServer: { close: () => Promise<void> } | null = null;

  if (process.env.NODE_ENV !== 'production') {
    let viteMiddleware: ((req: express.Request, res: express.Response, next: express.NextFunction) => void) | null = null;
    viteReady = import('vite')
      .then(async ({ createServer: createViteServer }) => {
        const vite = await createViteServer({
          server: { middlewareMode: true, hmr: false },
          appType: 'spa',
        });
        viteServer = vite;
        viteMiddleware = vite.middlewares;
      })
      .catch((err) => {
        console.error('Vite middleware initialization failed:', err);
      });

    app.use(async (req, res, next) => {
      try {
        if (viteReady) await viteReady;
        if (viteMiddleware) {
          return viteMiddleware(req, res, next);
        }
        res.status(503).send('Vite dev middleware unavailable');
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Turcord server running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    clearInterval(typingSweepTimer);
    for (const ws of clients.keys()) {
      try {
        ws.terminate();
      } catch {
        // Ignore close errors
      }
    }
    wss.close();
    viteServer?.close().catch(() => {});
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
