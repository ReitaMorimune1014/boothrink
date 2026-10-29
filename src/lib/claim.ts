import { randomUUID } from "node:crypto";
import { claimedKey, claimKey, countKey, stopKey, ticketKey } from "@/lib/keys";
import { getRedis } from "@/lib/redis";
import { partnerShop, type Shop } from "@/lib/shops";
import { jstDateString, secondsUntilEndOfDayJst } from "@/lib/time";
import { CLAIM_TTL_SECONDS, CLAIMED_TTL_SECONDS, COUNT_TTL_SECONDS } from "@/lib/ttl";

// 引換券（QR1回分）とチケットの発行。
// HTTP（リクエストやレスポンス）のことはここでは扱わず、API のファイル（route.ts）に任せる。
// こうすると、ここは「Redis をどう読み書きするか」だけに集中でき、テストもしやすい。

// mogiten:claim:{token} に入れる中身
export type ClaimData = {
  issuedBy: Shop; // QRを出した店（＝お客さんが買った店）
  validAt: Shop; // チケットを使える店
};

// mogiten:ticket:{id} に入れる中身
export type TicketData = {
  validAt: Shop;
  issuedBy: Shop;
  createdAt: string; // ISO 8601 形式の発行時刻
};

export type CreateClaimResult = { ok: true; token: string } | { ok: false; reason: "stopped" };

// タブレットに表示する、新しい引換券を作る
export async function createClaim(shop: Shop): Promise<CreateClaimResult> {
  const redis = getRedis();

  if ((await redis.exists(stopKey(shop))) === 1) {
    return { ok: false, reason: "stopped" };
  }

  const token = randomUUID();
  const claim: ClaimData = { issuedBy: shop, validAt: partnerShop(shop) };
  await redis.set(claimKey(token), claim, { ex: CLAIM_TTL_SECONDS });
  return { ok: true, token };
}

export type ClaimStatus = "waiting" | "claimed" | "expired" | "stopped";

// タブレットが2秒ごとに呼ぶ。「まだ読まれていない／読まれた／期限切れ／受付停止中」を返す。
// shop はタブレットの店。受付停止になったら、QRを隠せるように知らせる。
export async function getClaimStatus(token: string, shop: Shop): Promise<ClaimStatus> {
  const redis = getRedis();

  // 3つのキーを1回のコマンド（MGET）で読む。2秒ごとに呼ばれるので、コマンド数を節約する
  const [ticketId, claim, stopped] = await redis.mget<[string | null, ClaimData | null, string | null]>(
    claimedKey(token),
    claimKey(token),
    stopKey(shop),
  );

  // 読み込まれたことは、受付停止よりも優先して知らせる（「発行しました ✓」を出すため）
  if (ticketId) {
    return "claimed";
  }
  if (stopped) {
    return "stopped";
  }
  if (claim) {
    return "waiting";
  }
  return "expired";
}

export type RedeemClaimResult =
  | { ok: true; ticketId: string }
  | { ok: false; reason: "already_claimed" | "expired" | "stopped" };

// お客さんがQRを読んだとき: 引換券を消費して、チケットを1枚発行する
export async function redeemClaim(token: string, now: Date = new Date()): Promise<RedeemClaimResult> {
  const redis = getRedis();

  // ここが二重発行を防ぐ中心。
  // GETDEL は「読む」と「消す」を Redis の中で一度に行うので、同時に2人が読み込んでも、
  // 中身を受け取れるのは最初の1人だけ（2人目には null が返る）。
  // GET → DEL の2回に分けると、2人とも GET に成功してから DEL する、という順番が起こりうる。
  const claim = await redis.getdel<ClaimData>(claimKey(token));

  if (!claim) {
    // 引換券がない理由を見分ける: 誰かがすでに交換した（claimed がある）か、期限切れ・存在しないか
    const issuedTicketId = await redis.get<string>(claimedKey(token));
    if (issuedTicketId) {
      return { ok: false, reason: "already_claimed" };
    }
    return { ok: false, reason: "expired" };
  }

  // QRを表示したあとで受付停止になった場合は、発行しない
  if ((await redis.exists(stopKey(claim.issuedBy))) === 1) {
    return { ok: false, reason: "stopped" };
  }

  const ticketId = randomUUID();
  const ticket: TicketData = {
    validAt: claim.validAt,
    issuedBy: claim.issuedBy,
    createdAt: now.toISOString(),
  };
  const issuedCountKey = countKey(jstDateString(now), claim.issuedBy, "issued");

  // チケット保存・タブレットへの通知・発行数の更新を、MULTI でまとめて実行する。
  // 「チケットは保存されたのに発行数が増えていない」といった中途半端な状態を作らないため。
  await redis
    .multi()
    .set(ticketKey(ticketId), ticket, { ex: secondsUntilEndOfDayJst(now) })
    .set(claimedKey(token), ticketId, { ex: CLAIMED_TTL_SECONDS })
    .incr(issuedCountKey)
    .expire(issuedCountKey, COUNT_TTL_SECONDS)
    .exec();

  return { ok: true, ticketId };
}
