import { countKey, stopKey } from "@/lib/keys";
import { getRedis } from "@/lib/redis";
import type { Shop } from "@/lib/shops";
import { jstDateString, secondsUntilEndOfDayJst } from "@/lib/time";

// 管理画面で使う、今日の集計と受付停止の切り替え。

export type ShopStats = {
  issued: number; // この店のQRから発行したチケットの枚数
  used: number; // この店で使われたチケットの枚数
  stopped: boolean; // 受付停止中か
};

export type TodayStats = {
  date: string; // "YYYY-MM-DD"（日本時間）
  shops: Record<Shop, ShopStats>;
};

// MGET で読んだ値（数値・文字列・null）を、1店ぶんの集計にする
function toShopStats(issued: unknown, used: unknown, stop: unknown): ShopStats {
  return {
    // まだ1枚も発行していない日は、キー自体がないので null になる。そのときは 0 枚
    issued: Number(issued ?? 0),
    used: Number(used ?? 0),
    // キーがなければ null。型の上では undefined の可能性もあるので、両方とも「受付中」として扱う
    stopped: stop !== null && stop !== undefined,
  };
}

export async function getTodayStats(now: Date = new Date()): Promise<TodayStats> {
  const redis = getRedis();
  const date = jstDateString(now);

  // 両店の「発行数・使用数・受付停止」の6つのキーを、MGET 1回でまとめて読む。
  // 店は2つしかないので、ループで組み立てず、6つに名前をつけて受け取る（どれが何か読んでわかるように）
  const [andoIssued, andoUsed, andoStop, hayashiIssued, hayashiUsed, hayashiStop] = await redis.mget<
    (number | string | null)[]
  >(
    countKey(date, "ando", "issued"),
    countKey(date, "ando", "used"),
    stopKey("ando"),
    countKey(date, "hayashi", "issued"),
    countKey(date, "hayashi", "used"),
    stopKey("hayashi"),
  );

  return {
    date,
    shops: {
      ando: toShopStats(andoIssued, andoUsed, andoStop),
      hayashi: toShopStats(hayashiIssued, hayashiUsed, hayashiStop),
    },
  };
}

// 受付停止の切り替え。
// 停止は当日の終わりで自動的に解除する（次の日に止めたまま始まってしまうのを防ぐ）
export async function setStopped(shop: Shop, stopped: boolean, now: Date = new Date()): Promise<void> {
  const redis = getRedis();
  if (stopped) {
    await redis.set(stopKey(shop), "1", { ex: secondsUntilEndOfDayJst(now) });
  } else {
    await redis.del(stopKey(shop));
  }
}
