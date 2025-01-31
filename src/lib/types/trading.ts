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
  timestamp?: number;
}

export interface MarketData {
  symbol: string;
  last_price: number;
  data: Candle[];
  timestamp: number;
  candles_count: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBook {
  buy_pressure: number;
  sell_pressure: number;
  spread: number;
}

export interface Trade {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  timestamp: number;
  orderId: number;
}

export interface BacktestResult {
  trades: Trade[];
  profit_loss: number;
  win_rate: number;
  avg_profit: number;
  avg_loss: number;
  max_drawdown: number;
}

export interface BotConfig {
  max_trades: number;
  investment_amount: number;
  max_loss: number;
  min_profit: number;
  min_order_value: number;
  max_spread_percent: number;
} 