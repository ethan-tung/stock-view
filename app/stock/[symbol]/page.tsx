"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PriceChange } from "@/components/price-change";
import { WatchlistButton } from "@/components/watchlist-button";
import { IntradayChart } from "@/components/charts/intraday-chart";
import { KlineChart } from "@/components/charts/kline-chart";
import { useQuote, useIntraday, useKlines } from "@/hooks/use-market-data";
import {
  MARKET_LABEL,
  MARKET_CURRENCY,
  KLINE_RANGE_LABEL,
  type KlineRange,
} from "@/lib/types";
import { fmtPrice, fmtVolume, fmtTurnover, fmtTime } from "@/lib/format";

const RANGES = Object.keys(KLINE_RANGE_LABEL) as KlineRange[];

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const symbol = decodeURIComponent(params.symbol as string);
  const [chartTab, setChartTab] = useState("intraday");
  const [range, setRange] = useState<KlineRange>("3M");

  const quoteQuery = useQuote(symbol);
  const intradayQuery = useIntraday(chartTab === "intraday" ? symbol : null);
  const klinesQuery = useKlines(chartTab === "klines" ? symbol : null, range);

  const q = quoteQuery.data;

  return (
    <div className="space-y-6">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-1 pl-0">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Button>
      </Link>

      {quoteQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      ) : quoteQuery.isError || !q ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            未找到代码为 {symbol} 的股票，
            <Link href="/" className="text-primary underline">
              返回搜索
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    {q.name}
                    <span className="text-sm font-normal text-muted-foreground">
                      {q.symbol}
                    </span>
                    <Badge variant="outline">{MARKET_LABEL[q.market]}</Badge>
                    {q.delayed && <Badge variant="secondary">延迟行情</Badge>}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.exchange} · 更新于 {fmtTime(q.timestamp)}
                  </p>
                </div>
                <WatchlistButton symbol={q.symbol} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  className={`text-4xl font-bold tabular-nums ${
                    q.change > 0
                      ? "text-up"
                      : q.change < 0
                        ? "text-down"
                        : ""
                  }`}
                >
                  {MARKET_CURRENCY[q.market]}
                  {fmtPrice(q.price)}
                </span>
                <PriceChange change={q.change} changePct={q.changePct} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <StatItem label="今开" value={fmtPrice(q.open)} />
                <StatItem label="昨收" value={fmtPrice(q.prevClose)} />
                <StatItem label="最高" value={fmtPrice(q.high)} />
                <StatItem label="最低" value={fmtPrice(q.low)} />
                <StatItem label="成交量" value={fmtVolume(q.volume)} />
                <StatItem label="成交额" value={fmtTurnover(q.turnover)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={chartTab} onValueChange={setChartTab}>
                  <TabsList>
                    <TabsTrigger value="intraday">分时</TabsTrigger>
                    <TabsTrigger value="klines">K线</TabsTrigger>
                  </TabsList>
                </Tabs>
                {chartTab === "klines" && (
                  <Tabs value={range} onValueChange={(v) => setRange(v as KlineRange)}>
                    <TabsList>
                      {RANGES.map((r) => (
                        <TabsTrigger key={r} value={r}>
                          {KLINE_RANGE_LABEL[r]}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {chartTab === "intraday" ? (
                intradayQuery.isLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : intradayQuery.data ? (
                  <IntradayChart
                    points={intradayQuery.data}
                    prevClose={q.prevClose}
                  />
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    分时数据加载失败
                  </p>
                )
              ) : klinesQuery.isLoading ? (
                <Skeleton className="h-[380px] w-full" />
              ) : klinesQuery.data ? (
                <KlineChart klines={klinesQuery.data} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  K线数据加载失败
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
