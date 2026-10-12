import type { MarketDataSource } from "../data-source";
import type {
  IntradayPoint,
  KlinePoint,
  KlineRange,
  Market,
  MarketIndex,
  Quote,
  StockInfo,
} from "../types";

/* ---------------- 基础股票池 ---------------- */

interface SeedStock extends StockInfo {
  basePrice: number;
}

const UNIVERSE: SeedStock[] = [
  // A股
  { symbol: "600519", name: "贵州茅台", market: "CN", exchange: "SSE", basePrice: 1680 },
  { symbol: "300750", name: "宁德时代", market: "CN", exchange: "SZSE", basePrice: 245 },
  { symbol: "000858", name: "五粮液", market: "CN", exchange: "SZSE", basePrice: 138 },
  { symbol: "002594", name: "比亚迪", market: "CN", exchange: "SZSE", basePrice: 268 },
  { symbol: "600036", name: "招商银行", market: "CN", exchange: "SSE", basePrice: 42.5 },
  { symbol: "601012", name: "隆基绿能", market: "CN", exchange: "SSE", basePrice: 18.6 },
  { symbol: "300760", name: "迈瑞医疗", market: "CN", exchange: "SZSE", basePrice: 285 },
  { symbol: "600276", name: "恒瑞医药", market: "CN", exchange: "SSE", basePrice: 52.3 },
  { symbol: "600887", name: "伊利股份", market: "CN", exchange: "SSE", basePrice: 28.4 },
  { symbol: "688981", name: "中芯国际", market: "CN", exchange: "SSE", basePrice: 58.9 },
  { symbol: "601398", name: "工商银行", market: "CN", exchange: "SSE", basePrice: 5.85 },
  { symbol: "601318", name: "中国平安", market: "CN", exchange: "SSE", basePrice: 48.2 },
  // 港股
  { symbol: "00700", name: "腾讯控股", market: "HK", exchange: "HKEX", basePrice: 385 },
  { symbol: "09988", name: "阿里巴巴-W", market: "HK", exchange: "HKEX", basePrice: 92.5 },
  { symbol: "03690", name: "美团-W", market: "HK", exchange: "HKEX", basePrice: 128 },
  { symbol: "01810", name: "小米集团-W", market: "HK", exchange: "HKEX", basePrice: 26.8 },
  { symbol: "09618", name: "京东集团-SW", market: "HK", exchange: "HKEX", basePrice: 142 },
  { symbol: "00005", name: "汇丰控股", market: "HK", exchange: "HKEX", basePrice: 68.4 },
  { symbol: "00941", name: "中国移动", market: "HK", exchange: "HKEX", basePrice: 76.2 },
  { symbol: "00388", name: "香港交易所", market: "HK", exchange: "HKEX", basePrice: 295 },
  { symbol: "01211", name: "比亚迪股份", market: "HK", exchange: "HKEX", basePrice: 248 },
  { symbol: "01024", name: "快手-W", market: "HK", exchange: "HKEX", basePrice: 58.6 },
  // 美股
  { symbol: "AAPL", name: "苹果", market: "US", exchange: "NASDAQ", basePrice: 232.5 },
  { symbol: "MSFT", name: "微软", market: "US", exchange: "NASDAQ", basePrice: 428 },
  { symbol: "NVDA", name: "英伟达", market: "US", exchange: "NASDAQ", basePrice: 138.2 },
  { symbol: "TSLA", name: "特斯拉", market: "US", exchange: "NASDAQ", basePrice: 246.8 },
  { symbol: "AMZN", name: "亚马逊", market: "US", exchange: "NASDAQ", basePrice: 198.4 },
  { symbol: "GOOGL", name: "谷歌-A", market: "US", exchange: "NASDAQ", basePrice: 176.3 },
  { symbol: "META", name: "Meta", market: "US", exchange: "NASDAQ", basePrice: 585 },
  { symbol: "AMD", name: "超微半导体", market: "US", exchange: "NASDAQ", basePrice: 122.6 },
  { symbol: "NFLX", name: "奈飞", market: "US", exchange: "NASDAQ", basePrice: 762 },
  { symbol: "AVGO", name: "博通", market: "US", exchange: "NASDAQ", basePrice: 172.9 },
];

const INDICES_SEED: Array<{ symbol: string; name: string; base: number }> = [
  { symbol: "SH000001", name: "上证指数", base: 3265 },
  { symbol: "SZ399001", name: "深证成指", base: 10480 },
  { symbol: "SZ399006", name: "创业板指", base: 2145 },
  { symbol: "HKHSI", name: "恒生指数", base: 19280 },
  { symbol: "USIXIC", name: "纳斯达克", base: 18642 },
  { symbol: "USSPX", name: "标普500", base: 5848 },
  { symbol: "USDJI", name: "道琼斯", base: 43275 },
];

/* ---------------- 确定性随机数 ---------------- */

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const dayKey = () => new Date().toISOString().slice(0, 10);

/* ---------------- 数据生成 ---------------- */

function genIntraday(seed: SeedStock): IntradayPoint[] {
  const rand = mulberry32(hashSeed(seed.symbol + dayKey() + "intra"));
  const points: IntradayPoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  const N = 240;
  const prevClose = seed.basePrice;
  let price = prevClose * (1 + (rand() - 0.52) * 0.02);
  const open = price;
  let volSum = 0;
  let amtSum = 0;
  for (let i = 0; i < N; i++) {
    const drift = (rand() - 0.5) * 0.004 * prevClose;
    price = Math.max(price + drift, prevClose * 0.9);
    const vol = Math.floor(rand() * 90000 + 5000);
    volSum += vol;
    amtSum += price * vol;
    points.push({
      time: now - (N - 1 - i) * 60,
      price: round2(price),
      avgPrice: round2(amtSum / volSum),
      volume: vol,
    });
  }
  // 让开盘价更合理
  void open;
  return points;
}

function genKlines(seed: SeedStock, range: KlineRange): KlinePoint[] {
  const days = { "1M": 22, "3M": 66, "6M": 132, "1Y": 250 }[range];
  const rand = mulberry32(hashSeed(seed.symbol + range + "kline"));
  const closes: number[] = [seed.basePrice];
  for (let i = 1; i < days; i++) {
    const prev = closes[i - 1];
    closes.push(prev * (1 + (rand() - 0.5) * 0.035));
  }
  const today = new Date();
  return closes.map((close, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const open = closes[Math.max(0, i - 1)] * (1 + (rand() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + rand() * 0.012);
    const low = Math.min(open, close) * (1 - rand() * 0.012);
    return {
      time: Math.floor(d.getTime() / 1000),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: Math.floor(rand() * 8_000_000 + 500_000),
    };
  });
}

function findSeed(symbol: string): SeedStock {
  const s = UNIVERSE.find(
    (x) => x.symbol.toLowerCase() === symbol.toLowerCase()
  );
  if (!s) throw new Error(`未知代码: ${symbol}`);
  return s;
}

/* ---------------- Mock 数据源 ---------------- */

class MockDataSource implements MarketDataSource {
  readonly id = "mock";
  readonly label = "Mock 数据";

  async search(query: string, market: Market | "ALL" = "ALL"): Promise<StockInfo[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return UNIVERSE.filter((s) => {
      const matchMarket = market === "ALL" || s.market === market;
      const matchQuery =
        s.symbol.toLowerCase().includes(q) || s.name.includes(query.trim());
      return matchMarket && matchQuery;
    })
      .slice(0, 20)
      .map(({ basePrice, ...info }) => info);
  }

  async getQuote(symbol: string): Promise<Quote> {
    const seed = findSeed(symbol);
    const points = genIntraday(seed);
    const last = points[points.length - 1];
    const prevClose = seed.basePrice;
    // 模拟实时抖动：基于当前分钟数的小幅偏移
    const liveRand = mulberry32(
      hashSeed(symbol + String(Math.floor(Date.now() / 60000)))
    );
    const jitter = (liveRand() - 0.5) * 0.002 * prevClose;
    const price = round2(last.price + jitter);
    const change = round2(price - prevClose);
    const highs = points.map((p) => p.price);
    return {
      symbol: seed.symbol,
      name: seed.name,
      market: seed.market,
      exchange: seed.exchange,
      price,
      prevClose,
      open: points[0].price,
      high: round2(Math.max(...highs)),
      low: round2(Math.min(...highs)),
      volume: points.reduce((a, p) => a + p.volume, 0),
      turnover: round2(price * points.reduce((a, p) => a + p.volume, 0)),
      change,
      changePct: round2((change / prevClose) * 100),
      timestamp: Math.floor(Date.now() / 1000),
      delayed: true, // mock 标记为延迟行情
    };
  }

  async getIntraday(symbol: string): Promise<IntradayPoint[]> {
    return genIntraday(findSeed(symbol));
  }

  async getKlines(symbol: string, range: KlineRange): Promise<KlinePoint[]> {
    return genKlines(findSeed(symbol), range);
  }

  async getIndices(): Promise<MarketIndex[]> {
    return INDICES_SEED.map((idx) => {
      const rand = mulberry32(hashSeed(idx.symbol + dayKey()));
      const changePct = round2((rand() - 0.48) * 2.4);
      const price = round2(idx.base * (1 + changePct / 100));
      const change = round2(price - idx.base);
      return { symbol: idx.symbol, name: idx.name, price, change, changePct };
    });
  }
}

export const mockDataSource = new MockDataSource();
