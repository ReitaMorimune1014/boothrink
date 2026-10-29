import { describe, expect, it } from "vitest";
import { isShop, SHOPS } from "@/lib/shops";

describe("isShop", () => {
  it("登録されている店の名前ならtrue", () => {
    for (const shop of SHOPS) {
      expect(isShop(shop)).toBe(true);
    }
  });

  it("知らない名前・大文字違い・空文字はfalse", () => {
    expect(isShop("tanaka")).toBe(false);
    expect(isShop("Ando")).toBe(false);
    expect(isShop("")).toBe(false);
  });
});
