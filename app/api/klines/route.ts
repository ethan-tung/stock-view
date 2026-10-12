import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/sources/registry";
import { KLINE_RANGE_LABEL, type KlineRange } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANGES = Object.keys(KLINE_RANGE_LABEL) as KlineRange[];

/** GET /api/klines?symbol=600519&range=3M */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const range = (searchParams.get("range") ?? "3M") as KlineRange;
    if (!symbol) {
      return NextResponse.json({ error: "缺少 symbol 参数" }, { status: 400 });
    }
    if (!RANGES.includes(range)) {
      return NextResponse.json(
        { error: `range 参数无效，支持: ${RANGES.join(", ")}` },
        { status: 400 }
      );
    }
    const klines = await getDataSource().getKlines(symbol, range);
    return NextResponse.json({ klines });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取K线数据失败";
    const status = message.startsWith("未知代码") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
