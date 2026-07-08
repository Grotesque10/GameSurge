import React, { useState } from 'react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { X, TrendingUp, ShieldAlert } from 'lucide-react';

const SteamLogo = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12 0C5.378 0 0 5.378 0 12c0 5.617 3.864 10.334 9.07 11.666l-1.077-3.69a2.59 2.59 0 0 1-.09-.594c0-.986.55-1.84 1.353-2.285L7.7 14.542a3.842 3.842 0 1 1 3.841-3.842 3.82 3.82 0 0 1-.39 1.674l2.585 2.586a2.6 2.6 0 0 1 2.264 2.59A2.603 2.603 0 1 1 13.4 14.95l-2.585-2.585a3.822 3.822 0 0 1-.416-2.923l1.556-2.555a2.592 2.592 0 1 1 1.055.644l-1.554 2.554a3.826 3.826 0 0 1-.394.814l2.584 2.586a2.6 2.6 0 0 1 2.264 2.59 2.603 2.603 0 1 1-2.603 2.602c0-.18.024-.355.07-.525l-2.584-2.586A2.6 2.6 0 0 1 9.07 16.73c0-.19.025-.373.072-.55l1.077 3.69A12.008 12.008 0 0 0 24 12C24 5.378 18.622 0 12 0z"/>
  </svg>
);

const DiscordLogo = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.51,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.06-18.83C129.83,47.88,123.41,25,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
  </svg>
);

const LoginModal = ({ isOpen, onClose }) => {
  const { handleLogin, loading, authConfig } = useWatchlist();
  const [activeProvider, setActiveProvider] = useState(null);

  if (!isOpen) return null;

  const triggerLogin = async (provider) => {
    setActiveProvider(provider);
    if (provider === 'discord') {
      const clientId = authConfig?.discord_client_id || import.meta.env.VITE_DISCORD_CLIENT_ID || '';
      const redirectUri = encodeURIComponent(authConfig?.discord_redirect_uri || import.meta.env.VITE_DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback');
      window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=identify`;
    } else {
      await handleLogin(provider);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={loading ? undefined : onClose} />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-[460px] bg-[#141414]/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-center z-10 animate-in fade-in zoom-in-95 duration-200"
        style={{ padding: '40px 36px', backdropFilter: 'blur(20px)' }}
      >
        {/* Close Button */}
        {!loading && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[#666] hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Icon */}
        <div 
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0078f2] to-[#00d26a] border border-white/10 shadow-lg shadow-black/40"
          style={{ marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}
        >
          <TrendingUp className="w-7 h-7 text-white" />
        </div>

        {/* Header Text */}
        <h3 className="text-2xl font-black text-white mb-2.5 tracking-tight">Save Watchlist to Cloud</h3>
        <p 
          className="text-[#aaa] text-xs sm:text-sm leading-relaxed mx-auto"
          style={{ maxWidth: '360px', marginBottom: '32px', textAlign: 'center' }}
        >
          Synchronize your pricing alerts persistently across all devices. Choose a secure social provider to sign in instantly.
        </p>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-5">
            {/* Spinning loader */}
            <div className="w-12 h-12 rounded-full border-2 border-t-[#0078f2] border-r-transparent border-b-[#00d26a] border-l-transparent animate-spin shadow-lg shadow-black/50" />
            <p className="text-[#ccc] text-xs font-bold uppercase tracking-widest mt-2 animate-pulse">
              Simulating Secure {activeProvider === 'steam' ? 'Steam' : 'Discord'} Handshake...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Steam Login Button */}
            <button
              onClick={() => triggerLogin('steam')}
              className="w-full text-white font-extrabold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-xl hover:shadow-white/5 hover:border-white/20 cursor-pointer"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #1b2838 0%, #171a21 100%)', 
                border: '1px solid rgba(255, 255, 255, 0.08)' 
              }}
            >
              <span className="text-[#888] group-hover:text-white transition-colors flex items-center justify-center">
                <SteamLogo />
              </span>
              <span className="flex items-center justify-center text-sm sm:text-base font-extrabold leading-none" style={{ height: '20px' }}>
                Sign in with Steam
              </span>
            </button>

            {/* Discord Login Button */}
            <button
              onClick={() => triggerLogin('discord')}
              className="w-full text-white font-extrabold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-xl hover:shadow-[#5865F2]/20 hover:border-[#5865F2]/50 cursor-pointer"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)', 
                border: '1px solid rgba(255, 255, 255, 0.1)' 
              }}
            >
              <span className="text-[#d8dcff] group-hover:scale-105 transition-transform flex items-center justify-center">
                <DiscordLogo />
              </span>
              <span className="flex items-center justify-center text-sm sm:text-base font-extrabold leading-none" style={{ height: '20px' }}>
                Sign in with Discord
              </span>
            </button>

            {/* Notice Footer */}
            <div 
              className="pt-6 border-t border-white/5 mt-8 text-[#888] text-[11px] font-semibold"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', lineHeight: '1' }}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#f5a623]" style={{ flexShrink: 0 }} />
              <span>We do not store passwords. Auth is fully delegated.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
