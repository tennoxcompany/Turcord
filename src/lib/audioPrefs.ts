export interface AudioPreferences {
  micId: string;
  speakerId: string;
  inputGain: number;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

const STORAGE_KEY = 'turcord_audio_prefs_v1';
const EVENT_NAME = 'turcord:audioprefs';

const DEFAULT_PREFS: AudioPreferences = {
  micId: '',
  speakerId: '',
  inputGain: 100,
  echoCancellation: true,
  autoGainControl: true,
};

export function getAudioPrefs(): AudioPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
    return {
      micId: typeof parsed.micId === 'string' ? parsed.micId : '',
      speakerId: typeof parsed.speakerId === 'string' ? parsed.speakerId : '',
      inputGain:
        typeof parsed.inputGain === 'number' && Number.isFinite(parsed.inputGain)
          ? Math.max(0, Math.min(200, Math.round(parsed.inputGain)))
          : 100,
      echoCancellation:
        typeof parsed.echoCancellation === 'boolean' ? parsed.echoCancellation : true,
      autoGainControl:
        typeof parsed.autoGainControl === 'boolean' ? parsed.autoGainControl : true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setAudioPrefs(patch: Partial<AudioPreferences>): AudioPreferences {
  const next: AudioPreferences = {
    ...getAudioPrefs(),
    ...patch,
  };
  next.inputGain = Math.max(0, Math.min(200, Math.round(next.inputGain)));
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent<AudioPreferences>(EVENT_NAME, { detail: next }));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export function subscribeAudioPrefs(listener: (prefs: AudioPreferences) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<AudioPreferences>).detail;
    listener(detail ?? getAudioPrefs());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener(getAudioPrefs());
  };
  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
