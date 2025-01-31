'use client';

import { useState } from 'react';
import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const performanceMetrics = [
  {
    name: 'Total Profit/Loss',
    value: '+$2,345.67',
    change: '+15.3%',
    trend: 'up',
    icon: CurrencyDollarIcon,
  },
  {
    name: 'Win Rate',
    value: '67.8%',
    change: '+2.4%',
    trend: 'up',
    icon: ArrowTrendingUpIcon,
  },
  {
    name: 'Average Trade Duration',
    value: '45m',
    change: '-5m',
    trend: 'down',
    icon: ClockIcon,
  },
  {
    name: 'Total Trades',
    value: '234',
    change: '+12',
    trend: 'up',
    icon: ArrowTrendingDownIcon,
  },
];

const tradeHistory = [
  {
    date: '2024-03-15',
    pair: 'BTC/USDT',
    type: 'LONG',
    entryPrice: 43250.00,
    exitPrice: 43500.00,
    profit: 250.00,
    duration: '35m',
  },
  {
    date: '2024-03-15',
    pair: 'ETH/USDT',
    type: 'SHORT',
    entryPrice: 2300.00,
    exitPrice: 2250.00,
    profit: 50.00,
    duration: '45m',
  },
  // Add more trade history entries...
];

export default function AnalysisPage() {
  const [timeframe, setTimeframe] = useState('24h');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-100">Trading Analysis</h2>
        <div className="flex items-center space-x-2">
          {['24h', '7d', '30d', 'all'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-sm uppercase ${
                timeframe === tf
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric) => (
          <div
            key={metric.name}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-gray-800 rounded-lg">
                <metric.icon className="w-6 h-6 text-blue-500" />
              </div>
              <span className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
              }`}>
                {metric.change}
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-400">{metric.name}</h3>
              <p className="mt-2 text-2xl font-semibold text-gray-100">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Profit/Loss Over Time</h3>
          <div className="h-80 flex items-center justify-center text-gray-400">
            [Chart Component Placeholder]
          </div>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-medium text-gray-100 mb-4">Win Rate Distribution</h3>
          <div className="h-80 flex items-center justify-center text-gray-400">
            [Chart Component Placeholder]
          </div>
        </div>
      </div>

      {/* Trade History Table */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-medium text-gray-100">Recent Trades</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Pair</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Type</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Entry Price</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Exit Price</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Profit/Loss</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tradeHistory.map((trade, index) => (
                <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-200">{trade.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-200">{trade.pair}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.type === 'LONG'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm text-gray-200">${trade.entryPrice.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm text-gray-200">${trade.exitPrice.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`text-sm ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${Math.abs(trade.profit).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm text-gray-200">{trade.duration}</div>
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