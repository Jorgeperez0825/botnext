import { useState, useEffect } from 'react';

interface BotStatus {
  balance: number;
  activeTrades: number;
  winRate: number;
  avgTradeDuration: string;
}

interface Trade {
  pair: string;
  type: string;
  amount: number;
  entryPrice: number;
  exitPrice: number;
  profit: number;
  time: string;
}

interface TradingPair {
  pair: string;
  price: number;
  change24h: number;
  volume: string;
  trades: number;
}

interface PerformanceMetrics {
  totalProfitLoss: number;
  profitLossChange: string;
  tradeCount: number;
  tradeCountChange: string;
  bestTrade: {
    pair: string;
    profit: number;
    percentage: number;
  };
  worstTrade: {
    pair: string;
    profit: number;
    percentage: number;
  };
}

export function useBotData() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [activePairs, setActivePairs] = useState<TradingPair[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, tradesRes, pairsRes, metricsRes] = await Promise.all([
        fetch('/api/bot?action=status'),
        fetch('/api/bot?action=recentTrades'),
        fetch('/api/bot?action=activePairs'),
        fetch('/api/bot?action=performanceMetrics')
      ]);

      if (!statusRes.ok || !tradesRes.ok || !pairsRes.ok || !metricsRes.ok) {
        throw new Error('Error fetching bot data');
      }

      const [statusData, tradesData, pairsData, metricsData] = await Promise.all([
        statusRes.json(),
        tradesRes.json(),
        pairsRes.json(),
        metricsRes.json()
      ]);

      setStatus(statusData);
      setRecentTrades(tradesData);
      setActivePairs(pairsData);
      setPerformanceMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Actualizar cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return {
    status,
    recentTrades,
    activePairs,
    performanceMetrics,
    loading,
    error,
    refetch: fetchData
  };
} 