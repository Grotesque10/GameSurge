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
    buy:   { label: 'Buy',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    wait:  { label: 'Wait',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    avoid: { label: 'Avoid', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const s = map[sentiment];
  if (!s) return null;
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${s.cls}`}>
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[4vh] sm:pt-[12vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-md transition-opacity duration-300" />

      {/* Palette */}
      <div
        className="relative w-full max-w-3xl mx-4 rounded-2xl border border-white/10 bg-[#16161a]/95 shadow-[0_0_80px_-10px_rgba(0,120,242,0.15)] overflow-hidden backdrop-blur-2xl transition-all duration-300 flex flex-col max-h-[80vh] sm:max-h-[85vh]"
        style={{ animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Accent Header */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#0078f2]/50 to-transparent" />

        {/* Search Input Container - Padded & spacious */}
        <div className="flex items-center gap-4.5 px-6.5 py-5.5 bg-white/[0.02] flex-shrink-0">
          <Search className={`w-5.5 h-5.5 flex-shrink-0 transition-colors duration-200 ${query ? 'text-[#0078f2]' : 'text-neutral-500'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search games, tags, developers..."
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-neutral-600 font-medium tracking-tight"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-neutral-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 transition-colors ml-1">
            <kbd className="bg-white/5 border border-white/10 text-neutral-400 text-[10px] font-mono px-2 py-0.5 rounded shadow-sm">ESC</kbd>
          </button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-shrink-0" />

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {results.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <Search className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-400 text-base font-semibold">No games found for &ldquo;{query}&rdquo;</p>
              <p className="text-neutral-600 text-sm mt-1">Try checking for spelling errors or search genres like "RPG" or "Action".</p>
            </div>
          ) : (
            <div className="p-3 flex flex-col gap-1.5">
              {!query && (
                <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-extrabold px-4.5 pt-2 pb-1">
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
                    className={`w-full rounded-xl flex items-center gap-5 px-5 py-3.5 transition-all duration-200 text-left group relative overflow-hidden ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#0078f2]/10 to-[#00d26a]/5 border-l-2 border-[#0078f2] pl-4.5 translate-x-0.5' 
                        : 'hover:bg-white/[0.03] border-l-2 border-transparent hover:translate-x-0.5'
                    }`}
                  >
                    {/* Cover art - slightly larger and wider */}
                    <div className={`relative w-[50px] h-[72px] rounded-lg overflow-hidden flex-shrink-0 shadow-lg transition-transform duration-300 ${isActive ? 'scale-105 ring-1 ring-white/20' : 'opacity-90'}`}>
                      <img
                        src={game.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='72' viewBox='0 0 50 72'><rect width='100%25' height='100%25' fill='%231a1a1a' rx='4'/><path d='M25 24 L25 48 M15 36 L35 36' stroke='%23333' stroke-width='4' stroke-linecap='round'/></svg>";
                        }}
                      />
                    </div>

                    {/* Title & tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className={`text-base font-bold truncate transition-colors duration-200 ${isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                          {game.title}
                        </h4>
                        {hasSurge && <Zap className="w-3.5 h-3.5 text-[#ff4444] fill-[#ff4444] flex-shrink-0 animate-pulse" />}
                      </div>
                      <p className="text-neutral-500 text-xs truncate mb-2.5">{game.tags?.slice(0, 3).join(' · ')}</p>
                      <SentimentBadge sentiment={game.buying_sentiment} />
                    </div>

                    {/* Sparkline – hidden on small screens */}
                    <div className="flex-shrink-0 hidden sm:block mx-3">
                      <MiniSparkline data={sparkData} color={hasSurge ? '#ff4444' : '#0078f2'} />
                    </div>

                    {/* Price block */}
                    <div className="text-right flex-shrink-0 min-w-[95px] mr-1">
                      <p className={`text-base font-extrabold font-mono tabular-nums leading-none ${game.buying_sentiment === 'buy' ? 'text-[#00d26a]' : 'text-white'}`}>
                        {formatPrice(bestPrice)}
                      </p>
                      <p className="text-neutral-500 text-[10px] font-semibold truncate mt-1.5">{game.best_deal?.store}</p>
                    </div>

                    {/* Arrow icon */}
                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-[#0078f2] translate-x-0.5 opacity-100' : 'opacity-0 -translate-x-1'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info panel */}
        <div className="px-6 py-3 flex items-center justify-between bg-[#16161a]/95 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4 text-neutral-500 text-[10px] font-semibold">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/5 border border-white/10 text-neutral-400 px-1.5 py-0.5 rounded text-[8px] font-mono shadow-sm">↑</kbd>
              <kbd className="bg-white/5 border border-white/10 text-neutral-400 px-1.5 py-0.5 rounded text-[8px] font-mono shadow-sm">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/5 border border-white/10 text-neutral-400 px-2 py-0.5 rounded text-[8px] font-mono shadow-sm">↵</kbd>
              open
            </span>
          </div>
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider">{results.length} result{results.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.97) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CommandPalette;
