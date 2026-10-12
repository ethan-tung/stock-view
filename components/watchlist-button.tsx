"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";

export function WatchlistButton({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  const { has, toggle, hydrated } = useWatchlist();
  const active = has(symbol);

  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="sm"
      className={cn("gap-1.5", className)}
      disabled={!hydrated}
      onClick={() => toggle(symbol)}
      aria-label={active ? "取消自选" : "加入自选"}
    >
      <Star
        className={cn("h-4 w-4", active && "fill-yellow-400 text-yellow-400")}
      />
      {active ? "已自选" : "加自选"}
    </Button>
  );
}
