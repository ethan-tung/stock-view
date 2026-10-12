import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/sources/registry";

export const dynamic = "force-dynamic";

/** GET /api/quote?symbol=600519 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    if (!symbol) {
      return NextResponse.json({ error: "缺少 symbol 参数" }, { status: 400 });
    }
    const quote = await getDataSource().getQuote(symbol);
    return NextResponse.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取报价失败";
    const status = message.startsWith("未知代码") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
