import { Spot } from '@binance/connector';
import { Anthropic } from '@anthropic-ai/sdk';
import { WebSocket } from 'ws';
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

  constructor() {
    // Verificar variables de entorno
    this.validateEnvVariables();

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
  }

  private validateEnvVariables(): void {
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
      throw new Error('❌ Error: API keys de Binance no configuradas');
    }

    if (!process.env.CLAUDE_API_KEY) {
      console.warn('⚠️ Warning: API key de Claude no configurada - operando sin análisis de IA');
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
      // Cargar datos históricos
      await this.cache.loadHistoricalData(pair, this.binanceClient);
      
      // Iniciar WebSocket
      this.initializeWebSocket(pair);
      
      console.log(`✅ Datos inicializados para ${pair}`);
    } catch (error) {
      console.error(`❌ Error inicializando datos para ${pair}: ${error}`);
    }
  }

  private initializeWebSocket(pair: string): void {
    const cleanPair = pair.toLowerCase().replace('/', '');
    const ws = new WebSocket(`wss://stream.binance.us:9443/ws/${cleanPair}@kline_1m`);
    
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

    this.websockets.set(pair, ws);
    console.log(`📡 WebSocket iniciado para ${pair}`);
  }

  private async startTradingCycle(pairs: string[]): Promise<void> {
    while (true) {
      const cycleStart = `\n${'='.repeat(50)}\n🔄 Iniciando nuevo ciclo de trading - ${new Date().toISOString()}`;
      console.log(cycleStart);
      await this.logToFile(cycleStart);

      for (const pair of pairs) {
        try {
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
      
      const cycleEnd = `${'-'.repeat(50)}\n⏰ Esperando 1 minuto para el siguiente ciclo...\n`;
      console.log(cycleEnd);
      await this.logToFile(cycleEnd);
      
      // Esperar 1 minuto antes del siguiente ciclo
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  private async analyzeAndTrade(pair: string): Promise<TradeSignal | null> {
    try {
      const analysisStart = `\n${'-'.repeat(50)}\n🔍 Analizando par ${pair}...`;
      console.log(analysisStart);
      await this.logToFile(analysisStart);
      
      // Obtener datos de mercado
      const marketData = await this.cache.getMarketData(pair);
      console.log('📊 Datos de mercado obtenidos:', {
        symbol: marketData?.symbol,
        last_price: marketData?.last_price,
        data_length: marketData?.data?.length
      });

      if (!marketData || !marketData.data || marketData.data.length === 0) {
        const noDataMsg = `❌ No hay datos de mercado disponibles para ${pair}`;
        console.log(noDataMsg);
        await this.logToFile(noDataMsg);
        
        // Intentar cargar datos históricos nuevamente
        console.log('🔄 Intentando cargar datos históricos nuevamente...');
        await this.cache.loadHistoricalData(pair, this.binanceClient);
        return null;
      }

      const priceMsg = `📊 Precio actual de ${pair}: $${marketData.last_price.toFixed(2)}`;
      console.log(priceMsg);
      await this.logToFile(priceMsg);

      const orderBook = await this.getOrderBook(pair);
      const orderBookMsg = `📚 Libro de órdenes - Presión compradora: ${(orderBook.buy_pressure * 100).toFixed(2)}%, Presión vendedora: ${(orderBook.sell_pressure * 100).toFixed(2)}%`;
      console.log(orderBookMsg);
      await this.logToFile(orderBookMsg);

      const marketCondition = this.technicalAnalysis.analyzeMarketCondition(marketData);
      const marketCondMsg = `📈 Condición del mercado - Tendencia: ${marketCondition.trend}, Fuerza: ${(marketCondition.strength * 100).toFixed(2)}%, Volatilidad: ${marketCondition.volatility.toFixed(2)}%`;
      console.log(marketCondMsg);
      await this.logToFile(marketCondMsg);

      const sentiment = await this.getAISentiment(marketData);
      const sentimentMsg = `🤖 Sentimiento IA: ${sentiment.toFixed(2)} (${this.interpretSentiment(sentiment)})`;
      console.log(sentimentMsg);
      await this.logToFile(sentimentMsg);

      const signal = this.calculateTradeSignal(marketData, orderBook, marketCondition, sentiment);
      const signalMsg = `🎯 Señal generada: ${signal.action} con confianza ${(signal.confidence * 100).toFixed(2)}%\n`;
      console.log(signalMsg);
      await this.logToFile(signalMsg);

      // Guardar señal en Firebase
      await this.cache.saveSignalHistory({
        symbol: pair,
        timestamp: Date.now(),
        action: signal.action,
        confidence: signal.confidence,
        price: marketData.last_price,
        market_condition: marketCondition,
        sentiment: sentiment,
        technical_indicators: {
          rsi: this.technicalAnalysis.getTechnicalScore(marketData),
          macd: this.technicalAnalysis.getTechnicalScore(marketData),
          stochastic: this.technicalAnalysis.getTechnicalScore(marketData)
        }
      });

      // Umbral de confianza reducido a 35% para más operaciones
      if (signal.action !== 'ESPERAR' && signal.confidence > 0.35) {
        const tradeMsg = `⚡ Ejecutando operación: ${signal.action} con ${this.config.investment_amount} USDT`;
        console.log(tradeMsg);
        await this.logToFile(tradeMsg);
        
        // Validar la operación antes de ejecutar
        const [base, quote] = pair.split('/');
        const ticker = await this.binanceClient.tickerPrice(pair.replace('/', ''));
        const currentPrice = parseFloat(ticker.data.price);
        const quantity = (this.config.investment_amount / currentPrice).toFixed(6);
        
        if (await this.validateTrade(pair, signal.action, quantity)) {
          await this.executeTrade(pair, signal);
        } else {
          const validationMsg = `❌ La operación no pasó las validaciones de trading`;
          console.log(validationMsg);
          await this.logToFile(validationMsg);
        }
      } else {
        const skipMsg = signal.action === 'ESPERAR' 
          ? `⏸️ No hay señal de trading` 
          : `⏸️ Confianza ${(signal.confidence * 100).toFixed(2)}% insuficiente para operar (mínimo 35%)`;
        console.log(skipMsg);
        await this.logToFile(skipMsg);
      }

      return signal;
    } catch (error) {
      const errorMsg = `❌ Error analizando ${pair}: ${error}`;
      console.error(errorMsg);
      await this.logToFile(errorMsg);
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

  private processWebSocketMessage(symbol: string, msg: any): void {
    try {
      if (msg.e === 'kline') {
        const kline = msg.k;
        
        // Verificar si es una vela completa
        const is_candle_closed = kline.x;
        
        const candle = {
          timestamp: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v)
        };
        
        // Si el símbolo no existe en el caché, inicializarlo
        if (!this.cache.getMarketData(symbol)) {
          console.log(`🆕 Iniciando caché para ${symbol}`);
        }
        
        // Actualizar datos en caché
        this.cache.updateMarketData(symbol, candle);
        
        if (is_candle_closed) {
          console.log(`📊 Nueva vela para ${symbol} - Precio: ${candle.close.toFixed(2)}`);
        }
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

  private async getAISentiment(data: MarketData): Promise<number> {
    try {
      if (!this.anthropicClient) {
        console.log('⚠️ Cliente de Claude no disponible - usando sentimiento neutral');
        return 0.0;
      }

      // Obtener historial de señales y trades
      const signalHistory = await this.cache.getSignalHistory(data.symbol);
      const tradeHistory = await this.cache.getTradeHistory(data.symbol);

      const prompt = `Analiza los siguientes datos de mercado de ${data.symbol} y devuelve un número entre -1 y 1 que represente el sentimiento:

Datos técnicos actuales:
- Precio actual: $${data.last_price.toFixed(2)}
- Volumen 24h: ${data.data[data.data.length - 1].volume.toFixed(2)}
- Cambio % 24h: ${((data.last_price - data.data[0].close) / data.data[0].close * 100).toFixed(2)}%
- Máximo 24h: $${Math.max(...data.data.map(d => d.high)).toFixed(2)}
- Mínimo 24h: $${Math.min(...data.data.map(d => d.low)).toFixed(2)}

Historial de señales (últimas 5):
${signalHistory.slice(-5).map(s => 
  `- ${new Date(s.timestamp).toISOString()}: ${s.action} (confianza: ${(s.confidence * 100).toFixed(2)}%)`
).join('\n')}

Historial de operaciones (últimas 5):
${tradeHistory.slice(-5).map(t => 
  `- ${new Date(t.timestamp).toISOString()}: ${t.type} a $${t.price}`
).join('\n')}

Análisis de tendencia:
- RSI: ${this.technicalAnalysis.getTechnicalScore(data).toFixed(2)}
- Tendencia: ${this.technicalAnalysis.analyzeMarketCondition(data).trend}
- Volatilidad: ${this.technicalAnalysis.analyzeMarketCondition(data).volatility.toFixed(2)}%

Guía de sentimiento:
-1.0 = Extremadamente bearish (vender inmediatamente)
-0.7 = Muy bearish
-0.3 = Ligeramente bearish
0.0 = Neutral
0.3 = Ligeramente bullish
0.7 = Muy bullish
1.0 = Extremadamente bullish (comprar inmediatamente)

Responde SOLO con el número, sin explicación ni texto adicional.`;

      console.log('🤖 Enviando análisis a Claude...');
      console.log('📝 Prompt:', prompt);

      try {
        const response = await this.anthropicClient.messages.create({
          model: "claude-3-opus-20240229",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: prompt
          }]
        });

        if (!response || !response.content || response.content.length === 0) {
          console.log('⚠️ Respuesta de Claude inválida - usando sentimiento neutral');
          return 0.0;
        }

        const sentiment = parseFloat(response.content[0].text.trim());
        if (isNaN(sentiment)) {
          console.log('⚠️ Claude no devolvió un número válido - usando sentimiento neutral');
          return 0.0;
        }

        console.log(`✅ Análisis de Claude recibido: ${sentiment} (${this.interpretSentiment(sentiment)})`);
        return Math.max(Math.min(sentiment, 1.0), -1.0);

      } catch (error) {
        console.error('❌ Error en la llamada a Claude:', error);
        return 0.0;
      }

    } catch (error) {
      console.error('❌ Error general en análisis de Claude:', error);
      return 0.0;
    }
  }

  private calculateTradeSignal(
    marketData: MarketData,
    orderBook: OrderBook,
    marketCondition: MarketCondition,
    sentiment: number
  ): TradeSignal {
    try {
      console.log('\n📊 Calculando señal de trading...');
      
      const weights = this.anthropicClient ? {
        sentiment: 0.35,
        technical: 0.40,
        market_condition: 0.15,
        order_book: 0.10
      } : {
        sentiment: 0.0,
        technical: 0.60,
        market_condition: 0.25,
        order_book: 0.15
      };

      console.log('⚖️ Pesos utilizados:', weights);

      const technical_score = this.technicalAnalysis.getTechnicalScore(marketData);
      console.log(`📈 Score técnico: ${technical_score.toFixed(2)}`);

      let market_score = 0.0;
      if (marketCondition.trend === "alcista") {
        market_score = marketCondition.strength * 2.0;
      } else if (marketCondition.trend === "bajista") {
        market_score = -marketCondition.strength * 2.0;
      }
      console.log(`🌊 Score de mercado: ${market_score.toFixed(2)}`);

      const order_book_score = (orderBook.buy_pressure - orderBook.sell_pressure) * 2.0;
      console.log(`📚 Score del libro: ${order_book_score.toFixed(2)}`);

      const final_score = (
        sentiment * weights.sentiment +
        technical_score * weights.technical +
        market_score * weights.market_condition +
        order_book_score * weights.order_book
      );
      console.log(`🎯 Score final: ${final_score.toFixed(2)}`);

      const volatility_factor = marketCondition.volatility/100;
      const base_threshold = 0.25;
      const buy_threshold = base_threshold * (1 - volatility_factor);
      const sell_threshold = -base_threshold * (1 - volatility_factor);
      
      console.log(`📊 Umbrales - Compra: ${buy_threshold.toFixed(2)}, Venta: ${sell_threshold.toFixed(2)}`);

      let action: TradeSignal['action'];
      if (final_score > buy_threshold) {
        action = "COMPRAR";
      } else if (final_score < sell_threshold) {
        action = "VENDER";
      } else {
        action = "ESPERAR";
      }

      return {
        action,
        confidence: Math.abs(final_score)
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

  private async executeTrade(pair: string, signal: TradeSignal): Promise<void> {
    try {
      const [base, quote] = pair.split('/');
      const symbol = pair.replace('/', '');
      const ticker = await this.binanceClient.tickerPrice(symbol);
      const currentPrice = parseFloat(ticker.data.price);
      const quantity = (this.config.investment_amount / currentPrice).toFixed(6);

      if (signal.action === 'COMPRAR') {
        await this.binanceClient.newOrder(symbol, 'BUY', 'MARKET', {
          quantity: quantity
        });
      } else if (signal.action === 'VENDER') {
        await this.binanceClient.newOrder(symbol, 'SELL', 'MARKET', {
          quantity: quantity
        });
      }
    } catch (error) {
      console.error(`Error ejecutando operación: ${error}`);
    }
  }
}