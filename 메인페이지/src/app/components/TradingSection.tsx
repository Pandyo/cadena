import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { useState } from 'react';

export function TradingSection() {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('49100');

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
      <h2 className="text-xl mb-6 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-yellow-500" />
        거래
      </h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowUpCircle className="w-4 h-4" />
            매수
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ArrowDownCircle className="w-4 h-4" />
            매도
          </div>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">주문가격 (KRW)</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500 transition-colors"
            placeholder="49100"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">주문수량 (CADENA)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500 transition-colors"
            placeholder="0.00"
          />
        </div>

        <div className="flex gap-2">
          {['25%', '50%', '75%', '100%'].map((percent) => (
            <button
              key={percent}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              {percent}
            </button>
          ))}
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">사용가능</span>
            <span>0.00 KRW</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">주문총액</span>
            <span className="text-yellow-400">0.00 KRW</span>
          </div>
        </div>

        <button
          className={`w-full py-4 rounded-lg font-medium transition-all ${
            activeTab === 'buy'
              ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
              : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
          }`}
        >
          {activeTab === 'buy' ? '매수하기' : '매도하기'}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-sm text-gray-400 mb-3">최근 거래 내역</h3>
        <div className="space-y-2">
          {[
            { time: '14:23:45', type: 'buy', price: '49,100', amount: '0.5' },
            { time: '14:20:12', type: 'sell', price: '48,950', amount: '0.3' },
            { time: '14:15:30', type: 'buy', price: '49,000', amount: '1.2' },
          ].map((trade, i) => (
            <div key={i} className="flex justify-between items-center text-sm bg-gray-800/30 rounded-lg p-3">
              <span className="text-gray-400">{trade.time}</span>
              <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                {trade.type === 'buy' ? '매수' : '매도'}
              </span>
              <span>₩{trade.price}</span>
              <span className="text-gray-400">{trade.amount} CADENA</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
