import { NextResponse } from "next/server";
import { redeemClaim } from "@/lib/claim";
import { isUuid, pickField, readJsonBody } from "@/lib/validation";

// POST /api/claim  本文: { "token": "..." }
// お客さんのスマホが、QRの引換券をチケットに交換する。
// GET ではなく POST にしているのは、リンクのプレビューやプリフェッチ（GETで勝手に開かれる）で
// 引換券が消費されないようにするため。
export async function POST(request: Request) {
  const token = pickField(await readJsonBody(request), "token");
  if (!isUuid(token)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await redeemClaim(token);
  if (result.ok) {
    return NextResponse.json({ ticketId: result.ticketId });
  }

  // 410 Gone: 引換券がもう存在しない（期限切れ）
  // 409 Conflict: すでに誰かが交換した／受付停止中
  const status = result.reason === "expired" ? 410 : 409;
  return NextResponse.json({ error: result.reason }, { status });
}
