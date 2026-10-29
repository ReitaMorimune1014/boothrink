import { beforeEach, describe, expect, it } from "vitest";
import { GET as getTicketApi } from "@/app/api/ticket/[id]/route";
import { POST as useTicketApi } from "@/app/api/ticket/use/route";
import { stopKey } from "@/lib/keys";
import { getRedis } from "@/lib/redis";
import { issueTicket, resetRedis } from "../../../../test/redis-helpers";

// API（route.ts）のテスト。中の処理は ticket.test.ts で確かめているので、
// ここでは「入力チェック・HTTPのステータスコード・返す形」を確かめる。

function getRequest(id: string) {
  const request = new Request(`http://localhost/api/ticket/${encodeURIComponent(id)}`);
  // Next.js が渡すのと同じ形（Promise）で [id] を渡す
  return getTicketApi(request, { params: Promise.resolve({ id }) });
}

function useRequest(body: unknown) {
  const request = new Request("http://localhost/api/ticket/use", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return useTicketApi(request);
}

beforeEach(async () => {
  await resetRedis();
});

describe("GET /api/ticket/{id}", () => {
  it("id の形がおかしいと 400", async () => {
    expect((await getRequest("abc")).status).toBe(400);
  });

  it("未使用 → 使用済みと変わる。キャッシュさせない", async () => {
    const id = await issueTicket("ando");

    const before = await getRequest(id);
    expect(before.headers.get("Cache-Control")).toBe("no-store");
    expect(await before.json()).toMatchObject({ status: "unused", ticket: { validAt: "hayashi" } });

    await useRequest({ id });

    expect(await (await getRequest(id)).json()).toMatchObject({ status: "used" });
  });

  it("存在しないチケットは 200 で status: expired（画面でエラー表示に使う）", async () => {
    const response = await getRequest(crypto.randomUUID());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "expired" });
  });
});

describe("POST /api/ticket/use", () => {
  it("id の形がおかしいと 400 invalid", async () => {
    const response = await useRequest({ id: "abc" });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid" });
  });

  it("成功すると 200 と使用時刻", async () => {
    const id = await issueTicket();
    const response = await useRequest({ id });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { usedAt: string };
    expect(Number.isNaN(Date.parse(body.usedAt))).toBe(false);
  });

  it("2回目は 409 already_used と、最初に使った時刻", async () => {
    const id = await issueTicket();
    const first = (await (await useRequest({ id })).json()) as { usedAt: string };

    const second = await useRequest({ id });
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: "already_used", usedAt: first.usedAt });
  });

  it("存在しないチケットは 410 expired", async () => {
    const response = await useRequest({ id: crypto.randomUUID() });
    expect(response.status).toBe(410);
  });

  it("使える店が受付停止中なら 409 stopped", async () => {
    const id = await issueTicket("ando");
    await getRedis().set(stopKey("hayashi"), "1");

    const response = await useRequest({ id });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "stopped" });
  });
});
