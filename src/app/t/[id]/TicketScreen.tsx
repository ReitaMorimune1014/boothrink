"use client";

import { useState } from "react";
import { ErrorView } from "@/components/customer/ErrorView";
import styles from "@/components/customer/customer.module.css";
import type { TicketData } from "@/lib/claim";
import type { CustomerErrorReason } from "@/lib/customer-messages";
import { formatJstHourMinute } from "@/lib/format";
import { BENEFITS, SHOP_NAMES } from "@/lib/shops";
import { requestUseTicket } from "./ticket-api";

// 画面の状態。「未使用 → 確認 → 処理中 → 使用済み」と進む
type ScreenState =
  | { kind: "unused" }
  | { kind: "confirming" } // 確認ダイアログを表示中
  | { kind: "submitting" } // 「処理中…」
  | { kind: "used"; shownAt: string } // shownAt: 使用済みの画面を表示した時刻
  | { kind: "error"; reason: CustomerErrorReason };

type Props = {
  id: string;
  ticket: TicketData;
  // サーバーで読んだ時点で使用済みだったか
  initiallyUsed: boolean;
  // サーバーがこのページを作った時刻（＝お客さんが画面を開いた時刻）
  renderedAt: string;
};

export function TicketScreen({ id, ticket, initiallyUsed, renderedAt }: Props) {
  const [state, setState] = useState<ScreenState>(
    initiallyUsed ? { kind: "used", shownAt: renderedAt } : { kind: "unused" },
  );

  async function handleConfirm() {
    setState({ kind: "submitting" });
    // 使用済みかどうかはサーバーが決める。画面はその結果を表示するだけ
    const result = await requestUseTicket(id);
    if (result.ok) {
      // 「使う」を押して使用済みになった場合は、この画面に切り替わった時刻を表示する
      setState({ kind: "used", shownAt: new Date().toISOString() });
    } else {
      setState({ kind: "error", reason: result.reason });
    }
  }

  if (state.kind === "error") {
    return <ErrorView reason={state.reason} />;
  }

  if (state.kind === "used") {
    return (
      <main className={styles.usedScreen}>
        <p className={styles.usedLabel}>使用済み</p>
        <p className={styles.usedDetail}>
          {SHOP_NAMES[ticket.validAt]}：{BENEFITS[ticket.validAt]}
        </p>
        {/* 「使う」を押した時刻ではなく、画面を開いた時刻を出す。
            時刻は進めない。スクリーンショットなら撮ったときの時刻のままなので、今の時刻と比べれば見分けられる */}
        <p className={styles.shownAt}>現在 {formatJstHourMinute(new Date(state.shownAt))}</p>
        <p className={styles.usedDetail}>ご利用ありがとうございました</p>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.ticket}>
        <p className={styles.shopName}>{SHOP_NAMES[ticket.validAt]}で使えます</p>
        <p className={styles.benefit}>{BENEFITS[ticket.validAt]}</p>
        <p className={styles.small}>本日 23:59 まで有効・1食につき1枚</p>
        <p className={styles.small}>{SHOP_NAMES[ticket.issuedBy]}でお買い上げの特典</p>
      </section>

      <button
        type="button"
        className={styles.primaryButton}
        onClick={() => setState({ kind: "confirming" })}
        disabled={state.kind === "submitting"}
      >
        {state.kind === "submitting" ? "処理中…" : "使う"}
      </button>
      <p className={styles.small}>お店で注文するときに、店員さんの前で押してください</p>

      {state.kind === "confirming" && (
        <div className={styles.overlay}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <p id="confirm-title" className={styles.title}>
              店員さんに画面を見せてから押してください
            </p>
            <p className={styles.description}>押すと使用済みになり、元に戻せません。</p>
            <button type="button" className={styles.primaryButton} onClick={handleConfirm}>
              使う
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setState({ kind: "unused" })}>
              やめる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
