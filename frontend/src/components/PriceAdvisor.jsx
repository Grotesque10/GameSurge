import { TrendingDown, TrendingUp, Sparkles, ShieldCheck, Clock, AlertTriangle, Info } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

const PriceAdvisor = ({ game, bestDeal }) => {
  const { formatPrice } = useCurrency();

  if (!game) return null;

  const bestPrice = bestDeal?.price || 0;
  const listPrice = game.platforms?.reduce((max, p) => Math.max(max, p.current_price), 0) || bestPrice;
  const hasSurge = game.platforms?.some(p => p.surge_detected);
  const historicalLow = game.historical_low || 0;

  // Calculate Savings %
  const savingsPercent = listPrice > bestPrice 
    ? Math.round(((listPrice - bestPrice) / listPrice) * 100)
    : 0;

  // Compute a dynamic Recommendation Buy Score (0 - 100)
  let buyScore = 50;

  // Factor 1: Current Savings
  if (savingsPercent > 0) {
    buyScore += Math.min(savingsPercent * 0.5, 25);
  }

  // Factor 2: Proximity to Historical Low
  if (historicalLow > 0) {
    if (bestPrice <= historicalLow) {
      buyScore += 30; // Best deal ever!
    } else {
      const diffPercent = ((bestPrice - historicalLow) / historicalLow) * 100;
      if (diffPercent < 5) buyScore += 20;
      else if (diffPercent < 15) buyScore += 10;
      else if (diffPercent > 35) buyScore -= 20;
    }
  }

  // Factor 3: Active Surge Penalty
  if (hasSurge) {
    buyScore -= 40;
  }

  // Clamp Buy Score between 5 and 100
  buyScore = Math.max(5, Math.min(100, Math.round(buyScore)));

  // Determine configuration based on score
  let config = {
    label: 'Hold / Wait',
    description: 'We recommend waiting for a price drop or stabilization.',
    color: '#ff4444',
    bgColor: 'rgba(255, 68, 68, 0.08)',
    borderColor: 'rgba(255, 68, 68, 0.25)',
    Icon: AlertTriangle,
    analysis: 'Price is currently inflated above the 14-day historical moving average or experiencing an active surge. Better discounts are highly likely to return soon.'
  };

  if (buyScore >= 80) {
    config = {
      label: 'Strong Buy',
      description: 'Excellent pricing value. The best time to purchase.',
      color: '#00d26a',
      bgColor: 'rgba(0, 210, 106, 0.08)',
      borderColor: 'rgba(0, 210, 106, 0.25)',
      Icon: ShieldCheck,
      analysis: 'This game is currently priced at or extremely close to its all-time historical low. Buy now before the deal expires or prices surge.'
    };
  } else if (buyScore >= 45) {
    config = {
      label: 'Fair Buy',
      description: 'Decent discount active, but not the lowest recorded.',
      color: '#f5a623',
      bgColor: 'rgba(245, 166, 35, 0.08)',
      borderColor: 'rgba(245, 166, 35, 0.25)',
      Icon: Clock,
      analysis: 'A standard sale discount is running. While it represents fair value, historical data indicates a deeper discount may occur in upcoming seasonal sales.'
    };
  }

  return (
    <div
      className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
      style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
    >
      {/* Glow effect */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: config.color }} />

      <div className="relative z-10 flex items-start gap-4">
        {/* Score Ring */}
        <div className="flex-shrink-0 relative" style={{ width: 80, height: 80 }}>
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#222" strokeWidth="6" />
            <circle cx="40" cy="40" r="32" fill="none" stroke={config.color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32 * (buyScore / 100)} ${2 * Math.PI * 32}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white text-base font-extrabold leading-none">{buyScore}%</span>
            <span className="text-[8px] text-[#666] uppercase mt-0.5 font-bold">Buy Score</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: config.color }}>
            AI Purchase Advisor
          </p>
          <h4 className="text-white font-bold text-base sm:text-lg leading-tight flex items-center gap-1.5">
            {config.label}
            {buyScore >= 80 && <Sparkles className="w-4 h-4 text-[#00d26a] animate-pulse" />}
          </h4>
          <p className="text-[#888] text-xs mt-1 leading-snug">{config.description}</p>
        </div>
      </div>

      <div className="relative z-10 mt-4 pt-3 border-t border-white/5 flex gap-2">
        <Info className="w-4 h-4 text-[#666] flex-shrink-0 mt-0.5" />
        <p className="text-[#666] text-[11px] leading-relaxed">{config.analysis}</p>
      </div>
    </div>
  );
};

export default PriceAdvisor;
