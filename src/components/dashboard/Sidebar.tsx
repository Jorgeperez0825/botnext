'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  CogIcon, 
  ClockIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: ChartPieIcon },
  { name: 'Trading Pairs', href: '/dashboard/pairs', icon: ArrowTrendingUpIcon },
  { name: 'Performance', href: '/dashboard/performance', icon: ChartBarIcon },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CurrencyDollarIcon },
  { name: 'History', href: '/dashboard/history', icon: ClockIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Actualizar el tiempo inicialmente
    setCurrentTime(new Date().toLocaleTimeString());

    // Actualizar el tiempo cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              TradingBot
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg
            className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} transition-all`} />
              {!isCollapsed && (
                <span className="ml-3">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        {!isCollapsed && (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">Bot Status</div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Running</span>
            </div>
            <div className="text-xs text-gray-500">
              Last Update: {currentTime}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 