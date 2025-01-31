import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface TradingPair {
  pair: string;
  price: number;
  change24h: number;
  volume: string;
  trades: number;
}

interface ActivePairsProps {
  pairs: TradingPair[];
}

export default function ActivePairs({ pairs }: ActivePairsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Pares Activos
        </h3>
      </div>
      <div className="p-6">
        {pairs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No hay pares activos
          </p>
        ) : (
          <div className="space-y-4">
            {pairs.map((pair, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {pair.pair}
                  </p>
                  <div className="flex items-center mt-1">
                    <span
                      className={`text-xs flex items-center ${
                        pair.change24h >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {pair.change24h >= 0 ? (
                        <ArrowUpIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownIcon className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(pair.change24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${pair.price.toFixed(2)}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Vol: {pair.volume}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 