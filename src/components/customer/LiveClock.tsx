"use client";

import { useSyncExternalStore } from "react";
import { formatJstTime } from "@/lib/format";
import styles from "./customer.module.css";

// 1秒ごとに「時計が進んだ」と React に知らせる
function subscribeEverySecond(onTick: () => void): () => void {
  const timer = setInterval(onTick, 1_000);
  return () => clearInterval(timer);
}

// 秒単位に切り捨てる。同じ1秒の間は同じ値を返すので、React がむだに描き直さない
function currentSecond(): number {
  return Math.floor(Date.now() / 1_000);
}

// 現在時刻を秒まで表示する時計。
// 使用済み画面に出して、スクリーンショット（時刻が止まっている）ではないことを店員さんが確かめられるようにする。
//
// サーバーで描画するときは時刻を出さない（null）。サーバーとスマホで時刻がずれると、React が「描画結果が違う」と警告するため
export function LiveClock() {
  const second = useSyncExternalStore(subscribeEverySecond, currentSecond, () => null);
  return <p className={styles.clock}>{second === null ? "--:--:--" : formatJstTime(new Date(second * 1_000))}</p>;
}
