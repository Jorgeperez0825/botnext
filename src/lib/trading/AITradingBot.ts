import { Spot } from '@binance/connector';
import { Anthropic } from '@anthropic-ai/sdk';
import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import {
  MarketCondition,
  MarketData,
  OrderBook,
  TradeSignal,
  BacktestResult,
  Trade,
  BotConfig
} from '../types/trading';
import { TechnicalAnalysis } from './TechnicalAnalysis';
import { Cache } from './Cache';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get } from 'firebase/database';

// Cargar variables de entorno al inicio
dotenv.config();

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

interface TradingPairConfig {
    symbol: string;
    baseAsset: string;
    minNotional: string;
    minQty: string;
    stepSize: string;
    maxInvestmentUSDT: number;
}

interface TradingConfig {
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxLossPerTrade: number;
  checkInterval: number;
}

export class AITradingBot {
  private binanceClient: Spot;
  private anthropicClient: Anthropic | null = null;
  private cache: Cache;
  private technicalAnalysis: TechnicalAnalysis;
  private config: BotConfig;
  private websockets: Map<string, WebSocket>;
  private marketConditions: Map<string, MarketCondition>;
  private lastApiCallTime: Map<string, number[]>;
  private logDir: string;
  private tradingPairs: Map<string, TradingPairConfig> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private activeAnalysis: Set<string> = new Set();
  private database: any;
  private app: any;
  private balance: number = 0;
  private activeTrades: Map<string, any> = new Map();
  private tradeHistory: any[] = [];
  private pairs: Map<string, any> = new Map();
  private tradingConfig: TradingConfig = {
    stopLossPercentage: 2.5,
    takeProfitPercentage: 5,
    maxLossPerTrade: 10,
    checkInterval: 30000
  };

  constructor() {
    // Verificar variables de entorno
    this.validateEnvVariables();

    // Inicializar Firebase
    try {
      console.log('🔍 Configuración de Firebase:', {
        ...firebaseConfig,
        apiKey: '***' // Ocultar la API key por seguridad
      });
      
      this.app = initializeApp(firebaseConfig);
      console.log('✅ App de Firebase inicializada');
      
      this.database = getDatabase(this.app);
      console.log('✅ Base de datos de Firebase inicializada');
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error);
      throw error;
    }

    // Inicializar clientes
    this.initializeBinanceClient();
    this.initializeAnthropicClient();

    // Inicializar componentes
    this.cache = new Cache();
    this.technicalAnalysis = new TechnicalAnalysis();
    this.websockets = new Map();
    this.marketConditions = new Map();
    this.lastApiCallTime = new Map();

    // Configuración por defecto
    this.config = {
      max_trades: 2,
      investment_amount: 10,
      max_loss: 1.0,
      min_profit: 1.5,
      min_order_value: 10.0,
      max_spread_percent: 0.5
    };

    // Inicializar directorio de logs
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    this.logDir = path.join(__dirname, '../../../logs');
    
    // Crear directorio de logs si no existe
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Inicializar datos
    this.initializeData();
  }

  private validateEnvVariables(): void {
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
      throw new Error('❌ Error: API keys de Binance no configuradas');
    }

    if (!process.env.CLAUDE_API_KEY) {
      console.warn('⚠️ Warning: API key de Claude no configurada - operando sin análisis de IA');
    }

    if (!process.env.FIREBASE_DATABASE_URL) {
      throw new Error('❌ Error: URL de Firebase Database no configurada');
    }
  }

  private initializeBinanceClient(): void {
    try {
      this.binanceClient = new Spot(
        process.env.BINANCE_API_KEY!,
        process.env.BINANCE_API_SECRET!,
        {
          baseURL: 'https://api.binance.us',
          wsURL: 'wss://stream.binance.us:9443'
        }
      );
      
      console.log('✅ Cliente de Binance.US inicializado');
    } catch (error) {
      throw new Error(`❌ Error inicializando cliente de Binance.US: ${error}`);
    }
  }

  private initializeAnthropicClient(): void {
    if (process.env.CLAUDE_API_KEY) {
      try {
        this.anthropicClient = new Anthropic({
          apiKey: process.env.CLAUDE_API_KEY
        });
        console.log('✅ Cliente de Claude inicializado');
      } catch (error) {
        console.error(`⚠️ Error inicializando Claude: ${error}`);
        this.anthropicClient = null;
      }
    } else {
      this.anthropicClient = null;
    }
  }

  private async initializeData() {
    try {
      // Obtener balance inicial
      const accountInfo = await this.binanceClient.account();
      const usdtBalance = accountInfo.data.balances.find(
        (b: any) => b.asset === 'USDT'
      );
      this.balance = parseFloat(usdtBalance?.free || '0');

      // Inicializar pares de trading
      const exchangeInfo = await this.binanceClient.exchangeInfo();
      for (const symbol of exchangeInfo.data.symbols) {
        if (symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING') {
          this.pairs.set(symbol.symbol, {
            price: 0,
            change24h: 0,
            volume: '0',
            trades: 0,
          });
        }
      }

      // Iniciar websockets para cada par
      this.initializeWebSockets();
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }

  private initializeWebSockets() {
    for (const pair of this.pairs.keys()) {
      const ws = new WebSocket(`wss://stream.binance.us:9443/ws/${pair.toLowerCase()}@ticker`);
      
      ws.on('message', (data: any) => {
        const ticker = JSON.parse(data);
        this.pairs.set(pair, {
          price: parseFloat(ticker.c),
          change24h: parseFloat(ticker.p),
          volume: this.formatVolume(ticker.v),
          trades: parseInt(ticker.n),
        });
      });

      ws.on('error', (error) => {
        console.error(`❌ Error en WebSocket para ${pair}: ${error}`);
        setTimeout(() => this.initializeWebSocket(pair), 5000);
      });

      ws.on('open', () => {
        console.log(`✅ WebSocket conectado exitosamente para ${pair}`);
      });
    }
  }

  private formatVolume(volume: string): string {
    const vol = parseFloat(volume);
    if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(1)}M`;
    }
    if (vol >= 1000) {
      return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toFixed(1);
  }

  public async startBot(tradingPairs: string[]): Promise<void> {
    console.log('🚀 Iniciando bot de trading...');
    
    // Inicializar WebSockets y caché para cada par
    for (const pair of tradingPairs) {
      await this.initializePairData(pair);
    }

    // Iniciar ciclo de trading
    this.startTradingCycle(tradingPairs);
  }

  private async initializePairData(pair: string): Promise<void> {
    try {
      console.log(`🔄 Inicializando datos para ${pair}...`);
      
      // Cargar datos históricos
      const historicalData = await this.cache.loadHistoricalData(pair, this.binanceClient);
      
      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No se pudieron cargar datos históricos para ${pair}`);
      }

      // Crear objeto de datos de mercado
      const marketData: MarketData = {
        symbol: pair,
        last_price: historicalData[historicalData.length - 1].close,
        timestamp: Date.now(),
        data: historicalData,
        candles_count: historicalData.length
      };

      // Guardar en memoria
      this.marketData.set(pair, marketData);
      console.log(`✅ Datos históricos cargados para ${pair}: ${marketData.candles_count} velas`);
      
      // Iniciar WebSocket con reintentos
      let retryCount = 0;
      const maxRetries = 3;
      
      const initializeWS = () => {
        try {
          this.initializeWebSocket(pair);
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`⚠️ Reintento ${retryCount} de ${maxRetries} para ${pair}`);
            setTimeout(initializeWS, 5000 * retryCount);
          } else {
            console.error(`❌ No se pudo establecer conexión WebSocket para ${pair} después de ${maxRetries} intentos`);
          }
        }
      };

      initializeWS();
      console.log(`✅ WebSocket iniciado para ${pair}`);

      // Configurar el par de trading
      const exchangeInfo = await this.binanceClient.exchangeInfo({ symbol: pair });
      const symbolInfo = exchangeInfo.data.symbols[0];
      
      this.tradingPairs.set(pair, {
        symbol: pair,
        baseAsset: symbolInfo.baseAsset,
        minNotional: symbolInfo.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL')?.minNotional || '10',
        minQty: symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.minQty || '0.00000100',
        stepSize: symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.stepSize || '0.00000100',
        maxInvestmentUSDT: this.getMaxInvestmentForPair(symbolInfo.baseAsset)
      });

      console.log(`✅ Par de trading configurado: ${pair}`);
      console.log(`✅ Datos inicializados completamente para ${pair}`);
    } catch (error) {
      console.error(`❌ Error inicializando datos para ${pair}:`, error);
      throw error;
    }
  }

  private getMaxInvestmentForPair(baseAsset: string): number {
    // Reducir significativamente los montos de inversión
    const investments: { [key: string]: number } = {
      'BTC': 50,    // Reducido de 1000
      'ETH': 40,    // Reducido de 800
      'XRP': 20,    // Reducido de 400
      'DOGE': 10,   // Reducido de 200
      'UNI': 15,    // Reducido de 300
      'SOL': 25,    // Reducido de 500
      'AAVE': 15,   // Reducido de 300
      'SHIB': 10,   // Reducido de 150
      'AVAX': 20,   // Reducido de 400
      'MANA': 10,   // Reducido de 200
      'LINK': 20,   // Reducido de 400
      'APE': 10,    // Reducido de 200
      'OP': 15,     // Reducido de 300
      'SAND': 10,   // Reducido de 200
      'ARB': 15,    // Reducido de 300
      'FLOKI': 5,   // Reducido de 100
      'PEPE': 5     // Reducido de 100
    };
    return investments[baseAsset] || 5; // Valor por defecto reducido a 5 USDT
  }

  private initializeWebSocket(pair: string): void {
    const cleanPair = pair.toLowerCase().replace('/', '');
    const ws = new WebSocket(`wss://stream.binance.us:9443/ws/${cleanPair}@kline_1h`);
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.processWebSocketMessage(pair, message);
    });

    ws.on('error', (error) => {
      console.error(`❌ Error en WebSocket para ${pair}: ${error}`);
      this.reconnectWebSocket(pair);
    });

    ws.on('close', () => {
      console.log(`📡 WebSocket cerrado para ${pair} - intentando reconexión...`);
      setTimeout(() => this.reconnectWebSocket(pair), 5000);
    });

    // Agregar manejador de conexión exitosa
    ws.on('open', () => {
      console.log(`✅ WebSocket conectado exitosamente para ${pair}`);
    });

    this.websockets.set(pair, ws);
    console.log(`📡 WebSocket iniciado para ${pair} (intervalo: 1h)`);
  }

  private async startTradingCycle(pairs: string[]): Promise<void> {
    const HOUR_IN_MS = 60 * 60 * 1000; // 1 hora en milisegundos
    
    while (true) {
      const cycleStart = `\n${'='.repeat(50)}\n🔄 Iniciando nuevo ciclo de trading - ${new Date().toISOString()}`;
      console.log(cycleStart);
      await this.logToFile(cycleStart);

      for (const pair of pairs) {
        try {
          console.log(`\n🔍 Analizando ${pair} a las ${new Date().toLocaleTimeString()}...`);
          const signal = await this.analyzeAndTrade(pair);
          if (signal) {
            const signalMsg = `📊 Señal para ${pair}: ${signal.action} (${signal.confidence})`;
            console.log(signalMsg);
            await this.logToFile(signalMsg);
          }
        } catch (error) {
          const errorMsg = `❌ Error en ciclo de trading para ${pair}: ${error}`;
          console.error(errorMsg);
          await this.logToFile(errorMsg);
        }
      }
      
      const nextAnalysis = new Date(Date.now() + HOUR_IN_MS);
      const cycleEnd = `${'-'.repeat(50)}\n⏰ Próximo análisis a las ${nextAnalysis.toLocaleTimeString()}\n`;
      console.log(cycleEnd);
      await this.logToFile(cycleEnd);
      
      // Esperar 1 hora antes del siguiente ciclo
      await new Promise(resolve => setTimeout(resolve, HOUR_IN_MS));
    }
  }

  private async analyzeAndTrade(pair: string): Promise<TradeSignal | null> {
    try {
      const analysisStart = `\n${'-'.repeat(50)}\n🔍 Analizando par ${pair}...`;
      console.log(analysisStart);
      await this.logToFile(analysisStart);
      
      // Obtener datos de mercado
      let marketData = this.marketData.get(pair);
      
      if (!marketData || !marketData.data || marketData.data.length === 0) {
        console.log(`❌ No hay datos de mercado para ${pair}, intentando inicializar...`);
        
        try {
          await this.initializePairData(pair);
          marketData = this.marketData.get(pair);
          
          if (!marketData || !marketData.data || marketData.data.length === 0) {
            console.log(`❌ No se pudieron inicializar los datos para ${pair}`);
            return null;
          }
        } catch (error) {
          console.error(`❌ Error inicializando datos para ${pair}:`, error);
          return null;
        }
      }

      console.log(`📊 Precio actual de ${pair}: $${marketData.last_price.toFixed(2)}`);

      // Obtener datos necesarios para el análisis
      const orderBook = await this.getOrderBook(pair);
      const marketCondition = this.technicalAnalysis.analyzeMarketCondition(marketData);
      
      // Obtener sentimiento de IA
      let sentiment;
      try {
        sentiment = await this.getAISentiment(marketData);
      } catch (error) {
        console.error(`❌ Error obteniendo sentimiento AI para ${pair}:`, error);
        sentiment = { action: "ESPERAR", confidence: 0 };
      }

      // Calcular señal de trading
      const signal = this.calculateTradeSignal(marketData, orderBook, marketCondition, sentiment);
      console.log(`🎯 Señal generada para ${pair}: ${signal.action} con confianza ${(signal.confidence * 100).toFixed(2)}%\n`);

      // Ejecutar operación si la señal es lo suficientemente fuerte
      if (signal.action !== 'ESPERAR' && signal.confidence > 0.25) {
        const tradeMsg = `⚡ Ejecutando operación en ${pair}: ${signal.action} con ${this.config.investment_amount} USDT`;
        console.log(tradeMsg);
        await this.logToFile(tradeMsg);
        
        if (await this.validateTrade(pair, signal.action, this.config.investment_amount.toString())) {
          await this.executeTrade(pair, signal);
        }
      }

      return signal;
    } catch (error) {
      console.error(`❌ Error analizando ${pair}:`, error);
      return null;
    }
  }

  private interpretSentiment(sentiment: number): string {
    if (sentiment <= -0.7) return "Extremadamente bearish";
    if (sentiment <= -0.3) return "Muy bearish";
    if (sentiment < 0) return "Ligeramente bearish";
    if (sentiment === 0) return "Neutral";
    if (sentiment <= 0.3) return "Ligeramente bullish";
    if (sentiment <= 0.7) return "Muy bullish";
    return "Extremadamente bullish";
  }

  private async getOrderBook(symbol: string): Promise<OrderBook> {
    try {
      const depth = await this.binanceClient.depth(symbol.replace('/', ''), { limit: 20 });
      
      if (!depth.data.bids || !depth.data.asks || depth.data.bids.length < 10 || depth.data.asks.length < 10) {
        console.log(`⚠️ Libro de órdenes insuficiente para ${symbol}`);
        return {
          buy_pressure: 0.5,
          sell_pressure: 0.5,
          spread: 0.0
        };
      }

      // Calcular presión compradora/vendedora
      const bid_volume = depth.data.bids.slice(0, 10).reduce((sum, bid) => sum + parseFloat(bid[1]), 0);
      const ask_volume = depth.data.asks.slice(0, 10).reduce((sum, ask) => sum + parseFloat(ask[1]), 0);
      
      const total_volume = bid_volume + ask_volume;
      const spread = ((parseFloat(depth.data.asks[0][0]) - parseFloat(depth.data.bids[0][0])) / parseFloat(depth.data.bids[0][0])) * 100;

      // No operar si el spread es muy alto
      if (spread > this.config.max_spread_percent) {
        return {
          buy_pressure: 0.0,
          sell_pressure: 1.0,
          spread
        };
      }

      if (total_volume === 0) {
        return {
          buy_pressure: 0.5,
          sell_pressure: 0.5,
          spread
        };
      }

      return {
        buy_pressure: bid_volume / total_volume,
        sell_pressure: ask_volume / total_volume,
        spread
      };

    } catch (error) {
      console.error(`❌ Error analizando libro de órdenes para ${symbol}:`, error);
      return {
        buy_pressure: 0.5,
        sell_pressure: 0.5,
        spread: 0.0
      };
    }
  }

  private async processWebSocketMessage(symbol: string, message: any): Promise<void> {
    try {
      if (message.e === 'kline') {
        const kline = message.k;
        const is_candle_closed = kline.x;
        
        const candle = {
          timestamp: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v)
        };
        
        // Obtener datos actuales del mercado
        let currentMarketData = this.marketData.get(symbol);
        
        if (!currentMarketData) {
          currentMarketData = {
            symbol,
            last_price: parseFloat(kline.c),
            timestamp: Date.now(),
            data: [],
            candles_count: 0
          };
        }
        
        // Actualizar precio actual
        currentMarketData.last_price = parseFloat(kline.c);
        currentMarketData.timestamp = Date.now();
        
        if (is_candle_closed) {
          // Actualizar datos históricos
          currentMarketData.data.push(candle);
          currentMarketData.candles_count = currentMarketData.data.length;
          
          // Mantener solo las últimas 24 velas en Firebase (1 día de datos)
          const lastDayData = currentMarketData.data.slice(-24);
          
          // Guardar en Firebase solo los datos esenciales
          try {
            const marketDataRef = ref(this.database, `market_data/${symbol.toLowerCase()}`);
            await set(marketDataRef, {
              symbol,
              last_price: currentMarketData.last_price,
              timestamp: currentMarketData.timestamp,
              last_candle: candle,
              day_summary: {
                high: Math.max(...lastDayData.map(c => c.high)),
                low: Math.min(...lastDayData.map(c => c.low)),
                volume_24h: lastDayData.reduce((sum, c) => sum + c.volume, 0),
                price_change_24h: ((currentMarketData.last_price - lastDayData[0].close) / lastDayData[0].close * 100).toFixed(2)
              }
            });
          } catch (error) {
            console.log(`⚠️ No se pudo actualizar Firebase para ${symbol} - continuando en memoria`);
          }
          
          // Mantener datos completos solo en memoria
          if (currentMarketData.data.length > 120) {
            currentMarketData.data = currentMarketData.data.slice(-120);
          }
          
          console.log(`✅ Nueva vela para ${symbol} - Precio: ${candle.close.toFixed(2)}`);
        }
        
        // Actualizar en memoria
        this.marketData.set(symbol, currentMarketData);
      }
    } catch (error) {
      console.error(`❌ Error procesando mensaje de WebSocket para ${symbol}:`, error);
    }
  }

  private reconnectWebSocket(symbol: string): void {
    try {
      const ws = this.websockets.get(symbol);
      if (ws) {
        ws.terminate();
      }
      console.log(`🔄 Reconectando WebSocket para ${symbol}...`);
      this.initializeWebSocket(symbol);
    } catch (error) {
      console.error(`❌ Error reconectando WebSocket para ${symbol}:`, error);
    }
  }

  private async getAISentiment(marketData: MarketData): Promise<TradeSignal> {
    try {
      if (!this.anthropicClient) {
        console.log('⚠️ Cliente de Claude no disponible - usando sentimiento neutral');
        return { action: "ESPERAR", confidence: 0, timestamp: Date.now() };
      }

      if (!marketData || !marketData.data || marketData.data.length === 0) {
        console.log('⚠️ Datos de mercado no disponibles - usando sentimiento neutral');
        return { action: "ESPERAR", confidence: 0, timestamp: Date.now() };
      }

      // Obtener historial de señales y trades
      const signalHistory = await this.cache.getSignalHistory(marketData.symbol);
      const tradeHistory = await this.cache.getTradeHistory(marketData.symbol);

      const prompt = `Eres un experto analista de trading. Necesito que analices los siguientes datos de mercado y proporciones una recomendación de trading.

Datos del par ${marketData.symbol}:
- Precio actual: $${marketData.last_price.toFixed(2)}
- Volumen 24h: ${marketData.data[marketData.data.length - 1].volume.toFixed(2)}
- Cambio % 24h: ${((marketData.last_price - marketData.data[0].close) / marketData.data[0].close * 100).toFixed(2)}%
- Máximo 24h: $${Math.max(...marketData.data.map(d => d.high)).toFixed(2)}
- Mínimo 24h: $${Math.min(...marketData.data.map(d => d.low)).toFixed(2)}

Historial de señales recientes:
${signalHistory.slice(-5).map(s => 
  `- ${new Date(s.timestamp).toISOString()}: ${s.action} (${(s.confidence * 100).toFixed(2)}%)`
).join('\n')}

Historial de operaciones recientes:
${tradeHistory.slice(-5).map(t => 
  `- ${new Date(t.timestamp).toISOString()}: ${t.type} a $${t.price}`
).join('\n')}

Basado en estos datos, proporciona una recomendación de trading.
IMPORTANTE: Tu respuesta DEBE estar en el siguiente formato JSON exacto:
{
  "action": "COMPRAR" | "VENDER" | "ESPERAR",
  "confidence": <número entre 0 y 1>,
  "reason": "<explicación breve>"
}

No incluyas ningún otro texto fuera del JSON.`;

      console.log(`🤖 Solicitando análisis a Claude para ${marketData.symbol}...`);
      
      const response = await this.anthropicClient.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        temperature: 0.5,
        messages: [{ role: "user", content: prompt }]
      });

      try {
        const responseText = response.content[0].text.trim();
        console.log(`🤖 Respuesta de Claude para ${marketData.symbol}:`, responseText);
        
        const result = JSON.parse(responseText);
        
        // Validar el formato de la respuesta
        if (!result.action || !["COMPRAR", "VENDER", "ESPERAR"].includes(result.action)) {
          throw new Error(`Acción inválida: ${result.action}`);
        }
        
        if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
          throw new Error(`Confianza inválida: ${result.confidence}`);
        }

        console.log(`✅ Análisis de Claude para ${marketData.symbol}: ${result.action} (${(result.confidence * 100).toFixed(2)}%) - ${result.reason}`);

        return {
          action: result.action as "COMPRAR" | "VENDER" | "ESPERAR",
          confidence: result.confidence,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error(`❌ Error parseando respuesta de Claude para ${marketData.symbol}:`, error);
        console.error('Respuesta recibida:', response.content[0].text);
        return { action: "ESPERAR", confidence: 0, timestamp: Date.now() };
      }
    } catch (error) {
      console.error(`❌ Error obteniendo sentimiento AI para ${marketData.symbol}:`, error);
      return { action: "ESPERAR", confidence: 0, timestamp: Date.now() };
    }
  }

  private calculateTradeSignal(
    marketData: MarketData,
    orderBook: OrderBook,
    marketCondition: MarketCondition,
    sentiment: { action: string, confidence: number }
  ): TradeSignal {
    try {
      console.log('\n📊 Calculando señal de trading más agresiva...');
      
      // Aumentar peso del análisis técnico y sentimiento
      const weights = this.anthropicClient ? {
        sentiment: 0.45,        // Aumentado de 0.35
        technical: 0.35,        // Ajustado
        market_condition: 0.10,  // Reducido para ser más agresivo
        order_book: 0.10
      } : {
        sentiment: 0.0,
        technical: 0.70,        // Aumentado
        market_condition: 0.20,
        order_book: 0.10
      };

      console.log('⚖️ Nuevos pesos más agresivos:', weights);

      const technical_score = this.technicalAnalysis.getTechnicalScore(marketData);
      console.log(`📈 Score técnico: ${technical_score.toFixed(2)}`);

      // Hacer el score de mercado más sensible
      let market_score = 0.0;
      if (marketCondition.trend === "alcista") {
        market_score = marketCondition.strength * 2.5; // Aumentado de 2.0
      } else if (marketCondition.trend === "bajista") {
        market_score = -marketCondition.strength * 2.5; // Aumentado de 2.0
      }
      console.log(`🌊 Score de mercado: ${market_score.toFixed(2)}`);

      // Hacer el score del libro de órdenes más sensible
      const order_book_score = (orderBook.buy_pressure - orderBook.sell_pressure) * 2.5; // Aumentado de 2.0
      console.log(`📚 Score del libro: ${order_book_score.toFixed(2)}`);

      const final_score = (
        sentiment.confidence * weights.sentiment +
        technical_score * weights.technical +
        market_score * weights.market_condition +
        order_book_score * weights.order_book
      );
      console.log(`🎯 Score final: ${final_score.toFixed(2)}`);

      // Reducir los umbrales para más operaciones
      const volatility_factor = marketCondition.volatility/100;
      const base_threshold = 0.15; // Reducido de 0.25
      const buy_threshold = base_threshold * (1 - volatility_factor);
      const sell_threshold = -base_threshold * (1 - volatility_factor);
      
      console.log(`📊 Umbrales más agresivos - Compra: ${buy_threshold.toFixed(2)}, Venta: ${sell_threshold.toFixed(2)}`);

      let action: TradeSignal['action'];
      if (final_score > buy_threshold) {
        action = "COMPRAR";
      } else if (final_score < sell_threshold) {
        action = "VENDER";
      } else {
        action = "ESPERAR";
      }

      // Aumentar la confianza para más operaciones
      return {
        action,
        confidence: Math.min(Math.abs(final_score) * 1.5, 1.0) // Multiplicador de confianza
      };

    } catch (error) {
      console.error(`❌ Error calculando señal de trading: ${error}`);
      return {
        action: "ESPERAR",
        confidence: 0.0
      };
    }
  }

  private async logToFile(message: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `trading_${today}.log`);

      // Agregar timestamp al mensaje
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;

      // Escribir al archivo
      fs.appendFileSync(logFile, logMessage);
    } catch (error) {
      console.error('Error escribiendo logs:', error);
    }
  }

  private async validateTrade(pair: string, action: 'COMPRAR' | 'VENDER', quantity: string): Promise<boolean> {
    try {
      const symbol = pair.replace('/', '');
      const exchangeInfo = await this.binanceClient.exchangeInfo({ symbol });
      
      if (!exchangeInfo.data.symbols || exchangeInfo.data.symbols.length === 0) {
        throw new Error(`Par ${pair} no encontrado en reglas de trading`);
      }

      const symbolInfo = exchangeInfo.data.symbols[0];
      const filters = symbolInfo.filters;

      // Validar cantidad mínima
      const lotSize = filters.find(f => f.filterType === 'LOT_SIZE');
      if (lotSize) {
        const minQty = parseFloat(lotSize.minQty);
        if (parseFloat(quantity) < minQty) {
          throw new Error(`Cantidad ${quantity} menor que el mínimo permitido ${minQty}`);
        }
      }

      // Validar precio mínimo de orden
      const minNotional = filters.find(f => f.filterType === 'MIN_NOTIONAL');
      if (minNotional) {
        const ticker = await this.binanceClient.tickerPrice(symbol);
        const currentPrice = parseFloat(ticker.data.price);
        const orderValue = currentPrice * parseFloat(quantity);
        
        if (orderValue < parseFloat(minNotional.minNotional)) {
          throw new Error(`Valor de orden ${orderValue} menor que el mínimo permitido ${minNotional.minNotional}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`Error validando operación: ${error}`);
      return false;
    }
  }

  private async executeTrade(symbol: string, signal: TradeSignal): Promise<void> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      
      const config = this.tradingPairs.get(symbol);
      if (!config) {
        throw new Error(`Configuración no encontrada para ${symbol}`);
      }

      // Obtener balance actual
      const accountInfo = await this.binanceClient.account();
      const usdtBalance = accountInfo.data.balances.find(b => b.asset === 'USDT');
      if (!usdtBalance) {
        throw new Error('No se encontró balance de USDT');
      }

      const availableUSDT = parseFloat(usdtBalance.free);
      console.log(`💰 Balance disponible: ${availableUSDT.toFixed(2)} USDT`);

      // Verificar si hay suficiente balance
      if (availableUSDT < config.maxInvestmentUSDT) {
        console.log(`⚠️ Balance insuficiente. Ajustando cantidad de inversión...`);
        config.maxInvestmentUSDT = Math.floor(availableUSDT * 0.95); // Usar 95% del balance disponible
      }

      // Obtener precio actual del mercado
      const marketData = this.marketData.get(symbol);
      if (!marketData || !marketData.last_price) {
        throw new Error(`Datos de mercado no disponibles para ${symbol}`);
      }
      const currentPrice = marketData.last_price;

      // Calcular cantidad con más precisión
      const rawQuantity = config.maxInvestmentUSDT / currentPrice;
      const minQty = parseFloat(config.minQty);
      const stepSize = parseFloat(config.stepSize);
      
      // Ajustar cantidad según límites
      let quantity = Math.max(minQty, rawQuantity);
      quantity = Math.floor(quantity / stepSize) * stepSize;
      
      // Verificar valor mínimo y máximo de orden
      const orderValue = quantity * currentPrice;
      const minNotional = parseFloat(config.minNotional);
      
      if (orderValue < minNotional) {
        console.log(`⚠️ Valor de orden ${orderValue.toFixed(2)} USDT menor que el mínimo ${minNotional} USDT`);
        return;
      }

      if (orderValue > availableUSDT) {
        console.log(`⚠️ Valor de orden ${orderValue.toFixed(2)} USDT mayor que el balance disponible`);
        return;
      }

      // Ejecutar orden con cantidad ajustada
      const orderType = signal.action === 'COMPRAR' ? 'BUY' : 'SELL';
      console.log(`🔄 Ejecutando orden: ${orderType} ${quantity.toFixed(8)} ${config.baseAsset} a ${currentPrice.toFixed(2)} USDT`);
      console.log(`💰 Valor total de la orden: ${orderValue.toFixed(2)} USDT`);

      const order = await this.binanceClient.newOrder(cleanSymbol, orderType, 'MARKET', {
        quantity: quantity.toFixed(8)
      });

      console.log(`✅ Orden ejecutada exitosamente:`, order.data);

      // Guardar operación en historial
      await this.cache.saveTradeHistory({
        symbol: symbol,
        type: orderType,
        quantity: quantity,
        price: currentPrice,
        total: orderValue,
        timestamp: Date.now(),
        orderId: order.data.orderId
      });

    } catch (error) {
      console.error(`❌ Error ejecutando operación en ${symbol}:`, error);
      if (error.response?.data) {
        console.error('Detalles del error:', error.response.data);
      }
      throw error;
    }
  }

  public async addTradingPair(config: TradingPairConfig): Promise<void> {
    try {
      this.tradingPairs.set(config.symbol, config);
      await this.initializeWebSocket(config.symbol);
      console.log(`Par de trading añadido: ${config.symbol}`);
    } catch (error) {
      console.error(`Error añadiendo par de trading ${config.symbol}:`, error);
      throw error;
    }
  }

  public async removeTradingPair(symbol: string): Promise<void> {
    const ws = this.websockets.get(symbol);
    if (ws) {
      ws.close();
      this.websockets.delete(symbol);
    }
    this.tradingPairs.delete(symbol);
    this.marketData.delete(symbol);
    console.log(`Par de trading eliminado: ${symbol}`);
  }

  private async analyzeAllPairs(): Promise<void> {
    for (const [symbol, config] of this.tradingPairs) {
      if (!this.activeAnalysis.has(symbol)) {
        this.activeAnalysis.add(symbol);
        try {
          await this.analyzePair(symbol);
        } finally {
          this.activeAnalysis.delete(symbol);
        }
      }
    }
  }

  private async analyzePair(symbol: string): Promise<void> {
    try {
      const marketData = this.marketData.get(symbol);
      if (!marketData) {
        console.log(`Sin datos de mercado para ${symbol}`);
        return;
      }

      const sentiment = await this.getAISentiment(marketData);
      if (sentiment.confidence > 0.7) {
        await this.executeTrade(symbol, sentiment);
      }
    } catch (error) {
      console.error(`Error analizando ${symbol}:`, error);
    }
  }

  private calculateTradeQuantity(
    maxInvestmentUSDT: number,
    currentPrice: number,
    minQty: string,
    stepSize: string
  ): number {
    const rawQuantity = maxInvestmentUSDT / currentPrice;
    const minQtyNum = parseFloat(minQty);
    const stepSizeNum = parseFloat(stepSize);
    
    // Ajustar a los límites del par
    let quantity = Math.max(minQtyNum, rawQuantity);
    
    // Ajustar al tamaño de paso
    quantity = Math.floor(quantity / stepSizeNum) * stepSizeNum;
    
    return quantity;
  }

  // Métodos públicos para obtener datos
  async getBotStatus() {
    return {
      balance: this.balance,
      activeTrades: this.activeTrades.size,
      winRate: this.calculateWinRate(),
      avgTradeDuration: this.calculateAvgTradeDuration(),
    };
  }

  async getRecentTrades() {
    return this.tradeHistory
      .slice(-5)
      .map(trade => ({
        pair: trade.symbol,
        type: trade.side,
        amount: trade.quantity,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        profit: trade.profit,
        time: this.formatTimeAgo(trade.closeTime),
      }));
  }

  async getActivePairs() {
    return Array.from(this.pairs.entries())
      .slice(0, 5)
      .map(([pair, data]) => ({
        pair,
        ...data,
      }));
  }

  async getPerformanceMetrics() {
    const totalProfitLoss = this.calculateTotalProfitLoss();
    const previousProfitLoss = this.calculatePreviousProfitLoss();
    const profitLossChange = ((totalProfitLoss - previousProfitLoss) / previousProfitLoss * 100).toFixed(2);

    return {
      totalProfitLoss,
      profitLossChange: `${profitLossChange}%`,
      tradeCount: this.tradeHistory.length,
      tradeCountChange: '+12', // Esto debería calcularse comparando con el período anterior
    };
  }

  private calculateWinRate(): number {
    if (this.tradeHistory.length === 0) return 0;
    const winningTrades = this.tradeHistory.filter(trade => trade.profit > 0);
    return (winningTrades.length / this.tradeHistory.length) * 100;
  }

  private calculateAvgTradeDuration(): string {
    if (this.tradeHistory.length === 0) return '0m';
    const totalDuration = this.tradeHistory.reduce((acc, trade) => {
      return acc + (trade.closeTime - trade.openTime);
    }, 0);
    const avgMinutes = Math.floor(totalDuration / this.tradeHistory.length / 1000 / 60);
    return `${avgMinutes}m`;
  }

  private calculateTotalProfitLoss(): number {
    return this.tradeHistory.reduce((acc, trade) => acc + trade.profit, 0);
  }

  private calculatePreviousProfitLoss(): number {
    // Implementar cálculo del P/L del período anterior
    return 1000; // Valor de ejemplo
  }

  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  public async setTradingConfig(config: TradingConfig): Promise<void> {
    this.tradingConfig = { ...this.tradingConfig, ...config };
    console.log('✅ Configuración de trading actualizada:', this.tradingConfig);
  }

  public async checkExistingPositions(): Promise<void> {
    try {
      console.log('🔍 Verificando posiciones existentes...');
      const account = await this.binanceClient.account();
      
      for (const balance of account.data.balances) {
        const free = parseFloat(balance.free);
        const locked = parseFloat(balance.locked);
        
        if (free > 0 || locked > 0) {
          if (balance.asset !== 'USDT') {
            const symbol = `${balance.asset}USDT`;
            const ticker = await this.binanceClient.tickerPrice(symbol);
            const currentPrice = parseFloat(ticker.data.price);
            const totalValue = (free + locked) * currentPrice;
            
            if (totalValue >= 1) { // Solo mostrar posiciones con valor > 1 USDT
              console.log(`📈 Posición encontrada: ${balance.asset}`);
              console.log(`   Cantidad: ${free + locked}`);
              console.log(`   Valor actual: ${totalValue.toFixed(2)} USDT`);
              
              // Agregar a posiciones activas para monitoreo
              this.activeTrades.set(symbol, {
                entryPrice: currentPrice, // Usamos precio actual como referencia
                quantity: free + locked,
                type: 'EXISTENTE',
                timestamp: Date.now()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error verificando posiciones:', error);
      throw error;
    }
  }

  public async monitorPositions(): Promise<void> {
    try {
      for (const [symbol, trade] of this.activeTrades.entries()) {
        const ticker = await this.binanceClient.tickerPrice(symbol);
        const currentPrice = parseFloat(ticker.data.price);
        const priceChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
        
        // Verificar stop loss
        if (priceChange <= -this.tradingConfig.stopLossPercentage) {
          console.log(`🔴 Stop Loss alcanzado para ${symbol}`);
          console.log(`   Pérdida: ${priceChange.toFixed(2)}%`);
          await this.executeStopLoss(symbol, trade, currentPrice);
        }
        // Verificar take profit
        else if (priceChange >= this.tradingConfig.takeProfitPercentage) {
          console.log(`🟢 Take Profit alcanzado para ${symbol}`);
          console.log(`   Ganancia: ${priceChange.toFixed(2)}%`);
          await this.executeTakeProfit(symbol, trade, currentPrice);
        }
        // Actualizar estado
        else {
          console.log(`📊 ${symbol} - Cambio: ${priceChange.toFixed(2)}%`);
        }
      }
    } catch (error) {
      console.error('❌ Error monitoreando posiciones:', error);
    }
  }

  private async executeStopLoss(symbol: string, trade: any, currentPrice: number): Promise<void> {
    try {
      console.log(`🚨 Ejecutando stop loss para ${symbol}`);
      
      // Calcular cantidad a vender
      const quantity = trade.quantity;
      
      // Ejecutar orden de mercado para vender
      const order = await this.binanceClient.newOrder(symbol, 'SELL', 'MARKET', {
        quantity: quantity.toFixed(8)
      });
      
      console.log(`✅ Stop loss ejecutado para ${symbol}`);
      console.log(`   Cantidad vendida: ${quantity}`);
      console.log(`   Precio: ${currentPrice}`);
      
      // Registrar la operación
      await this.cache.saveTradeHistory({
        symbol,
        type: 'STOP_LOSS',
        quantity,
        price: currentPrice,
        total: quantity * currentPrice,
        timestamp: Date.now(),
        orderId: order.data.orderId
      });
      
      // Eliminar de trades activos
      this.activeTrades.delete(symbol);
      
    } catch (error) {
      console.error(`❌ Error ejecutando stop loss para ${symbol}:`, error);
    }
  }

  private async executeTakeProfit(symbol: string, trade: any, currentPrice: number): Promise<void> {
    try {
      console.log(`🎯 Ejecutando take profit para ${symbol}`);
      
      // Calcular cantidad a vender
      const quantity = trade.quantity;
      
      // Ejecutar orden de mercado para vender
      const order = await this.binanceClient.newOrder(symbol, 'SELL', 'MARKET', {
        quantity: quantity.toFixed(8)
      });
      
      console.log(`✅ Take profit ejecutado para ${symbol}`);
      console.log(`   Cantidad vendida: ${quantity}`);
      console.log(`   Precio: ${currentPrice}`);
      
      // Registrar la operación
      await this.cache.saveTradeHistory({
        symbol,
        type: 'TAKE_PROFIT',
        quantity,
        price: currentPrice,
        total: quantity * currentPrice,
        timestamp: Date.now(),
        orderId: order.data.orderId
      });
      
      // Eliminar de trades activos
      this.activeTrades.delete(symbol);
      
    } catch (error) {
      console.error(`❌ Error ejecutando take profit para ${symbol}:`, error);
    }
  }

  public getActiveTrades(): Map<string, any> {
    return this.activeTrades;
  }

  public async getProfitLoss(symbol: string): Promise<{
    entryPrice: number;
    currentPrice: number;
    priceChange: number;
    profitLoss: number;
    quantity: number;
  }> {
    try {
      const trade = this.activeTrades.get(symbol);
      if (!trade) {
        throw new Error(`No se encontró posición activa para ${symbol}`);
      }

      const ticker = await this.binanceClient.tickerPrice(symbol);
      const currentPrice = parseFloat(ticker.data.price);
      const priceChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
      const profitLoss = (currentPrice - trade.entryPrice) * trade.quantity;

      return {
        entryPrice: trade.entryPrice,
        currentPrice,
        priceChange,
        profitLoss,
        quantity: trade.quantity
      };
    } catch (error) {
      console.error(`Error obteniendo P/L para ${symbol}:`, error);
      throw error;
    }
  }
}