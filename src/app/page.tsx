'use client';

import { useState, useEffect } from 'react';
import { AITradingBot } from '../lib/trading/AITradingBot';

const TRADING_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'AVAX/USDT',
  'MATIC/USDT',
  'DOT/USDT',
  'ADA/USDT',
  'XRP/USDT',
  'LINK/USDT',
  'ATOM/USDT'
];

export default function Home() {
  const [bot, setBot] = useState<AITradingBot | null>(null);
  const [status, setStatus] = useState<'stopped' | 'running'>('stopped');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [config, setConfig] = useState({
    max_trades: 5,
    investment_amount: 10,
    max_loss: 1.5,
    min_profit: 2.0
  });

  useEffect(() => {
    // Redirigir console.log a nuestro sistema de logs
    const originalLog = console.log;
    console.log = (...args) => {
      setLogs(prev => [...prev, args.join(' ')]);
      originalLog.apply(console, args);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  const startBot = async () => {
    try {
      const newBot = new AITradingBot();
      await newBot.startBot(selectedPairs);
      setBot(newBot);
      setStatus('running');
      console.log('🚀 Bot iniciado exitosamente');
    } catch (error) {
      console.error('❌ Error iniciando el bot:', error);
    }
  };

  const stopBot = () => {
    if (bot) {
      // Implementar lógica de detención
      setBot(null);
      setStatus('stopped');
      console.log('🛑 Bot detenido');
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">
          Bot de Trading con IA
        </h1>

        {/* Panel de Control */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Configuración</h2>
            
            {/* Pares de Trading */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Pares de Trading</h3>
              <div className="grid grid-cols-2 gap-2">
                {TRADING_PAIRS.map(pair => (
                  <label key={pair} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedPairs.includes(pair)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPairs(prev => [...prev, pair]);
                        } else {
                          setSelectedPairs(prev => prev.filter(p => p !== pair));
                        }
                      }}
                      className="form-checkbox"
                    />
                    <span>{pair}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Parámetros */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Máximo de operaciones simultáneas
                </label>
                <input
                  type="number"
                  value={config.max_trades}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    max_trades: parseInt(e.target.value)
                  }))}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Monto de inversión (USDT)
                </label>
                <input
                  type="number"
                  value={config.investment_amount}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    investment_amount: parseFloat(e.target.value)
                  }))}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Pérdida máxima (%)
                </label>
                <input
                  type="number"
                  value={config.max_loss}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    max_loss: parseFloat(e.target.value)
                  }))}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Beneficio mínimo (%)
                </label>
                <input
                  type="number"
                  value={config.min_profit}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    min_profit: parseFloat(e.target.value)
                  }))}
                  className="form-input w-full"
                />
              </div>
            </div>

            {/* Botones de Control */}
            <div className="mt-6 flex space-x-4">
              <button
                onClick={startBot}
                disabled={status === 'running' || selectedPairs.length === 0}
                className={`px-4 py-2 rounded-md ${
                  status === 'running' || selectedPairs.length === 0
                    ? 'bg-gray-400'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white font-medium`}
              >
                Iniciar Bot
              </button>

              <button
                onClick={stopBot}
                disabled={status === 'stopped'}
                className={`px-4 py-2 rounded-md ${
                  status === 'stopped'
                    ? 'bg-gray-400'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white font-medium`}
              >
                Detener Bot
              </button>
            </div>
          </div>

          {/* Panel de Logs */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Logs</h2>
            <div className="h-[500px] overflow-y-auto bg-gray-900 p-4 rounded-md">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estado del Bot */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Estado del Bot</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-100 rounded-md">
              <h3 className="text-sm font-medium text-gray-600">Estado</h3>
              <p className={`text-lg font-bold ${
                status === 'running' ? 'text-green-600' : 'text-red-600'
              }`}>
                {status === 'running' ? 'En ejecución' : 'Detenido'}
              </p>
            </div>

            <div className="p-4 bg-gray-100 rounded-md">
              <h3 className="text-sm font-medium text-gray-600">Pares activos</h3>
              <p className="text-lg font-bold text-gray-800">
                {selectedPairs.length}
              </p>
            </div>

            <div className="p-4 bg-gray-100 rounded-md">
              <h3 className="text-sm font-medium text-gray-600">
                Inversión total
              </h3>
              <p className="text-lg font-bold text-gray-800">
                {config.investment_amount * selectedPairs.length} USDT
              </p>
            </div>

            <div className="p-4 bg-gray-100 rounded-md">
              <h3 className="text-sm font-medium text-gray-600">
                Operaciones máx.
              </h3>
              <p className="text-lg font-bold text-gray-800">
                {config.max_trades}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
