import { beforeEach, describe, expect, it } from "vitest";
import { countKey, stopKey, usedKey } from "@/lib/keys";
import { getRedis } from "@/lib/redis";
import { getTicket, markTicketUsed } from "@/lib/ticket";
import { jstDateString } from "@/lib/time";
import { issueTicket, resetRedis } from "../../test/redis-helpers";

// このファイルのテストは、本物の Redis を使う（test/global-setup.ts を参照）

beforeEach(async () => {
  await resetRedis();
});

describe("getTicket", () => {
  it("発行したばかりなら unused。どこで使えるかもわかる", async () => {
    const id = await issueTicket("ando");

    const view = await getTicket(id);
    expect(view.status).toBe("unused");
    if (view.status === "unused") {
      expect(view.ticket.issuedBy).toBe("ando");
      expect(view.ticket.validAt).toBe("hayashi");
    }
  });

  it("使ったあとは used と使用時刻", async () => {
    const id = await issueTicket();
    const usedAt = new Date("2026-11-01T13:00:00+09:00");
    await markTicketUsed(id, usedAt);

    const view = await getTicket(id);
    expect(view).toMatchObject({ status: "used", usedAt: usedAt.toISOString() });
  });

  it("存在しない（当日が終わって消えた）チケットは expired", async () => {
    expect(await getTicket(crypto.randomUUID())).toEqual({ status: "expired" });
  });

  it("使える店が受付停止中なら stopped。買った店の停止は関係ない", async () => {
    // ando で買ったチケットは hayashi で使う
    const id = await issueTicket("ando");

    await getRedis().set(stopKey("ando"), "1");
    expect((await getTicket(id)).status).toBe("unused");

    await getRedis().set(stopKey("hayashi"), "1");
    expect((await getTicket(id)).status).toBe("stopped");
  });

  it("使用済みは、受付停止よりも優先して見せる", async () => {
    const id = await issueTicket("ando");
    await markTicketUsed(id);
    await getRedis().set(stopKey("hayashi"), "1");

    expect((await getTicket(id)).status).toBe("used");
  });
});

describe("markTicketUsed", () => {
  it("使用時刻を保存し、使われた店の使用数を1増やす", async () => {
    const now = new Date("2026-11-01T15:30:00+09:00");
    const id = await issueTicket("hayashi");

    expect(await markTicketUsed(id, now)).toEqual({ ok: true, usedAt: now.toISOString() });

    const redis = getRedis();
    expect(await redis.get<string>(usedKey(id))).toBe(now.toISOString());
    // hayashi で買ったチケットは ando で使うので、ando の使用数が増える
    expect(await redis.get<number>(countKey(jstDateString(now), "ando", "used"))).toBe(1);
    expect(await redis.get<number>(countKey(jstDateString(now), "hayashi", "used"))).toBeNull();
  });

  it("使用済みの記録は、当日の終わりまで残る", async () => {
    const id = await issueTicket();
    await markTicketUsed(id);

    const ttl = await getRedis().ttl(usedKey(id));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it("2回目は already_used。最初に使った時刻を返す", async () => {
    const id = await issueTicket();
    const first = new Date("2026-11-01T12:00:00+09:00");
    await markTicketUsed(id, first);

    const second = await markTicketUsed(id, new Date("2026-11-01T12:05:00+09:00"));
    expect(second).toEqual({ ok: false, reason: "already_used", usedAt: first.toISOString() });
  });

  it("存在しないチケットは expired", async () => {
    expect(await markTicketUsed(crypto.randomUUID())).toEqual({ ok: false, reason: "expired" });
  });

  it("使える店が受付停止中なら stopped で、使用済みにもしない", async () => {
    const id = await issueTicket("ando");
    await getRedis().set(stopKey("hayashi"), "1");

    expect(await markTicketUsed(id)).toEqual({ ok: false, reason: "stopped" });
    expect(await getRedis().exists(usedKey(id))).toBe(0);
  });
});

describe("同時アクセス", () => {
  it("同じチケットで同時に2回「使う」を押しても、成功は1回だけ", async () => {
    const now = new Date();
    const id = await issueTicket("ando");

    const results = await Promise.all([markTicketUsed(id, now), markTicketUsed(id, now)]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.reason === "already_used")).toHaveLength(1);
    // 使用数も1しか増えていない
    expect(await getRedis().get<number>(countKey(jstDateString(now), "hayashi", "used"))).toBe(1);
  });

  it("20回同時に押しても、成功は1回だけ。全員に同じ使用時刻を返す", async () => {
    const id = await issueTicket();

    // 1回ずつ違う時刻で押したことにして、「最初の1回の時刻」が全員に返ることを確かめる
    const attempts = Array.from({ length: 20 }, (_, i) =>
      markTicketUsed(id, new Date(Date.UTC(2026, 10, 1, 3, 0, i))),
    );
    const results = await Promise.all(attempts);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const usedAtValues = new Set(
      results.map((result) => ("usedAt" in result ? result.usedAt : "なし")),
    );
    expect(usedAtValues.size).toBe(1);
  });

  it("（確認用）GET してから SET の2段階にすると二重利用が起きる。上のテストはこれを見分けられる", async () => {
    const redis = getRedis();
    const id = await issueTicket();

    // わざと「使用済みか確認してから書く」書き方にした、まちがった使用処理
    async function naiveUse(): Promise<boolean> {
      if (await redis.get(usedKey(id))) {
        return false;
      }
      await redis.set(usedKey(id), new Date().toISOString());
      return true;
    }

    const results = await Promise.all([naiveUse(), naiveUse()]);
    // 2回とも「まだ使われていない」と判断してから書くので、2回とも成功してしまう
    expect(results).toEqual([true, true]);
  });
});
