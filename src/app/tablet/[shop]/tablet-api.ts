import type { ClaimStatus } from "@/lib/claim";
import type { Shop } from "@/lib/shops";
import { STAFF_PASSWORD_HEADER } from "@/lib/staff-auth-header";
import type { TabletAction } from "./tablet-state";

// タブレットから API を呼ぶ関数。
// 結果を「起きたこと（TabletAction）」に変えて返すので、画面側はそれを dispatch するだけでよい。
// パスワードが違う（401）ときだけは、QRを回す話ではなくパスワード入力に戻す話なので "unauthorized" を返す。

export type ApiResult = TabletAction | "unauthorized";

export async function requestNewClaim(shop: Shop, password: string): Promise<ApiResult> {
  try {
    const response = await fetch("/api/claim/new", {
      method: "POST",
      headers: { "Content-Type": "application/json", [STAFF_PASSWORD_HEADER]: password },
      body: JSON.stringify({ shop }),
    });

    if (response.status === 401) {
      return "unauthorized";
    }
    if (response.status === 409) {
      return { type: "claimRefusedBecauseStopped" };
    }
    if (!response.ok) {
      return { type: "failed" };
    }

    const body = (await response.json()) as { token: string };
    return { type: "claimCreated", token: body.token };
  } catch {
    // 電波が悪いなどで、サーバーまで届かなかった
    return { type: "failed" };
  }
}

// 状態確認は2秒ごとに何度も呼ぶので、1回失敗しても画面はそのまま（null を返して何もしない）。
// 次の確認で取れればよい。
export async function requestClaimStatus(
  token: string,
  shop: Shop,
  password: string,
): Promise<ApiResult | null> {
  try {
    const query = new URLSearchParams({ token, shop });
    const response = await fetch(`/api/claim/status?${query.toString()}`, {
      headers: { [STAFF_PASSWORD_HEADER]: password },
      cache: "no-store",
    });

    if (response.status === 401) {
      return "unauthorized";
    }
    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { status: ClaimStatus };
    return { type: "statusChecked", token, status: body.status };
  } catch {
    return null;
  }
}
