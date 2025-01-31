import { AITradingBot } from '../lib/trading/AITradingBot';

async function checkTradeHistory() {
    console.log('📜 Verificando historial de operaciones...');
    
    const bot = new AITradingBot();
    
    try {
        // Obtener trades recientes
        const recentTrades = await bot.getRecentTrades();
        
        console.log('\n🔄 Operaciones Recientes:');
        for (const trade of recentTrades) {
            console.log(`\n${trade.pair}:`);
            console.log(`   Tipo: ${trade.type}`);
            console.log(`   Cantidad: ${trade.amount}`);
            console.log(`   Precio de entrada: $${trade.entryPrice}`);
            console.log(`   Precio de salida: ${trade.exitPrice ? '$' + trade.exitPrice : 'Posición abierta'}`);
            console.log(`   P/L: ${trade.profit ? trade.profit.toFixed(2) + ' USDT' : 'En curso'}`);
            console.log(`   Tiempo: ${trade.time}`);
        }

        // Obtener métricas de rendimiento
        const metrics = await bot.getPerformanceMetrics();
        
        console.log('\n📊 Métricas Generales:');
        console.log(`   P/L Total: ${metrics.totalProfitLoss.toFixed(2)} USDT`);
        console.log(`   Cambio en P/L: ${metrics.profitLossChange}`);
        console.log(`   Número total de operaciones: ${metrics.tradeCount}`);
        
        // Obtener estado actual del bot
        const status = await bot.getBotStatus();
        
        console.log('\n🤖 Estado Actual:');
        console.log(`   Balance: ${status.balance.toFixed(2)} USDT`);
        console.log(`   Operaciones activas: ${status.activeTrades}`);
        console.log(`   Tasa de éxito: ${status.winRate.toFixed(2)}%`);
        console.log(`   Duración promedio: ${status.avgTradeDuration}`);
    } catch (error) {
        console.error('❌ Error verificando historial:', error);
    }
}

checkTradeHistory().catch(console.error); 