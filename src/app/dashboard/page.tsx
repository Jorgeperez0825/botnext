'use client';

import { useBotData } from '@/hooks/useBotData';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentTrades from '@/components/dashboard/RecentTrades';
import ActivePairs from '@/components/dashboard/ActivePairs';
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics';

export default function DashboardPage() {
  const {
    status,
    recentTrades,
    activePairs,
    performanceMetrics,
    loading,
    error
  } = useBotData();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Panel de Control</h1>
      
      {/* Estadísticas generales */}
      <DashboardStats
        balance={status?.balance || 0}
        activeTrades={status?.activeTrades || 0}
        winRate={status?.winRate || 0}
        avgTradeDuration={status?.avgTradeDuration || '0m'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Trades recientes */}
        <RecentTrades trades={recentTrades} />
        
        {/* Pares activos */}
        <ActivePairs pairs={activePairs} />
      </div>

      {/* Métricas de rendimiento */}
      <div className="mt-8">
        <PerformanceMetrics metrics={performanceMetrics} />
      </div>
    </div>
  );
} 
