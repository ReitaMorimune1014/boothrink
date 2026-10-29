import { beforeEach, describe, expect, it } from "vitest";
import { POST as redeem } from "@/app/api/claim/route";
import { POST as createNew } from "@/app/api/claim/new/route";
import { GET as status } from "@/app/api/claim/status/route";
import { getRedis } from "@/lib/redis";
import { stopKey } from "@/lib/keys";
import { STAFF_PASSWORD_HEADER } from "@/lib/staff-auth";
import { resetRedis } from "../../../../test/redis-helpers";

// API（route.ts）のテスト。中の処理は claim.test.ts で確かめているので、
// ここでは「認証・入力チェック・HTTPのステータスコード」を確かめる。
// 関数を直接呼ぶので、サーバーを起動する必要はない。

// test/global-setup.ts で設定したパスワード
const STAFF_PASSWORD = "test-staff-password";

function jsonRequest(url: string, body: unknown, password?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (password !== undefined) {
    headers.set(STAFF_PASSWORD_HEADER, password);
  }
  return new Request(`http://localhost${url}`, { method: "POST", headers, body: JSON.stringify(body) });
}

function statusRequest(token: string, password?: string, shop = "ando"): Request {
  const headers = new Headers();
  if (password !== undefined) {
    headers.set(STAFF_PASSWORD_HEADER, password);
  }
  return new Request(`http://localhost/api/claim/status?token=${encodeURIComponent(token)}&shop=${shop}`, { headers });
}

async function createToken(): Promise<string> {
  const response = await createNew(jsonRequest("/api/claim/new", { shop: "ando" }, STAFF_PASSWORD));
  const body = (await response.json()) as { token: string };
  return body.token;
}

beforeEach(async () => {
  await resetRedis();
});

describe("POST /api/claim/new", () => {
  it("パスワードがないと 401", async () => {
    const response = await createNew(jsonRequest("/api/claim/new", { shop: "ando" }));
    expect(response.status).toBe(401);
  });

  it("知らない店は 400", async () => {
    const response = await createNew(jsonRequest("/api/claim/new", { shop: "tanaka" }, STAFF_PASSWORD));
    expect(response.status).toBe(400);
  });

  it("JSONでない本文は 400（500にしない）", async () => {
    const request = new Request("http://localhost/api/claim/new", {
      method: "POST",
      headers: { [STAFF_PASSWORD_HEADER]: STAFF_PASSWORD },
      body: "not json",
    });
    expect((await createNew(request)).status).toBe(400);
  });

  it("受付停止中は 409 stopped", async () => {
    await getRedis().set(stopKey("ando"), "1");
    const response = await createNew(jsonRequest("/api/claim/new", { shop: "ando" }, STAFF_PASSWORD));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "stopped" });
  });

  it("成功すると token と有効秒数を返す", async () => {
    const response = await createNew(jsonRequest("/api/claim/new", { shop: "ando" }, STAFF_PASSWORD));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string; expiresInSeconds: number };
    expect(body.expiresInSeconds).toBe(90);
    expect(typeof body.token).toBe("string");
  });
});

describe("GET /api/claim/status", () => {
  it("パスワードがないと 401", async () => {
    const token = await createToken();
    expect((await status(statusRequest(token))).status).toBe(401);
  });

  it("token の形がおかしいと 400", async () => {
    expect((await status(statusRequest("abc", STAFF_PASSWORD))).status).toBe(400);
  });

  it("知らない店は 400", async () => {
    const token = await createToken();
    expect((await status(statusRequest(token, STAFF_PASSWORD, "tanaka"))).status).toBe(400);
  });

  it("waiting → claimed と変わる。キャッシュさせない", async () => {
    const token = await createToken();

    const before = await status(statusRequest(token, STAFF_PASSWORD));
    expect(await before.json()).toEqual({ status: "waiting" });
    expect(before.headers.get("Cache-Control")).toBe("no-store");

    await redeem(jsonRequest("/api/claim", { token }));

    const after = await status(statusRequest(token, STAFF_PASSWORD));
    expect(await after.json()).toEqual({ status: "claimed" });
  });
});

describe("POST /api/claim", () => {
  it("お客さん用なのでパスワードなしで交換でき、ticketId を返す", async () => {
    const token = await createToken();
    const response = await redeem(jsonRequest("/api/claim", { token }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ticketId: string };
    expect(typeof body.ticketId).toBe("string");
  });

  it("token の形がおかしいと 400 invalid", async () => {
    const response = await redeem(jsonRequest("/api/claim", { token: "abc" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid" });
  });

  it("2回目は 409 already_claimed", async () => {
    const token = await createToken();
    await redeem(jsonRequest("/api/claim", { token }));

    const second = await redeem(jsonRequest("/api/claim", { token }));
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: "already_claimed" });
  });

  it("期限切れ（存在しない）は 410 expired", async () => {
    const response = await redeem(jsonRequest("/api/claim", { token: crypto.randomUUID() }));
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: "expired" });
  });
});
