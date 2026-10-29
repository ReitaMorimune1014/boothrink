import { describe, expect, it } from "vitest";
import { claimedKey, claimKey, countKey, stopKey, ticketKey, usedKey } from "@/lib/keys";

// CLAUDE.md の「Redisのキー」の表と、1文字も違わないことを確かめる
describe("Redisのキー名", () => {
  it("引換券", () => {
    expect(claimKey("abc")).toBe("mogiten:claim:abc");
    expect(claimedKey("abc")).toBe("mogiten:claimed:abc");
  });

  it("チケット", () => {
    expect(ticketKey("xyz")).toBe("mogiten:ticket:xyz");
    expect(usedKey("xyz")).toBe("mogiten:used:xyz");
  });

  it("発行数・使用数", () => {
    expect(countKey("2026-11-01", "ando", "issued")).toBe("mogiten:count:2026-11-01:ando:issued");
    expect(countKey("2026-11-01", "hayashi", "used")).toBe("mogiten:count:2026-11-01:hayashi:used");
  });

  it("受付停止", () => {
    expect(stopKey("hayashi")).toBe("mogiten:stop:hayashi");
  });
});
