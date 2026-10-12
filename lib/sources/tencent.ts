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

/**
 * 腾讯行情数据源（免费、无需 Key）。
 * 接口均为腾讯公开行情接口，经实测验证字段位置（2026-10）：
 * - 报价: https://qt.gtimg.cn/q={code}（GBK 编码，A/港/美字段位置不同）
 * - 搜索: https://smartbox.gtimg.cn/s3/?q={kw}&t=all
 * - 分时: https://ifzq.gtimg.cn/appstock/app/minute/query?code={code}（A/港）
 * - 日K:  https://ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,,,{n},qfq（A/港）
 * - 美股分时/日K: Yahoo Finance chart 接口（腾讯美股历史数据不全）
 * 上游偶发超时/限流时会自动重试一次。
 *
 * 内部 symbol 约定：A股 6 位数字（如 600519）、港股 5 位数字（如 00700）、美股字母（如 AAPL）。
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (s: string | undefined): number => {
  const n = parseFloat(s ?? "");
  return Number.isFinite(n) ? n : 0;
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 上游免费接口偶发超时/限流，失败时重试一次 */
async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < retries) await sleep(800);
    }
  }
  throw last instanceof Error ? last : new Error("上游行情接口异常");
}

async function fetchText(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://gu.qq.com/",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`上游行情接口异常 (${res.status})`);
    const buf = await res.arrayBuffer();
    // qt.gtimg.cn / smartbox 返回 GBK，ifzq 返回 UTF-8 JSON（ASCII 安全）
    return new TextDecoder("gbk").decode(buf);
  });
}

async function fetchJson(url: string): Promise<any> {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://gu.qq.com/",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`上游行情接口异常 (${res.status})`);
    return res.json();
  });
}

/** Yahoo Finance（免 Key）：用于美股 K 线/分时，腾讯该部分数据不全 */
async function fetchYahooChart(
  symbol: string,
  interval: string,
  range: string
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  const json = await withRetry(async () => {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) throw new Error(`Yahoo 接口异常 (${res.status})`);
    return res.json();
  });
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`未知代码: ${symbol}`);
  const ts: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close == null) continue;
    bars.push({
      time: ts[i],
      open: q.open?.[i] ?? close,
      high: q.high?.[i] ?? close,
      low: q.low?.[i] ?? close,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  }
  if (bars.length === 0) throw new Error(`未知代码: ${symbol}`);
  return bars;
}

/** smartbox 返回 \uXXXX 转义时解码 */
function unescapeUnicode(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) =>
    String.fromCharCode(parseInt(h, 16))
  );
}

function inferMarket(symbol: string): Market {
  const s = symbol.trim().toUpperCase();
  if (/^\d{6}$/.test(s)) return "CN";
  if (/^\d{5}$/.test(s)) return "HK";
  return "US";
}

/** 内部 symbol -> 腾讯代码 */
function toTencentCode(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  const market = inferMarket(s);
  if (market === "CN") {
    if (/^[69]/.test(s)) return "sh" + s;
    if (/^[84]/.test(s)) return "bj" + s;
    return "sz" + s;
  }
  if (market === "HK") return "hk" + s.toLowerCase();
  return "us" + s.split(".")[0];
}

function exchangeFor(market: Market, tcode: string, rawCode = ""): string {
  if (market === "CN") {
    if (tcode.startsWith("sh")) return "SSE";
    if (tcode.startsWith("bj")) return "BSE";
    return "SZSE";
  }
  if (market === "HK") return "HKEX";
  if (rawCode.includes(".OQ")) return "NASDAQ";
  if (rawCode.includes(".N")) return "NYSE";
  return "US";
}

/** 各市场成交量/成交额单位换算：A股 volume 单位为手、turnover 单位为万元 */
function unitMult(kind: string) {
  const isA = kind !== "100" && kind !== "200";
  return { volMult: isA ? 100 : 1, toMult: isA ? 10000 : 1 };
}

/** 在字段中定位行情时间：A股 "20261012161454"，港/美 "2026-10-12 11:30:21" */
function findDatetimeIndex(f: string[]): number {
  for (let i = 10; i < f.length; i++) {
    const v = f[i] ?? "";
    if (/^20\d{12}$/.test(v)) return i;
    if (/^\d{4}[-/]\d{2}[-/]\d{2} \d{2}:\d{2}/.test(v)) return i;
  }
  return -1;
}

interface ParsedQuote {
  name: string;
  rawCode: string;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  change: number;
  changePct: number;
  timestamp: number;
}

/**
 * 解析 qt.gtimg.cn 返回的 ~ 分隔字段。
 * 实测发现美股 bid/ask 档位字段数量不固定，因此以行情时间为锚点：
 * change/pct/high/low/turnover 位于时间字段之后第 1/2/3/4/7 位（多市场验证一致）。
 */
function parseQuoteFields(f: string[]): ParsedQuote {
  const { volMult, toMult } = unitMult(f[0]);
  const price = num(f[3]);
  const prevClose = num(f[4]);
  const dt = findDatetimeIndex(f);
  let change: number, changePct: number, high: number, low: number;
  let turnover: number, timestamp: number;
  if (dt > 0) {
    change = num(f[dt + 1]);
    changePct = num(f[dt + 2]);
    high = num(f[dt + 3]);
    low = num(f[dt + 4]);
    turnover = num(f[dt + 7]) * toMult;
    timestamp = parseQuoteTime(f[dt]);
  } else {
    // 兜底：用现价/昨收推算
    change = round2(price - prevClose);
    changePct = prevClose ? round2((change / prevClose) * 100) : 0;
    high = 0;
    low = 0;
    turnover = 0;
    timestamp = Math.floor(Date.now() / 1000);
  }
  return {
    name: f[1] ?? "",
    rawCode: f[2] ?? "",
    price,
    prevClose,
    open: num(f[5]),
    high,
    low,
    volume: Math.round(num(f[6]) * volMult),
    turnover: round2(turnover),
    change,
    changePct,
    timestamp,
  };
}

function parseQuoteVar(text: string): string[] {
  const m = text.match(/v_[a-zA-Z0-9_]+="([\s\S]*?)";/);
  if (!m) throw new Error("行情接口返回格式异常");
  return m[1].split("~");
}

function parseQuoteTime(s: string): number {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (m) {
    return Math.floor(
      new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`).getTime() / 1000
    );
  }
  const t = Date.parse(s.replace(/\//g, "-"));
  return Math.floor((Number.isFinite(t) ? t : Date.now()) / 1000);
}

function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function minuteTs(date: string, hm: string): number {
  // date: "20261012", hm: "0930"
  const t = new Date(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${hm.slice(0, 2)}:${hm.slice(2, 4)}:00`
  ).getTime();
  return Math.floor(t / 1000);
}

const KLINE_DAYS: Record<KlineRange, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 250,
};

const INDICES: Array<{ symbol: string; name: string; code: string; market: Market }> = [
  { symbol: "SH000001", name: "上证指数", code: "sh000001", market: "CN" },
  { symbol: "SZ399001", name: "深证成指", code: "sz399001", market: "CN" },
  { symbol: "SZ399006", name: "创业板指", code: "sz399006", market: "CN" },
  { symbol: "HKHSI", name: "恒生指数", code: "hkHSI", market: "HK" },
  { symbol: "USIXIC", name: "纳斯达克", code: "usIXIC", market: "US" },
  { symbol: "USDJI", name: "道琼斯", code: "usDJI", market: "US" },
];

class TencentDataSource implements MarketDataSource {
  readonly id = "tencent";
  readonly label = "腾讯行情";

  async search(query: string, market: Market | "ALL" = "ALL"): Promise<StockInfo[]> {
    const q = query.trim();
    if (!q) return [];
    const text = await fetchText(
      `https://smartbox.gtimg.cn/s3/?q=${encodeURIComponent(q)}&t=all`
    );
    const m = text.match(/v_hint="([\s\S]*?)"/);
    if (!m) return [];
    const results: StockInfo[] = [];
    for (const item of unescapeUnicode(m[1]).split("^")) {
      const [mkt, code, name, , type] = item.split("~");
      if (!type?.startsWith("GP") || !code || !name) continue;
      let sm: Market, symbol: string, exchange: string;
      if (mkt === "sh") { sm = "CN"; symbol = code; exchange = "SSE"; }
      else if (mkt === "sz") { sm = "CN"; symbol = code; exchange = "SZSE"; }
      else if (mkt === "bj") { sm = "CN"; symbol = code; exchange = "BSE"; }
      else if (mkt === "hk") { sm = "HK"; symbol = code; exchange = "HKEX"; }
      else if (mkt === "us") {
        const [base, suffix] = code.split(".");
        if (suffix !== "oq" && suffix !== "n") continue; // 只要纳斯达克/纽交所
        sm = "US"; symbol = base.toUpperCase();
        exchange = suffix === "oq" ? "NASDAQ" : "NYSE";
      } else continue;
      if (market !== "ALL" && sm !== market) continue;
      results.push({ symbol, name, market: sm, exchange });
      if (results.length >= 20) break;
    }
    return results;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const market = inferMarket(symbol);
    const code = toTencentCode(symbol);
    const text = await fetchText(`https://qt.gtimg.cn/q=${code}`);
    if (text.includes("pv_none_match")) throw new Error(`未知代码: ${symbol}`);
    const q = parseQuoteFields(parseQuoteVar(text));
    return {
      symbol: symbol.trim().toUpperCase(),
      name: q.name || symbol,
      market,
      exchange: exchangeFor(market, code, q.rawCode),
      price: q.price,
      prevClose: q.prevClose,
      open: q.open,
      high: q.high,
      low: q.low,
      volume: q.volume,
      turnover: q.turnover,
      change: q.change,
      changePct: q.changePct,
      timestamp: q.timestamp,
      delayed: true, // 免费接口存在延迟
    };
  }

  async getIntraday(symbol: string): Promise<IntradayPoint[]> {
    const market = inferMarket(symbol);
    if (market === "US") {
      // 美股分时走 Yahoo（1 分钟线）
      const bars = await fetchYahooChart(symbol.trim().toUpperCase(), "1m", "1d");
      let cumVol = 0;
      let cumAmt = 0;
      return bars.map((b) => {
        cumVol += b.volume;
        cumAmt += b.close * b.volume;
        return {
          time: b.time,
          price: round2(b.close),
          avgPrice: round2(cumVol > 0 ? cumAmt / cumVol : b.close),
          volume: b.volume,
        };
      });
    }
    const code = toTencentCode(symbol);
    const json = await fetchJson(
      `https://ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`
    );
    const node = json?.data?.[code];
    const arr: string[] = node?.data?.data ?? [];
    if (arr.length === 0) throw new Error(`未知代码: ${symbol}`);
    let date: string = node?.data?.date ?? "";
    if (!/^\d{8}$/.test(date)) date = todayKey();
    const volMult = market === "CN" ? 100 : 1; // A股成交量单位为手
    let cumVol = 0;
    let cumAmt = 0;
    return arr.map((line) => {
      const [hm, p, v, amt] = line.split(" ");
      const price = parseFloat(p);
      const vol = Math.round(parseFloat(v) * volMult);
      cumVol += vol;
      let avg: number;
      if (amt !== undefined) {
        cumAmt += parseFloat(amt);
        avg = cumVol > 0 ? cumAmt / cumVol : price;
      } else {
        avg = price; // 港股无成交额字段时用价格代替
      }
      return {
        time: minuteTs(date, hm),
        price: round2(price),
        avgPrice: round2(avg),
        volume: vol,
      };
    });
  }

  async getKlines(symbol: string, range: KlineRange): Promise<KlinePoint[]> {
    const market = inferMarket(symbol);
    if (market === "US") {
      // 美股 K 线走 Yahoo（腾讯该接口美股数据不全）
      const yahooRange = { "1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y" }[range];
      const bars = await fetchYahooChart(
        symbol.trim().toUpperCase(),
        "1d",
        yahooRange
      );
      return bars.map((b) => ({
        time: b.time,
        open: round2(b.open),
        high: round2(b.high),
        low: round2(b.low),
        close: round2(b.close),
        volume: b.volume,
      }));
    }
    const code = toTencentCode(symbol);
    const n = KLINE_DAYS[range] + 10;
    const json = await fetchJson(
      `https://ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},day,,,${n},qfq`
    );
    const node = json?.data?.[code];
    // 返回形如 [date, open, close, high, low, volume]
    const arr: string[][] = node?.qfqday ?? node?.day ?? [];
    if (arr.length === 0) throw new Error(`未知代码: ${symbol}`);
    const volMult = market === "CN" ? 100 : 1;
    return arr.slice(-KLINE_DAYS[range]).map((k) => ({
      time: Math.floor(new Date(k[0]).getTime() / 1000),
      open: parseFloat(k[1]),
      close: parseFloat(k[2]),
      high: parseFloat(k[3]),
      low: parseFloat(k[4]),
      volume: Math.round(parseFloat(k[5]) * volMult),
    }));
  }

  async getIndices(): Promise<MarketIndex[]> {
    const text = await fetchText(
      `https://qt.gtimg.cn/q=${INDICES.map((i) => i.code).join(",")}`
    );
    const out: MarketIndex[] = [];
    const re = /v_([a-zA-Z0-9_]+)="([\s\S]*?)";/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const code = m[1];
      const idx = INDICES.find(
        (i) => i.code.toLowerCase() === code.toLowerCase()
      );
      if (!idx) continue;
      const q = parseQuoteFields(m[2].split("~"));
      out.push({
        symbol: idx.symbol,
        name: idx.name,
        price: q.price,
        change: q.change,
        changePct: q.changePct,
      });
    }
    // 保持 INDICES 定义顺序
    out.sort(
      (a, b) =>
        INDICES.findIndex((i) => i.symbol === a.symbol) -
        INDICES.findIndex((i) => i.symbol === b.symbol)
    );
    return out;
  }
}

export const tencentDataSource = new TencentDataSource();
