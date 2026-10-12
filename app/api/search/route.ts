import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/sources/registry";
import type { Market } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/search?q=茅台&market=CN */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const market = (searchParams.get("market") ?? "ALL") as Market | "ALL";
    const results = await getDataSource().search(q, market);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "搜索失败" },
      { status: 500 }
    );
  }
}
