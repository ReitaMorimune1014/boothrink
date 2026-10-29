"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useReducer } from "react";
import type { Shop } from "@/lib/shops";
import { requestClaimStatus, requestNewClaim, type ApiResult } from "./tablet-api";
import { initialTabletState, tabletReducer, type TabletAction } from "./tablet-state";
import styles from "./tablet.module.css";

// 状態確認の間隔。CLAUDE.md の「2秒ごとに状態確認」
const STATUS_CHECK_INTERVAL_MS = 2_000;

// 「発行しました ✓」を表示する時間
const ISSUED_DISPLAY_MS = 1_000;

// 誰も読み込まなくても、QRを入れ替えるまでの時間。
// 引換券のTTL（90秒）ちょうどで入れ替えると、89秒目に読み込んだお客さんは
// ページを開いて「交換」を送るまでの数秒の間に期限が切れてしまう。
// そこで10秒早く入れ替え、読み込んでから交換するまでの余裕を残す。
const QR_ROTATION_MS = 80_000;

// 受付停止中・通信エラー中に、もう一度引換券を取りに行くまでの時間
const RETRY_INTERVAL_MS = 5_000;

type Props = {
  shop: Shop;
  password: string;
  onUnauthorized: () => void;
};

// QRを表示し、読み込まれたら「発行しました ✓」→ 次のQR、を繰り返す部品。
// 状態の移り変わりは tabletReducer に任せ、ここでは「いつ通信するか・いつタイマーを動かすか」だけを書く。
export function TabletQrLoop({ shop, password, onUnauthorized }: Props) {
  const [state, dispatch] = useReducer(tabletReducer, initialTabletState);

  // loading になったら、新しい引換券を取りに行く
  useEffect(() => {
    if (state.kind !== "loading") {
      return;
    }
    // 結果が届く前に画面が別の状態に移ったら、その結果は使わない
    let cancelled = false;
    requestNewClaim(shop, password).then((result) => {
      if (!cancelled) {
        handleResult(result);
      }
    });
    return () => {
      cancelled = true;
    };

    function handleResult(result: ApiResult) {
      if (result === "unauthorized") {
        onUnauthorized();
      } else {
        dispatch(result);
      }
    }
  }, [state.kind, shop, password, onUnauthorized]);

  // QRを表示している間: 2秒ごとに状態を確認し、時間が来たら入れ替える
  const showingToken = state.kind === "showing" ? state.token : null;
  useEffect(() => {
    if (showingToken === null) {
      return;
    }
    const token = showingToken;
    let cancelled = false;
    let checkTimer: ReturnType<typeof setTimeout> | undefined;

    // setInterval ではなく「確認が終わってから次の確認を予約する」形にする。
    // 電波が悪くて1回の確認に2秒以上かかっても、確認が何本も同時に走らないようにするため。
    async function checkStatus() {
      const result = await requestClaimStatus(token, shop, password);
      if (cancelled) {
        return;
      }
      if (result === "unauthorized") {
        onUnauthorized();
        return;
      }
      if (result) {
        dispatch(result);
      }
      checkTimer = setTimeout(checkStatus, STATUS_CHECK_INTERVAL_MS);
    }
    checkTimer = setTimeout(checkStatus, STATUS_CHECK_INTERVAL_MS);

    const rotation: TabletAction = { type: "rotationTimeReached", token };
    const rotationTimer = setTimeout(() => dispatch(rotation), QR_ROTATION_MS);

    return () => {
      cancelled = true;
      clearTimeout(checkTimer);
      clearTimeout(rotationTimer);
    };
  }, [showingToken, shop, password, onUnauthorized]);

  // 「発行しました ✓」を1秒見せたら、次のQRへ
  useEffect(() => {
    if (state.kind !== "issued") {
      return;
    }
    const timer = setTimeout(() => dispatch({ type: "issuedShown" }), ISSUED_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [state.kind]);

  // 受付停止中・通信エラー中は、少し待ってからもう一度試す（受付が再開されたら自動でQRが出る）
  useEffect(() => {
    if (state.kind !== "stopped" && state.kind !== "error") {
      return;
    }
    const timer = setTimeout(() => dispatch({ type: "retryTimeReached" }), RETRY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [state.kind]);

  switch (state.kind) {
    case "loading":
      return <p className={styles.message}>QRを準備中…</p>;

    case "showing":
      return (
        <>
          {/* QRの中身はお客さんが開くURL。そのページから POST /api/claim を送って、引換券をチケットに交換する。
              window はブラウザにしかないが、この部品はパスワードを読めたあと（＝ブラウザの中）でしか描画されないので使える */}
          <QRCodeSVG
            className={styles.qr}
            value={`${window.location.origin}/c/${state.token}`}
            size={512}
            level="M"
            marginSize={2}
          />
          <p className={styles.message}>スマホのカメラで読み込んでください</p>
        </>
      );

    case "issued":
      return <p className={styles.issued}>発行しました ✓</p>;

    case "stopped":
      return <p className={styles.message}>ただいま受付を停止しています</p>;

    case "error":
      return <p className={styles.message}>通信できません。再接続しています…</p>;
  }
}
