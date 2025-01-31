import { Spot } from '@binance/connector';
import * as dotenv from 'dotenv';

dotenv.config();

async function getTradingPairs() {
    try {
        const client = new Spot(
            process.env.BINANCE_API_KEY,
            process.env.BINANCE_API_SECRET,
            {
                baseURL: 'https://api.binance.us'
            }
        );

        const { data: exchangeInfo } = await client.exchangeInfo();
        
        // Filtrar símbolos que:
        // 1. Están activos
        // 2. Permiten trading
        // 3. Tienen USDT como base
        const validPairs = exchangeInfo.symbols
            .filter(symbol => 
                symbol.status === 'TRADING' &&
                symbol.isSpotTradingAllowed &&
                symbol.quoteAsset === 'USDT'
            )
            .map(symbol => ({
                symbol: symbol.symbol,
                baseAsset: symbol.baseAsset,
                minNotional: symbol.filters.find(f => f.filterType === 'MIN_NOTIONAL')?.minNotional || '0',
                minQty: symbol.filters.find(f => f.filterType === 'LOT_SIZE')?.minQty || '0',
                stepSize: symbol.filters.find(f => f.filterType === 'LOT_SIZE')?.stepSize || '0'
            }));

        console.log('Pares de trading válidos encontrados:', validPairs.length);
        console.log('Pares:', JSON.stringify(validPairs, null, 2));

        return validPairs;
    } catch (error) {
        console.error('Error obteniendo pares de trading:', error);
        throw error;
    }
}

getTradingPairs(); 