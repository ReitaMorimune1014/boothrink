import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/validation";

describe("isUuid", () => {
  it("crypto.randomUUID() の形ならtrue", () => {
    expect(isUuid(crypto.randomUUID())).toBe(true);
  });

  it("それ以外はfalse", () => {
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    // キーの区切りの「:」を混ぜて、別のキーを読ませようとする入力
    expect(isUuid("x:mogiten:stop:ando")).toBe(false);
  });
});
