"use client";

import Link from "next/link";
import { Star, X, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search-bar";
import { IndicesBar } from "@/components/indices-bar";
import { PriceChange } from "@/components/price-change";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useQuotes } from "@/hooks/use-market-data";
import { MARKET_LABEL, MARKET_CURRENCY } from "@/lib/types";
import { fmtPrice } from "@/lib/format";

function WatchlistSection() {
  const { symbols, remove, hydrated } = useWatchlist();
  const { data: quotes, isLoading } = useQuotes(hydrated ? symbols : []);

  if (!hydrated || isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <Star className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            还没有自选股，在上方搜索股票后点击「加自选」
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {quotes?.map((q) => (
        <Card key={q.symbol} className="transition-colors hover:bg-accent/50">
          <CardContent className="flex items-center justify-between p-4">
            <Link
              href={`/stock/${encodeURIComponent(q.symbol)}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{q.name}</p>
                <p className="text-xs text-muted-foreground">
                  {q.symbol} · {MARKET_LABEL[q.market]}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold tabular-nums">
                  {MARKET_CURRENCY[q.market]}
                  {fmtPrice(q.price)}
                </p>
                <PriceChange
                  change={q.change}
                  changePct={q.changePct}
                  className="text-xs"
                />
              </div>
              <button
                type="button"
                aria-label={`移除 ${q.name}`}
                onClick={() => remove(q.symbol)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <TrendingUp className="h-5 w-5" />
          市场指数
        </h1>
        <IndicesBar />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">搜索股票</h2>
        <SearchBar />
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Star className="h-5 w-5" />
          <h2 className="text-xl font-bold">我的自选</h2>
          <Badge variant="secondary">本地保存</Badge>
        </div>
        <WatchlistSection />
      </section>
    </div>
  );
}
