import type { TodayStats } from "@/lib/admin";
import type { Shop } from "@/lib/shops";
import { STAFF_PASSWORD_HEADER } from "@/lib/staff-auth-header";

// 管理画面から API を呼ぶ関数。
// 結果は「集計」「パスワード違い（unauthorized）」「通信失敗（null）」のどれかで返す。
export type AdminApiResult = TodayStats | "unauthorized" | null;

async function toResult(response: Response): Promise<AdminApiResult> {
  if (response.status === 401) {
    return "unauthorized";
  }
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as TodayStats;
}

export async function fetchStats(password: string): Promise<AdminApiResult> {
  try {
    const response = await fetch("/api/admin/stats", {
      headers: { [STAFF_PASSWORD_HEADER]: password },
      cache: "no-store",
    });
    return await toResult(response);
  } catch {
    return null;
  }
}

export async function postStop(password: string, shop: Shop, stopped: boolean): Promise<AdminApiResult> {
  try {
    const response = await fetch("/api/admin/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json", [STAFF_PASSWORD_HEADER]: password },
      body: JSON.stringify({ shop, stopped }),
    });
    return await toResult(response);
  } catch {
    return null;
  }
}

export async function postResetCounts(password: string): Promise<AdminApiResult> {
  try {
    const response = await fetch("/api/admin/reset-counts", {
      method: "POST",
      headers: { [STAFF_PASSWORD_HEADER]: password },
    });
    return await toResult(response);
  } catch {
    return null;
  }
}
