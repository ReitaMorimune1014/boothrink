import { createClaim, redeemClaim } from "@/lib/claim";
import { getRedis } from "@/lib/redis";
import type { Shop } from "@/lib/shops";

// テスト用の Redis（15番のDB）を空にする。各テストの前に呼び、前のテストのデータを持ち越さない
export async function resetRedis(): Promise<void> {
  await getRedis().flushdb();
}

// パターンに合うキーの一覧（テストで「チケットが何枚できたか」を数えるため）
export async function keysMatching(pattern: string): Promise<string[]> {
  return getRedis().keys(pattern);
}

// 本物の流れ（引換券を作る → 交換する）でチケットを1枚発行し、そのIDを返す
export async function issueTicket(shop: Shop = "ando", now: Date = new Date()): Promise<string> {
  const claim = await createClaim(shop);
  if (!claim.ok) {
    throw new Error("引換券を作れませんでした");
  }
  const redeemed = await redeemClaim(claim.token, now);
  if (!redeemed.ok) {
    throw new Error("チケットを発行できませんでした");
  }
  return redeemed.ticketId;
}
