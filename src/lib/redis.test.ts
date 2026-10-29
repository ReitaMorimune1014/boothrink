import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// redis.ts は作ったクライアントをモジュール内に覚えておくので、
// テストごとに読み込み直して（resetModules）、前のテストの状態を持ち越さないようにする
async function loadGetRedis() {
  const mod = await import("@/lib/redis");
  return mod.getRedis;
}

describe("getRedis", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("環境変数がないと、何を設定すればいいかわかるエラーを出す", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const getRedis = await loadGetRedis();
    expect(() => getRedis()).toThrow("UPSTASH_REDIS_REST_URL");
  });

  it("2回呼んでも同じクライアントを返す（毎回作らない）", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "dummy-token");
    const getRedis = await loadGetRedis();
    expect(getRedis()).toBe(getRedis());
  });
});
