import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Zap, ArrowRight } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

/* Tiny inline sparkline from price history */
const MiniSparkline = ({ data = [], color = '#0078f2' }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28, w = 72;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="flex-shrink-0 opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const SentimentBadge = ({ sentiment }) => {
  if (!sentiment) return null;
  const map = {
    buy:   { label: 'Buy',   cls: 'bg-emerald-500/20 text-emerald-400' },
    wait:  { label: 'Wait',  cls: 'bg-amber-500/20 text-amber-400' },
    avoid: { label: 'Avoid', cls: 'bg-red-500/20 text-red-400' },
  };
  const s = map[sentiment];
  if (!s) return null;
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.cls}`}>
      {s.label}
    </span>
  );
};

const CommandPalette = ({ data = [], isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return data.slice(0, 10);
    const q = query.toLowerCase();
    return data.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.tags?.some(t => t.toLowerCase().includes(q)) ||
      g.developer?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query, data]);

  const handleSelect = (game) => {
    onClose();
    navigate(`/game/${game.game_id}`);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      {/* Palette */}
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/10 shadow-2xl shadow-black overflow-hidden"
        style={{ background: 'rgba(20, 20, 22, 0.98)', animation: 'fadeInScale 0.15s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-4 px-6 py-5">
          <Search className="w-5 h-5 text-[#555] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search games, tags, developers..."
            className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-[#444] font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#444] hover:text-[#888] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="flex items-center gap-1 text-[#444] hover:text-[#888] transition-colors ml-1">
            <kbd className="bg-[#1e1e1e] border border-[#333] text-[#555] text-[10px] font-mono px-1.5 py-0.5 rounded">ESC</kbd>
          </button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Search className="w-8 h-8 text-[#333] mx-auto mb-3" />
              <p className="text-[#555] text-sm">No games found for &ldquo;{query}&rdquo;</p>
              <p className="text-[#333] text-xs mt-1">Try searching by genre or developer</p>
            </div>
          ) : (
            <div className="p-2">
              {!query && (
                <p className="text-[#444] text-[10px] uppercase tracking-widest font-semibold px-4 pt-2 pb-1.5">
                  Top Picks
                </p>
              )}
              {results.map((game, index) => {
                const hasSurge = game.platforms?.some(p => p.surge_detected);
                const sparkData = game.platforms?.[0]?.historical_prices_14d || [];
                const bestPrice = game.best_deal?.price;
                const isActive = activeIndex === index;
                return (
                  <button
                    key={game.game_id}
                    onClick={() => handleSelect(game)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full rounded-xl flex items-center gap-5 px-4 py-3.5 transition-all text-left group relative overflow-hidden ${
                      isActive ? 'bg-white/6' : 'hover:bg-white/4'
                    }`}
                  >
                    {/* Accent line on active */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[#0078f2]" />
                    )}

                    {/* Cover art */}
                    <img
                      src={game.image_url}
                      alt=""
                      className="w-11 h-16 object-cover rounded-lg flex-shrink-0 shadow-lg"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='64' viewBox='0 0 44 64'><rect width='100%25' height='100%25' fill='%231a1a1a' rx='4'/><path d='M22 20 L22 44 M12 32 L32 32' stroke='%23333' stroke-width='4' stroke-linecap='round'/></svg>";
                      }}
                    />

                    {/* Title & tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-white' : 'text-[#ddd] group-hover:text-white'}`}>
                          {game.title}
                        </h4>
                        {hasSurge && <Zap className="w-3 h-3 text-[#ff4444] fill-[#ff4444] flex-shrink-0" />}
                      </div>
                      <p className="text-[#555] text-xs truncate mb-1.5">{game.tags?.slice(0, 3).join(' · ')}</p>
                      <SentimentBadge sentiment={game.buying_sentiment} />
                    </div>

                    {/* Sparkline – hidden on small screens */}
                    <div className="flex-shrink-0 hidden sm:block">
                      <MiniSparkline data={sparkData} color={hasSurge ? '#ff4444' : '#0078f2'} />
                    </div>

                    {/* Price block */}
                    <div className="text-right flex-shrink-0 min-w-[80px]">
                      <p className="text-white text-base font-bold font-mono tabular-nums leading-tight">
                        {formatPrice(bestPrice)}
                      </p>
                      <p className="text-[#555] text-[10px] truncate mt-0.5">{game.best_deal?.store}</p>
                    </div>

                    {/* Arrow on active */}
                    <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 transition-all ${isActive ? 'text-[#0078f2] opacity-100' : 'opacity-0'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#444] text-[10px]">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1 py-0.5 rounded text-[9px] font-mono">↑</kbd>
              <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1 py-0.5 rounded text-[9px] font-mono">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-[9px] font-mono">↵</kbd>
              open
            </span>
          </div>
          <p className="text-[#333] text-[10px]">{results.length} result{results.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.97) translateY(-10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CommandPalette;
