import {
  RSI,
  MACD,
  Stochastic,
  ADX,
  CCI,
  ROC,
  EMA
} from 'technicalindicators';
import { MarketCondition, MarketData } from '../types/trading';

export class TechnicalAnalysis {
  constructor() {
    // No necesitamos inicializar los indicadores aquí
  }

  public analyzeMarketCondition(data: MarketData): MarketCondition {
    try {
      const prices = data.data.map(candle => candle.close);
      const highs = data.data.map(candle => candle.high);
      const lows = data.data.map(candle => candle.low);
      const volumes = data.data.map(candle => candle.volume);

      // Calcular EMA
      const ema20 = EMA.calculate({ period: 20, values: prices });
      const ema50 = EMA.calculate({ period: 50, values: prices });
      
      const currentPrice = data.last_price;
      const ema20Value = ema20[ema20.length - 1];
      const ema50Value = ema50[ema50.length - 1];

      // Determinar tendencia
      let trend: MarketCondition['trend'];
      let strength: number;

      if (currentPrice > ema50Value && ema20Value > ema50Value) {
        trend = 'alcista';
        strength = Math.min((currentPrice - ema50Value) / ema50Value * 100, 1.0);
      } else if (currentPrice < ema50Value && ema20Value < ema50Value) {
        trend = 'bajista';
        strength = Math.min((ema50Value - currentPrice) / ema50Value * 100, 1.0);
      } else {
        trend = 'neutral';
        strength = 0.5;
      }

      // Calcular volatilidad
      const volatility = this.calculateVolatility(data);

      // Analizar volumen
      const volumeAnalysis = this.analyzeVolume(data);

      // Calcular soportes y resistencias
      const { support, resistance } = this.calculatePivotPoints(data);

      return {
        trend,
        strength,
        volatility,
        volume_analysis: volumeAnalysis,
        support,
        resistance
      };
    } catch (error) {
      console.error('Error en análisis técnico:', error);
      return {
        trend: 'neutral',
        strength: 0.5,
        volatility: 0,
        volume_analysis: 'normal',
        support: 0,
        resistance: 0
      };
    }
  }

  private calculateVolatility(data: MarketData): number {
    const prices = data.data.map(candle => candle.close);
    const returns = prices.slice(1).map((price, i) => 
      (price - prices[i]) / prices[i] * 100
    );

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private analyzeVolume(data: MarketData): MarketCondition['volume_analysis'] {
    const volumes = data.data.map(candle => candle.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];

    if (currentVolume > avgVolume * 1.5) {
      return 'alto';
    } else if (currentVolume < avgVolume * 0.5) {
      return 'bajo';
    } else {
      return 'normal';
    }
  }

  private calculatePivotPoints(data: MarketData): { support: number; resistance: number } {
    const lastCandle = data.data[data.data.length - 1];
    const pivot = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
    
    return {
      resistance: 2 * pivot - lastCandle.low,
      support: 2 * pivot - lastCandle.high
    };
  }

  public getTechnicalScore(data: MarketData): number {
    try {
      console.log('\n📊 Calculando indicadores técnicos...');
      
      const prices = data.data.map(candle => candle.close);
      const highs = data.data.map(candle => candle.high);
      const lows = data.data.map(candle => candle.low);
      let score = 0;

      // RSI
      const rsi = RSI.calculate({ period: 14, values: prices });
      const currentRSI = rsi[rsi.length - 1];
      console.log(`📈 RSI actual: ${currentRSI.toFixed(2)}`);
      
      if (currentRSI <= 30) {
        score += 0.8;
        console.log('⚡ RSI indica sobreventa fuerte (+0.8)');
      } else if (currentRSI <= 40) {
        score += 0.4;
        console.log('📈 RSI indica sobreventa moderada (+0.4)');
      } else if (currentRSI >= 70) {
        score -= 0.7;
        console.log('📉 RSI indica sobrecompra fuerte (-0.7)');
      } else if (currentRSI >= 60) {
        score -= 0.3;
        console.log('📉 RSI indica sobrecompra moderada (-0.3)');
      }

      // MACD
      const macdResult = MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        values: prices,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });
      
      const currentMACD = macdResult[macdResult.length - 1];
      console.log(`📊 MACD - Línea: ${currentMACD.MACD.toFixed(4)}, Señal: ${currentMACD.signal.toFixed(4)}`);
      
      if (currentMACD.MACD > currentMACD.signal) {
        score += 0.6;
        console.log('📈 MACD por encima de la señal (+0.6)');
      } else if (currentMACD.MACD < currentMACD.signal) {
        score -= 0.4;
        console.log('📉 MACD por debajo de la señal (-0.4)');
      }

      // Stochastic
      const stoch = Stochastic.calculate({
        high: highs,
        low: lows,
        close: prices,
        period: 14,
        signalPeriod: 3
      });
      
      const currentStoch = stoch[stoch.length - 1];
      console.log(`📊 Estocástico K: ${currentStoch.k.toFixed(2)}`);
      
      if (currentStoch.k < 20) {
        score += 0.7;
        console.log('⚡ Estocástico indica sobreventa (+0.7)');
      } else if (currentStoch.k > 80) {
        score -= 0.5;
        console.log('📉 Estocástico indica sobrecompra (-0.5)');
      }

      // ADX
      const adx = ADX.calculate({
        high: highs,
        low: lows,
        close: prices,
        period: 14
      });
      
      const currentADX = adx[adx.length - 1];
      const adxValue = typeof currentADX === 'number' ? currentADX : currentADX.adx;
      console.log(`📊 ADX: ${adxValue.toFixed(2)}`);
      
      if (adxValue > 25) {
        const roc = ROC.calculate({
          values: prices,
          period: 10
        });
        const currentROC = roc[roc.length - 1];
        console.log(`📊 ROC: ${currentROC.toFixed(2)}`);
        
        if (currentROC > 0) {
          score += 0.6;
          console.log('📈 ADX indica tendencia fuerte alcista (+0.6)');
        } else {
          score -= 0.4;
          console.log('📉 ADX indica tendencia fuerte bajista (-0.4)');
        }
      }

      const finalScore = Math.max(Math.min(score, 1.0), -1.0);
      console.log(`🎯 Score técnico final: ${finalScore.toFixed(2)}\n`);
      
      return finalScore;
    } catch (error) {
      console.error('❌ Error calculando score técnico:', error);
      return 0;
    }
  }
} 