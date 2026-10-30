"use client";

import { useCallback, useEffect, useState } from "react";
import type { TodayStats } from "@/lib/admin";
import { formatJstTime } from "@/lib/format";
import { SHOP_NAMES, SHOPS, type Shop } from "@/lib/shops";
import { fetchStats, postResetCounts, postStop, type AdminApiResult } from "./admin-api";
import styles from "./admin.module.css";

// 数を自動で更新する間隔。
// 管理画面はずっと開いておく前提なので、Redis のコマンド数を抑えるため、タブレット（2秒）より長くする
const REFRESH_INTERVAL_MS = 10_000;

// 受付停止ボタンの文言
function toggleLabel(isPending: boolean, stopped: boolean): string {
  if (isPending) {
    return "処理中…";
  }
  if (stopped) {
    return "受付を再開する";
  }
  return "受付を停止する";
}

type Props = {
  password: string;
  onUnauthorized: () => void;
};

export function AdminDashboard({ password, onUnauthorized }: Props) {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [networkError, setNetworkError] = useState(false);
  // 受付停止の切り替え中の店（「処理中…」を出し、二度押しを防ぐ）
  const [pendingShop, setPendingShop] = useState<Shop | null>(null);
  // 数のリセット中（「処理中…」を出し、二度押しを防ぐ）
  const [resetting, setResetting] = useState(false);

  // API の結果を画面に反映する。取得でも切り替えでも同じ形で返ってくるので、1か所にまとめる。
  // useCallback で包むのは、下の useEffect の依存に入れるため（包まないと描画のたびに取得がやり直しになる）
  const applyResult = useCallback(
    (result: AdminApiResult) => {
      if (result === "unauthorized") {
        onUnauthorized();
        return;
      }
      if (result === null) {
        // 通信に失敗しても、前に取れた数はそのまま見せておく
        setNetworkError(true);
        return;
      }
      setStats(result);
      setUpdatedAt(new Date());
      setNetworkError(false);
    },
    [onUnauthorized],
  );

  // 開いたときと、そのあと10秒ごとに数を取りに行く
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // 「取り終わってから次を予約する」形にして、遅い回線で取得が重ならないようにする
    async function refresh() {
      const result = await fetchStats(password);
      if (cancelled) {
        return;
      }
      applyResult(result);
      timer = setTimeout(refresh, REFRESH_INTERVAL_MS);
    }
    refresh();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password, applyResult]);

  async function handleToggle(shop: Shop, nextStopped: boolean) {
    // 停止はお客さんに影響が大きいので、押し間違いを防ぐために確認する。再開は確認しない
    if (nextStopped && !window.confirm(`${SHOP_NAMES[shop]}の受付を停止しますか？`)) {
      return;
    }
    setPendingShop(shop);
    applyResult(await postStop(password, shop, nextStopped));
    setPendingShop(null);
  }

  async function handleResetCounts() {
    // 元に戻せない操作なので、何が消えて何が残るかを書いて確認する
    const confirmed = window.confirm(
      "今日の発行数・使用数を、両店とも0に戻しますか？\n\n配ったチケットはそのまま使えます。数は元に戻せません。",
    );
    if (!confirmed) {
      return;
    }
    setResetting(true);
    applyResult(await postResetCounts(password));
    setResetting(false);
  }

  if (stats === null) {
    return <p className={styles.message}>{networkError ? "通信できません。再接続しています…" : "読み込み中…"}</p>;
  }

  return (
    <>
      <p className={styles.meta}>
        {stats.date} の集計
        {updatedAt && `（${formatJstTime(updatedAt)} 更新）`}
      </p>
      {networkError && <p className={styles.warning}>通信できません。表示は最後に取得できた数です</p>}

      <div className={styles.cards}>
        {SHOPS.map((shop) => {
          const shopStats = stats.shops[shop];
          const isPending = pendingShop === shop;
          return (
            <section key={shop} className={styles.card}>
              <h2 className={styles.shopName}>{SHOP_NAMES[shop]}</h2>
              <dl className={styles.numbers}>
                <div>
                  <dt>発行（この店のQRから）</dt>
                  <dd>{shopStats.issued} 枚</dd>
                </div>
                <div>
                  <dt>使用（この店で）</dt>
                  <dd>{shopStats.used} 枚</dd>
                </div>
              </dl>
              <p className={shopStats.stopped ? styles.stopped : styles.open}>
                {shopStats.stopped ? "受付停止中" : "受付中"}
              </p>
              <button
                type="button"
                className={shopStats.stopped ? styles.resumeButton : styles.stopButton}
                onClick={() => handleToggle(shop, !shopStats.stopped)}
                disabled={isPending}
              >
                {toggleLabel(isPending, shopStats.stopped)}
              </button>
            </section>
          );
        })}
      </div>

      {/* 押し間違えないよう、店ごとのボタンから離して一番下に置く */}
      <section className={styles.resetArea}>
        <p className={styles.resetNote}>リハーサルや負荷テストのあとに、今日の数を0に戻します（チケットは消えません）</p>
        <button type="button" className={styles.resetButton} onClick={handleResetCounts} disabled={resetting}>
          {resetting ? "処理中…" : "今日の数を0に戻す"}
        </button>
      </section>
    </>
  );
}
