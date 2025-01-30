import 'dotenv/config';
import { AITradingBot } from '../lib/trading/AITradingBot';

async function testBot() {
  try {
    console.log('🚀 Iniciando prueba del bot...');
    console.log('📊 Verificando variables de entorno...');
    
    // Verificar variables de entorno
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
      throw new Error('❌ Error: API keys de Binance no configuradas en .env');
    }
    
    console.log('✅ Variables de entorno cargadas correctamente');
    
    // Inicializar el bot
    const bot = new AITradingBot();
    
    // Pares de prueba
    const testPairs = ['BTC/USDT', 'ETH/USDT'];
    
    console.log('📊 Probando conexión con Binance...');
    console.log('🔍 Analizando pares:', testPairs.join(', '));
    
    // Iniciar el bot con los pares de prueba
    await bot.startBot(testPairs);
    
    // El bot seguirá ejecutándose hasta que se detenga manualmente
    console.log('✅ Bot iniciado exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
testBot(); 