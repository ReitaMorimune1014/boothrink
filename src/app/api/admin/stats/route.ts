import { NextResponse } from "next/server";
import { getTodayStats } from "@/lib/admin";
import { isStaffRequest } from "@/lib/staff-auth";

// GET /api/admin/stats
// 管理画面が、今日の発行数・使用数・受付停止の状態を取得する（要パスワード）
export async function GET(request: Request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = await getTodayStats();
  // 管理画面は数を見に来るので、いつも最新を返す
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
