import React, { useEffect, useRef, useState } from 'react';
import {
  Headphones,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { VoiceParticipant } from '../types/halka';
import { Avatar } from './Avatar';

interface StreamVideoProps {
  stream: MediaStream;
  muted?: boolean;
  mirrored?: boolean;
}

const StreamVideo: React.FC<StreamVideoProps> = ({ stream, muted = false, mirrored = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full h-full object-cover ${mirrored ? '-scale-x-100' : ''}`}
    />
  );
};

interface RemoteAudioProps {
  stream: MediaStream;
  deafened: boolean;
}

const RemoteAudio: React.FC<RemoteAudioProps> = ({ stream, deafened }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = deafened;
    }
  }, [deafened]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
};

interface VoiceStageProps {
  channelName: string;
  isJoined: boolean;
  currentUid: string;
  participants: VoiceParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  voiceError: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
}

export const VoiceStage: React.FC<VoiceStageProps> = ({
  channelName,
  isJoined,
  currentUid,
  participants,
  localStream,
  remoteStreams,
  muted,
  deafened,
  cameraOn,
  screenSharing,
  voiceError,
  onJoin,
  onLeave,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
}) => {
  const [spotlightUid, setSpotlightUid] = useState<string | null>(null);

  const hasVideoTrack = (stream?: MediaStream | null) =>
    Boolean(stream && stream.getVideoTracks().some((t) => t.readyState === 'live'));

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-rail)] min-w-0 min-h-0 h-full overflow-hidden">
      {/* Hidden Remote Audio Sinks */}
      {Object.entries(remoteStreams).map(([uid, stream]) => (
        <RemoteAudio key={uid} stream={stream} deafened={deafened} />
      ))}

      {/* Top Header */}
      <header className="h-12 shrink-0 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <Volume2 className="w-5 h-5 text-[#23A55A] shrink-0" />
          <h1 className="font-display font-semibold text-[15px] text-white truncate">{channelName}</h1>
          <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
            · {participants.length} kişi odada
          </span>
        </div>
        {!isJoined && (
          <button
            onClick={onJoin}
            className="px-4 py-1.5 rounded-lg bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Sesli Odaya Katıl
          </button>
        )}
      </header>

      {voiceError && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          {voiceError}
        </div>
      )}

      {/* Stage Grid */}
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        {!isJoined && participants.length === 0 ? (
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[#23A55A]">
              <Headphones className="w-8 h-8" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white">
              {channelName} odası şu an boş
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Sesli sohbete bağlan, kameranı aç veya ekranını paylaşarak arkadaşlarınla konuşmaya başla.
            </p>
            <button
              onClick={onJoin}
              className="px-6 py-2.5 rounded-xl bg-[#23A55A] hover:bg-[#1E8E4C] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Sesli Odaya Katıl
            </button>
          </div>
        ) : (
          <div
            className={`w-full max-w-5xl grid gap-4 ${
              participants.length === 1
                ? 'grid-cols-1 max-w-xl'
                : participants.length <= 4
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {participants.map((p) => {
              const isMe = p.uid === currentUid;
              const stream = isMe ? localStream : remoteStreams[p.uid];
              const showVideo = (p.cameraOn || p.screenSharing) && hasVideoTrack(stream);
              const isSpotlight = spotlightUid === p.uid;

              return (
                <div
                  key={p.uid}
                  onClick={() => setSpotlightUid(isSpotlight ? null : p.uid)}
                  className={`relative aspect-video rounded-2xl bg-[var(--bg-card)] overflow-hidden flex items-center justify-center cursor-pointer transition-all ${
                    p.speaking
                      ? 'ring-2 ring-[#23A55A]'
                      : 'border border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                  } ${isSpotlight ? 'sm:col-span-2' : ''}`}
                >
                  {showVideo && stream ? (
                    <StreamVideo stream={stream} muted={isMe || deafened} mirrored={isMe && !p.screenSharing} />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Avatar
                        src={p.avatarUrl}
                        name={p.displayName}
                        size="xl"
                        speaking={p.speaking}
                        ringBg="var(--bg-card)"
                      />
                    </div>
                  )}

                  {/* Bottom Name & Status Pill */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-sm text-xs font-medium text-white flex items-center gap-2 truncate">
                      <span className="truncate">
                        {p.displayName} {isMe ? '(Sen)' : ''}
                      </span>
                      {p.screenSharing && (
                        <span className="text-[10px] text-[#23A55A] font-semibold">EKRAN</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.deafened ? (
                        <span className="p-1.5 rounded-full bg-rose-500/80 text-white">
                          <VolumeX className="w-3.5 h-3.5" />
                        </span>
                      ) : p.muted ? (
                        <span className="p-1.5 rounded-full bg-rose-500/80 text-white">
                          <MicOff className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Voice Controls Bar */}
      {isJoined && (
        <div className="pb-6 pt-2 flex items-center justify-center gap-3 shrink-0">
          <button
            onClick={onToggleMute}
            title={muted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              muted ? 'bg-white text-[#111214]' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-white border border-[var(--border-subtle)]'
            }`}
          >
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={onToggleCamera}
            title={cameraOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              cameraOn ? 'bg-white text-[#111214]' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-white border border-[var(--border-subtle)]'
            }`}
          >
            {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <button
            onClick={onToggleScreenShare}
            title={screenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekran Paylaş'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              screenSharing ? 'bg-[#23A55A] text-white' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-white border border-[var(--border-subtle)]'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleDeafen}
            title={deafened ? 'Sesi Aç' : 'Sağırlaştır'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              deafened ? 'bg-white text-[#111214]' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-white border border-[var(--border-subtle)]'
            }`}
          >
            {deafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </button>
          <button
            onClick={onLeave}
            title="Sesli Odadan Ayrıl"
            className="w-12 h-12 rounded-full bg-[#DA373C] hover:bg-[#B8282D] text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
