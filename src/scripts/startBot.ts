import { AITradingBot } from '../lib/trading/AITradingBot';

async function main() {
    console.log('🚀 Iniciando Bot de Trading...');
    
    const bot = new AITradingBot();
    
    // Configuración de stop loss y take profit
    const tradingConfig = {
        stopLossPercentage: 2.5,  // Stop loss al 2.5% de pérdida
        takeProfitPercentage: 5,  // Take profit al 5% de ganancia
        maxLossPerTrade: 10,      // Máxima pérdida permitida por operación en USDT
        checkInterval: 30000      // Revisar posiciones cada 30 segundos
    };
    
    // Lista de pares de trading para monitorear
    const tradingPairs = [
        'BTCUSDT',
        'ETHUSDT',
        'DOGEUSDT',
        'SOLUSDT',
        'XRPUSDT'
    ];
    
    try {
        // Verificar posiciones existentes primero
        console.log('🔍 Verificando posiciones existentes en Binance.US...');
        await bot.checkExistingPositions();
        
        console.log('⚙️ Configurando stop loss y take profit...');
        await bot.setTradingConfig(tradingConfig);
        
        console.log('📊 Iniciando monitoreo de pares:', tradingPairs.join(', '));
        
        // Iniciar monitoreo de posiciones en segundo plano
        setInterval(async () => {
            try {
                await bot.monitorPositions();
            } catch (error) {
                console.error('❌ Error monitoreando posiciones:', error);
            }
        }, tradingConfig.checkInterval);
        
        // Iniciar el bot
        await bot.startBot(tradingPairs);
    } catch (error) {
        console.error('❌ Error iniciando el bot:', error);
    }
}

main().catch(console.error); 