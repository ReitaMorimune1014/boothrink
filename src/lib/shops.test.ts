import { describe, expect, it } from "vitest";
import { BENEFITS, isShop, partnerShop, SHOPS } from "@/lib/shops";

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

describe("partnerShop", () => {
  it("たこ焼き（ando）で買ったら唐揚げ（hayashi）で使う。逆も同じ", () => {
    expect(partnerShop("ando")).toBe("hayashi");
    expect(partnerShop("hayashi")).toBe("ando");
  });
});

describe("BENEFITS", () => {
  it("CLAUDE.md の特典の表と同じ（使う店ごと）", () => {
    // ando で買う → hayashi で使う → 唐揚げ＋1個
    expect(BENEFITS[partnerShop("ando")]).toBe("唐揚げ＋1個");
    // hayashi で買う → ando で使う → たこ焼き＋2個
    expect(BENEFITS[partnerShop("hayashi")]).toBe("たこ焼き＋2個");
  });
});
