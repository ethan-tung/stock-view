"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  IntradayPoint,
  KlinePoint,
  KlineRange,
  Market,
  MarketIndex,
  Quote,
  StockInfo,
} from "@/lib/types";

async function api<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `请求失败 (${res.status})`);
  }
  return data as T;
}

/** 搜索股票 */
export function useSearch(query: string, market: Market | "ALL") {
  return useQuery({
    queryKey: ["search", query.trim(), market],
    queryFn: () =>
      api<{ results: StockInfo[] }>(
        `/api/search?q=${encodeURIComponent(query.trim())}&market=${market}`
      ).then((d) => d.results),
    enabled: query.trim().length > 0,
    staleTime: 60 * 1000,
  });
}

/** 实时报价（默认 15 秒轮询，可关闭） */
export function useQuote(symbol: string | null, opts?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => api<Quote>(`/api/quote?symbol=${encodeURIComponent(symbol!)}`),
    enabled: !!symbol,
    refetchInterval: opts?.refetchInterval ?? 15_000,
  });
}

/** 批量报价（自选股列表用） */
export function useQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ["quotes", [...symbols].sort().join(",")],
    queryFn: async () => {
      const list = await Promise.all(
        symbols.map((s) =>
          api<Quote>(`/api/quote?symbol=${encodeURIComponent(s)}`).catch(() => null)
        )
      );
      return list.filter((q): q is Quote => q !== null);
    },
    enabled: symbols.length > 0,
    refetchInterval: 30_000,
  });
}

/** 分时数据 */
export function useIntraday(symbol: string | null) {
  return useQuery({
    queryKey: ["intraday", symbol],
    queryFn: () =>
      api<{ points: IntradayPoint[] }>(
        `/api/intraday?symbol=${encodeURIComponent(symbol!)}`
      ).then((d) => d.points),
    enabled: !!symbol,
    staleTime: 60 * 1000,
  });
}

/** K 线数据 */
export function useKlines(symbol: string | null, range: KlineRange) {
  return useQuery({
    queryKey: ["klines", symbol, range],
    queryFn: () =>
      api<{ klines: KlinePoint[] }>(
        `/api/klines?symbol=${encodeURIComponent(symbol!)}&range=${range}`
      ).then((d) => d.klines),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

/** 市场指数 */
export function useIndices() {
  return useQuery({
    queryKey: ["indices"],
    queryFn: () =>
      api<{ indices: MarketIndex[] }>("/api/indices").then((d) => d.indices),
    refetchInterval: 60_000,
  });
}
