import { NextResponse } from "next/server";
import { getTodayStats, resetTodayCounts } from "@/lib/admin";
import { isStaffRequest } from "@/lib/staff-auth";

// POST /api/admin/reset-counts
// 今日の発行数・使用数を0に戻す（要パスワード）。
// 状態を変える操作なので GET ではなく POST にする（リンクを開いただけで消えないように）
export async function POST(request: Request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await resetTodayCounts();
  // 戻したあとの最新の状態を返し、画面をすぐ更新できるようにする
  const stats = await getTodayStats();
  return NextResponse.json(stats);
}
