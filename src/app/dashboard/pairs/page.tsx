'use client';

import { useState } from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const tradingPairs = [
  {
    pair: 'BTC/USDT',
    status: 'active',
    lastPrice: 43250.00,
    change24h: 2.3,
    volume24h: '1.2M',
    trades24h: 15,
    profitLoss: 345.67,
    winRate: 68.5,
  },
  {
    pair: 'ETH/USDT',
    status: 'active',
    lastPrice: 2250.00,
    change24h: -1.2,
    volume24h: '850K',
    trades24h: 12,
    profitLoss: 123.45,
    winRate: 62.3,
  },
  {
    pair: 'SOL/USDT',
    status: 'paused',
    lastPrice: 98.50,
    change24h: 5.6,
    volume24h: '500K',
    trades24h: 8,
    profitLoss: -45.67,
    winRate: 45.8,
  },
];

export default function TradingPairsPage() {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('pair');
  const [sortOrder, setSortOrder] = useState('asc');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-100">Trading Pairs</h2>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            {['all', 'active', 'paused'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm capitalize ${
                  filter === f
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Add Pair
          </button>
        </div>
      </div>

      {/* Trading Pairs Table */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Pair</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Last Price</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">24h Change</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">24h Volume</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">24h Trades</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">P/L</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Win Rate</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tradingPairs
                .filter((pair) => filter === 'all' || pair.status === filter)
                .map((pair) => (
                  <tr key={pair.pair} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-200">{pair.pair}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pair.status === 'active'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {pair.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-200">${pair.lastPrice.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm flex items-center justify-end ${
                        pair.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {pair.change24h >= 0 ? (
                          <ArrowUpIcon className="w-4 h-4 mr-1" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 mr-1" />
                        )}
                        {Math.abs(pair.change24h)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-200">${pair.volume24h}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-200">{pair.trades24h}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm ${
                        pair.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        ${Math.abs(pair.profitLoss).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-200">{pair.winRate}%</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {pair.status === 'active' ? (
                          <button className="text-yellow-500 hover:text-yellow-400">
                            <PauseCircleIcon className="w-5 h-5" />
                          </button>
                        ) : (
                          <button className="text-green-500 hover:text-green-400">
                            <PlayCircleIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button className="text-blue-500 hover:text-blue-400">
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button className="text-red-500 hover:text-red-400">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 