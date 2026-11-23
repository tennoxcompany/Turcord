import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
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
            meta.avatarUrl = String(msg.avatarUrl || '').slice(0, 1000);
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
            if (msg.avatarUrl !== undefined) meta.avatarUrl = String(msg.avatarUrl).slice(0, 1000);
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
