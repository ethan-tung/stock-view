"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARKET_LABEL, type Market } from "@/lib/types";
import { useSearch } from "@/hooks/use-market-data";
import { cn } from "@/lib/utils";

const MARKET_TABS: Array<{ value: Market | "ALL"; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "CN", label: MARKET_LABEL.CN },
  { value: "HK", label: MARKET_LABEL.HK },
  { value: "US", label: MARKET_LABEL.US },
];

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [market, setMarket] = useState<Market | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: results, isFetching } = useSearch(debounced, market);
  const showDropdown = open && debounced.trim().length > 0;

  const go = (symbol: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  return (
    <div ref={boxRef} className="w-full">
      <Tabs
        value={market}
        onValueChange={(v) => setMarket(v as Market | "ALL")}
        className="mb-3"
      >
        <TabsList>
          {MARKET_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && results?.[0]) go(results[0].symbol);
          }}
          placeholder="搜索股票代码或名称，如 茅台 / 600519 / AAPL"
          className="pl-9"
        />
        {isFetching && showDropdown && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
            {results && results.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto py-1">
                {results.map((s) => (
                  <li key={s.symbol}>
                    <button
                      type="button"
                      onClick={() => go(s.symbol)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">{s.symbol}</span>
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs",
                          s.market === "CN" && "bg-up/15 text-up",
                          s.market === "HK" && "bg-blue-500/15 text-blue-500",
                          s.market === "US" && "bg-purple-500/15 text-purple-500"
                        )}
                      >
                        {MARKET_LABEL[s.market]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !isFetching && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  没有找到匹配的股票
                </p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
