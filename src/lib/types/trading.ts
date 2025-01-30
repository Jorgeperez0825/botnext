import { z } from 'zod';

export const MarketConditionSchema = z.object({
  trend: z.enum(['alcista', 'bajista', 'neutral']),
  strength: z.number(),
  volatility: z.number(),
  volume_analysis: z.enum(['alto', 'bajo', 'normal']),
  support: z.number(),
  resistance: z.number(),
});

export type MarketCondition = z.infer<typeof MarketConditionSchema>;

export interface TradeSignal {
  action: 'COMPRAR' | 'VENDER' | 'ESPERAR' | 'ERROR';
  confidence: number;
}

export interface MarketData {
  symbol: string;
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    RSI?: number;
    MACD?: number;
    Signal?: number;
    StochRSI?: number;
    ADX?: number;
    CCI?: number;
    ROC?: number;
  }[];
  last_price: number;
  timestamp: Date;
  candles_count: number;
}

export interface OrderBook {
  buy_pressure: number;
  sell_pressure: number;
  spread: number;
}

export interface BacktestResult {
  total_trades: number;
  win_rate: number;
  avg_profit: number;
  max_drawdown: number;
  trades: Trade[];
}

export interface Trade {
  type: 'BUY' | 'SELL';
  price: number;
  timestamp: Date;
  profit?: number;
}

export interface BotConfig {
  max_trades: number;
  investment_amount: number;
  max_loss: number;
  min_profit: number;
  min_order_value: number;
  max_spread_percent: number;
} 