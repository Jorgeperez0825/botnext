declare module '@binance/connector' {
  export class Spot {
    constructor(
      apiKey: string,
      apiSecret: string,
      options?: {
        baseURL?: string;
        wsURL?: string;
      }
    );

    account(): Promise<{
      data: {
        balances: Array<{
          asset: string;
          free: string;
          locked: string;
        }>;
      };
    }>;

    exchangeInfo(params?: { symbol?: string }): Promise<{
      data: {
        symbols: Array<{
          symbol: string;
          status: string;
          baseAsset: string;
          quoteAsset: string;
          filters: Array<{
            filterType: string;
            minNotional?: string;
            minQty?: string;
            stepSize?: string;
          }>;
        }>;
      };
    }>;

    depth(symbol: string, options?: { limit?: number }): Promise<{
      data: {
        bids: Array<[string, string]>;
        asks: Array<[string, string]>;
      };
    }>;

    tickerPrice(symbol: string): Promise<{
      data: {
        price: string;
      };
    }>;

    newOrder(
      symbol: string,
      side: 'BUY' | 'SELL',
      type: 'MARKET' | 'LIMIT',
      options?: {
        quantity?: string;
        price?: string;
        timeInForce?: 'GTC' | 'IOC' | 'FOK';
      }
    ): Promise<{
      data: {
        orderId: number;
        status: string;
        executedQty: string;
        cummulativeQuoteQty: string;
      };
    }>;
  }
} 