import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../contexts/WatchlistContext';
import { Shield, CloudLightning, AlertCircle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { handleOAuthExchange } = useWatchlist();
  const [status, setStatus] = useState('Initiating cloud sync...');
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const provider = queryParams.get('provider');

    const processLogin = async () => {
      try {
        if (provider === 'steam') {
          setStatus('Verifying Steam signature...');
          setCurrentStep(1);
          const openidParams = {};
          queryParams.forEach((value, key) => {
            if (key.startsWith('openid.')) {
              openidParams[key] = value;
            }
          });
          
          if (!openidParams['openid.mode']) {
            setError('Steam OpenID signature was not returned correctly.');
            setStatus('');
            return;
          }

          setCurrentStep(2);
          setStatus('Connecting account & fetching watchlist...');
          await handleOAuthExchange('steam', openidParams);
        } else {
          // Parse the URL hash fragment (implicit flow redirects with hash parameters)
          const hash = window.location.hash;
          const hashParams = new URLSearchParams(hash.substring(1)); // strip '#'
          const accessToken = hashParams.get('access_token');

          if (!accessToken) {
            setError('OAuth authentication parameters were not returned from Discord.');
            setStatus('');
            return;
          }

          setCurrentStep(2);
          setStatus('Synchronizing watchlist & securing profile...');
          await handleOAuthExchange('discord', accessToken);
        }
        
        setCurrentStep(3);
        setStatus('Connection established successfully!');
        
        // Small delay to let user see success state before redirecting
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } catch (err) {
        console.error(err);
        setError('Failed to establish connection with server database.');
        setStatus('');
      }
    };

    processLogin();
  }, [handleOAuthExchange, navigate]);

  return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#0078f2]/15 via-[#00d26a]/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div 
        className="w-full max-w-md bg-[#0e0e12]/80 border border-white/5 rounded-3xl px-6 py-12 md:px-12 md:py-16 text-center shadow-2xl relative backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300"
        style={{ backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
      >
        {error ? (
          <div className="py-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-500 animate-bounce" />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-3">Sync Connection Failed</h3>
            <p className="text-[#8e8e9f] text-xs leading-relaxed max-w-xs mx-auto mb-8">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-[#13131a] hover:bg-[#1a1a24] border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
            >
              Return to Store
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            {/* Elegant spacious loading container */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-8">
              {/* Outer spinning gradient ring */}
              <div className="absolute inset-0 rounded-full border border-white/5" />
              <div 
                className="absolute inset-0 rounded-full border-2 border-t-[#0078f2] border-r-transparent border-b-[#00d26a] border-l-transparent animate-spin" 
                style={{ animationDuration: '1.2s' }}
              />
              
              {/* Inner pulsing container */}
              <div className="w-20 h-20 rounded-full bg-[#131317] border border-white/5 flex items-center justify-center shadow-inner">
                {currentStep === 1 ? (
                  <Shield className="w-8 h-8 text-[#0078f2] animate-pulse" />
                ) : currentStep === 2 ? (
                  <CloudLightning className="w-8 h-8 text-[#00d26a] animate-pulse" />
                ) : (
                  <div className="w-3.5 h-3.5 bg-[#00d26a] rounded-full animate-ping" />
                )}
              </div>
            </div>

            <h3 className="text-lg font-black text-white tracking-wider mb-2 uppercase bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              Securing Connection
            </h3>
            
            <div className="h-12 flex items-center justify-center">
              <p className="text-[#8e8e9f] text-xs font-bold tracking-wide animate-pulse max-w-xs leading-relaxed">
                {status}
              </p>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-2 mt-8 md:mt-10">
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentStep >= 1 ? 'bg-[#0078f2] scale-125' : 'bg-white/10'}`} />
              <div className="w-6 h-[1px] bg-white/10" />
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentStep >= 2 ? 'bg-[#00d26a] scale-125' : 'bg-white/10'}`} />
              <div className="w-6 h-[1px] bg-white/10" />
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentStep >= 3 ? 'bg-[#00d26a] scale-125' : 'bg-white/10'}`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
