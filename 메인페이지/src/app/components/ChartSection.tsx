import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const chartData = [
  { time: '00:00', price: 45000, volume: 120 },
  { time: '04:00', price: 46200, volume: 150 },
  { time: '08:00', price: 44800, volume: 180 },
  { time: '12:00', price: 47500, volume: 200 },
  { time: '16:00', price: 46900, volume: 165 },
  { time: '20:00', price: 48200, volume: 190 },
  { time: '24:00', price: 49100, volume: 210 },
];

export function ChartSection() {
  const currentPrice = 49100;
  const priceChange = 4100;
  const percentChange = ((priceChange / (currentPrice - priceChange)) * 100).toFixed(2);
  const isPositive = priceChange > 0;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl mb-2">CADENA/KRW</h2>
          <div className="flex items-center gap-3">
            <span className="text-3xl">₩{currentPrice.toLocaleString()}</span>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isPositive ? '+' : ''}{percentChange}%</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400 mb-1">24시간 거래량</div>
          <div className="text-xl">₩850M</div>
        </div>
      </div>

      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} key="price-chart">
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} key="stop-1"/>
                <stop offset="95%" stopColor="#EAB308" stopOpacity={0} key="stop-2"/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" key="grid" />
            <XAxis dataKey="time" stroke="#9CA3AF" key="xaxis" />
            <YAxis stroke="#9CA3AF" key="yaxis" />
            <Tooltip
              key="tooltip"
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Area type="monotone" dataKey="price" stroke="#EAB308" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} key="area" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-700">
        <div>
          <div className="text-sm text-gray-400 mb-1">고가</div>
          <div className="text-green-400">₩49,500</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">저가</div>
          <div className="text-red-400">₩44,200</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">시가</div>
          <div>₩45,000</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">변동성 지수</div>
          <div className="text-yellow-400">높음</div>
        </div>
      </div>
    </div>
  );
}
