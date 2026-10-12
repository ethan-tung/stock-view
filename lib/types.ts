/** 市场类型：A股 / 港股 / 美股 */
export type Market = "CN" | "HK" | "US";

export const MARKET_LABEL: Record<Market, string> = {
  CN: "A股",
  HK: "港股",
  US: "美股",
};

export const MARKET_CURRENCY: Record<Market, string> = {
  CN: "¥",
  HK: "HK$",
  US: "$",
};

/** 股票基础信息 */
export interface StockInfo {
  symbol: string;
  name: string;
  market: Market;
  exchange: string;
}

/** 实时/延迟报价 */
export interface Quote extends StockInfo {
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  change: number;
  changePct: number;
  timestamp: number; // unix 秒
  delayed: boolean; // 是否为延迟行情
}

/** 分时数据点 */
export interface IntradayPoint {
  time: number; // unix 秒
  price: number;
  avgPrice: number;
  volume: number;
}

/** K 线数据点（日K） */
export interface KlinePoint {
  time: number; // unix 秒（交易日）
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type KlineRange = "1M" | "3M" | "6M" | "1Y";

export const KLINE_RANGE_LABEL: Record<KlineRange, string> = {
  "1M": "1月",
  "3M": "3月",
  "6M": "6月",
  "1Y": "1年",
};

/** 市场指数 */
export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}
