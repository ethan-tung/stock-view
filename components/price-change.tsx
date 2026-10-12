import { cn } from "@/lib/utils";
import { fmtChange, fmtPct } from "@/lib/format";

/** 涨跌幅文本：上涨红色，下跌绿色（A股习惯） */
export function PriceChange({
  change,
  changePct,
  className,
  showArrow = true,
}: {
  change: number;
  changePct: number;
  className?: string;
  showArrow?: boolean;
}) {
  const isUp = change > 0;
  const isFlat = change === 0;
  const arrow = !showArrow || isFlat ? "" : isUp ? "▲ " : "▼ ";
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        isUp && "text-up",
        !isUp && !isFlat && "text-down",
        isFlat && "text-muted-foreground",
        className
      )}
    >
      {arrow}
      {fmtChange(change)} ({fmtPct(changePct)})
    </span>
  );
}
