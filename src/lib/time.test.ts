import { describe, expect, it } from "vitest";
import { jstDateString, secondsUntilEndOfDayJst } from "@/lib/time";

// テストの時刻は、末尾に +09:00 をつけて「日本時間で何時か」がひと目でわかるように書く

describe("jstDateString", () => {
  it("日本時間の23:59:59は、まだその日", () => {
    expect(jstDateString(new Date("2026-11-01T23:59:59+09:00"))).toBe("2026-11-01");
  });

  it("日本時間の0:00になったら次の日（UTCではまだ前日の15:00）", () => {
    expect(jstDateString(new Date("2026-11-02T00:00:00+09:00"))).toBe("2026-11-02");
  });

  it("UTCで朝でも、日本時間で見た日付を返す", () => {
    // UTC 2026-11-01 20:00 = 日本時間 2026-11-02 05:00
    expect(jstDateString(new Date("2026-11-01T20:00:00Z"))).toBe("2026-11-02");
  });

  it("年をまたぐ", () => {
    expect(jstDateString(new Date("2027-01-01T00:30:00+09:00"))).toBe("2027-01-01");
  });

  it("月・日が1桁なら0で埋める", () => {
    expect(jstDateString(new Date("2026-03-05T12:00:00+09:00"))).toBe("2026-03-05");
  });
});

describe("secondsUntilEndOfDayJst", () => {
  it("日本時間の0:00ちょうどなら、まる1日（86400秒）", () => {
    expect(secondsUntilEndOfDayJst(new Date("2026-11-01T00:00:00+09:00"))).toBe(86400);
  });

  it("日本時間の12:00なら、残り12時間", () => {
    expect(secondsUntilEndOfDayJst(new Date("2026-11-01T12:00:00+09:00"))).toBe(12 * 60 * 60);
  });

  it("日本時間の23:59:00なら、残り60秒", () => {
    expect(secondsUntilEndOfDayJst(new Date("2026-11-01T23:59:00+09:00"))).toBe(60);
  });

  it("秒の端数は切り上げる（0秒にするとRedisがエラーになる）", () => {
    expect(secondsUntilEndOfDayJst(new Date("2026-11-01T23:59:59.500+09:00"))).toBe(1);
  });

  it("サーバーがUTCで動いていても、日本時間の日付の区切りで計算する", () => {
    // UTC 2026-11-01 00:00 = 日本時間 09:00 → 残り15時間（UTCで計算すると24時間になってしまう）
    expect(secondsUntilEndOfDayJst(new Date("2026-11-01T00:00:00Z"))).toBe(15 * 60 * 60);
  });

  it("TTLが切れる瞬間は、日本時間で次の日の0:00", () => {
    const now = new Date("2026-11-01T18:23:45.678+09:00");
    const expiresAt = new Date(now.getTime() + secondsUntilEndOfDayJst(now) * 1000);
    // 切り上げのぶん1秒未満だけ遅れることはあるが、早く切れることはない
    expect(jstDateString(expiresAt)).toBe("2026-11-02");
    expect(expiresAt.getTime() - new Date("2026-11-02T00:00:00+09:00").getTime()).toBeLessThan(1000);
  });
});
