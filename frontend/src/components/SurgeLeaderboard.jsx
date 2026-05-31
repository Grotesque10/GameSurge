import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

const SurgeLeaderboard = ({ data }) => {
  const { formatPrice } = useCurrency();
  // Sort games by surge index descending
  const sortedGames = [...data].sort((a, b) => {
    const surgeA = Math.max(...a.platforms.map(p => p.surge_index || 0));
    const surgeB = Math.max(...b.platforms.map(p => p.surge_index || 0));
    return surgeB - surgeA;
  }).slice(0, 5); // Top 5

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <Activity className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">Surge Leaderboard</h2>
      </div>
      
      <div className="space-y-4">
        {sortedGames.map((game, idx) => {
          // Find the platform with the highest surge for this game
          const maxSurgePlatform = game.platforms.reduce((max, p) => 
            (p.surge_index > max.surge_index ? p : max), game.platforms[0]);
            
          const isSurging = maxSurgePlatform.surge_detected;
          
          return (
            <div key={game.game_id} className="group relative overflow-hidden bg-slate-900/50 rounded-lg p-4 hover:bg-slate-700/50 transition-all duration-300 border border-slate-700/50 hover:border-slate-500">
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-700 text-slate-300'}`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200">{game.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{maxSurgePlatform.store} • Volatility: {maxSurgePlatform.stability_std_dev}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-mono font-bold text-lg text-slate-200">
                    {formatPrice(maxSurgePlatform.current_price)}
                  </div>
                  <div className={`flex items-center justify-end gap-1 text-sm font-medium mt-1 ${isSurging ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isSurging ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(maxSurgePlatform.surge_index).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {/* Decorative background gradient */}
              {isSurging && (
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SurgeLeaderboard;
