import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlist } from '../contexts/WatchlistContext';
import { API_BASE_URL } from '../config';
import { ArrowLeft, Trash2, BellRing, Target, ExternalLink, Activity, ShoppingBag } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

const Watchlist = () => {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const { formatPrice } = useCurrency();
  const [liveData, setLiveData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (watchlist.length === 0) {
      setLoading(false);
      return;
    }

    const fetchLivePrices = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/games`);
        if (res.ok) {
          const allGames = await res.json();
          const prices = {};
          watchlist.forEach(item => {
            const game = allGames.find(g => g.game_id === item.game_id);
            if (game) {
              prices[item.game_id] = game;
            }
          });
          setLiveData(prices);
        }
      } catch (err) {
        console.error("Failed to fetch live prices for watchlist:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLivePrices();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchLivePrices, 60000);
    return () => clearInterval(interval);
  }, [watchlist]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-20">
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 border-b border-[#1e1e1e] bg-[#121212]/95 backdrop-blur-xl">
        <div className="container-main h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-[#f5a623] to-[#ff4444] p-1.5 rounded-lg">
              <BellRing className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Watchlist</span>
          </div>
          <Link to="/" className="text-[#888] hover:text-white transition-colors text-sm font-medium flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
        </div>
      </nav>

      <div className="container-main pt-8">
        <h1 className="text-2xl font-bold text-white mb-2">Tracked Deals</h1>
        <p 
          className="text-[#888] text-sm"
          style={{ marginBottom: '32px' }}
        >
          Games you're watching. We'll compare live prices against your targets.
        </p>

        {watchlist.length === 0 ? (
          <div 
            className="bg-[#151515] rounded-2xl border border-[#222] flex flex-col items-center justify-center text-center"
            style={{ padding: '48px 48px 64px 48px' }}
          >
            <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-[#444]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Your watchlist is empty</h2>
            <p className="text-[#666] max-w-sm">
              Keep track of games you want to buy. Set a target price and check back here for live deals.
            </p>
            <Link 
              to="/" 
              className="text-white rounded-xl font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl hover:shadow-[#0078f2]/20 border border-white/10 hover:border-[#0078f2]/30 cursor-pointer focus:outline-none"
              style={{ 
                marginTop: '28px',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #0078f2 0%, #005cbd 100%)',
                boxShadow: '0 0 24px 3px rgba(0, 120, 242, 0.35)',
                outline: 'none'
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Store</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {watchlist.map(item => {
              const liveGame = liveData[item.game_id];
              const bestDeal = liveGame?.best_deal;
              const isTargetMet = bestDeal && bestDeal.price <= item.target_price;
              
              return (
                <div key={item.game_id} className="bg-[#151515] rounded-xl border border-[#222] overflow-hidden flex flex-col sm:flex-row group transition-all hover:border-[#333]">
                  {/* Image */}
                  <Link to={`/game/${item.game_id}`} className="w-full sm:w-36 aspect-[16/9] sm:aspect-[2/3] flex-shrink-0 relative overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='150' viewBox='0 0 100 150'><rect width='100%25' height='100%25' fill='%231a1a1a' rx='6'/><path d='M50 50 L50 100 M25 75 L75 75' stroke='%23333' stroke-width='4' stroke-linecap='round'/></svg>";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent sm:bg-gradient-to-r" />
                  </Link>

                  {/* Content */}
                  <div 
                    className="flex-1 flex flex-col justify-center min-w-0"
                    style={{ padding: '2rem' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Link to={`/game/${item.game_id}`} className="text-lg font-bold text-white hover:text-[#0078f2] transition-colors line-clamp-1">
                        {item.title}
                      </Link>
                      <button 
                        onClick={() => removeFromWatchlist(item.game_id)}
                        className="text-[#666] hover:text-[#ff4444] p-2 rounded-md hover:bg-[#222] transition-colors flex-shrink-0 ml-4"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-4">
                      {/* Target */}
                      <div>
                        <p className="text-[#666] text-[10px] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Your Target
                        </p>
                        <p className="text-[#aaa] font-mono text-lg">{formatPrice(item.target_price)}</p>
                      </div>

                      {/* Live Price */}
                      <div>
                        <p className="text-[#666] text-[10px] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Live Price
                        </p>
                        {loading ? (
                          <div className="h-7 w-20 bg-[#222] rounded animate-pulse" />
                        ) : bestDeal ? (
                          <div className="flex items-end gap-3">
                            <p className={`font-mono text-2xl leading-none font-bold ${isTargetMet ? 'text-[#00d26a]' : 'text-white'}`}>
                              {formatPrice(bestDeal.price)}
                            </p>
                            <span className="text-[#888] text-xs pb-0.5">on {bestDeal.store}</span>
                          </div>
                        ) : (
                          <p className="text-[#888] text-sm">Unavailable</p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="mt-2 sm:mt-0 sm:ml-auto w-full sm:w-auto">
                        {isTargetMet ? (
                          <a 
                            href={bestDeal.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-[#00d26a] hover:bg-[#00b35a] text-black font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                          >
                            Buy Now <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <div className="bg-[#222] text-[#888] font-semibold px-6 py-2.5 rounded-lg flex items-center justify-center cursor-not-allowed w-full sm:w-auto">
                            Waiting...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
