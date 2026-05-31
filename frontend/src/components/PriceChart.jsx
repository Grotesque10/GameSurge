import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useCurrency } from '../contexts/CurrencyContext';

const CustomTooltip = ({ active, payload, label }) => {
  const { formatPrice } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-lg shadow-2xl">
        <p className="text-[#888] font-medium text-xs mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[#aaa] text-xs">{entry.name}:</span>
            <span className="font-mono font-bold text-white text-xs">{formatPrice(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const PriceChart = ({ game }) => {
  const { formatPrice } = useCurrency();
  const chartData = useMemo(() => {
    if (!game || !game.platforms) return [];
    const daysCount = game.platforms[0]?.historical_prices_14d?.length || 0;
    const data = [];
    for (let i = 0; i < daysCount; i++) {
      const dayData = { name: `Day ${i + 1}` };
      game.platforms.forEach(platform => {
        dayData[platform.store] = platform.historical_prices_14d[i];
      });
      data.push(dayData);
    }
    return data;
  }, [game]);

  const platformColors = {
    "Steam": "#66c0f4",
    "Epic Games": "#0078f2",
    "Xbox": "#107c10"
  };

  if (!game) return null;

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] h-[400px] flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Price History</h3>
          <p className="text-[#888] text-xs mt-1">14-day cross-platform comparison</p>
        </div>
        <div className="text-right">
          <p className="text-[#888] text-xs">Best Current Deal</p>
          <p className="text-xl font-bold text-[#00d26a]">
            {formatPrice(game.best_deal?.price)} <span className="text-xs font-normal text-[#888]">on {game.best_deal?.store}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#555"
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatPrice(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              iconType="circle"
              iconSize={8}
            />
            {game.platforms?.map((platform) => (
              <Line
                key={platform.store}
                type="monotone"
                dataKey={platform.store}
                stroke={platformColors[platform.store] || "#a855f7"}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: '#1a1a1a' }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;
