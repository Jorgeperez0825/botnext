import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, child } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";
import { MarketData, Candle, Trade, TradeSignal } from '../types/trading';

export class Cache {
  private db;
  private analytics;
  private readonly MAX_CANDLES = 1000;
  private marketData: Map<string, MarketData>;

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
    
    // Inicializar Analytics si estamos en el navegador
    if (typeof window !== 'undefined') {
      this.analytics = getAnalytics(app);
      console.log('✅ Firebase Analytics inicializado');
    }
    
    console.log('✅ Firebase inicializado correctamente');
  }

  public async loadHistoricalData(symbol: string, binanceClient: any): Promise<void> {
    try {
      console.log(`📊 Cargando datos históricos para ${symbol}...`);
      
      // Obtener las últimas 120 velas de 1 minuto
      const klines = await binanceClient.klines(symbol.replace('/', ''), '1m', { limit: 120 });
      
      if (!klines.data || klines.data.length === 0) {
        throw new Error('No se obtuvieron datos históricos');
      }

      console.log(`✅ ${klines.data.length} velas cargadas para ${symbol}`);

      const candles = klines.data.map(k => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      const marketData: MarketData = {
        symbol,
        last_price: candles[candles.length - 1].close,
        last_update: Date.now(),
        data: candles
      };

      // Guardar en caché local
      this.marketData.set(symbol, marketData);

      // Guardar en Firebase
      await this.saveMarketData(symbol, marketData);

      console.log(`✅ Datos inicializados para ${symbol}`);
    } catch (error) {
      console.error(`❌ Error cargando datos históricos para ${symbol}:`, error);
      throw error;
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

  public async saveSignalHistory(signal: any): Promise<void> {
    try {
      const signalRef = ref(this.db, `signals/${signal.symbol.toLowerCase()}/${signal.timestamp}`);
      await set(signalRef, signal);
    } catch (error) {
      console.error('❌ Error guardando señal en Firebase:', error);
    }
  }

  public async saveTradeHistory(trade: Trade): Promise<void> {
    try {
      const tradeRef = ref(this.db, `trades/${trade.symbol.toLowerCase()}/${trade.timestamp}`);
      await set(tradeRef, trade);
    } catch (error) {
      console.error('❌ Error guardando operación en Firebase:', error);
    }
  }

  // Métodos adicionales para trading

  public async getTradeHistory(symbol: string): Promise<any[]> {
    try {
      const path = `trades/${symbol.toLowerCase()}`;
      const snapshot = await get(child(ref(this.db), path));
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (error) {
      console.error('❌ Error obteniendo historial de trading:', error);
      return [];
    }
  }

  public async getSignalHistory(symbol: string): Promise<any[]> {
    try {
      const path = `signals/${symbol.toLowerCase()}`;
      const snapshot = await get(child(ref(this.db), path));
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (error) {
      console.error('❌ Error obteniendo historial de señales:', error);
      return [];
    }
  }
} 