import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface DashboardStatsProps {
  balance: number;
  activeTrades: number;
  winRate: number;
  avgTradeDuration: string;
}

export default function DashboardStats({
  balance,
  activeTrades,
  winRate,
  avgTradeDuration
}: DashboardStatsProps) {
  const stats = [
    {
      name: 'Balance Total',
      value: `$${balance.toFixed(2)}`,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Trades Activos',
      value: activeTrades.toString(),
      icon: ArrowTrendingUpIcon,
    },
    {
      name: 'Tasa de Éxito',
      value: `${winRate.toFixed(1)}%`,
      icon: ChartBarIcon,
    },
    {
      name: 'Duración Promedio',
      value: avgTradeDuration,
      icon: ClockIcon,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {stat.name}
              </p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 