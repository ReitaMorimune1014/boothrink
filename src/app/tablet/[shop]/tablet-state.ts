import type { ClaimStatus } from "@/lib/claim";

// タブレットでQRを回す部分の「今どの状態か」と「何が起きたら、どの状態に移るか」。
//
// なぜ画面の部品（TabletQrLoop）から分けるのか:
// - QRの入れ替え・読み込みの検知・受付停止など、状態の移り変わりがこの画面でいちばん複雑な部分
// - タイマーや通信と混ぜると読みにくく、テストもしにくい
// - ここは「今の状態 + 起きたこと → 次の状態」を返すだけの関数なので、ブラウザなしでテストできる
//
// パスワードの入力は、この外（TabletScreen）で扱う。ここはパスワードがある前提で動く。

export type TabletState =
  | { kind: "loading" } // 新しい引換券を取りに行っている
  | { kind: "showing"; token: string } // QRを表示中
  | { kind: "issued" } // 「発行しました ✓」を表示中
  | { kind: "stopped" } // 受付停止中（QRを隠す）
  | { kind: "error" }; // 通信できない

export type TabletAction =
  | { type: "claimCreated"; token: string }
  | { type: "claimRefusedBecauseStopped" }
  | { type: "statusChecked"; token: string; status: ClaimStatus }
  | { type: "rotationTimeReached"; token: string } // 誰も読み込まないまま、入れ替える時間になった
  | { type: "issuedShown" } // 「発行しました ✓」を1秒表示し終えた
  | { type: "retryTimeReached" } // 受付停止中・通信エラー中に、もう一度試す時間になった
  | { type: "failed" };

export const initialTabletState: TabletState = { kind: "loading" };

export function tabletReducer(state: TabletState, action: TabletAction): TabletState {
  switch (action.type) {
    case "claimCreated":
      return { kind: "showing", token: action.token };

    case "claimRefusedBecauseStopped":
      return { kind: "stopped" };

    case "failed":
      return { kind: "error" };

    case "statusChecked":
      // 入れ替える前の古いQRの結果が遅れて届くことがある。今表示しているQRの結果だけを使う
      if (state.kind !== "showing" || state.token !== action.token) {
        return state;
      }
      if (action.status === "claimed") {
        return { kind: "issued" };
      }
      if (action.status === "stopped") {
        return { kind: "stopped" };
      }
      if (action.status === "expired") {
        return { kind: "loading" };
      }
      // waiting: 何も変えない（同じ state を返すと、React は画面を描き直さない）
      return state;

    case "rotationTimeReached":
      if (state.kind !== "showing" || state.token !== action.token) {
        return state;
      }
      return { kind: "loading" };

    case "issuedShown":
      if (state.kind !== "issued") {
        return state;
      }
      return { kind: "loading" };

    case "retryTimeReached":
      if (state.kind !== "stopped" && state.kind !== "error") {
        return state;
      }
      return { kind: "loading" };
  }
}
