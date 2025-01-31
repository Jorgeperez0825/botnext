'use client';

import { useState } from 'react';
import { 
  CogIcon,
  BanknotesIcon,
  ChartBarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const defaultSettings = {
  general: {
    tradingInterval: '60',
    maxConcurrentTrades: '5',
    defaultInvestmentAmount: '1000',
  },
  riskManagement: {
    stopLossPercentage: '2',
    takeProfitPercentage: '3',
    maxDailyLoss: '5000',
    maxPositionSize: '10000',
  },
  analysis: {
    minimumVolume: '100000',
    minimumPriceChange: '0.5',
    trendConfirmationPeriod: '12',
  },
  notifications: {
    emailNotifications: true,
    tradeAlerts: true,
    dailySummary: true,
    profitAlerts: true,
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState('general');

  const handleInputChange = (category: string, field: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí implementaremos la lógica para guardar la configuración
    console.log('Settings saved:', settings);
  };

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'riskManagement', name: 'Risk Management', icon: ShieldCheckIcon },
    { id: 'analysis', name: 'Analysis', icon: ChartBarIcon },
    { id: 'notifications', name: 'Notifications', icon: BanknotesIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Bot Settings</h2>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Save Changes
        </button>
      </div>

      {/* Settings Navigation */}
      <div className="border-b border-gray-800">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Forms */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
        {/* General Settings */}
        <div className={activeTab === 'general' ? 'space-y-6' : 'hidden'}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Trading Interval (minutes)
              </label>
              <input
                type="number"
                value={settings.general.tradingInterval}
                onChange={(e) => handleInputChange('general', 'tradingInterval', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Maximum Concurrent Trades
              </label>
              <input
                type="number"
                value={settings.general.maxConcurrentTrades}
                onChange={(e) => handleInputChange('general', 'maxConcurrentTrades', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Default Investment Amount (USDT)
              </label>
              <input
                type="number"
                value={settings.general.defaultInvestmentAmount}
                onChange={(e) => handleInputChange('general', 'defaultInvestmentAmount', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Risk Management Settings */}
        <div className={activeTab === 'riskManagement' ? 'space-y-6' : 'hidden'}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Stop Loss Percentage
              </label>
              <input
                type="number"
                value={settings.riskManagement.stopLossPercentage}
                onChange={(e) => handleInputChange('riskManagement', 'stopLossPercentage', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Take Profit Percentage
              </label>
              <input
                type="number"
                value={settings.riskManagement.takeProfitPercentage}
                onChange={(e) => handleInputChange('riskManagement', 'takeProfitPercentage', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Maximum Daily Loss (USDT)
              </label>
              <input
                type="number"
                value={settings.riskManagement.maxDailyLoss}
                onChange={(e) => handleInputChange('riskManagement', 'maxDailyLoss', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Maximum Position Size (USDT)
              </label>
              <input
                type="number"
                value={settings.riskManagement.maxPositionSize}
                onChange={(e) => handleInputChange('riskManagement', 'maxPositionSize', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Analysis Settings */}
        <div className={activeTab === 'analysis' ? 'space-y-6' : 'hidden'}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Minimum Volume (USDT)
              </label>
              <input
                type="number"
                value={settings.analysis.minimumVolume}
                onChange={(e) => handleInputChange('analysis', 'minimumVolume', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Minimum Price Change (%)
              </label>
              <input
                type="number"
                value={settings.analysis.minimumPriceChange}
                onChange={(e) => handleInputChange('analysis', 'minimumPriceChange', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">
                Trend Confirmation Period (hours)
              </label>
              <input
                type="number"
                value={settings.analysis.trendConfirmationPeriod}
                onChange={(e) => handleInputChange('analysis', 'trendConfirmationPeriod', e.target.value)}
                className="mt-1 block w-full rounded-lg bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className={activeTab === 'notifications' ? 'space-y-6' : 'hidden'}>
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Email Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Trade Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.tradeAlerts}
                  onChange={(e) => handleInputChange('notifications', 'tradeAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Daily Summary</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.dailySummary}
                  onChange={(e) => handleInputChange('notifications', 'dailySummary', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Profit Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.profitAlerts}
                  onChange={(e) => handleInputChange('notifications', 'profitAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 