import { useState, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Gamepad2, Monitor, ShoppingBag, Star, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

const GameCard = ({ game, isGrid = false }) => {
  const { formatPrice } = useCurrency();
  const bestPrice = game.best_deal?.price;
  const hasSurge = game.platforms?.some(p => p.surge_detected);
  const avail = game.availability || {};

  const highestPrice = game.platforms?.reduce((max, p) => Math.max(max, p.current_price), 0) || bestPrice;
  const discountPercent = highestPrice > bestPrice
    ? Math.round(((highestPrice - bestPrice) / highestPrice) * 100)
    : 0;

  // Value dot color based on buying sentiment
  const sentiment = game.buying_sentiment;
  const dotColor = sentiment === 'buy' ? '#00d26a' : sentiment === 'avoid' ? '#ff4444' : '#f5a623';
  const sentimentLabel = sentiment === 'buy' ? 'Great Deal' : sentiment === 'avoid' ? 'Overpriced' : 'Fair Price';

  // Price trend from history
  const history = game.platforms?.[0]?.historical_prices_14d || [];
  const priceTrend = history.length >= 2 ? (history[history.length - 1] - history[history.length - 2]) : 0;

  // Store count
  const storeCount = game.platforms?.length || 0;

  // 3D Tilt Effect State
  const [tiltStyle, setTiltStyle] = useState({});
  const cardRef = useRef(null);
  const [imageError, setImageError] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Max tilt is 12 degrees
    const rotateX = ((y - centerY) / centerY) * -12; 
    const rotateY = ((x - centerX) / centerX) * 12;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease-out',
      zIndex: 10
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s ease-out',
      zIndex: 1
    });
  };

  return (
    <Link
      to={`/game/${game.game_id}`}
      className={`group block cursor-pointer h-full ${isGrid ? 'w-full' : 'flex-shrink-0'}`}
      style={isGrid ? {} : { width: 'clamp(130px, 16vw, 185px)' }}
    >
      {/* Image */}
      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden rounded-lg aspect-[2/3] bg-[#1a1a1a]"
        style={tiltStyle}
      >
        {game.image_url && game.image_url.trim() !== "" && !imageError ? (
          <img
            src={game.image_url}
            alt={game.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e1e1e] to-[#0f0f0f] border border-[#2a2a2a] flex flex-col items-center justify-center p-4 text-center group-hover:scale-[1.02] transition-transform duration-300">
            <Gamepad2 className="w-8 h-8 text-[#555] mb-2 group-hover:text-[#0078f2] transition-colors" />
            <span className="text-white text-[10px] sm:text-xs font-bold leading-tight line-clamp-3">{game.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {hasSurge && (
          <div className="absolute top-1.5 left-1.5 bg-[#ff4444] text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 animate-pulse">
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
            <span>Surge</span>
          </div>
        )}

        {discountPercent > 0 && (
          <div className="absolute top-1.5 right-1.5 bg-[#00d26a]/90 backdrop-blur-sm text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
            -{discountPercent}%
          </div>
        )}

        {/* Availability badges — bottom-right of poster */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {avail.game_pass && (
            <div className="w-5 h-5 bg-black/70 backdrop-blur-sm rounded flex items-center justify-center" title="Game Pass">
              <Gamepad2 className="w-3 h-3 text-[#00d26a]" />
            </div>
          )}
          {avail.steam_deck_verified && (
            <div className="w-5 h-5 bg-black/70 backdrop-blur-sm rounded flex items-center justify-center" title="Steam Deck Verified">
              <Monitor className="w-3 h-3 text-[#66c0f4]" />
            </div>
          )}
          {avail.epic_exclusive && (
            <div className="w-5 h-5 bg-black/70 backdrop-blur-sm rounded flex items-center justify-center" title="Epic Exclusive">
              <ShoppingBag className="w-3 h-3 text-[#0078f2]" />
            </div>
          )}
        </div>

        {/* ── Hover Reveal Panel ── */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <div className="bg-gradient-to-t from-black/95 via-black/85 to-transparent px-3 pt-8 pb-3">
            {/* Price + Store */}
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-white font-bold text-base sm:text-lg font-mono leading-none">{formatPrice(bestPrice)}</p>
                <p className="text-[#888] text-[10px] mt-0.5">{game.best_deal?.store}</p>
              </div>
              <div className="flex items-center gap-1">
                {priceTrend < 0 && <TrendingDown className="w-3 h-3 text-[#00d26a]" />}
                {priceTrend > 0 && <TrendingUp className="w-3 h-3 text-[#ff4444]" />}
                {storeCount > 1 && (
                  <span className="text-[#666] text-[9px] bg-white/10 px-1.5 py-0.5 rounded">{storeCount} stores</span>
                )}
              </div>
            </div>
            {/* Rating + CTA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-[#f5a623] fill-[#f5a623]" />
                <span className="text-[#ccc] text-[10px] font-medium">{game.rating}/100</span>
              </div>
              <span className="flex items-center gap-1 text-[#0078f2] text-[10px] font-semibold">
                View Deal <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="mt-4 px-0.5 min-h-[44px]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <p className="text-[#666] text-[10px] font-medium uppercase tracking-wide">{sentimentLabel}</p>
        </div>
        <h3 className="text-[#ddd] text-xs sm:text-sm font-semibold mt-0.5 leading-tight group-hover:text-white transition-colors line-clamp-2 min-h-[2.3em]">
          {game.title}
        </h3>
      </div>
    </Link>
  );
};

export default memo(GameCard);
