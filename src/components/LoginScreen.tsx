import React, { useState } from 'react';
import { Headphones, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import loginShowcaseImg from '../assets/images/halka_login_showcase_1795430680974.jpg';

interface LoginScreenProps {
  onGoogleLogin: () => Promise<void>;
  error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogleLogin, error }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onGoogleLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#111214] text-[#F2F3F5] flex flex-col lg:flex-row">
      {/* Left Column: Auth & Value Prop */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 max-w-2xl mx-auto lg:mx-0">
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl font-bold tracking-tight text-white">Turcord</span>
          <span className="text-xs text-[#949BA4]">Sesli &amp; Yazılı Topluluk Platformu</span>
        </div>

        <div className="my-12 space-y-8">
          <div className="space-y-4">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.12] text-balance">
              Arkadaşlarınla kesintisiz konuş, sunucunu kur.
            </h1>
            <p className="text-base text-[#B5BAC1] leading-relaxed max-w-lg">
              Sesli odalar, ekran paylaşımı, metin kanalları, roller ve direkt mesajlar tek bir hızlı arayüzde. Erişim engeli olmadan tarayıcıdan anında bağlan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#1E1F22] border border-[#2B2D31] space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <Headphones className="w-4 h-4 text-[#5865F2]" />
                <span>Düşük Gecikmeli Ses</span>
              </div>
              <p className="text-xs text-[#949BA4] leading-relaxed">
                WebRTC tabanlı sesli kanallar, kamera ve ekran paylaşımı.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#1E1F22] border border-[#2B2D31] space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <MessageSquare className="w-4 h-4 text-[#23A55A]" />
                <span>Zengin Metin Kanalları</span>
              </div>
              <p className="text-xs text-[#949BA4] leading-relaxed">
                Yanıtlar, emoji tepkileri, mesaj sabitleme ve canlı yazıyor bilgisi.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#1E1F22] border border-[#2B2D31] space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <Users className="w-4 h-4 text-[#F0B232]" />
                <span>Arkadaşlar &amp; DM</span>
              </div>
              <p className="text-xs text-[#949BA4] leading-relaxed">
                Kullanıcı adıyla arkadaş ekle, birebir sohbet ve sesli arama başlat.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#1E1F22] border border-[#2B2D31] space-y-1.5">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <ShieldCheck className="w-4 h-4 text-[#B5BAC1]" />
                <span>Turcord Bot &amp; Roller</span>
              </div>
              <p className="text-xs text-[#949BA4] leading-relaxed">
                Resmi Turcord botu, slash komutları, moderasyon ve yetki yönetimi.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleClick}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-medium text-base transition-colors cursor-pointer shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              <span>{loading ? 'Bağlanıyor...' : 'Google ile Giriş Yap'}</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-[#80848E] flex items-center gap-2">
          <span>Turcord Topluluk Platformu</span>
          <span aria-hidden="true">·</span>
          <span>Tarayıcıdan Anında Erişim</span>
        </div>
      </div>

      {/* Right Column: Visual Showcase */}
      <div className="hidden lg:block flex-1 relative overflow-hidden bg-[#18191C] border-l border-[#2B2D31]">
        <img
          src={loginShowcaseImg}
          alt="Turcord sesli ve topluluk iletişim kanalları"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111214] via-transparent to-[#111214]/40" />
        <div className="absolute bottom-12 left-12 right-12 max-w-md space-y-2">
          <p className="text-xs font-medium text-[#949BA4]">Oda, Kanal &amp; Ses</p>
          <p className="font-display text-xl font-semibold text-white leading-snug">
            Kurulum gerektirmez. Sunucunu oluştur, davet kodunu paylaş ve saniyeler içinde sesli odaya geç.
          </p>
        </div>
      </div>
    </div>
  );
};
