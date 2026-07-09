import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import {
  ArrowLeft, Star, Monitor, Cpu, HardDrive, MemoryStick,
  TrendingUp, AlertTriangle, Shield, Clock, Tag,
  Copy, Check, Gamepad2, ShoppingBag, Award, ExternalLink, BellPlus, BellRing, X,
  Cloud, LogOut, ChevronDown, Globe
} from 'lucide-react';
import BuyingSentiment from './BuyingSentiment';
import PriceAdvisor from './PriceAdvisor';
import { SkeletonGameDetails } from './SkeletonCard';
import LoginModal from './LoginModal';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useCurrency, SUPPORTED_CURRENCIES } from '../contexts/CurrencyContext';
import { API_BASE_URL } from '../config';

/* ─── Custom Chart Tooltip ─── */
const ChartTooltip = ({ active, payload, label }) => {
  const { formatPrice } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-[#333] p-3 rounded-lg shadow-2xl shadow-black/60">
        <p className="text-[#888] font-medium text-[10px] mb-1.5 uppercase tracking-wider">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[#aaa] text-xs">{entry.name}</span>
            <span className="font-mono font-bold text-white text-xs ml-auto">{formatPrice(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ─── Platform Colors (known stores + dynamic fallback) ─── */
const KNOWN_COLORS = {
  "Steam": "#66c0f4",
  "Epic Games Store": "#0078f2",
  "GOG": "#a855f7",
  "Humble Store": "#e85d3a",
  "GreenManGaming": "#4caf50",
  "Fanatical": "#ff6b00",
  "GameBillet": "#e91e63",
  "Gamesplanet": "#1e88e5",
  "2Game": "#26c6da",
  "WinGameStore": "#7e57c2",
  "IndieGala": "#ef5350",
  "DreamGame": "#42a5f5",
  "Gamesload": "#66bb6a",
};
const FALLBACK_PALETTE = ["#a855f7", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1", "#14b8a6", "#e11d48"];
const getStoreColor = (name) => {
  if (name && Object.prototype.hasOwnProperty.call(KNOWN_COLORS, name)) return KNOWN_COLORS[name];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length];
};

const GameDetails = () => {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeReqTab, setActiveReqTab] = useState('minimum');
  const [copied, setCopied] = useState(false);
  const { isWatched, addToWatchlist, removeFromWatchlist, user, handleLogout } = useWatchlist();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { formatPrice, formatPriceInCurrency, currency, setCurrency, supportedCurrencies, convertToUsd } = useCurrency();
  const currencySymbol = (currency && Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, currency))
    ? SUPPORTED_CURRENCIES[currency]?.symbol
    : '$';
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    const fetchGame = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/game/${id}`);
        const json = await res.json();
        if (json.status === 'success') setGame(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
    window.scrollTo(0, 0);
  }, [id]);

  /* ─── Chart Data (limit to top 5 cheapest stores) ─── */
  const chartPlatforms = useMemo(() => {
    if (!game?.platforms) return [];
    return [...game.platforms]
      .sort((a, b) => a.current_price - b.current_price)
      .slice(0, 5);
  }, [game]);

  const lineChartData = useMemo(() => {
    if (!chartPlatforms.length) return [];
    const days = chartPlatforms[0]?.historical_prices_14d?.length || 0;
    return Array.from({ length: days }, (_, i) => {
      const point = { name: `Day ${i + 1}` };
      chartPlatforms.forEach(p => {
        const store = p.store;
        if (store && store !== '__proto__' && store !== 'constructor' && store !== 'prototype') {
          point[store] = p.historical_prices_14d[i];
        }
      });
      return point;
    });
  }, [chartPlatforms]);

  const barChartData = useMemo(() => {
    if (!chartPlatforms.length) return [];
    return chartPlatforms.map(p => ({
      name: p.store,
      price: p.current_price,
      color: getStoreColor(p.store)
    }));
  }, [chartPlatforms]);

  /* ─── Copy Link Handler ─── */
  const handleCopyLink = () => {
    const url = `${window.location.origin}/game/${id}?source=surge_alert`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ─── Loading ─── */
  if (loading) return <SkeletonGameDetails />;

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4">
        <p className="text-[#888] text-lg">Game not found</p>
        <Link to="/" className="text-[#0078f2] hover:underline text-sm">← Back to Store</Link>
      </div>
    );
  }

  const bestDeal = game.best_deal;
  const hasSurge = game.platforms?.some(p => p.surge_detected);
  const avail = game.availability || {};

  // Find best recommendation score platform
  const bestRecPlatform = game.platforms?.reduce((best, p) =>
    (p.recommendation_score || 0) > (best?.recommendation_score || 0) ? p : best
    , game.platforms?.[0]);

  return (
    <div className="min-h-screen bg-[#0d0d0d]">

      {/* ─── Hero Section ─── */}
      <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        {/* Background Image */}
        <div className="absolute inset-0 h-[420px] sm:h-[480px] overflow-hidden">
          {game.header_url && game.header_url.trim() !== "" ? (
            <img src={game.header_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0078f2]/20 via-[#00d26a]/10 to-[#0d0d0d]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/40 via-[#0d0d0d]/70 to-[#0d0d0d]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/90 via-[#0d0d0d]/50 to-transparent" />
        </div>

        {/* Nav */}
        <nav className="relative z-20 w-full">
          <div className="container-wide min-h-14 py-3 flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 text-[#aaa] hover:text-white transition-colors text-sm font-medium group" style={{ textDecoration: 'none' }}>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Store
            </Link>
            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 transition-all text-xs font-medium text-[#aaa] hover:text-white outline-none cursor-pointer"
              >
                {supportedCurrencies?.map(c => (
                  <option key={c} value={c} className="bg-[#121212] text-white">
                    {c}
                  </option>
                ))}
              </select>

              {/* Watchlist Button */}
              {isWatched(game?.game_id) ? (
                <button
                  onClick={() => removeFromWatchlist(game.game_id)}
                  className="flex items-center gap-1.5 bg-[#f5a623]/20 hover:bg-[#f5a623]/30 backdrop-blur-sm border border-[#f5a623]/30 rounded-lg px-3 py-1.5 transition-all text-xs font-medium text-[#f5a623]"
                >
                  <BellRing className="w-3.5 h-3.5" /> Watching
                </button>
              ) : (
                <button
                  onClick={() => { setTargetPrice(bestDeal?.price?.toString() || ''); setShowWatchModal(true); }}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 transition-all text-xs font-medium text-[#aaa] hover:text-white"
                >
                  <BellPlus className="w-3.5 h-3.5" /> Watch
                </button>
              )}

              {/* Copy Link Button */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 transition-all text-xs font-medium"
                style={{ textDecoration: 'none' }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00d26a]" /> : <Copy className="w-3.5 h-3.5 text-[#aaa]" />}
                <span className={copied ? 'text-[#00d26a]' : 'text-[#aaa]'}>{copied ? 'Copied!' : 'Share Deal'}</span>
              </button>

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
                          className="w-full flex items-center gap-2.5 text-left text-xs text-[#ff4e4e] hover:bg-[#ff4e4e]/10 rounded-lg transition-all duration-200 font-semibold cursor-pointer group"
                          style={{ padding: '10px 20px' }}
                        >
                          <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          <span>Log Out</span>
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

              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-[#0078f2] to-[#00d26a] p-1.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-white">GameSurge</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container-wide pt-6 sm:pt-10 pb-8">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">

            {/* Poster */}
            <div className="flex-shrink-0 w-[180px] sm:w-[200px] lg:w-[220px] mx-auto sm:mx-0">
              <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/70 border border-white/10 ring-1 ring-white/5">
                {game.image_url && game.image_url.trim() !== "" && !imageError ? (
                  <img src={game.image_url} alt={game.title} className="w-full aspect-[2/3] object-cover" onError={() => setImageError(true)} />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gradient-to-br from-[#1e1e1e] to-[#0f0f0f] border border-[#2a2a2a] flex flex-col items-center justify-center p-6 text-center">
                    <Gamepad2 className="w-12 h-12 text-[#555] mb-3" />
                    <span className="text-white text-xs sm:text-sm font-extrabold leading-tight">{game.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title + Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left pt-0 sm:pt-4">
              {/* Tags row */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start mb-3">
                {game.tags?.map(tag => (
                  <span key={tag} className="bg-white/10 backdrop-blur-sm text-[#ccc] text-[10px] font-medium px-3 py-0.5 rounded-full border border-white/5">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">{game.title}</h1>

              <div className="flex items-center gap-3 sm:gap-4 mt-3 flex-wrap justify-center sm:justify-start text-xs sm:text-sm text-[#aaa]">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{game.developer}</span>
                <span className="text-[#333]">•</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{game.release_date}</span>
              </div>

              {/* Availability Badges */}
              {(avail.game_pass || avail.steam_deck_verified || avail.epic_exclusive) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                  {avail.game_pass && (
                    <span className="flex items-center gap-1.5 bg-[#107c10]/15 text-[#00d26a] text-[10px] font-semibold px-2.5 py-1 rounded-md border border-[#107c10]/20">
                      <Gamepad2 className="w-3.5 h-3.5" /> Game Pass
                    </span>
                  )}
                  {avail.steam_deck_verified && (
                    <span className="flex items-center gap-1.5 bg-[#66c0f4]/10 text-[#66c0f4] text-[10px] font-semibold px-2.5 py-1 rounded-md border border-[#66c0f4]/20">
                      <Monitor className="w-3.5 h-3.5" /> Deck Verified
                    </span>
                  )}
                  {avail.epic_exclusive && (
                    <span className="flex items-center gap-1.5 bg-[#0078f2]/10 text-[#0078f2] text-[10px] font-semibold px-2.5 py-1 rounded-md border border-[#0078f2]/20">
                      <ShoppingBag className="w-3.5 h-3.5" /> Epic Exclusive
                    </span>
                  )}
                </div>
              )}

              {/* Rating + Price Row */}
              <div className="flex items-center gap-4 mt-5 flex-wrap justify-center sm:justify-start">
                {/* Rating Badge */}
                <div
                  className="flex items-center gap-1.5 bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#333] rounded-xl"
                  style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                >
                  <Star className="w-4 h-4 text-[#f5a623] fill-[#f5a623]" />
                  <span className="text-white font-bold text-sm sm:text-base leading-none">{game.rating}</span>
                  <span className="text-[#666] text-[10px]">/100</span>
                </div>

                {/* Best Price Badge */}
                <div
                  className={`flex items-center gap-2 backdrop-blur-sm border rounded-xl ${hasSurge ? 'bg-[#ff4444]/10 border-[#ff4444]/30' : 'bg-[#00d26a]/10 border-[#00d26a]/30'}`}
                  style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}
                >
                  {hasSurge ? <AlertTriangle className="w-4 h-4 text-[#ff4444]" /> : <Shield className="w-4 h-4 text-[#00d26a]" />}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${hasSurge ? 'text-[#ff4444]' : 'text-[#00d26a]'}`}>
                      {hasSurge ? 'Surge Active' : 'Good Value'}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-white font-bold text-sm leading-none">{formatPrice(bestDeal?.price)}</span>
                      <span className="text-[#888] text-[10px]">on {bestDeal?.store}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div
        className="container-wide"
        style={{
          paddingTop: '64px',
          paddingBottom: '120px',
          height: 'auto',
          boxSizing: 'border-box'
        }}
      >

        {/* ─── Gauges & Advisor Row (Feature 4) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BuyingSentiment
            sentiment={game.buying_sentiment}
            bestPrice={bestDeal?.price}
            historicalLow={game.historical_low}
          />
          <PriceAdvisor game={game} bestDeal={bestDeal} />
        </div>

        {/* ─── About ─── */}
        <section
          className="bg-[#151515] rounded-2xl border border-[#222]"
          style={{
            marginTop: '64px',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          <h3 className="text-white font-bold text-base sm:text-lg mb-3">About This Game</h3>
          <p className="text-[#999] text-sm leading-relaxed">
            {game.summary && game.summary.trim() !== "" ? game.summary : "No description is currently available for this title. Real-time pricing intelligence remains fully active across all supported platforms and digital stores."}
          </p>
        </section>

        {/* ─── Editions & Related Packages ─── */}
        {game.related_variations && game.related_variations.length > 0 && (
          <section
            className="bg-[#151515] rounded-2xl border border-[#222]"
            style={{
              marginTop: '40px',
              padding: '24px',
              boxSizing: 'border-box'
            }}
          >
            <h3 className="text-white font-bold text-base sm:text-lg mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0078f2]" />
              Editions & Related Packages
            </h3>
            <p className="text-[#666] text-xs mb-6">Compare and switch to other packages, expansions, or standard editions in this franchise</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {game.related_variations.map(variation => (
                <Link
                  key={variation.game_id}
                  to={`/game/${variation.game_id}`}
                  className="flex items-center gap-4 bg-[#1e1e1e] rounded-xl p-4 border border-[#2a2a2a] hover:border-[#0078f2]/40 hover:bg-[#252525] transition-all group duration-200"
                  style={{ textDecoration: 'none' }}
                >
                  <img
                    src={variation.image_url}
                    alt={variation.title}
                    className="w-12 h-16 object-cover rounded-lg flex-shrink-0 shadow-md border border-white/5 group-hover:scale-102 transition-transform duration-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='64' viewBox='0 0 48 64'><rect width='100%25' height='100%25' fill='%231a1a1a' rx='4'/><path d='M24 20 L24 44 M12 32 L36 32' stroke='%23333' stroke-width='4' stroke-linecap='round'/></svg>";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-xs sm:text-sm truncate group-hover:text-[#0078f2] transition-colors duration-200">
                      {variation.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-[#666] uppercase tracking-wider">Best Deal:</span>
                      <span className="text-[#00d26a] font-bold text-xs sm:text-sm font-mono">
                        {variation.best_price !== null ? formatPrice(variation.best_price) : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Price History Chart + Platform Comparison ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginTop: '64px' }}>

          <section
            className="lg:col-span-2 bg-[#151515] rounded-2xl border border-[#222]"
            style={{
              padding: '24px',
              boxSizing: 'border-box'
            }}
          >
            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              style={{
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
            >
              <div>
                <h3 className="text-white font-bold text-base sm:text-lg">14-Day Price History</h3>
                <p className="text-[#666] text-xs mt-0.5">Cross-platform pricing comparison</p>
              </div>
              <div className="text-right">
                <p className="text-[#666] text-[10px] uppercase tracking-wider">Best Current Deal</p>
                <p className="text-[#00d26a] font-bold text-xl">{formatPrice(bestDeal?.price)}</p>
              </div>
            </div>
            <div className="h-[260px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#444" tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#444" tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={v => formatPrice(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                  {chartPlatforms.map(p => (
                    <Line key={p.store} type="monotone" dataKey={p.store} stroke={getStoreColor(p.store)} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: '#151515' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            className="bg-[#151515] rounded-2xl border border-[#222]"
            style={{
              padding: '24px',
              boxSizing: 'border-box'
            }}
          >
            <h3 className="text-white font-bold text-base sm:text-lg mb-1">Current Prices</h3>
            <p className="text-[#666] text-xs" style={{ marginBottom: '16px' }}>Grouped comparison</p>
            <div className="h-[200px] sm:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#444" tick={{ fill: '#888', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#444" tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={v => formatPrice(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {barChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Price list below bar chart */}
            <div className="mt-5 space-y-3 border-t border-[#222] pt-5">
              {chartPlatforms.map(p => (
                <div key={p.store} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStoreColor(p.store) }} />
                    <span className="text-[#ccc] text-xs font-medium">{p.store}</span>
                  </div>
                  <span className="text-white text-sm font-bold font-mono">{formatPrice(p.current_price)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ─── Platform Analytics Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6" style={{ marginTop: '64px' }}>
          {chartPlatforms.map(p => (
            <div
              key={p.store}
              className="rounded-2xl border border-[#222] relative overflow-hidden"
              style={{
                padding: '20px',
                boxSizing: 'border-box',
                background: `linear-gradient(135deg, ${getStoreColor(p.store)}15, ${getStoreColor(p.store)}05)`
              }}
            >
              {/* Decorative circle */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: getStoreColor(p.store) }} />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStoreColor(p.store) }} />
                  <h4 className="text-white font-bold text-sm">{p.store}</h4>
                  {p.surge_detected && (
                    <span className="bg-[#ff4444]/20 text-[#ff4444] text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto">SURGE</span>
                  )}
                  {bestRecPlatform?.store === p.store && (
                    <span className="bg-[#f5a623]/15 text-[#f5a623] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ml-auto">
                      <Award className="w-2.5 h-2.5" /> TOP
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-[#666] text-[10px] uppercase tracking-wider mb-0.5">Price</p>
                    <p className="text-white font-bold text-lg font-mono">{formatPrice(p.current_price)}</p>
                  </div>
                  <div>
                    <p className="text-[#666] text-[10px] uppercase tracking-wider mb-0.5">Surge</p>
                    <p className={`font-bold text-lg ${p.surge_detected ? 'text-[#ff4444]' : p.surge_index < 0 ? 'text-[#00d26a]' : 'text-[#888]'}`}>
                      {p.surge_index > 0 ? '+' : ''}{p.surge_index}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[#666] text-[10px] uppercase tracking-wider mb-0.5">14d WMA</p>
                    <p className="text-[#aaa] text-sm font-mono">{formatPrice(p.wma)}</p>
                  </div>
                  <div>
                    <p className="text-[#666] text-[10px] uppercase tracking-wider mb-0.5">Volatility</p>
                    <p className="text-[#aaa] text-sm font-mono">{p.stability_std_dev}</p>
                  </div>
                  <div className="col-span-2 pt-0.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#666] text-[10px] uppercase tracking-wider font-semibold">Value Score</span>
                      <span className="text-[#aaa] text-[10px] font-bold font-mono">{p.value_score}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(p.value_score, 100)}%`,
                          backgroundColor: p.value_score >= 80 ? '#00d26a' : p.value_score >= 50 ? '#f5a623' : '#ff4444'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Deal Comparison Table ─── */}
        <section
          className="bg-[#151515] rounded-2xl border border-[#222]"
          style={{
            marginTop: '64px',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          <h3 className="text-white font-bold text-base sm:text-lg mb-1">Deal Comparison</h3>
          <p className="text-[#666] text-xs mb-5">Total cost of ownership across platforms</p>
          <div className="overflow-x-auto">
            <table className="min-w-[550px] w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: '0 6px' }}>
              <thead>
                <tr>
                  <th className="text-[#666] text-[10px] uppercase tracking-wider font-semibold pb-3 pl-4 pr-3">Store</th>
                  <th className="text-[#666] text-[10px] uppercase tracking-wider font-semibold pb-3 px-3">Current Price</th>
                  <th className="text-[#666] text-[10px] uppercase tracking-wider font-semibold pb-3 px-3">Historical Low</th>
                  <th className="text-[#666] text-[10px] uppercase tracking-wider font-semibold pb-3 px-3">Savings</th>
                  <th className="text-[#666] text-[10px] uppercase tracking-wider font-semibold pb-3 pl-3 pr-4">Buy</th>
                </tr>
              </thead>
              <tbody>
                {game.platforms?.map(p => (
                  <tr key={p.store} className="bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-colors">
                    <td className="py-4 pl-5 rounded-l-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStoreColor(p.store) }} />
                        <span className="text-white text-sm font-semibold">{p.store}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-bold text-sm font-mono">{formatPrice(p.current_price)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#aaa] text-sm font-mono">{p.historical_low ? formatPrice(p.historical_low) : '—'}</span>
                    </td>
                    <td className="py-4 px-4">
                      {p.savings > 0 ? (
                        <span className="text-[#00d26a] text-xs font-bold">-{Math.round(p.savings)}%</span>
                      ) : (
                        <span className="text-[#888] text-xs">Full Price</span>
                      )}
                    </td>
                    <td className="py-4 pl-4 pr-5 rounded-r-lg">
                      {p.deal_url ? (
                        <a href={p.deal_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0078f2] text-xs font-medium hover:underline">
                          <ExternalLink className="w-3 h-3" /> Buy
                        </a>
                      ) : (
                        <span className="text-[#888] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── Global Regional Pricing Estimates (Feature 5) ─── */}
        <section
          className="bg-[#151515] rounded-2xl border border-[#222]"
          style={{
            marginTop: '40px',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          <h3 className="text-white font-bold text-base sm:text-lg mb-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#00d26a]" />
            Global Regional Pricing Estimates
          </h3>
          <p className="text-[#888] text-xs" style={{ marginBottom: '16px' }}>Real-time converted pricing estimates across major global currencies based on current exchange rates</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            {Object.entries(SUPPORTED_CURRENCIES).map(([code, config]) => {
              const isCurrent = currency === code;
              return (
                <div
                  key={code}
                  className="rounded-xl border transition-all"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    paddingBottom: '16px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    height: '125px',
                    boxSizing: 'border-box',
                    backgroundColor: isCurrent ? 'rgba(0, 120, 242, 0.08)' : '#1a1a1a',
                    borderColor: isCurrent ? '#0078f2' : '#222',
                    boxShadow: isCurrent ? '0 0 12px rgba(0, 120, 242, 0.15)' : 'none',
                    borderWidth: isCurrent ? '1.5px' : '1px'
                  }}
                >
                  <div className="min-w-0">
                    <span className="text-[#888] text-[10px] font-bold uppercase tracking-wider block truncate">
                      {config.label}
                    </span>
                    <span className="text-white font-extrabold text-base sm:text-lg font-mono block mt-2.5 leading-none">
                      {formatPriceInCurrency(bestDeal?.price, code)}
                    </span>
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider block ${isCurrent ? 'text-[#0078f2] opacity-80' : 'text-[#888]/40'
                    }`}>
                    {code}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── System Requirements ─── */}
        {game.system_requirements && (
          <section
            className="bg-[#151515] rounded-2xl border border-[#222]"
            style={{
              marginTop: '64px',
              padding: '24px 24px 32px 24px',
              marginBottom: '80px',
              boxSizing: 'border-box',
              overflow: 'visible'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '20px',
                marginBottom: '16px'
              }}
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-[#0078f2]" />
                <h3 className="text-white font-bold text-base sm:text-lg">System Requirements</h3>
              </div>
              {/* Tab pills */}
              <div
                className="bg-[#1a1a1a] rounded-xl border border-[#222]"
                style={{
                  display: 'flex',
                  position: 'relative',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {['minimum', 'recommended'].map(tier => {
                  const isActive = activeReqTab === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => setActiveReqTab(tier)}
                      className="text-xs font-bold capitalize transition-all focus:outline-none"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        backgroundColor: isActive ? '#0078f2' : 'transparent',
                        color: isActive ? '#fff' : '#888',
                        boxShadow: isActive ? '0 2px 8px rgba(0, 120, 242, 0.25)' : 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {tier}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ maxWidth: '900px', boxSizing: 'border-box' }}>
              {Object.entries(
                (game.system_requirements && activeReqTab && Object.prototype.hasOwnProperty.call(game.system_requirements, activeReqTab))
                  ? game.system_requirements[activeReqTab]
                  : {}
              ).map(([key, value]) => {
                const icons = { os: Monitor, processor: Cpu, memory: MemoryStick, graphics: Monitor, storage: HardDrive };
                const Icon = icons[key] || Monitor;
                return (
                  <div
                    key={key}
                    className="bg-[#1a1a1a] rounded-xl border border-[#222] text-center"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '16px',
                      boxSizing: 'border-box',
                      height: 'auto'
                    }}
                  >
                    <div className="w-10 h-10 bg-[#222] rounded-lg flex items-center justify-center mb-2.5">
                      <Icon className="w-5 h-5 text-[#666]" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {key}
                    </span>
                    <span className="text-white text-xs font-medium leading-relaxed block">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ─── Watchlist Modal ─── */}
      {showWatchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-[#151515] border border-[#333] rounded-3xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200"
            style={{ padding: '2.5rem' }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-bold text-white pr-4">Add to Watchlist</h3>
              <button
                onClick={() => setShowWatchModal(false)}
                className="p-2 rounded-full text-[#888] hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-[#888] text-base mb-8 pr-2">Get notified when <strong className="text-[#ccc]">{game.title}</strong> hits your target price.</p>
            <label className="block text-xs font-bold text-[#aaa] uppercase tracking-wider mb-2">Target Price ({currencySymbol})</label>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-2xl text-[#0078f2] font-bold font-mono">{currencySymbol}</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={targetPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                    setTargetPrice(val);
                  }
                }}
                placeholder="0.00"
                className="w-full bg-[#1c1c1c] border border-[#2d2d2d] rounded-xl py-3.5 pr-4 text-2xl text-white font-mono focus:outline-none focus:border-[#0078f2] focus:ring-4 focus:ring-[#0078f2]/10 transition-all duration-200"
                style={{ paddingLeft: '2.75rem', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={() => {
                const val = parseFloat(targetPrice);
                if (!isNaN(val) && val > 0) {
                  const valUsd = convertToUsd(val);
                  addToWatchlist(game, valUsd);
                  setShowWatchModal(false);
                }
              }}
              className="w-full bg-[#0078f2] hover:bg-[#0066cc] text-white font-bold py-3 rounded-lg transition-colors text-lg focus:outline-none"
              style={{ marginTop: '24px' }}
            >
              Start Watching
            </button>
          </div>
        </div>
      )}

      {/* ─── Sticky Buy Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d0d0d]/85 backdrop-blur-md border-t border-[#222] z-40 animate-in slide-in-from-bottom-full duration-500 delay-300">
        <div className="container-wide h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={game.image_url}
              alt=""
              className="w-8 h-12 sm:w-10 sm:h-14 object-cover rounded shadow-lg hidden sm:block"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='56' viewBox='0 0 40 56'><rect width='100%25' height='100%25' fill='%231a1a1a' rx='4'/><path d='M20 18 L20 38 M12 28 L28 28' stroke='%23333' stroke-width='4' stroke-linecap='round'/></svg>";
              }}
            />
            <div>
              <p className="text-white font-bold text-sm sm:text-base leading-tight line-clamp-1">{game.title}</p>
              <p className="text-[#888] text-[10px] sm:text-xs">Best price on <span className="text-[#aaa] font-medium">{bestDeal?.store}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              {bestDeal?.savings > 0 && <p className="text-[#00d26a] text-[10px] uppercase font-bold tracking-wider mb-0.5">Save {Math.round(bestDeal.savings)}%</p>}
              <p className="text-white font-bold text-lg font-mono leading-none">{formatPrice(bestDeal?.price)}</p>
            </div>
            <a
              href={bestDeal?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0078f2] hover:bg-[#0066cc] text-white text-sm font-bold rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg shadow-[#0078f2]/25 hover:scale-[1.02] active:scale-[0.98]"
              style={{ textDecoration: 'none', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
            >
              Buy Now <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};

export default GameDetails;
