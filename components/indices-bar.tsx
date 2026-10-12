"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndices } from "@/hooks/use-market-data";
import { fmtPrice, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 市场指数横向滚动条 */
export function IndicesBar() {
  const { data, isLoading, isError } = useIndices();

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-40 shrink-0" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-muted-foreground">指数数据加载失败</p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {data.map((idx) => {
        const up = idx.change > 0;
        return (
          <Card key={idx.symbol} className="w-40 shrink-0">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{idx.name}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {fmtPrice(idx.price)}
              </p>
              <p
                className={cn(
                  "text-xs tabular-nums",
                  up ? "text-up" : "text-down"
                )}
              >
                {up ? "▲" : "▼"} {fmtPct(idx.changePct)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
