import { beforeEach, describe, expect, it } from "vitest";
import { GET as stats } from "@/app/api/admin/stats/route";
import { POST as resetCounts } from "@/app/api/admin/reset-counts/route";
import { POST as stop } from "@/app/api/admin/stop/route";
import { STAFF_PASSWORD_HEADER } from "@/lib/staff-auth";
import { resetRedis } from "../../../../test/redis-helpers";

// API（route.ts）のテスト。中の処理は admin.test.ts で確かめているので、
// ここでは「認証・入力チェック・返す形」を確かめる。

// test/global-setup.ts で設定したパスワード
const STAFF_PASSWORD = "test-staff-password";

function statsRequest(password?: string): Request {
  const headers = new Headers();
  if (password !== undefined) {
    headers.set(STAFF_PASSWORD_HEADER, password);
  }
  return new Request("http://localhost/api/admin/stats", { headers });
}

function stopRequest(body: unknown, password?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (password !== undefined) {
    headers.set(STAFF_PASSWORD_HEADER, password);
  }
  return new Request("http://localhost/api/admin/stop", { method: "POST", headers, body: JSON.stringify(body) });
}

beforeEach(async () => {
  await resetRedis();
});

describe("GET /api/admin/stats", () => {
  it("パスワードがないと 401", async () => {
    expect((await stats(statsRequest())).status).toBe(401);
  });

  it("両店の数と停止状態を返す。キャッシュさせない", async () => {
    const response = await stats(statsRequest(STAFF_PASSWORD));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = (await response.json()) as { shops: Record<string, unknown> };
    expect(Object.keys(body.shops).sort()).toEqual(["ando", "hayashi"]);
  });
});

describe("POST /api/admin/stop", () => {
  it("パスワードがないと 401（お客さんが受付停止できないこと）", async () => {
    expect((await stop(stopRequest({ shop: "ando", stopped: true }))).status).toBe(401);
  });

  it("知らない店、stopped が true/false でない場合は 400", async () => {
    expect((await stop(stopRequest({ shop: "tanaka", stopped: true }, STAFF_PASSWORD))).status).toBe(400);
    expect((await stop(stopRequest({ shop: "ando", stopped: "yes" }, STAFF_PASSWORD))).status).toBe(400);
    expect((await stop(stopRequest({ shop: "ando" }, STAFF_PASSWORD))).status).toBe(400);
  });

  it("停止 → 再開。切り替えたあとの状態を返す", async () => {
    const stopped = await stop(stopRequest({ shop: "ando", stopped: true }, STAFF_PASSWORD));
    expect(await stopped.json()).toMatchObject({ shops: { ando: { stopped: true }, hayashi: { stopped: false } } });

    const resumed = await stop(stopRequest({ shop: "ando", stopped: false }, STAFF_PASSWORD));
    expect(await resumed.json()).toMatchObject({ shops: { ando: { stopped: false } } });
  });
});

describe("POST /api/admin/reset-counts", () => {
  function resetRequest(password?: string): Request {
    const headers = new Headers();
    if (password !== undefined) {
      headers.set(STAFF_PASSWORD_HEADER, password);
    }
    return new Request("http://localhost/api/admin/reset-counts", { method: "POST", headers });
  }

  it("パスワードがないと 401（お客さんが数を消せないこと）", async () => {
    expect((await resetCounts(resetRequest())).status).toBe(401);
  });

  it("戻したあとの集計を返す", async () => {
    const response = await resetCounts(resetRequest(STAFF_PASSWORD));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ shops: { ando: { issued: 0, used: 0 } } });
  });
});
