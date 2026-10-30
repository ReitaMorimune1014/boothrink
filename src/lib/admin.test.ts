import { beforeEach, describe, expect, it } from "vitest";
import { getTodayStats, resetTodayCounts, setStopped } from "@/lib/admin";
import { stopKey } from "@/lib/keys";
import { getRedis } from "@/lib/redis";
import { getTicket, markTicketUsed } from "@/lib/ticket";
import { issueTicket, resetRedis } from "../../test/redis-helpers";

// このファイルのテストは、本物の Redis を使う（test/global-setup.ts を参照）

beforeEach(async () => {
  await resetRedis();
});

describe("getTodayStats", () => {
  it("何もない日は、すべて0で受付中", async () => {
    const now = new Date("2026-11-01T10:00:00+09:00");
    expect(await getTodayStats(now)).toEqual({
      date: "2026-11-01",
      shops: {
        ando: { issued: 0, used: 0, stopped: false },
        hayashi: { issued: 0, used: 0, stopped: false },
      },
    });
  });

  it("発行は「QRを出した店」、使用は「使われた店」で数える", async () => {
    const now = new Date("2026-11-01T12:00:00+09:00");
    // ando で2枚発行し、そのうち1枚を hayashi で使う
    const first = await issueTicket("ando", now);
    await issueTicket("ando", now);
    await markTicketUsed(first, now);
    // hayashi で1枚発行
    await issueTicket("hayashi", now);

    const stats = await getTodayStats(now);
    expect(stats.shops.ando).toEqual({ issued: 2, used: 0, stopped: false });
    expect(stats.shops.hayashi).toEqual({ issued: 1, used: 1, stopped: false });
  });

  it("別の日の数は混ざらない", async () => {
    await issueTicket("ando", new Date("2026-11-01T12:00:00+09:00"));

    const nextDay = await getTodayStats(new Date("2026-11-02T09:00:00+09:00"));
    expect(nextDay.shops.ando.issued).toBe(0);
  });
});

describe("setStopped", () => {
  it("停止すると stopped になり、新しいチケットを使えなくなる", async () => {
    const id = await issueTicket("ando");
    await setStopped("hayashi", true);

    expect((await getTodayStats()).shops.hayashi.stopped).toBe(true);
    expect((await getTicket(id)).status).toBe("stopped");
  });

  it("再開すると元に戻る", async () => {
    await setStopped("ando", true);
    await setStopped("ando", false);

    expect((await getTodayStats()).shops.ando.stopped).toBe(false);
  });

  it("2回続けて停止しても、停止のまま（切り替えではない）", async () => {
    await setStopped("ando", true);
    await setStopped("ando", true);

    expect((await getTodayStats()).shops.ando.stopped).toBe(true);
  });

  it("停止は当日の終わりに自動で解除される（TTLが1日以内）", async () => {
    await setStopped("ando", true);
    const ttl = await getRedis().ttl(stopKey("ando"));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(24 * 60 * 60);
  });
});

describe("resetTodayCounts", () => {
  it("今日の発行数・使用数を両店とも0に戻す", async () => {
    const now = new Date("2026-11-01T12:00:00+09:00");
    const id = await issueTicket("ando", now);
    await issueTicket("hayashi", now);
    await markTicketUsed(id, now);

    await resetTodayCounts(now);

    const stats = await getTodayStats(now);
    expect(stats.shops.ando).toMatchObject({ issued: 0, used: 0 });
    expect(stats.shops.hayashi).toMatchObject({ issued: 0, used: 0 });
  });

  it("チケットは消さない。未使用は使えるし、使用済みは使用済みのまま", async () => {
    const now = new Date();
    const unusedId = await issueTicket("ando", now);
    const usedId = await issueTicket("ando", now);
    await markTicketUsed(usedId, now);

    await resetTodayCounts(now);

    expect((await getTicket(usedId)).status).toBe("used");
    expect((await markTicketUsed(usedId, now)).ok).toBe(false);
    expect((await getTicket(unusedId)).status).toBe("unused");
    // リセットしたあとに使った分は、0から数え直す
    expect((await markTicketUsed(unusedId, now)).ok).toBe(true);
    expect((await getTodayStats(now)).shops.hayashi.used).toBe(1);
  });

  it("受付停止の状態は変えない", async () => {
    await setStopped("ando", true);
    await resetTodayCounts();

    expect((await getTodayStats()).shops.ando.stopped).toBe(true);
  });

  it("別の日の数は消さない", async () => {
    const yesterday = new Date("2026-11-01T12:00:00+09:00");
    await issueTicket("ando", yesterday);

    await resetTodayCounts(new Date("2026-11-02T12:00:00+09:00"));

    expect((await getTodayStats(yesterday)).shops.ando.issued).toBe(1);
  });

  it("リセットと発行が同時に起きても、数が壊れない（0 か 1 のどちらかになる）", async () => {
    const now = new Date();
    await issueTicket("ando", now);

    // 発行（INCR）とリセット（DEL）を同時に走らせる。どちらが先かで結果は変わるが、
    // 数が負になったり、2以上になったりはしない
    await Promise.all([issueTicket("ando", now), resetTodayCounts(now)]);

    expect([0, 1]).toContain((await getTodayStats(now)).shops.ando.issued);
  });
});
