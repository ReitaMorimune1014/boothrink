import { NextResponse } from "next/server";
import { markTicketUsed } from "@/lib/ticket";
import { isUuid, pickField, readJsonBody } from "@/lib/validation";

// POST /api/ticket/use  本文: { "id": "..." }
// お客さんが店員の前で「使う」を押したときに呼ぶ。二重利用は 409 で拒否する。
export async function POST(request: Request) {
  const id = pickField(await readJsonBody(request), "id");
  if (!isUuid(id)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await markTicketUsed(id);
  if (result.ok) {
    return NextResponse.json({ usedAt: result.usedAt });
  }

  if (result.reason === "already_used") {
    // 「いつ使われたか」も返す（画面に「○時○分に使用済み」と出せるように）
    return NextResponse.json({ error: result.reason, usedAt: result.usedAt }, { status: 409 });
  }

  // 410 Gone: チケットがもう存在しない（期限切れ） / 409 Conflict: 受付停止中
  const status = result.reason === "expired" ? 410 : 409;
  return NextResponse.json({ error: result.reason }, { status });
}
