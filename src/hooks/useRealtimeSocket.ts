import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { IncomingCall, PublicProfile, VoiceParticipant } from '../types/halka';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const PRESENCE_HEARTBEAT_MS = 25_000;
const PRESENCE_STALE_MS = 90_000;
const VOICE_HEARTBEAT_MS = 20_000;
const VOICE_STALE_MS = 75_000;
const CALL_STALE_MS = 60_000;
const SPEAKING_SYNC_THROTTLE_MS = 450;

export interface RemoteMedia {
  uid: string;
  stream: MediaStream;
}

interface ParsedVoiceRoom {
  kind: 'server' | 'dm';
  basePath: string;
  channelId: string;
  participantDocId: (uid: string) => string;
}

interface StoredPresenceEntry {
  uid: string;
  displayName: string;
  avatarUrl: string;
  status: string;
  lastSeenMs: number;
}

interface StoredVoiceDoc {
  participant: VoiceParticipant;
  channelId: string;
  updatedMs: number;
}

function parseVoiceRoomKey(roomKey: string): ParsedVoiceRoom | null {
  if (roomKey.startsWith('server:')) {
    const parts = roomKey.split(':');
    const serverId = parts[1];
    const channelId = parts[2];
    if (!serverId || !channelId) return null;
    return {
      kind: 'server',
      basePath: `servers/${serverId}`,
      channelId,
      participantDocId: (uid: string) => `${channelId}__${uid}`,
    };
  }
  if (roomKey.startsWith('dm:')) {
    const threadId = roomKey.slice(3);
    if (!threadId) return null;
    return {
      kind: 'dm',
      basePath: `dmThreads/${threadId}`,
      channelId: threadId,
      participantDocId: (uid: string) => uid,
    };
  }
  return null;
}

function makeSignalId(): string {
  return `sig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function timestampToMs(ts: unknown, fallbackMs: number): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as Timestamp).toMillis === 'function') {
    return (ts as Timestamp).toMillis();
  }
  return fallbackMs;
}

export function useRealtimeSocket(
  profile: PublicProfile | null,
  activeServerId: string | null,
  activeChannelKey: string | null
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const profileRef = useRef<PublicProfile | null>(profile);
  const serverIdRef = useRef<string | null>(activeServerId);
  const channelKeyRef = useRef<string | null>(activeChannelKey);

  profileRef.current = profile;
  serverIdRef.current = activeServerId;
  channelKeyRef.current = activeChannelKey;

  const [wsOpen, setWsOpen] = useState(false);
  const [fsConnected, setFsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<
    Record<string, { status: string; displayName: string; avatarUrl: string }>
  >({});
  const [serverVoiceChannels, setServerVoiceChannels] = useState<Record<string, VoiceParticipant[]>>({});
  const [activeVoiceRoomKey, setActiveVoiceRoomKey] = useState<string | null>(null);
  const [activeVoiceLabel, setActiveVoiceLabel] = useState<string>('');
  const [roomParticipants, setRoomParticipants] = useState<VoiceParticipant[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ uid: string; displayName: string }>>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // Local media & WebRTC state
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // Refs to avoid stale closures in async listeners & intervals
  const mutedRef = useRef(false);
  const deafenedRef = useRef(false);
  const cameraOnRef = useRef(false);
  const screenSharingRef = useRef(false);
  const speakingRef = useRef(false);

  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const fallbackOfferTimersRef = useRef<Map<string, number>>(new Map());
  const processedSignalIdsRef = useRef<Set<string>>(new Set());

  const voiceRoomRef = useRef<string | null>(null);
  const voiceJoinAtMsRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const speakingSyncTimerRef = useRef<number | null>(null);
  const lastSpeakingSyncMsRef = useRef<number>(0);

  // Presence & snapshot caches for staleness pruning
  const fsPresenceDocsRef = useRef<Map<string, StoredPresenceEntry>>(new Map());
  const wsOnlineUsersRef = useRef<Record<string, { status: string; displayName: string; avatarUrl: string }>>({});
  const serverVoiceDocsRef = useRef<StoredVoiceDoc[]>([]);
  const roomVoiceDocsRef = useRef<StoredVoiceDoc[]>([]);
  const activeIncomingCallDocIdsRef = useRef<Map<string, string>>(new Map());
  const lastOutgoingRingRef = useRef<{ targetUid: string; callId: string } | null>(null);

  const wsConnected = wsOpen || fsConnected;

  const sendWs = useCallback((payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const recomputeOnlineUsers = useCallback(() => {
    const now = Date.now();
    const merged: Record<string, { status: string; displayName: string; avatarUrl: string }> = {};

    for (const [uid, entry] of fsPresenceDocsRef.current.entries()) {
      if (now - entry.lastSeenMs <= PRESENCE_STALE_MS && entry.status !== 'offline') {
        merged[uid] = {
          status: entry.status,
          displayName: entry.displayName,
          avatarUrl: entry.avatarUrl,
        };
      }
    }

    for (const [uid, entry] of Object.entries(wsOnlineUsersRef.current)) {
      if (entry && entry.status && entry.status !== 'offline') {
        merged[uid] = entry;
      }
    }

    const me = profileRef.current;
    if (me && me.status !== 'offline') {
      merged[me.uid] = {
        status: me.status,
        displayName: me.displayName,
        avatarUrl: me.avatarUrl,
      };
    }

    setOnlineUsers(merged);
  }, []);

  const writePresenceDoc = useCallback(async (overrideStatus?: string) => {
    const p = profileRef.current;
    if (!p?.uid) return;
    const status = overrideStatus || p.status || 'online';
    try {
      await setDoc(doc(db, 'presence', p.uid), {
        uid: p.uid,
        displayName: (p.displayName || 'Kullanıcı').slice(0, 40),
        avatarUrl: (p.avatarUrl || '').slice(0, 1000),
        status: status === 'idle' || status === 'dnd' || status === 'offline' ? status : 'online',
        lastSeenAt: serverTimestamp(),
      });
    } catch {
      // Transient network or auth-transition errors are safe to retry on next heartbeat
    }
  }, []);

  const syncMyVoiceParticipantDoc = useCallback(async (roomKeyOverride?: string) => {
    const p = profileRef.current;
    const roomKey = roomKeyOverride || voiceRoomRef.current;
    if (!p?.uid || !roomKey) return;
    const parsed = parseVoiceRoomKey(roomKey);
    if (!parsed) return;

    const participantId = parsed.participantDocId(p.uid);
    const username = p.username && p.username.length >= 2 ? p.username.slice(0, 32) : 'user';
    const isEffectivelyMuted = mutedRef.current || deafenedRef.current || !localAudioStreamRef.current;

    try {
      await setDoc(doc(db, parsed.basePath, 'voiceParticipants', participantId), {
        id: participantId,
        channelId: parsed.channelId,
        uid: p.uid,
        displayName: (p.displayName || 'Kullanıcı').slice(0, 40),
        username,
        avatarUrl: (p.avatarUrl || '').slice(0, 1000),
        muted: isEffectivelyMuted,
        deafened: deafenedRef.current,
        cameraOn: cameraOnRef.current,
        screenSharing: screenSharingRef.current,
        speaking: !isEffectivelyMuted && speakingRef.current,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Transient Firestore write errors will be retried on next heartbeat
    }
  }, []);

  const deleteMyVoiceParticipantDoc = useCallback(async (roomKey: string, uid: string) => {
    const parsed = parseVoiceRoomKey(roomKey);
    if (!parsed) return;
    const participantId = parsed.participantDocId(uid);
    try {
      await deleteDoc(doc(db, parsed.basePath, 'voiceParticipants', participantId));
    } catch {
      // Ignore if already deleted or signed out
    }
  }, []);

  const sendSignal = useCallback(
    async (roomKey: string, targetUid: string, type: 'offer' | 'answer' | 'ice', payloadObj: unknown) => {
      const myUid = profileRef.current?.uid;
      if (!myUid) return;
      const parsed = parseVoiceRoomKey(roomKey);
      if (!parsed) return;

      const payload = JSON.stringify(payloadObj);
      if (payload.length > 20000) {
        console.warn('Voice signal payload exceeds Firestore 20KB limit');
        return;
      }

      const sigId = makeSignalId();
      try {
        await setDoc(doc(db, parsed.basePath, 'voiceSignals', sigId), {
          id: sigId,
          roomKey,
          fromUid: myUid,
          targetUid,
          type,
          payload,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Voice signal write error:', err);
      }
    },
    []
  );

  const rebuildLocalDisplayStream = useCallback(() => {
    const combined = new MediaStream();
    localAudioStreamRef.current?.getAudioTracks().forEach((t) => combined.addTrack(t));
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getVideoTracks().forEach((t) => combined.addTrack(t));
    } else if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getVideoTracks().forEach((t) => combined.addTrack(t));
    }
    setLocalStream(combined.getTracks().length > 0 ? combined : null);
  }, []);

  const closePeer = useCallback((peerUid: string, keepPendingIce = false) => {
    const timer = fallbackOfferTimersRef.current.get(peerUid);
    if (timer) {
      window.clearTimeout(timer);
      fallbackOfferTimersRef.current.delete(peerUid);
    }
    makingOfferRef.current.delete(peerUid);
    if (!keepPendingIce) {
      pendingIceRef.current.delete(peerUid);
    }

    const pc = peersRef.current.get(peerUid);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peersRef.current.delete(peerUid);
    }
    setRemoteStreams((prev) => {
      if (!(peerUid in prev)) return prev;
      const next = { ...prev };
      delete next[peerUid];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (peerUid: string, roomKey: string) => {
      closePeer(peerUid, true);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Attach local audio & video/screen tracks
      localAudioStreamRef.current?.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localAudioStreamRef.current!);
      });
      const activeVideoStream = localScreenStreamRef.current || localVideoStreamRef.current;
      activeVideoStream?.getVideoTracks().forEach((track) => {
        pc.addTrack(track, activeVideoStream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && voiceRoomRef.current === roomKey) {
          const candidateInit =
            typeof event.candidate.toJSON === 'function' ? event.candidate.toJSON() : event.candidate;
          void sendSignal(roomKey, peerUid, 'ice', candidateInit);
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const existing = prev[peerUid];
          if (existing) {
            const tracks = existing
              .getTracks()
              .filter((t) => t.kind !== event.track.kind && t.readyState === 'live');
            return { ...prev, [peerUid]: new MediaStream([...tracks, event.track]) };
          }
          return { ...prev, [peerUid]: event.streams[0] || new MediaStream([event.track]) };
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          closePeer(peerUid);
        }
      };

      peersRef.current.set(peerUid, pc);
      return pc;
    },
    [closePeer, sendSignal]
  );

  const flushPendingIce = useCallback(async (peerUid: string, pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.get(peerUid);
    if (!queued || queued.length === 0) return;
    pendingIceRef.current.delete(peerUid);
    for (const cand of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
    }
  }, []);

  const initiateOffer = useCallback(
    async (peerUid: string, roomKey: string) => {
      if (voiceRoomRef.current !== roomKey) return;
      const pc = peersRef.current.get(peerUid) || createPeerConnection(peerUid, roomKey);
      makingOfferRef.current.set(peerUid, true);
      try {
        const offer = await pc.createOffer();
        if (voiceRoomRef.current !== roomKey) return;
        await pc.setLocalDescription(offer);
        if (pc.localDescription) {
          await sendSignal(roomKey, peerUid, 'offer', {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp,
          });
        }
      } catch (err) {
        console.warn('Create offer error:', err);
      } finally {
        makingOfferRef.current.set(peerUid, false);
      }
    },
    [createPeerConnection, sendSignal]
  );

  const renegotiateAllPeers = useCallback(async () => {
    const roomKey = voiceRoomRef.current;
    if (!roomKey) return;

    for (const [peerUid, pc] of peersRef.current.entries()) {
      makingOfferRef.current.set(peerUid, true);
      try {
        const senders = pc.getSenders();
        const videoStream = localScreenStreamRef.current || localVideoStreamRef.current;
        const desiredVideoTrack = videoStream?.getVideoTracks()[0] || null;
        const videoSender = senders.find((s) => s.track?.kind === 'video');

        if (videoSender && desiredVideoTrack) {
          await videoSender.replaceTrack(desiredVideoTrack);
        } else if (videoSender && !desiredVideoTrack) {
          pc.removeTrack(videoSender);
        } else if (!videoSender && desiredVideoTrack && videoStream) {
          pc.addTrack(desiredVideoTrack, videoStream);
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (pc.localDescription && voiceRoomRef.current === roomKey) {
          await sendSignal(roomKey, peerUid, 'offer', {
            type: pc.localDescription.type,
            sdp: pc.localDescription.sdp,
          });
        }
      } catch (err) {
        console.warn('Renegotiation error:', err);
      } finally {
        makingOfferRef.current.set(peerUid, false);
      }
    }
  }, [sendSignal]);

  const stopSpeakingDetector = useCallback(() => {
    if (speakingTimerRef.current) {
      window.clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
    if (speakingSyncTimerRef.current) {
      window.clearTimeout(speakingSyncTimerRef.current);
      speakingSyncTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    speakingRef.current = false;
  }, []);

  const scheduleSpeakingSync = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastSpeakingSyncMsRef.current;
    if (elapsed >= SPEAKING_SYNC_THROTTLE_MS) {
      lastSpeakingSyncMsRef.current = now;
      void syncMyVoiceParticipantDoc();
      return;
    }
    if (!speakingSyncTimerRef.current) {
      speakingSyncTimerRef.current = window.setTimeout(() => {
        speakingSyncTimerRef.current = null;
        lastSpeakingSyncMsRef.current = Date.now();
        void syncMyVoiceParticipantDoc();
      }, SPEAKING_SYNC_THROTTLE_MS - elapsed);
    }
  }, [syncMyVoiceParticipantDoc]);

  const startSpeakingDetector = useCallback(
    (stream: MediaStream) => {
      stopSpeakingDetector();
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        audioCtxRef.current = ctx;
        const data = new Uint8Array(analyser.frequencyBinCount);

        speakingTimerRef.current = window.setInterval(() => {
          if (!voiceRoomRef.current) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const isAudioDisabled =
            localAudioStreamRef.current?.getAudioTracks().every((t) => !t.enabled) ?? true;
          const speaking = !isAudioDisabled && avg > 14;
          if (speaking !== speakingRef.current) {
            speakingRef.current = speaking;
            const myUid = profileRef.current?.uid;
            if (myUid) {
              setRoomParticipants((prev) =>
                prev.map((part) => (part.uid === myUid ? { ...part, speaking } : part))
              );
            }
            scheduleSpeakingSync();
          }
        }, 160);
      } catch {
        // AudioContext unavailable
      }
    },
    [scheduleSpeakingSync, stopSpeakingDetector]
  );

  const leaveVoice = useCallback(async () => {
    const prevRoom = voiceRoomRef.current;
    const myUid = profileRef.current?.uid;

    voiceRoomRef.current = null;
    setActiveVoiceRoomKey(null);
    setActiveVoiceLabel('');
    setRoomParticipants([]);
    roomVoiceDocsRef.current = [];
    cameraOnRef.current = false;
    screenSharingRef.current = false;
    speakingRef.current = false;
    setCameraOn(false);
    setScreenSharing(false);
    setVoiceError(null);
    stopSpeakingDetector();

    for (const timer of fallbackOfferTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    fallbackOfferTimersRef.current.clear();
    pendingIceRef.current.clear();
    makingOfferRef.current.clear();
    processedSignalIdsRef.current.clear();

    for (const peerUid of Array.from(peersRef.current.keys())) {
      closePeer(peerUid);
    }
    localAudioStreamRef.current?.getTracks().forEach((t) => t.stop());
    localVideoStreamRef.current?.getTracks().forEach((t) => t.stop());
    localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localAudioStreamRef.current = null;
    localVideoStreamRef.current = null;
    localScreenStreamRef.current = null;
    setLocalStream(null);

    if (lastOutgoingRingRef.current) {
      const { targetUid, callId } = lastOutgoingRingRef.current;
      lastOutgoingRingRef.current = null;
      await deleteDoc(doc(db, 'users', targetUid, 'incomingCalls', callId)).catch(() => {});
    }

    if (prevRoom && myUid) {
      await deleteMyVoiceParticipantDoc(prevRoom, myUid);
    }
  }, [closePeer, deleteMyVoiceParticipantDoc, stopSpeakingDetector]);

  const joinVoice = useCallback(
    async (roomKey: string, label: string, withVideo = false) => {
      if (!profileRef.current) return;
      if (voiceRoomRef.current === roomKey) return;
      if (voiceRoomRef.current) {
        await leaveVoice();
      }
      setVoiceError(null);

      try {
        const noiseSuppression = profileRef.current?.noiseSuppression ?? true;
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { noiseSuppression, echoCancellation: true },
          video: false,
        });
        audioStream.getAudioTracks().forEach((t) => {
          t.enabled = !mutedRef.current && !deafenedRef.current;
        });
        localAudioStreamRef.current = audioStream;
        startSpeakingDetector(audioStream);
      } catch {
        setVoiceError('Mikrofon izni verilmedi — dinleyici modunda bağlanıldı.');
      }

      if (withVideo) {
        try {
          const vidStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: false,
          });
          localVideoStreamRef.current = vidStream;
          cameraOnRef.current = true;
          setCameraOn(true);
        } catch {
          setVoiceError('Kamera açılamadı.');
        }
      }

      rebuildLocalDisplayStream();
      voiceRoomRef.current = roomKey;
      voiceJoinAtMsRef.current = Date.now();
      processedSignalIdsRef.current.clear();
      setActiveVoiceRoomKey(roomKey);
      setActiveVoiceLabel(label);

      await syncMyVoiceParticipantDoc(roomKey);
    },
    [leaveVoice, rebuildLocalDisplayStream, startSpeakingDetector, syncMyVoiceParticipantDoc]
  );

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    localAudioStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next && !deafenedRef.current;
    });
    if (next) {
      speakingRef.current = false;
    }
    if (voiceRoomRef.current) {
      void syncMyVoiceParticipantDoc();
    }
  }, [syncMyVoiceParticipantDoc]);

  const toggleDeafen = useCallback(() => {
    const next = !deafenedRef.current;
    deafenedRef.current = next;
    setDeafened(next);
    localAudioStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next && !mutedRef.current;
    });
    if (next) {
      speakingRef.current = false;
    }
    if (voiceRoomRef.current) {
      void syncMyVoiceParticipantDoc();
    }
  }, [syncMyVoiceParticipantDoc]);

  const toggleCamera = useCallback(async () => {
    if (!voiceRoomRef.current) return;
    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getTracks().forEach((t) => t.stop());
      localVideoStreamRef.current = null;
      cameraOnRef.current = false;
      setCameraOn(false);
      rebuildLocalDisplayStream();
      void syncMyVoiceParticipantDoc();
      await renegotiateAllPeers();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      localVideoStreamRef.current = stream;
      cameraOnRef.current = true;
      setCameraOn(true);
      rebuildLocalDisplayStream();
      void syncMyVoiceParticipantDoc();
      await renegotiateAllPeers();
    } catch {
      setVoiceError('Kamera erişimi reddedildi.');
    }
  }, [rebuildLocalDisplayStream, renegotiateAllPeers, syncMyVoiceParticipantDoc]);

  const toggleScreenShare = useCallback(async () => {
    if (!voiceRoomRef.current) return;
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
      screenSharingRef.current = false;
      setScreenSharing(false);
      rebuildLocalDisplayStream();
      void syncMyVoiceParticipantDoc();
      await renegotiateAllPeers();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          localScreenStreamRef.current = null;
          screenSharingRef.current = false;
          setScreenSharing(false);
          rebuildLocalDisplayStream();
          void syncMyVoiceParticipantDoc();
          void renegotiateAllPeers();
        };
      }
      localScreenStreamRef.current = stream;
      screenSharingRef.current = true;
      setScreenSharing(true);
      rebuildLocalDisplayStream();
      void syncMyVoiceParticipantDoc();
      await renegotiateAllPeers();
    } catch {
      // User cancelled screen share dialog
    }
  }, [rebuildLocalDisplayStream, renegotiateAllPeers, syncMyVoiceParticipantDoc]);

  const ringUser = useCallback(async (targetUid: string, roomKey: string, video: boolean) => {
    const p = profileRef.current;
    if (!p?.uid || !targetUid || targetUid === p.uid) return;
    const callId = `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    lastOutgoingRingRef.current = { targetUid, callId };
    try {
      await setDoc(doc(db, 'users', targetUid, 'incomingCalls', callId), {
        id: callId,
        fromUid: p.uid,
        fromName: (p.displayName || 'Kullanıcı').slice(0, 40),
        fromAvatar: (p.avatarUrl || '').slice(0, 1000),
        roomKey,
        video: Boolean(video),
        status: 'ringing',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Ring user error:', err);
    }
  }, []);

  const declineCall = useCallback(async (fromUid: string) => {
    const myUid = profileRef.current?.uid;
    setIncomingCall(null);
    if (!myUid) return;
    const callId = activeIncomingCallDocIdsRef.current.get(fromUid);
    if (callId) {
      activeIncomingCallDocIdsRef.current.delete(fromUid);
      await deleteDoc(doc(db, 'users', myUid, 'incomingCalls', callId)).catch(() => {});
    }
  }, []);

  const clearIncomingCallDoc = useCallback(async (fromUid: string) => {
    const myUid = profileRef.current?.uid;
    setIncomingCall(null);
    if (!myUid) return;
    const callId = activeIncomingCallDocIdsRef.current.get(fromUid);
    if (callId) {
      activeIncomingCallDocIdsRef.current.delete(fromUid);
      await deleteDoc(doc(db, 'users', myUid, 'incomingCalls', callId)).catch(() => {});
    }
  }, []);

  const cleanupForSignOut = useCallback(async () => {
    const myUid = profileRef.current?.uid;
    await leaveVoice();
    if (myUid) {
      await deleteDoc(doc(db, 'presence', myUid)).catch(() => {});
    }
  }, [leaveVoice]);

  const sendTyping = useCallback(
    (channelKey: string, isTyping: boolean) => {
      sendWs({ type: isTyping ? 'typing:start' : 'typing:stop', channelKey });
    },
    [sendWs]
  );

  // 1. Firestore Real-Time Presence Heartbeat + Global Presence Listener
  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) {
      fsPresenceDocsRef.current.clear();
      setFsConnected(false);
      setOnlineUsers({});
      return;
    }

    void writePresenceDoc();
    const heartbeatId = window.setInterval(() => {
      void writePresenceDoc();
    }, PRESENCE_HEARTBEAT_MS);

    const pruneId = window.setInterval(() => {
      recomputeOnlineUsers();
    }, 15_000);

    const q = query(
      collection(db, 'presence'),
      where('status', 'in', ['online', 'idle', 'dnd']),
      limit(150)
    );
    const unsubPresence = onSnapshot(
      q,
      (snap) => {
        setFsConnected(true);
        const now = Date.now();
        const nextMap = new Map<string, StoredPresenceEntry>();
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (!data || typeof data.uid !== 'string') continue;
          nextMap.set(data.uid, {
            uid: data.uid,
            displayName: typeof data.displayName === 'string' ? data.displayName : 'Kullanıcı',
            avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
            status: typeof data.status === 'string' ? data.status : 'online',
            lastSeenMs: timestampToMs(data.lastSeenAt, now),
          });
        }
        fsPresenceDocsRef.current = nextMap;
        recomputeOnlineUsers();
      },
      (err) => {
        console.warn('Presence listener error:', err);
      }
    );

    const handlePageExit = () => {
      if (voiceRoomRef.current) {
        void deleteMyVoiceParticipantDoc(voiceRoomRef.current, uid);
      }
      void deleteDoc(doc(db, 'presence', uid)).catch(() => {});
    };

    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);

    return () => {
      window.clearInterval(heartbeatId);
      window.clearInterval(pruneId);
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
      unsubPresence();
    };
  }, [profile?.uid, deleteMyVoiceParticipantDoc, recomputeOnlineUsers, writePresenceDoc]);

  // Update Firestore presence immediately when status / name / avatar changes
  useEffect(() => {
    if (!profile?.uid) return;
    void writePresenceDoc();
    recomputeOnlineUsers();
  }, [profile?.uid, profile?.status, profile?.displayName, profile?.avatarUrl, writePresenceDoc, recomputeOnlineUsers]);

  // 2. Firestore Incoming DM Calls Listener
  useEffect(() => {
    const uid = profile?.uid;
    if (!uid) {
      setIncomingCall(null);
      activeIncomingCallDocIdsRef.current.clear();
      return;
    }

    const q = query(collection(db, 'users', uid, 'incomingCalls'), where('status', '==', 'ringing'));
    return onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const nextIds = new Map<string, string>();
        let latestCall: IncomingCall | null = null;
        let latestMs = -1;

        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const createdMs = timestampToMs(data.createdAt, now);
          if (now - createdMs > CALL_STALE_MS) {
            void deleteDoc(docSnap.ref).catch(() => {});
            continue;
          }
          if (typeof data.fromUid === 'string') {
            nextIds.set(data.fromUid, docSnap.id);
            if (createdMs >= latestMs) {
              latestMs = createdMs;
              latestCall = {
                fromUid: data.fromUid,
                fromName: data.fromName || 'Kullanıcı',
                fromAvatar: data.fromAvatar || '',
                roomKey: data.roomKey || '',
                video: Boolean(data.video),
              };
            }
          }
        }

        activeIncomingCallDocIdsRef.current = nextIds;
        setIncomingCall((prev) => {
          if (!latestCall) return null;
          if (prev && prev.fromUid === latestCall.fromUid && prev.roomKey === latestCall.roomKey) {
            return prev;
          }
          return latestCall;
        });
      },
      (err) => {
        console.warn('Incoming calls listener error:', err);
      }
    );
  }, [profile?.uid]);

  // 3. Firestore Server Voice Channels Watcher (shows participants in all channels of active server)
  useEffect(() => {
    if (!profile?.uid || !activeServerId) {
      serverVoiceDocsRef.current = [];
      setServerVoiceChannels({});
      return;
    }

    const rebuildServerVoiceMap = () => {
      const now = Date.now();
      const grouped: Record<string, VoiceParticipant[]> = {};
      for (const item of serverVoiceDocsRef.current) {
        if (now - item.updatedMs > VOICE_STALE_MS) continue;
        if (!grouped[item.channelId]) grouped[item.channelId] = [];
        grouped[item.channelId].push(item.participant);
      }
      for (const list of Object.values(grouped)) {
        list.sort((a, b) => a.uid.localeCompare(b.uid));
      }
      setServerVoiceChannels(grouped);
    };

    const unsub = onSnapshot(
      collection(db, 'servers', activeServerId, 'voiceParticipants'),
      (snap) => {
        const now = Date.now();
        serverVoiceDocsRef.current = snap.docs.map((d) => {
          const data = d.data();
          return {
            channelId: String(data.channelId || ''),
            updatedMs: timestampToMs(data.updatedAt, now),
            participant: {
              uid: String(data.uid || ''),
              displayName: String(data.displayName || 'Kullanıcı'),
              username: String(data.username || 'user'),
              avatarUrl: String(data.avatarUrl || ''),
              muted: Boolean(data.muted),
              deafened: Boolean(data.deafened),
              cameraOn: Boolean(data.cameraOn),
              screenSharing: Boolean(data.screenSharing),
              speaking: Boolean(data.speaking),
            },
          };
        });
        rebuildServerVoiceMap();
      },
      (err) => {
        console.warn('Server voice channels listener error:', err);
      }
    );

    const pruneTimer = window.setInterval(rebuildServerVoiceMap, 15_000);

    return () => {
      unsub();
      window.clearInterval(pruneTimer);
    };
  }, [profile?.uid, activeServerId]);

  // 4. Firestore Active Voice Room Participants & WebRTC Signaling
  useEffect(() => {
    const myUid = profile?.uid;
    const roomKey = activeVoiceRoomKey;
    if (!myUid || !roomKey) return;

    const parsed = parseVoiceRoomKey(roomKey);
    if (!parsed) return;

    const syncPeersWithList = (activeList: VoiceParticipant[]) => {
      if (voiceRoomRef.current !== roomKey) return;
      const otherUids = new Set(activeList.map((p) => p.uid).filter((u) => u && u !== myUid));

      // Tear down peers that left
      for (const existingPeerUid of Array.from(peersRef.current.keys())) {
        if (!otherUids.has(existingPeerUid)) {
          closePeer(existingPeerUid);
        }
      }
      for (const [timerUid, timerId] of Array.from(fallbackOfferTimersRef.current.entries())) {
        if (!otherUids.has(timerUid)) {
          window.clearTimeout(timerId);
          fallbackOfferTimersRef.current.delete(timerUid);
        }
      }

      // Deterministic tie-breaker: smaller UID initiates WebRTC offer; larger UID waits (with fallback)
      for (const peerUid of otherUids) {
        if (!peersRef.current.has(peerUid)) {
          if (myUid < peerUid) {
            const existingTimer = fallbackOfferTimersRef.current.get(peerUid);
            if (existingTimer) {
              window.clearTimeout(existingTimer);
              fallbackOfferTimersRef.current.delete(peerUid);
            }
            void initiateOffer(peerUid, roomKey);
          } else if (!fallbackOfferTimersRef.current.has(peerUid)) {
            const timerId = window.setTimeout(() => {
              fallbackOfferTimersRef.current.delete(peerUid);
              if (voiceRoomRef.current === roomKey && !peersRef.current.has(peerUid)) {
                void initiateOffer(peerUid, roomKey);
              }
            }, 2800);
            fallbackOfferTimersRef.current.set(peerUid, timerId);
          }
        }
      }
    };

    const applyRoomDocs = () => {
      const now = Date.now();
      const activeList = roomVoiceDocsRef.current
        .filter((item) => now - item.updatedMs <= VOICE_STALE_MS)
        .map((item) => item.participant)
        .sort((a, b) => a.uid.localeCompare(b.uid));
      setRoomParticipants(activeList);
      syncPeersWithList(activeList);
    };

    // Listen to participants in this specific voice room
    const participantsQuery = query(
      collection(db, parsed.basePath, 'voiceParticipants'),
      where('channelId', '==', parsed.channelId)
    );
    const unsubParticipants = onSnapshot(
      participantsQuery,
      (snap) => {
        const now = Date.now();
        roomVoiceDocsRef.current = snap.docs.map((d) => {
          const data = d.data();
          return {
            channelId: String(data.channelId || ''),
            updatedMs: timestampToMs(data.updatedAt, now),
            participant: {
              uid: String(data.uid || ''),
              displayName: String(data.displayName || 'Kullanıcı'),
              username: String(data.username || 'user'),
              avatarUrl: String(data.avatarUrl || ''),
              muted: Boolean(data.muted),
              deafened: Boolean(data.deafened),
              cameraOn: Boolean(data.cameraOn),
              screenSharing: Boolean(data.screenSharing),
              speaking: Boolean(data.speaking),
            },
          };
        });
        applyRoomDocs();
      },
      (err) => {
        console.warn('Voice room participants error:', err);
      }
    );

    // Heartbeat keeps our participant record fresh so staleness checks don't prune us
    const voiceHeartbeatId = window.setInterval(() => {
      void syncMyVoiceParticipantDoc(roomKey);
    }, VOICE_HEARTBEAT_MS);

    const voicePruneId = window.setInterval(() => {
      applyRoomDocs();
    }, 15_000);

    // Listen to incoming WebRTC signals addressed to us
    const signalsQuery = query(
      collection(db, parsed.basePath, 'voiceSignals'),
      where('targetUid', '==', myUid)
    );
    const unsubSignals = onSnapshot(
      signalsQuery,
      async (snap) => {
        if (voiceRoomRef.current !== roomKey) return;

        // Sort so offer/answer are processed before ice within the same snapshot batch
        const typeOrder: Record<string, number> = { offer: 0, answer: 1, ice: 2 };
        const sortedDocs = [...snap.docs].sort((a, b) => {
          const da = a.data();
          const dbData = b.data();
          const oa = typeOrder[da.type] ?? 3;
          const ob = typeOrder[dbData.type] ?? 3;
          if (oa !== ob) return oa - ob;
          return timestampToMs(da.createdAt, 0) - timestampToMs(dbData.createdAt, 0);
        });

        for (const docSnap of sortedDocs) {
          if (processedSignalIdsRef.current.has(docSnap.id)) continue;
          processedSignalIdsRef.current.add(docSnap.id);

          const sig = docSnap.data();
          // Delete consumed signal doc promptly
          void deleteDoc(docSnap.ref).catch(() => {});

          if (!sig || sig.roomKey !== roomKey || sig.fromUid === myUid) continue;
          if (sig.createdAt) {
            const sigMs = timestampToMs(sig.createdAt, Date.now());
            if (sigMs < voiceJoinAtMsRef.current - 15_000) continue;
          }

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(String(sig.payload || '{}'));
          } catch {
            continue;
          }

          const fromUid = String(sig.fromUid);

          try {
            if (sig.type === 'offer') {
              const fallbackTimer = fallbackOfferTimersRef.current.get(fromUid);
              if (fallbackTimer) {
                window.clearTimeout(fallbackTimer);
                fallbackOfferTimersRef.current.delete(fromUid);
              }

              const pc = peersRef.current.get(fromUid) || createPeerConnection(fromUid, roomKey);
              const polite = myUid > fromUid;
              const offerCollision = Boolean(makingOfferRef.current.get(fromUid)) || pc.signalingState !== 'stable';
              if (offerCollision && !polite) {
                continue;
              }

              if (pc.signalingState !== 'stable') {
                await Promise.all([
                  pc.setLocalDescription({ type: 'rollback' }),
                  pc.setRemoteDescription(new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit)),
                ]);
              } else {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit)
                );
              }

              await flushPendingIce(fromUid, pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              if (voiceRoomRef.current === roomKey && pc.localDescription) {
                await sendSignal(roomKey, fromUid, 'answer', {
                  type: pc.localDescription.type,
                  sdp: pc.localDescription.sdp,
                });
              }
            } else if (sig.type === 'answer') {
              const pc = peersRef.current.get(fromUid);
              if (!pc || pc.signalingState !== 'have-local-offer') continue;
              await pc.setRemoteDescription(
                new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit)
              );
              await flushPendingIce(fromUid, pc);
            } else if (sig.type === 'ice') {
              const pc = peersRef.current.get(fromUid);
              const candidateInit = payload as unknown as RTCIceCandidateInit;
              if (!pc || !pc.remoteDescription) {
                const list = pendingIceRef.current.get(fromUid) || [];
                list.push(candidateInit);
                pendingIceRef.current.set(fromUid, list);
              } else {
                await pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(() => {});
              }
            }
          } catch (err) {
            console.warn('WebRTC signal handling error:', err);
          }
        }
      },
      (err) => {
        console.warn('Voice signals listener error:', err);
      }
    );

    return () => {
      unsubParticipants();
      unsubSignals();
      window.clearInterval(voiceHeartbeatId);
      window.clearInterval(voicePruneId);
    };
  }, [
    profile?.uid,
    activeVoiceRoomKey,
    closePeer,
    createPeerConnection,
    flushPendingIce,
    initiateOffer,
    sendSignal,
    syncMyVoiceParticipantDoc,
  ]);

  // 5. Optional WebSocket lifecycle (low-latency typing indicators when backend server is available)
  useEffect(() => {
    if (!profile?.uid) return;
    const configuredWsUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
    const isStaticGithubPages = window.location.hostname.endsWith('.github.io');
    if (isStaticGithubPages && !configuredWsUrl) {
      return;
    }

    let unmounted = false;
    let failedAttempts = 0;
    let openedOnce = false;

    const connect = () => {
      if (unmounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = configuredWsUrl || `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        openedOnce = true;
        failedAttempts = 0;
        setWsOpen(true);
        const p = profileRef.current;
        if (p) {
          ws.send(
            JSON.stringify({
              type: 'auth:identify',
              uid: p.uid,
              displayName: p.displayName,
              username: p.username,
              avatarUrl: p.avatarUrl,
              status: p.status,
            })
          );
        }
        if (channelKeyRef.current) {
          ws.send(JSON.stringify({ type: 'channel:focus', channelKey: channelKeyRef.current }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'presence:sync':
              wsOnlineUsersRef.current = msg.users || {};
              recomputeOnlineUsers();
              break;
            case 'presence:update':
              wsOnlineUsersRef.current = {
                ...wsOnlineUsersRef.current,
                [msg.uid]: {
                  status: msg.status,
                  displayName: msg.displayName,
                  avatarUrl: msg.avatarUrl,
                },
              };
              recomputeOnlineUsers();
              break;
            case 'typing:update':
              if (msg.channelKey === channelKeyRef.current) {
                setTypingUsers(
                  (msg.typers || []).filter((t: { uid: string }) => t.uid !== profileRef.current?.uid)
                );
              }
              break;
          }
        } catch {
          // Ignore malformed WS packets
        }
      };

      ws.onclose = () => {
        setWsOpen(false);
        failedAttempts += 1;
        if (!unmounted && (openedOnce || failedAttempts < 3)) {
          reconnectTimerRef.current = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setWsOpen(false);
    };
  }, [profile?.uid, recomputeOnlineUsers]);

  // Sync profile updates to WS
  useEffect(() => {
    if (!profile || !wsOpen) return;
    sendWs({
      type: 'presence:status',
      status: profile.status,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });
  }, [profile?.status, profile?.displayName, profile?.avatarUrl, wsOpen, sendWs]);

  // Focus active text channel / DM for typing indicators
  useEffect(() => {
    setTypingUsers([]);
    if (wsOpen) {
      sendWs({ type: 'channel:focus', channelKey: activeChannelKey });
    }
  }, [activeChannelKey, wsOpen, sendWs]);

  return {
    wsConnected,
    onlineUsers,
    serverVoiceChannels,
    activeVoiceRoomKey,
    activeVoiceLabel,
    roomParticipants,
    typingUsers,
    incomingCall,
    setIncomingCall,
    muted,
    deafened,
    cameraOn,
    screenSharing,
    voiceError,
    localStream,
    remoteStreams,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    toggleScreenShare,
    ringUser,
    declineCall,
    clearIncomingCallDoc,
    cleanupForSignOut,
    sendTyping,
  };
}
