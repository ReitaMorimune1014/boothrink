import { describe, expect, it } from "vitest";
import { formatJstTime } from "@/lib/format";

describe("formatJstTime", () => {
  it("日本時間の時:分:秒で表示する", () => {
    expect(formatJstTime(new Date("2026-11-01T14:05:09+09:00"))).toBe("14:05:09");
  });

  it("UTCの時刻を渡しても、日本時間に直して表示する", () => {
    // UTC 05:05:09 = 日本時間 14:05:09
    expect(formatJstTime(new Date("2026-11-01T05:05:09Z"))).toBe("14:05:09");
  });

  it("0時台は 00 と表示する（24 にしない）", () => {
    expect(formatJstTime(new Date("2026-11-02T00:01:02+09:00"))).toBe("00:01:02");
  });
});
