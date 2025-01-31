import { AITradingBot } from '../lib/trading/AITradingBot';

async function checkProfitLoss() {
    console.log('🔍 Verificando Profit/Loss de posiciones...');
    
    const bot = new AITradingBot();
    
    try {
        const positions = await bot.checkExistingPositions();
        
        // Obtener precios actuales y calcular P/L
        for (const [symbol, trade] of bot.getActiveTrades()) {
            const ticker = await bot.binanceClient.tickerPrice(symbol);
            const currentPrice = parseFloat(ticker.data.price);
            const priceChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
            const profitLoss = (currentPrice - trade.entryPrice) * trade.quantity;
            
            console.log(`\n💰 ${symbol}:`);
            console.log(`   Precio de entrada: $${trade.entryPrice.toFixed(4)}`);
            console.log(`   Precio actual: $${currentPrice.toFixed(4)}`);
            console.log(`   Cambio: ${priceChange.toFixed(2)}%`);
            console.log(`   P/L: ${profitLoss.toFixed(2)} USDT`);
        }
    } catch (error) {
        console.error('❌ Error verificando P/L:', error);
    }
}

checkProfitLoss().catch(console.error); 