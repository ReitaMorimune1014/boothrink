import { beforeEach, describe, expect, it } from "vitest";
import { createClaim, getClaimStatus, redeemClaim, type ClaimData, type TicketData } from "@/lib/claim";
import { claimKey, countKey, stopKey, ticketKey } from "@/lib/keys";
import { getRedis } from "@/lib/redis";
import { jstDateString } from "@/lib/time";
import { keysMatching, resetRedis } from "../../test/redis-helpers";

// このファイルのテストは、本物の Redis を使う（test/global-setup.ts を参照）

beforeEach(async () => {
  await resetRedis();
});

async function newToken(shop: "ando" | "hayashi" = "ando"): Promise<string> {
  const result = await createClaim(shop);
  if (!result.ok) {
    throw new Error("引換券を作れませんでした");
  }
  return result.token;
}

describe("createClaim", () => {
  it("買った店と使える店を入れた引換券を、90秒のTTLで作る", async () => {
    const token = await newToken("ando");
    const redis = getRedis();

    expect(await redis.get<ClaimData>(claimKey(token))).toEqual({ issuedBy: "ando", validAt: "hayashi" });
    const ttl = await redis.ttl(claimKey(token));
    expect(ttl).toBeGreaterThan(85);
    expect(ttl).toBeLessThanOrEqual(90);
  });

  it("受付停止中の店では作らない", async () => {
    await getRedis().set(stopKey("ando"), "1");

    expect(await createClaim("ando")).toEqual({ ok: false, reason: "stopped" });
    // 止めていない店は今まで通り作れる
    expect((await createClaim("hayashi")).ok).toBe(true);
  });
});

describe("getClaimStatus", () => {
  it("作っただけなら waiting → 交換されたら claimed", async () => {
    const token = await newToken();
    expect(await getClaimStatus(token)).toBe("waiting");

    await redeemClaim(token);
    expect(await getClaimStatus(token)).toBe("claimed");
  });

  it("存在しない引換券は expired", async () => {
    expect(await getClaimStatus(crypto.randomUUID())).toBe("expired");
  });
});

describe("redeemClaim", () => {
  it("チケットを発行し、当日の発行数を1増やす", async () => {
    const now = new Date("2026-11-01T14:00:00+09:00");
    const token = await newToken("hayashi");

    const result = await redeemClaim(token, now);
    if (!result.ok) {
      throw new Error("発行に失敗しました");
    }

    const redis = getRedis();
    expect(await redis.get<TicketData>(ticketKey(result.ticketId))).toEqual({
      validAt: "ando",
      issuedBy: "hayashi",
      createdAt: now.toISOString(),
    });
    expect(await redis.get<number>(countKey(jstDateString(now), "hayashi", "issued"))).toBe(1);
    // 引換券は消えている（もう一度は使えない）
    expect(await redis.exists(claimKey(token))).toBe(0);
  });

  it("チケットは当日の終わり（日本時間の翌0:00）まで残る", async () => {
    const token = await newToken();
    // 実際の時刻で動かして、TTLが1日を超えず、0より大きいことを確かめる
    const result = await redeemClaim(token);
    if (!result.ok) {
      throw new Error("発行に失敗しました");
    }
    const ttl = await getRedis().ttl(ticketKey(result.ticketId));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it("同じ引換券をもう一度使うと already_claimed", async () => {
    const token = await newToken();
    await redeemClaim(token);

    expect(await redeemClaim(token)).toEqual({ ok: false, reason: "already_claimed" });
  });

  it("存在しない（期限切れの）引換券は expired", async () => {
    expect(await redeemClaim(crypto.randomUUID())).toEqual({ ok: false, reason: "expired" });
  });

  it("QRを表示したあとに受付停止になったら、発行しない", async () => {
    const token = await newToken("ando");
    await getRedis().set(stopKey("ando"), "1");

    expect(await redeemClaim(token)).toEqual({ ok: false, reason: "stopped" });
    expect(await keysMatching("mogiten:ticket:*")).toHaveLength(0);
  });
});

describe("同時アクセス", () => {
  it("同じQRを2人が同時に読み込んでも、チケットは1枚だけ発行される", async () => {
    const now = new Date();
    const token = await newToken("ando");

    // Promise.all で2つの交換を「同時に」走らせる（片方の完了を待たずにもう片方を始める）
    const results = await Promise.all([redeemClaim(token, now), redeemClaim(token, now)]);

    const succeeded = results.filter((result) => result.ok);
    expect(succeeded).toHaveLength(1);
    expect(await keysMatching("mogiten:ticket:*")).toHaveLength(1);
    expect(await getRedis().get<number>(countKey(jstDateString(now), "ando", "issued"))).toBe(1);
  });

  it("20人が同時に読み込んでも、チケットは1枚だけ", async () => {
    const token = await newToken();

    const attempts = Array.from({ length: 20 }, () => redeemClaim(token));
    const results = await Promise.all(attempts);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await keysMatching("mogiten:ticket:*")).toHaveLength(1);
    for (const result of results) {
      if (!result.ok) {
        // 負けた側は「交換済み」か、勝った側の書き込みが終わる直前に確認した場合は「期限切れ」になる
        expect(["already_claimed", "expired"]).toContain(result.reason);
      }
    }
  });

  it("（確認用）GET → DEL の2段階にすると二重発行が起きる。上のテストはこれを見分けられる", async () => {
    const redis = getRedis();
    const token = await newToken();

    // わざと「確認してから消す」書き方にした、まちがった交換処理
    async function naiveRedeem(): Promise<boolean> {
      const claim = await redis.get<ClaimData>(claimKey(token));
      if (!claim) {
        return false;
      }
      await redis.del(claimKey(token));
      return true;
    }

    const results = await Promise.all([naiveRedeem(), naiveRedeem()]);
    // 2人とも GET に成功してから DEL するので、2人とも「交換できた」になってしまう
    expect(results).toEqual([true, true]);
  });
});
