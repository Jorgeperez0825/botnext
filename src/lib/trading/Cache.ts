import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, child } from 'firebase/database';
import { getAnalytics } from "firebase/analytics";
import { MarketData, Candle } from '../types/trading';

export class Cache {
  private db;
  private analytics;
  private readonly MAX_CANDLES = 1000;

  constructor() {
    // Configuración de Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyDOlIE4kN1_rE5VDGpFtzaBB5ZU3Zzr4qU",
      authDomain: "botnext-e13e7.firebaseapp.com",
      projectId: "botnext-e13e7",
      storageBucket: "botnext-e13e7.firebasestorage.app",
      messagingSenderId: "73447344157",
      appId: "1:73447344157:web:083a42bb42421f44079ef4",
      measurementId: "G-92JD2LY697",
      databaseURL: "https://botnext-e13e7-default-rtdb.firebaseio.com"  // URL corregida
    };

    try {
      // Inicializar Firebase
      const app = initializeApp(firebaseConfig);
      this.db = getDatabase(app);
      
      // Inicializar Analytics si estamos en el navegador
      if (typeof window !== 'undefined') {
        this.analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics inicializado');
      }
      
      console.log('✅ Firebase inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error);
      throw error;
    }
  }

  public async loadHistoricalData(symbol: string, binanceClient: any): Promise<void> {
    try {
      console.log(`📊 Cargando datos históricos para ${symbol}...`);
      
      // Intentar cargar desde Firebase primero
      const cachedData = await this.loadFromFirebase(symbol);
      
      if (cachedData && cachedData.data.length > 0) {
        console.log(`✅ Datos cargados desde caché para ${symbol}`);
        return;
      }

      // Si no hay datos en caché, cargar desde Binance
      const candles = await binanceClient.candles({
        symbol: symbol.replace('/', ''),
        interval: '1m',
        limit: 120
      });

      if (!candles || candles.length === 0) {
        throw new Error('No se pudieron obtener datos históricos');
      }

      const marketData: MarketData = {
        symbol,
        last_price: parseFloat(candles[candles.length - 1].close),
        last_update: Date.now(),
        data: candles.map(candle => ({
          timestamp: candle.openTime,
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume)
        }))
      };

      // Guardar en Firebase
      await this.saveToFirebase(symbol, marketData);
      
      console.log(`✅ ${candles.length} velas cargadas para ${symbol}`);

    } catch (error) {
      console.error(`❌ Error cargando datos históricos para ${symbol}:`, error);
      throw error;
    }
  }

  private async saveToFirebase(symbol: string, data: MarketData): Promise<void> {
    try {
      const path = this.getSymbolPath(symbol);
      await set(ref(this.db, path), {
        ...data,
        last_update: Date.now()
      });
    } catch (error) {
      console.error(`❌ Error guardando en Firebase para ${symbol}:`, error);
      throw error;
    }
  }

  private async loadFromFirebase(symbol: string): Promise<MarketData | null> {
    try {
      const path = this.getSymbolPath(symbol);
      const snapshot = await get(child(ref(this.db), path));
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error cargando desde Firebase para ${symbol}:`, error);
      return null;
    }
  }

  public async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      return await this.loadFromFirebase(symbol);
    } catch (error) {
      console.error(`❌ Error obteniendo datos de mercado para ${symbol}:`, error);
      return null;
    }
  }

  public async updateMarketData(symbol: string, newCandle: Candle): Promise<void> {
    try {
      const marketData = await this.getMarketData(symbol);
      
      if (!marketData) {
        // Crear nuevo registro si no existe
        const newMarketData: MarketData = {
          symbol,
          last_price: newCandle.close,
          last_update: Date.now(),
          data: [newCandle]
        };
        await this.saveToFirebase(symbol, newMarketData);
        return;
      }

      // Actualizar datos existentes
      marketData.last_price = newCandle.close;
      marketData.last_update = Date.now();
      marketData.data.push(newCandle);

      // Mantener solo las últimas MAX_CANDLES velas
      if (marketData.data.length > this.MAX_CANDLES) {
        marketData.data = marketData.data.slice(-this.MAX_CANDLES);
      }

      await this.saveToFirebase(symbol, marketData);

    } catch (error) {
      console.error(`❌ Error actualizando datos para ${symbol}:`, error);
      throw error;
    }
  }

  private getSymbolPath(symbol: string): string {
    return `market_data/${symbol.toLowerCase().replace('/', '_')}`;
  }

  // Métodos adicionales para trading

  public async saveTradeHistory(trade: any): Promise<void> {
    try {
      const path = `trades/${trade.symbol.toLowerCase()}/${trade.timestamp}`;
      await set(ref(this.db, path), trade);
    } catch (error) {
      console.error('❌ Error guardando historial de trading:', error);
    }
  }

  public async saveSignalHistory(signal: any): Promise<void> {
    try {
      const path = `signals/${signal.symbol.toLowerCase()}/${signal.timestamp}`;
      await set(ref(this.db, path), signal);
    } catch (error) {
      console.error('❌ Error guardando historial de señales:', error);
    }
  }

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