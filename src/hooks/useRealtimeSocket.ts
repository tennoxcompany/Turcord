import { useCallback, useEffect, useRef, useState } from 'react';
import type { IncomingCall, PublicProfile, VoiceParticipant } from '../types/halka';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface RemoteMedia {
  uid: string;
  stream: MediaStream;
}

export function useRealtimeSocket(profile: PublicProfile | null, activeServerId: string | null, activeChannelKey: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const profileRef = useRef<PublicProfile | null>(profile);
  const serverIdRef = useRef<string | null>(activeServerId);
  const channelKeyRef = useRef<string | null>(activeChannelKey);

  profileRef.current = profile;
  serverIdRef.current = activeServerId;
  channelKeyRef.current = activeChannelKey;

  const [wsConnected, setWsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { status: string; displayName: string; avatarUrl: string }>>({});
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

  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const voiceRoomRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const lastSpeakingRef = useRef<boolean>(false);

  const sendWs = useCallback((payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

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

  const closePeer = useCallback((peerUid: string) => {
    const pc = peersRef.current.get(peerUid);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
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
    (peerUid: string) => {
      closePeer(peerUid);
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
        if (event.candidate) {
          sendWs({
            type: 'rtc:ice-candidate',
            targetUid: peerUid,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const existing = prev[peerUid];
          if (existing) {
            const updated = new MediaStream([...existing.getTracks().filter((t) => t.kind !== event.track.kind), event.track]);
            return { ...prev, [peerUid]: updated };
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
    [closePeer, sendWs]
  );

  const renegotiateAllPeers = useCallback(async () => {
    for (const [peerUid, pc] of peersRef.current.entries()) {
      try {
        // Sync senders
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
        sendWs({ type: 'rtc:offer', targetUid: peerUid, sdp: offer });
      } catch (err) {
        console.warn('Renegotiation error:', err);
      }
    }
  }, [sendWs]);

  const stopSpeakingDetector = useCallback(() => {
    if (speakingTimerRef.current) {
      window.clearInterval(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    lastSpeakingRef.current = false;
  }, []);

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
          const isMuted = localAudioStreamRef.current?.getAudioTracks().every((t) => !t.enabled) ?? true;
          const speaking = !isMuted && avg > 14;
          if (speaking !== lastSpeakingRef.current) {
            lastSpeakingRef.current = speaking;
            sendWs({ type: 'voice:state', speaking });
          }
        }, 160);
      } catch {
        // AudioContext unavailable
      }
    },
    [sendWs, stopSpeakingDetector]
  );

  const leaveVoice = useCallback(() => {
    if (voiceRoomRef.current) {
      sendWs({ type: 'voice:leave' });
    }
    voiceRoomRef.current = null;
    setActiveVoiceRoomKey(null);
    setActiveVoiceLabel('');
    setRoomParticipants([]);
    setCameraOn(false);
    setScreenSharing(false);
    setVoiceError(null);
    stopSpeakingDetector();

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
  }, [closePeer, sendWs, stopSpeakingDetector]);

  const joinVoice = useCallback(
    async (roomKey: string, label: string, withVideo = false) => {
      if (!profileRef.current) return;
      if (voiceRoomRef.current === roomKey) return;
      if (voiceRoomRef.current) {
        leaveVoice();
      }
      setVoiceError(null);

      try {
        const noiseSuppression = profileRef.current?.noiseSuppression ?? true;
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { noiseSuppression, echoCancellation: true },
          video: false,
        });
        audioStream.getAudioTracks().forEach((t) => {
          t.enabled = !muted && !deafened;
        });
        localAudioStreamRef.current = audioStream;
        startSpeakingDetector(audioStream);
      } catch {
        setVoiceError('Mikrofon izni verilmedi — dinleyici modunda bağlanıldı.');
      }

      let camActive = false;
      if (withVideo) {
        try {
          const vidStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
          localVideoStreamRef.current = vidStream;
          camActive = true;
          setCameraOn(true);
        } catch {
          setVoiceError('Kamera açılamadı.');
        }
      }

      rebuildLocalDisplayStream();
      voiceRoomRef.current = roomKey;
      setActiveVoiceRoomKey(roomKey);
      setActiveVoiceLabel(label);

      sendWs({
        type: 'voice:join',
        roomKey,
        muted: muted || deafened || !localAudioStreamRef.current,
        deafened,
        cameraOn: camActive,
        screenSharing: false,
      });
    },
    [deafened, leaveVoice, muted, rebuildLocalDisplayStream, sendWs, startSpeakingDetector]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localAudioStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next && !deafened;
      });
      if (voiceRoomRef.current) {
        sendWs({ type: 'voice:state', muted: next || deafened, speaking: false });
      }
      return next;
    });
  }, [deafened, sendWs]);

  const toggleDeafen = useCallback(() => {
    setDeafened((prev) => {
      const next = !prev;
      localAudioStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next && !muted;
      });
      if (voiceRoomRef.current) {
        sendWs({ type: 'voice:state', deafened: next, muted: next || muted, speaking: false });
      }
      return next;
    });
  }, [muted, sendWs]);

  const toggleCamera = useCallback(async () => {
    if (!voiceRoomRef.current) return;
    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getTracks().forEach((t) => t.stop());
      localVideoStreamRef.current = null;
      setCameraOn(false);
      rebuildLocalDisplayStream();
      sendWs({ type: 'voice:state', cameraOn: false });
      await renegotiateAllPeers();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      localVideoStreamRef.current = stream;
      setCameraOn(true);
      rebuildLocalDisplayStream();
      sendWs({ type: 'voice:state', cameraOn: true });
      await renegotiateAllPeers();
    } catch {
      setVoiceError('Kamera erişimi reddedildi.');
    }
  }, [rebuildLocalDisplayStream, renegotiateAllPeers, sendWs]);

  const toggleScreenShare = useCallback(async () => {
    if (!voiceRoomRef.current) return;
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
      setScreenSharing(false);
      rebuildLocalDisplayStream();
      sendWs({ type: 'voice:state', screenSharing: false });
      await renegotiateAllPeers();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          localScreenStreamRef.current = null;
          setScreenSharing(false);
          rebuildLocalDisplayStream();
          sendWs({ type: 'voice:state', screenSharing: false });
          renegotiateAllPeers();
        };
      }
      localScreenStreamRef.current = stream;
      setScreenSharing(true);
      rebuildLocalDisplayStream();
      sendWs({ type: 'voice:state', screenSharing: true });
      await renegotiateAllPeers();
    } catch {
      // User cancelled screen share dialog
    }
  }, [rebuildLocalDisplayStream, renegotiateAllPeers, sendWs]);

  const ringUser = useCallback(
    (targetUid: string, roomKey: string, video: boolean) => {
      sendWs({ type: 'call:ring', targetUid, roomKey, video });
    },
    [sendWs]
  );

  const declineCall = useCallback(
    (fromUid: string) => {
      sendWs({ type: 'call:decline', targetUid: fromUid });
      setIncomingCall(null);
    },
    [sendWs]
  );

  const sendTyping = useCallback(
    (channelKey: string, isTyping: boolean) => {
      sendWs({ type: isTyping ? 'typing:start' : 'typing:stop', channelKey });
    },
    [sendWs]
  );

  // WebSocket lifecycle
  useEffect(() => {
    if (!profile) return;
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
        setWsConnected(true);
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
        if (serverIdRef.current) {
          ws.send(JSON.stringify({ type: 'server:watch', serverId: serverIdRef.current }));
        }
        if (channelKeyRef.current) {
          ws.send(JSON.stringify({ type: 'channel:focus', channelKey: channelKeyRef.current }));
        }
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'presence:sync':
              setOnlineUsers(msg.users || {});
              break;
            case 'presence:update':
              setOnlineUsers((prev) => ({
                ...prev,
                [msg.uid]: {
                  status: msg.status,
                  displayName: msg.displayName,
                  avatarUrl: msg.avatarUrl,
                },
              }));
              break;
            case 'voice:server-state':
              if (msg.serverId === serverIdRef.current) {
                setServerVoiceChannels(msg.channels || {});
              }
              break;
            case 'voice:room-state':
              if (msg.roomKey === voiceRoomRef.current) {
                setRoomParticipants(msg.participants || []);
              }
              break;
            case 'voice:peers-init': {
              const peers: VoiceParticipant[] = msg.peers || [];
              for (const peer of peers) {
                const pc = createPeerConnection(peer.uid);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(
                  JSON.stringify({
                    type: 'rtc:offer',
                    targetUid: peer.uid,
                    sdp: offer,
                  })
                );
              }
              break;
            }
            case 'voice:user-left':
              closePeer(msg.uid);
              break;
            case 'rtc:offer': {
              const pc = peersRef.current.get(msg.fromUid) || createPeerConnection(msg.fromUid);
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              ws.send(
                JSON.stringify({
                  type: 'rtc:answer',
                  targetUid: msg.fromUid,
                  sdp: answer,
                })
              );
              break;
            }
            case 'rtc:answer': {
              const pc = peersRef.current.get(msg.fromUid);
              if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              }
              break;
            }
            case 'rtc:ice-candidate': {
              const pc = peersRef.current.get(msg.fromUid);
              if (pc && msg.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
              }
              break;
            }
            case 'typing:update':
              if (msg.channelKey === channelKeyRef.current) {
                setTypingUsers((msg.typers || []).filter((t: { uid: string }) => t.uid !== profileRef.current?.uid));
              }
              break;
            case 'call:incoming':
              setIncomingCall({
                fromUid: msg.fromUid,
                fromName: msg.fromName,
                fromAvatar: msg.fromAvatar,
                roomKey: msg.roomKey,
                video: Boolean(msg.video),
              });
              break;
            case 'call:declined':
              setVoiceError('Arama karşı taraf tarafından reddedildi.');
              break;
          }
        } catch (err) {
          console.warn('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
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
    };
  }, [profile?.uid, closePeer, createPeerConnection]);

  // Sync profile updates to WS
  useEffect(() => {
    if (!profile || !wsConnected) return;
    sendWs({
      type: 'presence:status',
      status: profile.status,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });
  }, [profile?.status, profile?.displayName, profile?.avatarUrl, wsConnected, sendWs]);

  // Watch active server for voice channel participant lists
  useEffect(() => {
    setServerVoiceChannels({});
    if (wsConnected) {
      sendWs({ type: 'server:watch', serverId: activeServerId });
    }
  }, [activeServerId, wsConnected, sendWs]);

  // Focus active text channel / DM for typing indicators
  useEffect(() => {
    setTypingUsers([]);
    if (wsConnected) {
      sendWs({ type: 'channel:focus', channelKey: activeChannelKey });
    }
  }, [activeChannelKey, wsConnected, sendWs]);

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
    sendTyping,
  };
}
