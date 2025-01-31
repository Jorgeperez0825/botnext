import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { ChartBarIcon, ScaleIcon } from '@heroicons/react/24/outline';

interface PerformanceMetricsProps {
  metrics: {
    totalProfitLoss: number;
    profitLossChange: string;
    tradeCount: number;
    tradeCountChange: string;
    bestTrade?: {
      pair: string;
      profit: number;
      percentage: number;
    };
    worstTrade?: {
      pair: string;
      profit: number;
      percentage: number;
    };
  } | null;
}

export default function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  if (!metrics) return null;

  const isProfitPositive = metrics.totalProfitLoss >= 0;
  const isTradeCountIncreasing = !metrics.tradeCountChange.startsWith('-');

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        Métricas de Rendimiento
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ganancias/Pérdidas Totales */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ganancias/Pérdidas Totales
              </p>
            </div>
            <span
              className={`inline-flex items-center text-sm font-medium ${
                isProfitPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isProfitPositive ? (
                <ArrowUpIcon className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownIcon className="w-3 h-3 mr-1" />
              )}
              {metrics.profitLossChange}
            </span>
          </div>
          <p
            className={`mt-2 text-2xl font-semibold ${
              isProfitPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            ${Math.abs(metrics.totalProfitLoss).toFixed(2)}
          </p>
        </div>

        {/* Total de Trades */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ScaleIcon className="h-5 w-5 text-gray-400 mr-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total de Trades
              </p>
            </div>
            <span
              className={`inline-flex items-center text-sm font-medium ${
                isTradeCountIncreasing
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isTradeCountIncreasing ? (
                <ArrowUpIcon className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownIcon className="w-3 h-3 mr-1" />
              )}
              {metrics.tradeCountChange}
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {metrics.tradeCount}
          </p>
        </div>

        {/* Mejor Trade */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Mejor Trade
          </p>
          <div className="space-y-1">
            {metrics.bestTrade ? (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metrics.bestTrade.pair}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  +${metrics.bestTrade.profit.toFixed(2)} (+{metrics.bestTrade.percentage.toFixed(2)}%)
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay datos disponibles
              </p>
            )}
          </div>
        </div>

        {/* Peor Trade */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Peor Trade
          </p>
          <div className="space-y-1">
            {metrics.worstTrade ? (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {metrics.worstTrade.pair}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  -${Math.abs(metrics.worstTrade.profit).toFixed(2)} ({metrics.worstTrade.percentage.toFixed(2)}%)
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay datos disponibles
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 