import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/sources/registry";

export const dynamic = "force-dynamic";

/** GET /api/indices */
export async function GET() {
  try {
    const indices = await getDataSource().getIndices();
    return NextResponse.json({ indices });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取指数失败" },
      { status: 500 }
    );
  }
}
