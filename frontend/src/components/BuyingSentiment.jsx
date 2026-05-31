import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

const SENTIMENT_CONFIG = {
  buy: {
    label: 'Great Time to Buy',
    description: 'Price is at or near its all-time low',
    color: '#00d26a',
    bgColor: 'rgba(0, 210, 106, 0.08)',
    borderColor: 'rgba(0, 210, 106, 0.25)',
    Icon: ShieldCheck,
    glowColor: '0 0 24px rgba(0, 210, 106, 0.15)',
    rotation: 180
  },
  wait: {
    label: 'Consider Waiting',
    description: 'A sale is likely coming soon',
    color: '#f5a623',
    bgColor: 'rgba(245, 166, 35, 0.08)',
    borderColor: 'rgba(245, 166, 35, 0.25)',
    Icon: Clock,
    glowColor: '0 0 24px rgba(245, 166, 35, 0.15)',
    rotation: 90
  },
  avoid: {
    label: 'Avoid Buying Now',
    description: 'Surge active — price is inflated',
    color: '#ff4444',
    bgColor: 'rgba(255, 68, 68, 0.08)',
    borderColor: 'rgba(255, 68, 68, 0.25)',
    Icon: AlertTriangle,
    glowColor: '0 0 24px rgba(255, 68, 68, 0.15)',
    rotation: 0
  }
};

const BuyingSentiment = ({ sentiment = 'wait', bestPrice, historicalLow }) => {
  const { formatPrice } = useCurrency();
  if (!sentiment) return null;
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.wait;
  const { label, description, color, bgColor, borderColor, Icon, glowColor } = config;

  // Gauge percentage: buy=100, wait=55, avoid=15
  const gaugePercent = sentiment === 'buy' ? 92 : sentiment === 'wait' ? 55 : 15;

  return (
    <div
      className="rounded-2xl p-5 border relative overflow-hidden"
      style={{ backgroundColor: bgColor, borderColor, boxShadow: glowColor }}
    >
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: color }} />

      <div className="relative z-10 flex items-center gap-5">
        {/* Gauge Arc */}
        <div className="flex-shrink-0 relative" style={{ width: 80, height: 80 }}>
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            {/* Background arc */}
            <circle cx="40" cy="40" r="32" fill="none" stroke="#222" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${Math.PI * 64 * 0.75} ${Math.PI * 64 * 0.25}`}
            />
            {/* Filled arc */}
            <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${Math.PI * 64 * 0.75 * (gaugePercent / 100)} ${Math.PI * 64}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color }}>
            Buying Sentiment
          </p>
          <h4 className="text-white font-bold text-base sm:text-lg leading-tight">{label}</h4>
          <p className="text-[#888] text-xs mt-1">{description}</p>
          {historicalLow && (
            <p className="text-[#555] text-[10px] mt-2 font-mono flex flex-wrap gap-x-4 gap-y-1 items-center">
              <span>
                Historical Low: <span className="text-[#aaa]">{formatPrice(historicalLow)}</span>
              </span>
              {bestPrice && (
                <span className="flex items-center gap-2">
                  <span className="text-[#333] hidden sm:inline">•</span>
                  <span>
                    Current Best: <span style={{ color }}>{formatPrice(bestPrice)}</span>
                  </span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyingSentiment;
