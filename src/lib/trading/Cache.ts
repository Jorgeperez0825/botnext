import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, child } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";
import { MarketData, Candle, Trade, TradeSignal } from '../types/trading';
import { Spot } from '@binance/connector';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export class Cache {
  private db;
  private analytics;
  private readonly MAX_CANDLES = 1000;
  private marketData: Map<string, MarketData>;
  private signalHistoryCache: Map<string, TradeSignal[]>;
  private tradeHistoryCache: Map<string, Trade[]>;
  private cacheDir: string;

  constructor() {
    // Configurar Firebase
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };

    const app = initializeApp(firebaseConfig);
    this.db = getDatabase(app);
    this.marketData = new Map();
    this.signalHistoryCache = new Map();
    this.tradeHistoryCache = new Map();
    
    // Inicializar Analytics si estamos en el navegador
    if (typeof window !== 'undefined') {
      this.analytics = getAnalytics(app);
      console.log('✅ Firebase Analytics inicializado');
    }
    
    console.log('✅ Firebase inicializado correctamente');

    // Configurar directorio de caché
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.cacheDir = path.join(__dirname, '../../../cache');
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  public async loadHistoricalData(symbol: string, client: Spot): Promise<Candle[]> {
    try {
      console.log(`📊 Cargando datos históricos para ${symbol}...`);
      
      // Obtener datos de las últimas 120 velas de 1 minuto
      const klines = await client.klines(symbol.replace('/', ''), '1m', { limit: 120 });
      
      if (!klines.data || klines.data.length === 0) {
        throw new Error(`No se pudieron obtener datos históricos para ${symbol}`);
      }

      const candles: Candle[] = klines.data.map((kline: any) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));

      console.log(`✅ ${candles.length} velas cargadas para ${symbol}`);
      return candles;
    } catch (error) {
      console.error(`❌ Error cargando datos históricos para ${symbol}:`, error);
      return [];
    }
  }

  public async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      // Intentar obtener de caché local
      let data = this.marketData.get(symbol);
      
      if (!data) {
        // Si no está en caché local, intentar obtener de Firebase
        console.log(`🔍 Buscando datos de ${symbol} en Firebase...`);
        const snapshot = await get(child(ref(this.db), `market_data/${symbol.toLowerCase()}`));
        
        if (snapshot.exists()) {
          data = snapshot.val();
          this.marketData.set(symbol, data);
          console.log(`✅ Datos de ${symbol} recuperados de Firebase`);
        }
      }

      return data || null;
    } catch (error) {
      console.error(`❌ Error obteniendo datos de mercado para ${symbol}:`, error);
      return null;
    }
  }

  public async updateMarketData(symbol: string, candle: any): Promise<void> {
    try {
      let data = this.marketData.get(symbol);
      
      if (!data) {
        data = {
          symbol,
          last_price: candle.close,
          last_update: Date.now(),
          data: [candle]
        };
      } else {
        data.last_price = candle.close;
        data.last_update = Date.now();
        data.data.push(candle);
        
        // Mantener solo las últimas 120 velas
        if (data.data.length > 120) {
          data.data = data.data.slice(-120);
        }
      }

      // Actualizar caché local
      this.marketData.set(symbol, data);

      // Guardar en Firebase
      await this.saveMarketData(symbol, data);
    } catch (error) {
      console.error(`❌ Error actualizando datos de mercado para ${symbol}:`, error);
    }
  }

  private async saveMarketData(symbol: string, data: MarketData): Promise<void> {
    try {
      await set(ref(this.db, `market_data/${symbol.toLowerCase()}`), data);
    } catch (error) {
      console.error(`❌ Error guardando datos en Firebase para ${symbol}:`, error);
      throw error;
    }
  }

  public async saveSignalHistory(signal: TradeSignal & { symbol: string }): Promise<void> {
    const history = this.signalHistoryCache.get(signal.symbol) || [];
    history.push(signal);
    
    // Mantener solo las últimas 100 señales
    if (history.length > 100) {
      history.shift();
    }
    
    this.signalHistoryCache.set(signal.symbol, history);
    await this.saveToFile('signals', signal.symbol, history);
  }

  public async getSignalHistory(symbol: string): Promise<TradeSignal[]> {
    if (!this.signalHistoryCache.has(symbol)) {
      const history = await this.loadFromFile('signals', symbol);
      this.signalHistoryCache.set(symbol, history || []);
    }
    return this.signalHistoryCache.get(symbol) || [];
  }

  public async saveTradeHistory(trade: Trade): Promise<void> {
    const history = this.tradeHistoryCache.get(trade.symbol) || [];
    history.push(trade);
    
    // Mantener solo los últimos 100 trades
    if (history.length > 100) {
      history.shift();
    }
    
    this.tradeHistoryCache.set(trade.symbol, history);
    await this.saveToFile('trades', trade.symbol, history);
  }

  public async getTradeHistory(symbol: string): Promise<Trade[]> {
    if (!this.tradeHistoryCache.has(symbol)) {
      const history = await this.loadFromFile('trades', symbol);
      this.tradeHistoryCache.set(symbol, history || []);
    }
    return this.tradeHistoryCache.get(symbol) || [];
  }

  private async saveToFile(type: string, symbol: string, data: any[]): Promise<void> {
    try {
      const filename = path.join(this.cacheDir, `${type}_${symbol.toLowerCase()}.json`);
      await fs.promises.writeFile(filename, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error guardando caché para ${symbol}:`, error);
    }
  }

  private async loadFromFile(type: string, symbol: string): Promise<any[]> {
    try {
      const filename = path.join(this.cacheDir, `${type}_${symbol.toLowerCase()}.json`);
      if (fs.existsSync(filename)) {
        const data = await fs.promises.readFile(filename, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Error cargando caché para ${symbol}:`, error);
    }
    return [];
  }
} 