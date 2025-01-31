import { AITradingBot } from '../lib/trading/AITradingBot';
import { Spot } from '@binance/connector';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Verificar que las variables de entorno necesarias estén definidas
const requiredEnvVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_DATABASE_URL',
    'BINANCE_API_KEY',
    'BINANCE_API_SECRET',
    'CLAUDE_API_KEY'
];

try {
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Variable de entorno ${envVar} no definida`);
        }
    }
    console.log('✅ Variables de entorno cargadas correctamente');
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

async function getTradingPairs() {
    const client = new Spot(
        process.env.BINANCE_API_KEY,
        process.env.BINANCE_API_SECRET,
        {
            baseURL: 'https://api.binance.us'
        }
    );

    try {
        const exchangeInfo = await client.exchangeInfo();
        const tradingPairs = exchangeInfo.data.symbols
            .filter(symbol => 
                symbol.status === 'TRADING' && 
                symbol.quoteAsset === 'USDT' &&
                ['BTC', 'ETH', 'XRP', 'DOGE', 'UNI', 'SOL', 'AAVE', 'SHIB', 'AVAX', 'MANA', 'LINK', 'APE', 'OP', 'SAND', 'ARB', 'FLOKI', 'PEPE'].includes(symbol.baseAsset)
            )
            .map(symbol => ({
                symbol: symbol.symbol,
                baseAsset: symbol.baseAsset,
                minNotional: symbol.filters.find(f => f.filterType === 'MIN_NOTIONAL')?.minNotional || '10',
                minQty: symbol.filters.find(f => f.filterType === 'LOT_SIZE')?.minQty || '0.00000100',
                stepSize: symbol.filters.find(f => f.filterType === 'LOT_SIZE')?.stepSize || '0.00000100',
                maxInvestmentUSDT: getMaxInvestmentForPair(symbol.baseAsset)
            }));

        return tradingPairs;
    } catch (error) {
        console.error('Error obteniendo pares de trading:', error);
        throw error;
    }
}

function getMaxInvestmentForPair(baseAsset: string): number {
    const investments: { [key: string]: number } = {
        'BTC': 1000,
        'ETH': 800,
        'XRP': 400,
        'DOGE': 200,
        'UNI': 300,
        'SOL': 500,
        'AAVE': 300,
        'SHIB': 150,
        'AVAX': 400,
        'MANA': 200,
        'LINK': 400,
        'APE': 200,
        'OP': 300,
        'SAND': 200,
        'ARB': 300,
        'FLOKI': 100,
        'PEPE': 100
    };
    return investments[baseAsset] || 100;
}

async function startBot() {
    try {
        const bot = new AITradingBot();
        const pairs = await getTradingPairs();
        console.log(`🚀 Iniciando bot con ${pairs.length} pares de trading`);
        console.log('💰 Configuración de inversión por par:');
        pairs.forEach(pair => {
            console.log(`${pair.symbol}: ${pair.maxInvestmentUSDT} USDT`);
        });

        for (const pair of pairs) {
            try {
                await bot.addTradingPair(pair);
                console.log(`✅ Par añadido: ${pair.symbol}`);
            } catch (error) {
                console.error(`❌ Error añadiendo par ${pair.symbol}:`, error);
            }
        }

        // Iniciar el bot con todos los pares
        const tradingPairs = pairs.map(p => p.symbol);
        await bot.startBot(tradingPairs);

        // Mantener el proceso vivo
        process.on('SIGINT', async () => {
            console.log('Deteniendo bot...');
            process.exit(0);
        });

    } catch (error) {
        console.error('Error iniciando el bot:', error);
        process.exit(1);
    }
}

startBot(); 
