import { NextResponse } from "next/server";
import { getTodayStats, setStopped } from "@/lib/admin";
import { isShop } from "@/lib/shops";
import { isStaffRequest } from "@/lib/staff-auth";
import { pickField, readJsonBody } from "@/lib/validation";

// POST /api/admin/stop  本文: { "shop": "ando", "stopped": true }
// 受付停止を切り替える（要パスワード）。
// 「切り替え（今と逆にする）」ではなく「停止する／再開する」をはっきり送ってもらう。
// 2回押したときや、2人が同時に操作したときに、意図と逆の状態になるのを防ぐため。
export async function POST(request: Request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const shop = pickField(body, "shop");
  const stopped = pickField(body, "stopped");
  if (typeof shop !== "string" || !isShop(shop)) {
    return NextResponse.json({ error: "invalid_shop" }, { status: 400 });
  }
  if (typeof stopped !== "boolean") {
    return NextResponse.json({ error: "invalid_stopped" }, { status: 400 });
  }

  await setStopped(shop, stopped);
  // 切り替えたあとの最新の状態を返し、画面をすぐ更新できるようにする
  const stats = await getTodayStats();
  return NextResponse.json(stats);
}
