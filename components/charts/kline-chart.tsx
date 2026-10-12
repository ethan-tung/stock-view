"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { KlinePoint } from "@/lib/types";

function chartTheme(dark: boolean) {
  return {
    layout: {
      background: { color: "transparent" },
      textColor: dark ? "#a1a1aa" : "#71717a",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
      horzLines: { color: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
    },
    timeScale: {
      borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      timeVisible: false,
    },
    rightPriceScale: {
      borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    },
  };
}

/** K 线图：蜡烛图 + 成交量 */
export function KlineChart({ klines }: { klines: KlinePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    const container = containerRef.current;
    if (!container || klines.length === 0) return;

    const chart: IChartApi = createChart(container, {
      ...chartTheme(dark),
      width: container.clientWidth,
      height: 380,
    });

    // A股习惯：涨红跌绿
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#e5484d",
      downColor: "#30a46c",
      wickUpColor: "#e5484d",
      wickDownColor: "#30a46c",
      borderVisible: false,
    });
    candles.setData(
      klines.map((k) => ({
        time: k.time as UTCTimestamp,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }))
    );

    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceScaleId: "",
        priceFormat: { type: "volume" },
      }
    );
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(
      klines.map((k) => ({
        time: k.time as UTCTimestamp,
        value: k.volume,
        color:
          k.close >= k.open
            ? "rgba(229,72,77,0.45)"
            : "rgba(48,164,108,0.45)",
      }))
    );

    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: Math.floor(w) });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [klines, dark]);

  return <div ref={containerRef} className="h-[380px] w-full" />;
}
