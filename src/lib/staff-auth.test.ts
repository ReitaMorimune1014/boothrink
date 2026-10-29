import { afterEach, describe, expect, it, vi } from "vitest";
import { isStaffRequest, STAFF_PASSWORD_HEADER } from "@/lib/staff-auth";

function requestWithPassword(password?: string): Request {
  const headers = new Headers();
  if (password !== undefined) {
    headers.set(STAFF_PASSWORD_HEADER, password);
  }
  return new Request("http://localhost/api/claim/new", { method: "POST", headers });
}

describe("isStaffRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("パスワードが合っていれば通す", () => {
    vi.stubEnv("STAFF_PASSWORD", "correct");
    expect(isStaffRequest(requestWithPassword("correct"))).toBe(true);
  });

  it("違う・ない・長さが違う、はすべて通さない", () => {
    vi.stubEnv("STAFF_PASSWORD", "correct");
    expect(isStaffRequest(requestWithPassword("wrong!!"))).toBe(false);
    expect(isStaffRequest(requestWithPassword())).toBe(false);
    expect(isStaffRequest(requestWithPassword("correct-but-longer"))).toBe(false);
  });

  it("STAFF_PASSWORD が未設定なら、空のパスワードでも通さない", () => {
    vi.stubEnv("STAFF_PASSWORD", "");
    expect(isStaffRequest(requestWithPassword(""))).toBe(false);
  });
});
