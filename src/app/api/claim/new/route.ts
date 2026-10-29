import { NextResponse } from "next/server";
import { createClaim } from "@/lib/claim";
import { isShop } from "@/lib/shops";
import { isStaffRequest } from "@/lib/staff-auth";
import { pickField, readJsonBody } from "@/lib/validation";
import { CLAIM_TTL_SECONDS } from "@/lib/ttl";

// POST /api/claim/new  本文: { "shop": "ando" }
// タブレットが、表示するQR用の新しい引換券を作る（要パスワード）
export async function POST(request: Request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const shop = pickField(await readJsonBody(request), "shop");
  if (typeof shop !== "string" || !isShop(shop)) {
    return NextResponse.json({ error: "invalid_shop" }, { status: 400 });
  }

  const result = await createClaim(shop);
  if (!result.ok) {
    // 409 Conflict: リクエストは正しいが、今の状態（受付停止中）では受け付けられない
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({ token: result.token, expiresInSeconds: CLAIM_TTL_SECONDS });
}
