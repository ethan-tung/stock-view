"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  AreaSeries,
  LineSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { IntradayPoint } from "@/lib/types";

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
      tickMarkFormatter: (time: UTCTimestamp) => {
        const d = new Date(time * 1000);
        return `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`;
      },
    },
    rightPriceScale: { borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
  };
}

/** 分时图：价格面积图 + 均价线 */
export function IntradayChart({
  points,
  prevClose,
}: {
  points: IntradayPoint[];
  prevClose: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    const container = containerRef.current;
    if (!container || points.length === 0) return;

    const chart = createChart(container, {
      ...chartTheme(dark),
      width: container.clientWidth,
      height: 320,
    });
    chartRef.current = chart;

    const last = points[points.length - 1].price;
    const up = last >= prevClose;
    const lineColor = up ? "#e5484d" : "#30a46c";

    const area = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: up ? "rgba(229,72,77,0.35)" : "rgba(48,164,108,0.35)",
      bottomColor: up ? "rgba(229,72,77,0.02)" : "rgba(48,164,108,0.02)",
      lineWidth: 2,
      priceLineVisible: false,
    });
    area.setData(
      points.map((p) => ({ time: p.time as UTCTimestamp, value: p.price }))
    );

    const avg = chart.addSeries(LineSeries, {
      color: "#f5a524",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    avg.setData(
      points.map((p) => ({ time: p.time as UTCTimestamp, value: p.avgPrice }))
    );

    // 昨收参考线
    area.createPriceLine({
      price: prevClose,
      color: dark ? "#71717a" : "#a1a1aa",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "昨收",
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: Math.floor(w) });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [points, prevClose, dark]);

  return <div ref={containerRef} className="h-[320px] w-full" />;
}
