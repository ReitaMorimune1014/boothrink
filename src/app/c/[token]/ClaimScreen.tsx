"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorView } from "@/components/customer/ErrorView";
import styles from "@/components/customer/customer.module.css";
import { loadClaimedTicketId, saveClaimedTicketId } from "@/lib/claimed-ticket-storage";
import type { CustomerErrorReason } from "@/lib/customer-messages";
import { requestRedeem } from "./claim-api";

// QRを読み込んだお客さんが最初に開く画面。
// ページを開いた（GET）だけでは何も変わらない。ブラウザでこの部品が動いてから POST /api/claim を送って、引換券をチケットに交換する。
// リンクのプレビューやプリフェッチは、ページを取得するだけでこの JavaScript を動かさないので、引換券を消費しない。
export function ClaimScreen({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<CustomerErrorReason | null>(null);

  // 交換を1回だけ送るための印。
  // 開発中の React（StrictMode）は、確認のために useEffect を2回動かす。2回送ると、2回目は「使用済み」になってしまう。
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    // このQRで受け取り済みなら、サーバーに送らずに自分のチケットへ（再読み込み・「戻る」の対策）
    const remembered = loadClaimedTicketId(token);
    if (remembered) {
      router.replace(`/t/${remembered}`);
      return;
    }

    requestRedeem(token).then((result) => {
      if (result.ok) {
        saveClaimedTicketId(token, result.ticketId);
        // replace にすると、チケット画面から「戻る」を押してもこの画面に戻らない
        router.replace(`/t/${result.ticketId}`);
      } else {
        setError(result.reason);
      }
    });
  }, [token, router]);

  if (error) {
    return <ErrorView reason={error} />;
  }

  return (
    <main className={styles.screen}>
      <p className={styles.message}>チケットを発行しています…</p>
    </main>
  );
}
