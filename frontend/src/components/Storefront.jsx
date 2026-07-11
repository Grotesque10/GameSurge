import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameCard from './GameCard';
import { SkeletonCard, SkeletonHero, SkeletonSurgeRow } from './SkeletonCard';
import { ChevronLeft, ChevronRight, Activity, Flame, TrendingDown, Star, Percent, Tag, Search, TrendingUp, Swords, Sparkles, Cloud, LogOut, ChevronDown, Trash2 } from 'lucide-react';
import logo from '../assets/logo.png';
import { useCurrency } from '../contexts/CurrencyContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import LoginModal from './LoginModal';

const decodeHtmlEntities = (str) => {
  if (!str) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'text/html');
    return doc.documentElement.textContent || str;
  } catch (e) {
    return str.replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
};

const GameCarousel = ({ title, icon: Icon, iconColor, games, subtitle, hideTopBorder }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -600 : 600, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  if (!games || games.length === 0) return null;

  return (
    <section style={{ marginTop: hideTopBorder ? '0px' : '40px', paddingTop: hideTopBorder ? '0px' : '20px', borderTop: hideTopBorder ? 'none' : '1px solid #1e1e1e' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor || 'text-white'}`} />}
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">{title}</h2>
          </div>
          {subtitle && <p className="text-[#666] text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 mobile-hide-arrows">
          <button onClick={() => scroll('left')} disabled={!canScrollLeft}
            className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[#2a2a2a]">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => scroll('right')} disabled={!canScrollRight}
            className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center hover:bg-[#2a2a2a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[#2a2a2a]">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-4" onScroll={checkScroll}>
        {games.map(game => (
          <GameCard key={game.game_id} game={game} />
        ))}
      </div>
    </section>
  );
};

const Storefront = ({ data, loading, error, onRetry, onOpenSearch, onLoadMore, pagination }) => {
  const navigate = useNavigate();
  const { currency, setCurrency, supportedCurrencies, formatPrice } = useCurrency();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const { user, handleLogout, handleDeleteAccount } = useWatchlist();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const surgingGames = useMemo(() => data.filter(g => g.platforms?.some(p => p.surge_detected)), [data]);
  const recoveryGames = useMemo(() => data.filter(g => g.surge_recovery), [data]);
  const allGames = data;
  const [selectedTag, setSelectedTag] = useState('All');
  const [maxPrice, setMaxPrice] = useState(Infinity);
  const [sortBy, setSortBy] = useState('default');

  const filteredAndSortedGames = useMemo(() => {
    let result = [...allGames];
    if (selectedTag && selectedTag !== 'All') {
      result = result.filter(g => g.tags?.includes(selectedTag));
    }
    if (maxPrice !== Infinity) {
      result = result.filter(g => (g.best_deal?.price || 0) <= maxPrice);
    }
    if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'savings') {
      result.sort((a, b) => {
        const maxSavingsA = a.platforms?.reduce((max, p) => Math.max(max, p.savings || 0), 0) || 0;
        const maxSavingsB = b.platforms?.reduce((max, p) => Math.max(max, p.savings || 0), 0) || 0;
        return maxSavingsB - maxSavingsA;
      });
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.best_deal?.price || 0) - (b.best_deal?.price || 0));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.best_deal?.price || 0) - (a.best_deal?.price || 0));
    }
    return result;
  }, [allGames, selectedTag, sortBy, maxPrice]);
  const featuredGames = useMemo(() => allGames.slice(0, 5), [allGames]);
  const featuredGame = featuredGames[currentHeroIndex];

  // Auto-rotate hero banner
  useEffect(() => {
    if (featuredGames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredGames.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredGames.length]);

  // Epic Games Style Categorizations (memoized for performance)
  const topRated = useMemo(() => [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 15), [data]);

  const massiveDiscounts = useMemo(() => [...data].map(game => {
    const maxSavings = game.platforms?.reduce((max, p) => Math.max(max, p.savings || 0), 0) || 0;
    return { ...game, _maxSavings: maxSavings };
  }).sort((a, b) => b._maxSavings - a._maxSavings).filter(g => g._maxSavings > 0).slice(0, 15), [data]);

  const actionGames = useMemo(() => data.filter(g => g.tags?.includes('Action') || g.tags?.includes('Adventure')).slice(0, 15), [data]);
  const strategyRpgs = useMemo(() => data.filter(g => g.tags?.includes('Strategy') || g.tags?.includes('RPG')).slice(0, 15), [data]);
  const indieGames = useMemo(() => data.filter(g => g.tags?.includes('Indie')).slice(0, 15), [data]);

  /* ─── Skeleton Loading State ─── */
  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#121212' }}>
        <nav className="sticky top-0 z-50 border-b border-[#1e1e1e]" style={{ backgroundColor: 'rgba(18,18,18,0.95)' }}>
          <div className="container-main h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="GameSurge" className="w-6 h-6 object-contain rounded" />
              <span className="text-lg font-bold text-white tracking-tight">GameSurge</span>
            </div>
          </div>
        </nav>
        <div className="container-main">
          {error && (
            <div className="mt-6 rounded-lg border border-[#6b2323] bg-[#2b1616] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[#ff9b9b] text-sm text-left">{error}</p>
              <button
                onClick={onRetry}
                className="px-3 py-1.5 rounded-md border border-[#8b2f2f] text-[#ffb3b3] hover:bg-[#3a1d1d] text-xs self-start sm:self-auto"
              >
                Retry
              </button>
            </div>
          )}
          <SkeletonHero />
          <div className="flex gap-4 overflow-hidden pb-4" style={{ marginTop: '40px' }}>
            {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" style={{ marginTop: '40px' }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonSurgeRow key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#121212' }}>

      {/* ─── Navigation Bar ─── */}
      <nav className="sticky top-0 z-50 border-b border-[#1e1e1e]" style={{ backgroundColor: 'rgba(18,18,18,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="container-main h-14 flex items-center justify-between mobile-storefront-nav">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="GameSurge" className="w-6 h-6 object-contain rounded" />
            <span className="text-lg font-bold text-white tracking-tight">GameSurge</span>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs rounded px-2 py-1 outline-none hover:border-[#444] transition-colors cursor-pointer"
            >
              {supportedCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="hidden sm:flex items-center gap-6">
              <span className="text-[#f5f5f5] text-sm font-medium cursor-pointer hover:text-white transition-colors">Store</span>
              <span className="text-[#888] text-sm font-medium cursor-pointer hover:text-white transition-colors">Surge Alerts</span>
              <Link to="/watchlist" className="text-[#888] text-sm font-medium hover:text-white transition-colors" style={{ textDecoration: 'none' }}>Watchlist</Link>
            </div>

            {/* Cloud Sync Account Panel */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                >
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-7 h-7 rounded-full border border-white/10"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><rect width='100%25' height='100%25' fill='%231a1a1a'/><circle cx='14' cy='14' r='6' fill='%23444'/></svg>";
                    }}
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-[#888] hidden sm:block" />
                </button>
                {showUserDropdown && (
                  <div
                    className="absolute right-0 mt-3.5 w-60 bg-[#151515]/95 border border-white/10 rounded-xl shadow-2xl z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-1.5 duration-200"
                    style={{ padding: '8px 0', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                  >
                    {/* Upward pointer arrow */}
                    <div className="absolute -top-1 right-3.5 w-2 h-2 bg-[#151515] border-t border-l border-white/10 rotate-45" />

                    <div className="relative z-10">
                      <div
                        className="text-left"
                        style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '6px' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-extrabold truncate max-w-[150px]">{user.display_name}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00d26a] animate-pulse" title="Cloud Sync Active" />
                        </div>
                        <p className="text-[#888] text-[9px] uppercase tracking-wider mt-1 flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: user.auth_provider === 'steam' ? '#66c0f4' : '#5865F2' }}
                          />
                          {user.auth_provider} cloud
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-2.5 text-left text-xs text-[#ff4e4e] hover:bg-[#ff4e4e]/10 transition-all duration-200 font-semibold cursor-pointer group"
                        style={{ padding: '10px 20px' }}
                      >
                        <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        <span>Log Out</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to permanently delete your account and watchlist data? This action cannot be undone.")) {
                            await handleDeleteAccount();
                            setShowUserDropdown(false);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 text-left text-xs text-[#ff4444] hover:bg-[#ff4444]/10 transition-all duration-200 font-semibold cursor-pointer group"
                        style={{ padding: '10px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        <span>Delete Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 bg-[#0078f2]/10 hover:bg-[#0078f2]/20 border border-[#0078f2]/30 hover:border-[#0078f2]/50 text-[#0078f2] text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 animate-bounce" />
                <span className="hidden sm:inline">Save to Cloud</span>
              </button>
            )}

            {/* Search trigger */}
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] rounded-lg px-3 py-1.5 transition-colors group"
            >
              <Search className="w-3.5 h-3.5 text-[#555] group-hover:text-[#888]" />
              <span className="text-[#555] text-xs hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline bg-[#151515] text-[#555] text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#333]">⌘K</kbd>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Live Hot Deals Ticker ─── */}
      {!error && data.length > 0 && (
        <div className="w-full bg-[#0078f2]/10 border-b border-[#0078f2]/20 overflow-hidden relative h-10 flex items-center mobile-ticker-container">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#121212] to-transparent z-10" />
          <div className="flex whitespace-nowrap animate-ticker w-max">
            {/* Double the array for seamless looping */}
            {[...data.filter(g => g.platforms?.some(p => p.surge_detected || p.savings >= 70)).slice(0, 10),
            ...data.filter(g => g.platforms?.some(p => p.surge_detected || p.savings >= 70)).slice(0, 10)].map((game, i) => {
              const surge = game.platforms?.some(p => p.surge_detected);
              const maxSavings = game.platforms?.reduce((max, p) => Math.max(max, p.savings || 0), 0) || 0;
              return (
                <Link 
                  key={`${game.game_id}-${i}`} 
                  to={`/game/${game.game_id}`} 
                  className="inline-flex items-center transition-colors h-10 no-underline" 
                  style={{ textDecoration: 'none', color: '#e2e8f0' }}
                >
                  {/* 1. Price */}
                  <span 
                    className="text-emerald-400 text-xs font-mono font-bold" 
                    style={{ marginRight: '8px' }}
                  >
                    {formatPrice(game.best_deal?.price)}
                  </span>

                  {/* 2. Badge */}
                  {surge ? (
                    <span 
                      className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                      style={{ padding: '2px 8px', borderRadius: '4px' }}
                    >
                      <Flame className="w-3 h-3 text-[#ff4444]" /> Surge
                    </span>
                  ) : (
                    <span 
                      className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                      style={{ padding: '2px 8px', borderRadius: '4px' }}
                    >
                      {Math.round(maxSavings)}% Off
                    </span>
                  )}

                  {/* 3. Title */}
                  <span 
                    className="text-xs font-semibold hover:text-[#3b82f6] transition-colors whitespace-nowrap" 
                    style={{ color: '#e2e8f0', marginLeft: '12px' }}
                  >
                    {game.title}
                  </span>

                  {/* 4. Bullet Separator */}
                  <span 
                    className="text-[#555] text-[10px] font-bold" 
                    style={{ margin: '0 16px' }}
                  >
                    •
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#121212] to-transparent z-10" />
        </div>
      )}

      {/* ─── Page Content ─── */}
      <div className="container-main">
        {error && (
          <div className="mt-6 rounded-lg border border-[#6b2323] bg-[#2b1616] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[#ff9b9b] text-sm text-left">{error}</p>
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-md border border-[#8b2f2f] text-[#ffb3b3] hover:bg-[#3a1d1d] text-xs self-start sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══ Hero Banner ═══ */}
        {featuredGame && (
          <section
            className="relative overflow-hidden rounded-xl cursor-pointer group mt-8 sm:mt-10"
            onClick={() => navigate(`/game/${featuredGame.game_id}`)}
          >
            <div className="relative w-full overflow-hidden rounded-xl mobile-storefront-hero" style={{ aspectRatio: '16/7' }}>
              {/* Image with key for fade transition */}
              <img
                key={featuredGame.game_id}
                src={featuredGame.header_url}
                alt={featuredGame.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 animate-in fade-in duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end">
                <div style={{ paddingLeft: '32px', paddingBottom: '32px', boxSizing: 'border-box' }} className="w-full">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="bg-[#0078f2] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded shadow-md">Featured</span>
                    {featuredGame.platforms?.some(p => p.surge_detected) && (
                      <span className="bg-[#ff4444] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded flex items-center gap-1 shadow-md">
                        <Flame className="w-3 h-3" /> Price Surge Active
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 drop-shadow-xl animate-in slide-in-from-bottom-2 duration-500 fade-in leading-tight" key={`title-${featuredGame.game_id}`}>{featuredGame.title}</h2>
                  <p className="text-[#ccc] text-xs sm:text-sm max-w-xl leading-relaxed mb-0 hidden sm:block line-clamp-2 animate-in slide-in-from-bottom-2 duration-500 delay-100 fade-in" key={`summary-${featuredGame.game_id}`}>
                    {decodeHtmlEntities(featuredGame.summary)?.slice(0, 260)}...
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-5 animate-in slide-in-from-bottom-2 duration-500 delay-200 fade-in" key={`badges-${featuredGame.game_id}`}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', padding: '0 16px', lineHeight: 'normal', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(4px)', color: '#ffffff', fontWeight: '600', fontSize: '14px', boxSizing: 'border-box' }}>
                      Best: {formatPrice(featuredGame.best_deal?.price)} on {featuredGame.best_deal?.store}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', padding: '0 16px', lineHeight: 'normal', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(4px)', color: '#f5a623', fontWeight: '600', fontSize: '14px', boxSizing: 'border-box' }}>
                      ★ {featuredGame.rating}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Pagination Dots */}
              <div className="absolute bottom-5 right-6 sm:right-10 flex gap-2 mobile-hero-dots">
                {featuredGames.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentHeroIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 focus:outline-none cursor-pointer border-none ${idx === currentHeroIndex ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/70 w-2'}`}
                    title={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ Top Rated & Massive Discounts ═══ */}
        <div style={{ marginTop: '40px' }}>
          <GameCarousel
            title="Top Rated Masterpieces"
            icon={Star}
            iconColor="text-[#f5a623]"
            games={topRated}
            hideTopBorder={true}
          />
        </div>

        <GameCarousel
          title="Massive Discounts"
          icon={Percent}
          iconColor="text-[#00d26a]"
          games={massiveDiscounts}
          subtitle="Unbeatable deals available right now"
        />

        {recoveryGames.length > 0 && (
          <GameCarousel
            title="Surge Recoveries"
            icon={TrendingDown}
            iconColor="text-[#00d26a]"
            games={recoveryGames}
            subtitle="These games were surging but just dropped in price"
          />
        )}

        {/* ═══ Section: Active Price Surges ═══ */}
        {surgingGames.length > 0 && (
          <section style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #1e1e1e' }}>
            <div className="flex items-center gap-2 mb-5">
              <Flame className="w-5 h-5 text-[#ff4444]" />
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Active Price Surges</h2>
              <span className="bg-[#ff4444]/20 text-[#ff4444] text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {surgingGames.length} detected
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {surgingGames.map(game => {
                const surgePlatform = game.platforms.find(p => p.surge_detected);
                return (
                  <Link key={game.game_id} to={`/game/${game.game_id}`}
                    className="flex items-center gap-3.5 bg-[#1a1a1a] rounded-xl p-4 sm:p-5 border border-[#222] hover:border-[#ff4444]/40 hover:bg-[#1e1e1e] transition-all group"
                    style={{ textDecoration: 'none' }}>
                    <img
                      src={game.image_url}
                      alt={game.title}
                      className="w-12 h-16 sm:w-14 sm:h-[72px] object-cover rounded-lg flex-shrink-0 shadow-md border border-white/5"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='64' viewBox='0 0 48 64'><rect width='100%25' height='100%25' fill='%231a1a1a' rx='4'/><path d='M24 20 L24 44 M12 32 L36 32' stroke='%23333' stroke-width='4' stroke-linecap='round'/></svg>";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-xs sm:text-sm truncate group-hover:text-[#ff4444] transition-colors">{game.title}</h3>
                      <p className="text-[#666] text-[10px] sm:text-xs mt-0.5">{surgePlatform?.store}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[#ff4444] text-xs sm:text-sm font-bold">+{surgePlatform?.surge_index}%</span>
                        <span className="text-[#555] text-[10px]">above avg</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-sm tabular-nums">{formatPrice(surgePlatform?.current_price)}</p>
                      <p className="text-[#555] text-[10px] mt-0.5">WMA: {formatPrice(surgePlatform?.wma)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ Genre Carousels ═══ */}
        <GameCarousel
          title="Action & Adventure"
          icon={Swords}
          iconColor="text-[#ff4444]"
          games={actionGames}
        />
        <GameCarousel
          title="Deep Strategy & RPGs"
          icon={Tag}
          iconColor="text-[#0078f2]"
          games={strategyRpgs}
        />
        <GameCarousel
          title="Indie Hits"
          icon={Sparkles}
          iconColor="text-[#b944ff]"
          games={indieGames}
        />

        {/* ═══ Section: Browse All (Paginated) ═══ */}
        <section style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #1e1e1e' }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mobile-filters-row" style={{ marginBottom: '16px' }}>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-[#0078f2]" />
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Browse All</h2>
              {pagination && (
                <span className="bg-[#1e1e1e] text-[#888] text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-[#2a2a2a]">
                  {filteredAndSortedGames.length} of {allGames.length}
                </span>
              )}
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-wrap items-center gap-4 mobile-filters-wrap">
              {/* Genre Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[#666] text-[10px] font-bold uppercase tracking-wider">Genre:</span>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none hover:border-[#444] transition-colors cursor-pointer"
                >
                  <option value="All">All Genres</option>
                  <option value="Action">Action</option>
                  <option value="Adventure">Adventure</option>
                  <option value="RPG">RPG</option>
                  <option value="Strategy">Strategy</option>
                  <option value="Indie">Indie</option>
                  <option value="Casual">Casual</option>
                </select>
              </div>

              {/* Price Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[#666] text-[10px] font-bold uppercase tracking-wider">Price:</span>
                <select
                  value={maxPrice === Infinity ? 'Any' : maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value === 'Any' ? Infinity : Number(e.target.value))}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none hover:border-[#444] transition-colors cursor-pointer"
                >
                  <option value="Any">Any Price</option>
                  <option value="10">Under $10</option>
                  <option value="20">Under $20</option>
                  <option value="30">Under $30</option>
                  <option value="50">Under $50</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <span className="text-[#666] text-[10px] font-bold uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2.5 py-1.5 outline-none hover:border-[#444] transition-colors cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="rating">Rating (High to Low)</option>
                  <option value="savings">Discount % (High to Low)</option>
                  <option value="price_asc">Price (Low to High)</option>
                  <option value="price_desc">Price (High to Low)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {filteredAndSortedGames.map(game => (
              <GameCard key={`browse-${game.game_id}`} game={game} isGrid={true} />
            ))}
          </div>

          {/* Empty State */}
          {filteredAndSortedGames.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-16 bg-[#151515] rounded-xl border border-[#222] mt-4">
              <p className="text-[#666] text-sm">No games match the selected filters.</p>
              <button
                onClick={() => {
                  setSelectedTag('All');
                  setMaxPrice(Infinity);
                  setSortBy('default');
                }}
                className="mt-3 text-xs text-[#0078f2] hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Load More Button */}
          {pagination && pagination.page < pagination.total_pages && filteredAndSortedGames.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={onLoadMore}
                className="group flex items-center gap-2 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] hover:border-[#444] rounded-xl px-8 py-3 transition-all duration-200"
              >
                <span className="text-[#aaa] group-hover:text-white text-sm font-medium transition-colors">Load More Games</span>
                <span className="text-[#555] text-xs font-mono">({allGames.length}/{pagination.total})</span>
              </button>
            </div>
          )}
        </section>

        {/* Bottom spacer */}
        <div className="h-16 sm:h-24" />
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#1e1e1e]">
        <div className="container-main py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[#444] text-xs">© 2026 GameSurge. Real-time game price intelligence.</p>
          <p className="text-[#444] text-xs">Data refreshes every 30 seconds</p>
        </div>
      </footer>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};

export default Storefront;
