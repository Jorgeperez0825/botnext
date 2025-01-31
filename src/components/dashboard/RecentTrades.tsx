interface Trade {
  pair: string;
  type: string;
  amount: number;
  entryPrice: number;
  exitPrice: number;
  profit: number;
  profitPercentage: string;
  time: string;
}

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Trades Recientes
        </h3>
      </div>
      <div className="p-6">
        {trades.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No hay trades recientes
          </p>
        ) : (
          <div className="space-y-4">
            {trades.map((trade, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
              >
                {/* Encabezado del trade */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {trade.pair}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        trade.type === 'COMPRAR'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {trade.type}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {trade.time}
                  </span>
                </div>

                {/* Detalles del trade */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Precio de entrada
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${trade.entryPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Precio de salida
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${trade.exitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Cantidad
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {trade.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ganancia/Pérdida
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        trade.profit >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      ${Math.abs(trade.profit).toFixed(2)}
                      <span className="ml-1">
                        ({trade.profitPercentage}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Valor total de la operación */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Valor total de la operación
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${(trade.amount * trade.entryPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 