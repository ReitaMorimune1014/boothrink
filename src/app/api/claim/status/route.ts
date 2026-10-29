import { NextResponse } from "next/server";
import { getClaimStatus } from "@/lib/claim";
import { isShop } from "@/lib/shops";
import { isStaffRequest } from "@/lib/staff-auth";
import { isUuid } from "@/lib/validation";

// GET /api/claim/status?token=...&shop=ando
// タブレットが2秒ごとに呼び、QRが読み込まれたかを確かめる（要パスワード）。
// GET なので状態は変えない（読むだけ）。
export async function GET(request: Request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const token = params.get("token");
  if (!isUuid(token)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  const shop = params.get("shop");
  if (shop === null || !isShop(shop)) {
    return NextResponse.json({ error: "invalid_shop" }, { status: 400 });
  }

  const status = await getClaimStatus(token, shop);
  // 毎回最新の状態が必要なので、ブラウザや途中のサーバーにキャッシュさせない
  return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
}
