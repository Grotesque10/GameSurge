import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlist } from '../contexts/WatchlistContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { handleOAuthExchange } = useWatchlist();
  const [status, setStatus] = useState('Initiating cloud synchronization...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const provider = queryParams.get('provider');

    const processLogin = async () => {
      try {
        if (provider === 'steam') {
          setStatus('Validating Steam credentials and securing connection...');
          const openidParams = {};
          queryParams.forEach((value, key) => {
            if (key.startsWith('openid.')) {
              openidParams[key] = value;
            }
          });
          
          if (!openidParams['openid.mode']) {
            setError('Steam OpenID authentication signature was not returned correctly.');
            setStatus('');
            return;
          }

          await handleOAuthExchange('steam', openidParams);
        } else {
          // Parse the URL hash fragment (implicit flow redirects with hash parameters)
          const hash = window.location.hash;
          const hashParams = new URLSearchParams(hash.substring(1)); // strip '#'
          const accessToken = hashParams.get('access_token');

          if (!accessToken) {
            setError('OAuth authentication parameters were not returned correctly from Discord.');
            setStatus('');
            return;
          }

          setStatus('Synchronizing watchlists and securing connection...');
          await handleOAuthExchange('discord', accessToken);
        }
        navigate('/'); // redirect home
      } catch (err) {
        console.error(err);
        setError('Failed to establish connection with server database.');
        setStatus('');
      }
    };

    processLogin();
  }, [handleOAuthExchange, navigate]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-[#141414]/90 border border-white/10 rounded-2xl p-8 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {error ? (
          <div>
            <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
              <span className="text-red-500 font-bold">!</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Sync Connection Failed</h3>
            <p className="text-[#888] text-xs leading-relaxed mb-6">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] hover:border-[#444] text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              Back to Store
            </button>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-[#0078f2] border-r-transparent border-b-[#00d26a] border-l-transparent animate-spin" />
            <p className="text-[#ccc] text-xs font-bold uppercase tracking-wider animate-pulse">
              {status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
