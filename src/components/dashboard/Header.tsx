'use client';

import { useState } from 'react';
import { BellIcon, SignalIcon } from '@heroicons/react/24/outline';
import { useBotData } from '@/hooks/useBotData';

export function Header() {
  const { status, performanceMetrics, error } = useBotData();
  const [notifications] = useState([
    { id: 1, message: 'New trade executed: BTC/USDT', time: '5m ago' },
    { id: 2, message: 'Profit target reached: ETH/USDT', time: '15m ago' },
    { id: 3, message: 'Stop loss triggered: DOGE/USDT', time: '30m ago' },
  ]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Trading Bot Dashboard
              </h1>
              <div className="flex items-center">
                <SignalIcon 
                  className={`h-5 w-5 ${error ? 'text-red-500' : 'text-green-500'}`} 
                />
                <span className={`ml-1 text-xs ${error ? 'text-red-500' : 'text-green-500'}`}>
                  {error ? 'Desconectado' : 'Conectado'}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Balance: ${status?.balance.toFixed(2) || '0.00'} USDT
              {error && (
                <span className="ml-2 text-xs text-red-500">
                  Error: {error}
                </span>
              )}
            </p>
          </div>

          {/* Notificaciones */}
          <div className="relative">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="sr-only">Ver notificaciones</span>
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
            </button>

            {/* Panel de notificaciones */}
            <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 hidden">
              <div className="p-4">
                <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Notificaciones
                </h2>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start space-x-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 