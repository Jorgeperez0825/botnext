import { NextResponse } from 'next/server';
import { AITradingBot } from '@/lib/trading/AITradingBot';

let botInstance: AITradingBot | null = null;

function getBotInstance() {
  if (!botInstance) {
    botInstance = new AITradingBot();
  }
  return botInstance;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const bot = getBotInstance();

    switch (action) {
      case 'status':
        const status = await bot.getBotStatus();
        return NextResponse.json({
          ...status,
          balance: status.balance || 0,
          activeTrades: status.activeTrades || 0,
          winRate: status.winRate || 0,
          avgTradeDuration: status.avgTradeDuration || '0m'
        });
      
      case 'recentTrades':
        const trades = await bot.getRecentTrades();
        const tradesWithPercentage = trades?.map(trade => {
          const entryValue = trade.amount * trade.entryPrice;
          const currentValue = trade.amount * trade.exitPrice;
          const profitPercentage = ((currentValue - entryValue) / entryValue) * 100;
          return {
            ...trade,
            profitPercentage: profitPercentage.toFixed(2)
          };
        }) || [];
        return NextResponse.json(tradesWithPercentage);
      
      case 'activePairs':
        const pairs = await bot.getActivePairs();
        return NextResponse.json(pairs || []);
      
      case 'performanceMetrics':
        const metrics = await bot.getPerformanceMetrics();
        return NextResponse.json({
          totalProfitLoss: metrics?.totalProfitLoss || 0,
          profitLossChange: metrics?.profitLossChange || '0%',
          tradeCount: metrics?.tradeCount || 0,
          tradeCountChange: metrics?.tradeCountChange || '0',
          bestTrade: metrics?.bestTrade || null,
          worstTrade: metrics?.worstTrade || null
        });

      case 'currentPrices':
        const currentPrices = await bot.getCurrentPrices();
        return NextResponse.json(currentPrices || []);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 