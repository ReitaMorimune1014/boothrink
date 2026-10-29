import { NextResponse } from "next/server";
import { getTicket } from "@/lib/ticket";
import { isUuid } from "@/lib/validation";

// GET /api/ticket/{id}
// お客さんのチケット画面が、チケットの状態（unused / used / stopped / expired）を取得する。
// GET なので状態は変えない（読むだけ）。
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  // Next.js 15 以降、URL の [id] の部分は Promise で渡される
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const view = await getTicket(id);
  // 使用済みになった直後に古い「未使用」が表示されないよう、キャッシュさせない
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
}
