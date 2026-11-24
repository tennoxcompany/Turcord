import React, { useId, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onGoogleLogin: () => Promise<void>;
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onEmailRegister: (input: {
    email: string;
    password: string;
    displayName: string;
    username: string;
  }) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  error: string | null;
  onClearError?: () => void;
}

const PIXEL_STARS: Array<{
  top: string;
  left: string;
  size: string;
  opacity: string;
}> = [
  { top: '7%', left: '16%', size: 'w-2 h-2', opacity: 'opacity-25' },
  { top: '10%', left: '38%', size: 'w-1.5 h-1.5', opacity: 'opacity-45' },
  { top: '6%', left: '63%', size: 'w-1.5 h-1.5', opacity: 'opacity-35' },
  { top: '9%', left: '84%', size: 'w-1.5 h-1.5', opacity: 'opacity-40' },
  { top: '16%', left: '84%', size: 'w-2.5 h-2.5', opacity: 'opacity-30' },
  { top: '28%', left: '95%', size: 'w-1.5 h-1.5', opacity: 'opacity-35' },
  { top: '34%', left: '76%', size: 'w-1.5 h-1.5', opacity: 'opacity-30' },
  { top: '44%', left: '84%', size: 'w-1.5 h-1.5', opacity: 'opacity-25' },
  { top: '53%', left: '96%', size: 'w-2.5 h-2.5', opacity: 'opacity-35' },
  { top: '62%', left: '87%', size: 'w-1.5 h-1.5', opacity: 'opacity-30' },
  { top: '71%', left: '82%', size: 'w-1.5 h-1.5', opacity: 'opacity-25' },
  { top: '63%', left: '25%', size: 'w-1.5 h-1.5', opacity: 'opacity-35' },
  { top: '68%', left: '9%', size: 'w-1.5 h-1.5', opacity: 'opacity-40' },
  { top: '81%', left: '33%', size: 'w-1.5 h-1.5', opacity: 'opacity-25' },
  { top: '87%', left: '42%', size: 'w-2.5 h-2.5', opacity: 'opacity-30' },
  { top: '94%', left: '57%', size: 'w-2.5 h-2.5', opacity: 'opacity-35' },
];

const TurcordLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => {
  const maskId = useId();
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="100" height="100" fill="white" />
          {/* Crescent cutout */}
          <circle cx="43" cy="44.5" r="16.5" fill="black" />
          <circle cx="50.5" cy="44.5" r="13" fill="white" />
          {/* Twin voice wave cutouts */}
          <rect x="55" y="31" width="7.5" height="27" rx="3.75" fill="black" />
          <rect x="67.5" y="36.5" width="7.5" height="16" rx="3.75" fill="black" />
        </mask>
      </defs>
      <path
        fill="currentColor"
        mask={`url(#${maskId})`}
        d="M50 12C75 12 90 25 90 45C90 65 75 77 50 77H35L19 88C16.5 89.5 14 87.5 15.2 84.8L21.5 69.5C14.2 63.5 10 55 10 45C10 25 25 12 50 12Z"
      />
    </svg>
  );
};

const GoogleMark: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
    />
  </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogleLogin,
  onEmailLogin,
  onEmailRegister,
  onResetPassword,
  error,
  onClearError,
}) => {
  const [view, setView] = useState<'welcome' | 'register' | 'login'>('welcome');

  // Register state
  const [regMode, setRegMode] = useState<'email' | 'phone'>('email');
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const combinedError = localError || error;

  const switchView = (next: 'welcome' | 'register' | 'login') => {
    setView(next);
    setRegStep(1);
    setLocalError(null);
    setInfoMsg(null);
    onClearError?.();
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setLocalError(null);
    setInfoMsg(null);
    try {
      await onGoogleLogin();
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMsg(null);
    onClearError?.();

    if (regMode === 'phone') {
      setLocalError(
        'Telefon numarası ile SMS kaydı şu an devre dışı. Ücretsiz olarak E-posta sekmesinden veya aşağıdaki Google ile kaydol butonundan hesabını oluşturabilirsin.'
      );
      return;
    }

    const email = regEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Lütfen geçerli bir e-posta adresi gir.');
      return;
    }

    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_.]/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20);
    if (!regUsername) {
      setRegUsername(base.length >= 2 ? base : 'kullanici');
    }
    if (!regDisplayName) {
      const pretty = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
      setRegDisplayName(pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1, 32) : 'Üye');
    }
    setRegStep(2);
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMsg(null);
    onClearError?.();

    const cleanUsername = regUsername.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (cleanUsername.length < 2) {
      setLocalError('Kullanıcı adı en az 2 karakter olmalıdır (a-z, 0-9, _, .).');
      return;
    }
    if (regPassword.length < 6) {
      setLocalError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      await onEmailRegister({
        email: regEmail.trim(),
        password: regPassword,
        displayName: regDisplayName.trim() || cleanUsername,
        username: cleanUsername,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMsg(null);
    onClearError?.();

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setLocalError('Lütfen e-posta adresini gir.');
      return;
    }
    if (!identifier.includes('@')) {
      setLocalError('Lütfen kayıtlı e-posta adresinle giriş yap veya aşağıdan Google ile devam et.');
      return;
    }
    if (!loginPassword) {
      setLocalError('Lütfen şifreni gir.');
      return;
    }

    setLoading(true);
    try {
      await onEmailLogin(identifier, loginPassword);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLocalError(null);
    setInfoMsg(null);
    onClearError?.();

    const email = loginIdentifier.trim();
    if (!email || !email.includes('@')) {
      setLocalError('Şifre sıfırlama bağlantısı göndermek için yukarıya e-posta adresini yaz.');
      return;
    }

    setLoading(true);
    try {
      await onResetPassword(email);
      setInfoMsg(`${email} adresine şifre sıfırlama bağlantısı gönderildi.`);
    } catch {
      // Error surfaced via parent error prop
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onContextMenu={(e) => {
        const target = e.target as HTMLElement | null;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
      }}
      className="relative h-dvh w-full overflow-y-auto bg-[#03072B] text-[#F2F3F5] flex items-center justify-center p-4 sm:p-6 select-none"
    >
      {/* Space Indigo Gradient + Nebula + Pixel Stars */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 12% 10%, rgba(147, 51, 234, 0.34), transparent 34%), radial-gradient(circle at 78% 18%, rgba(30, 64, 175, 0.28), transparent 48%), linear-gradient(180deg, #020521 0%, #050C49 52%, #020523 100%)',
        }}
      >
        <div className="pointer-events-none fixed -top-24 -left-24 w-80 h-80 rounded-full bg-purple-600/25 blur-3xl" />
        {PIXEL_STARS.map((star, idx) => (
          <span
            key={idx}
            style={{ top: star.top, left: star.left }}
            className={`fixed block bg-[#8A94E8] ${star.size} ${star.opacity}`}
          />
        ))}
        {/* Pixel Sparkle Cross on Lower Left */}
        <div className="fixed top-[63%] left-[10%] w-5 h-5 opacity-45 hidden sm:block">
          <span className="absolute left-2 top-0 w-1 h-5 bg-[#7B86E8]" />
          <span className="absolute top-2 left-0 w-5 h-1 bg-[#7B86E8]" />
        </div>
      </div>

      {/* Screen 1: Welcome */}
      {view === 'welcome' && (
        <div className="relative z-10 w-full max-w-[400px] mx-auto flex flex-col items-center text-center py-6">
          <div className="mb-4 text-white">
            <TurcordLogo className="w-16 h-16 mx-auto drop-shadow-[0_6px_24px_rgba(88,101,242,0.45)]" />
          </div>

          <h1 className="font-display text-2xl sm:text-[32px] font-extrabold tracking-tight text-white uppercase leading-tight">
            TURCORD&apos;A HOŞ GELDİN
          </h1>
          <p className="mt-2.5 text-sm sm:text-[15px] text-white/85 max-w-[330px] leading-snug">
            Vakit geçir, oyunlar oyna veya sadece konuş. Başlamak için aşağıya dokun!
          </p>

          <div className="w-full mt-7 space-y-2.5">
            <button
              type="button"
              onClick={() => switchView('register')}
              className="w-full h-11 sm:h-12 rounded-xl bg-white hover:bg-white/92 text-[#0B0F2E] font-semibold text-sm sm:text-[15px] transition-colors cursor-pointer shadow-lg"
            >
              Kaydol
            </button>
            <button
              type="button"
              onClick={() => switchView('login')}
              className="w-full h-11 sm:h-12 rounded-xl bg-[#070B2A]/95 hover:bg-[#0D1342] border border-white/10 text-white font-semibold text-sm sm:text-[15px] transition-colors cursor-pointer"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      )}

      {/* Screen 2: Register Card */}
      {view === 'register' && (
        <div className="relative z-10 w-full max-w-[440px] bg-[#1E1F24] border border-white/8 rounded-2xl shadow-2xl p-6 sm:p-7">
          <div className="flex items-center mb-3">
            <button
              type="button"
              onClick={() => (regStep === 2 ? setRegStep(1) : switchView('welcome'))}
              aria-label="Geri"
              className="p-1 -ml-1 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {regStep === 1 ? (
            <form onSubmit={handleRegisterStep1} className="space-y-4">
              <h2 className="font-display text-xl sm:text-[22px] font-bold text-white text-center">
                Telefon numarası veya e-posta gir.
              </h2>

              {/* Segmented Toggle: E-posta / Telefon */}
              <div className="bg-[#2B2D33] p-1 rounded-xl grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setRegMode('email');
                    setLocalError(null);
                    onClearError?.();
                  }}
                  className={`h-9 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    regMode === 'email'
                      ? 'bg-[#4E5058] text-white shadow-sm'
                      : 'text-[#949BA4] hover:text-white'
                  }`}
                >
                  E-posta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegMode('phone');
                    setLocalError(null);
                    onClearError?.();
                  }}
                  className={`h-9 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    regMode === 'phone'
                      ? 'bg-[#4E5058] text-white shadow-sm'
                      : 'text-[#949BA4] hover:text-white'
                  }`}
                >
                  Telefon
                </button>
              </div>

              {regMode === 'email' ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#B5BAC1]">E-posta</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="E-posta"
                    autoFocus
                    className="w-full h-11 px-3.5 rounded-xl bg-[#111214] border border-[#3F4147] focus:border-[#5865F2] text-sm text-white placeholder-[#80848E] outline-none transition-colors"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#B5BAC1]">Telefon</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+90 5XX XXX XX XX"
                    autoFocus
                    className="w-full h-11 px-3.5 rounded-xl bg-[#111214] border border-[#3F4147] focus:border-[#5865F2] text-sm text-white placeholder-[#80848E] outline-none transition-colors"
                  />
                </div>
              )}

              {combinedError && (
                <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-xs text-rose-300 leading-relaxed">
                  {combinedError}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading || (regMode === 'email' ? !regEmail.trim() : !regPhone.trim())
                }
                className="w-full h-11 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#3B4270] disabled:text-white/55 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                İleri
              </button>

              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-semibold text-[#949BA4] tracking-wider">YA DA</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#2B2D33] hover:bg-[#35373D] disabled:opacity-60 text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <GoogleMark className="w-4 h-4" />
                <span>{loading ? 'Bağlanıyor...' : 'Google ile kaydol'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterStep2} className="space-y-3.5">
              <div className="text-center space-y-1">
                <h2 className="font-display text-xl sm:text-[22px] font-bold text-white">
                  Hesabını oluştur
                </h2>
                <p className="text-xs text-[#B5BAC1] truncate">{regEmail}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#B5BAC1]">Görünen Ad</label>
                <input
                  type="text"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="Adın"
                  maxLength={40}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111214] border border-[#3F4147] focus:border-[#5865F2] text-sm text-white placeholder-[#80848E] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#B5BAC1]">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) =>
                    setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                  }
                  placeholder="ornek_kullanici"
                  maxLength={32}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111214] border border-[#3F4147] focus:border-[#5865F2] text-sm text-white placeholder-[#80848E] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#B5BAC1]">Şifre</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    className="w-full h-11 px-3.5 pr-10 rounded-xl bg-[#111214] border border-[#3F4147] focus:border-[#5865F2] text-sm text-white placeholder-[#80848E] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949BA4] hover:text-white cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {combinedError && (
                <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-xs text-rose-300 leading-relaxed">
                  {combinedError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                {loading ? 'Hesap oluşturuluyor...' : 'Kaydol'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Screen 3: Login Card */}
      {view === 'login' && (
        <div className="relative z-10 w-full max-w-[440px] bg-[#1E1F24] border border-white/8 rounded-2xl shadow-2xl p-6 sm:p-7">
          <div className="flex items-center mb-2">
            <button
              type="button"
              onClick={() => switchView('welcome')}
              aria-label="Geri"
              className="p-1 -ml-1 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center space-y-1 mb-5">
            <h2 className="font-display text-xl sm:text-[22px] font-bold text-white">
              Tekrar hoş geldin!
            </h2>
            <p className="text-xs sm:text-sm text-[#B5BAC1]">
              Seni tekrar gördüğümüze çok sevindik!
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#B5BAC1]">
                E-posta veya Telefon Numarası
              </label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                autoFocus
                className="w-full h-11 px-3.5 rounded-xl bg-[#111214] border border-[#3F4147] focus:border-[#5865F2] text-sm text-white placeholder-[#80848E] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#B5BAC1]">Şifre</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-11 px-3.5 pr-10 rounded-xl bg-[#111214] border border-[#3F4147] focus:border-[#5865F2] text-sm text-white placeholder-[#80848E] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((s) => !s)}
                  aria-label="Şifreyi Göster veya Gizle"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949BA4] hover:text-white cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-0.5 text-left">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="block text-xs text-[#00A8FC] hover:underline cursor-pointer"
              >
                Şifreni mi unuttun?
              </button>
              <button
                type="button"
                onClick={() => switchView('register')}
                className="block text-xs text-[#00A8FC] hover:underline cursor-pointer"
              >
                Bir hesaba mı ihtiyacın var? Kaydol
              </button>
            </div>

            {combinedError && (
              <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/30 text-xs text-rose-300 leading-relaxed">
                {combinedError}
              </div>
            )}

            {infoMsg && (
              <div className="p-3 rounded-xl bg-[#23A55A]/15 border border-[#23A55A]/35 text-xs text-[#6EE7B7] leading-relaxed">
                {infoMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold text-[#949BA4] tracking-wider">YA DA</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#2B2D33] hover:bg-[#35373D] disabled:opacity-60 text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <GoogleMark className="w-4 h-4" />
            <span>{loading ? 'Bağlanıyor...' : 'Google ile giriş yap'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
