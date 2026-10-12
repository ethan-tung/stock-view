import type {
  IntradayPoint,
  KlinePoint,
  KlineRange,
  Market,
  MarketIndex,
  Quote,
  StockInfo,
} from "./types";

/**
 * 行情数据源接口。
 * 新增真实数据源时实现该接口，并在 lib/sources/registry.ts 中注册即可，
 * 前端与 API Routes 无需改动。
 */
export interface MarketDataSource {
  readonly id: string;
  readonly label: string;
  /** 搜索股票，query 可为代码或名称关键字 */
  search(query: string, market?: Market | "ALL"): Promise<StockInfo[]>;
  /** 获取单只股票报价 */
  getQuote(symbol: string): Promise<Quote>;
  /** 获取分时数据 */
  getIntraday(symbol: string): Promise<IntradayPoint[]>;
  /** 获取日 K 线 */
  getKlines(symbol: string, range: KlineRange): Promise<KlinePoint[]>;
  /** 获取市场指数 */
  getIndices(): Promise<MarketIndex[]>;
}
