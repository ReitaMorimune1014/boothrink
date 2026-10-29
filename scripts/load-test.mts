// 負荷テスト: 400人ぶんの「QR発行 → 交換 → 使用」を同時に流し、二重発行・二重利用が起きないことを確かめる。
//
// 使い方（README と docs/operations.md も参照）:
//   BASE_URL=https://xxxx.vercel.app STAFF_PASSWORD=... npm run load-test
//   人数や同時接続数を変えるとき: PEOPLE=400 CONCURRENCY=20
//
// 注意: 指定した URL のデータベースに、本物のチケットと発行数・使用数が書き込まれる。
// 当日の本番データに混ざらないよう、前日までに実行するか、テスト用の Upstash データベースに向けて実行する。

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "";
const PEOPLE = Number(process.env.PEOPLE ?? 400);
// 同時に処理する人数。両店のタブレットの前に人が並んでも、実際に同時に操作するのは数十人程度なので 20 を初期値にする
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 20);

type Shop = "ando" | "hayashi";
type Stats = { shops: Record<Shop, { issued: number; used: number }> };

// API ごとの応答時間（ミリ秒）を記録して、最後にまとめて表示する
const latencies: Record<string, number[]> = {};

// 失敗したこと（期待と違う結果）を記録する。1件でもあれば、最後に失敗として終了する
const problems: string[] = [];

async function call(name: string, path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const started = performance.now();
  const response = await fetch(`${BASE_URL}${path}`, init);
  const body: unknown = await response.json().catch(() => null);
  const elapsed = performance.now() - started;
  const list = latencies[name] ?? [];
  list.push(elapsed);
  latencies[name] = list;
  return { status: response.status, body };
}

function jsonPost(body: unknown, staff = false): RequestInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (staff) {
    headers["x-staff-password"] = STAFF_PASSWORD;
  }
  return { method: "POST", headers, body: JSON.stringify(body) };
}

async function getStats(): Promise<Stats> {
  const { status, body } = await call("admin/stats", "/api/admin/stats", {
    headers: { "x-staff-password": STAFF_PASSWORD },
  });
  if (status !== 200) {
    throw new Error(`管理画面の集計を取得できません（HTTP ${status}）。STAFF_PASSWORD を確認してください`);
  }
  return body as Stats;
}

// 1人ぶんの流れ
async function simulatePerson(index: number): Promise<void> {
  // 交互に両店で買ったことにする
  const shop: Shop = index % 2 === 0 ? "ando" : "hayashi";

  // 1. タブレットが引換券を作る
  const created = await call("claim/new", "/api/claim/new", jsonPost({ shop }, true));
  const token = (created.body as { token?: string } | null)?.token;
  if (created.status !== 200 || !token) {
    problems.push(`#${index} 引換券を作れない（HTTP ${created.status}）`);
    return;
  }

  // 2. 同じQRを2回同時に交換する（2人が同時に読み込んだ想定）。成功は1回だけのはず
  const redeems = await Promise.all([
    call("claim", "/api/claim", jsonPost({ token })),
    call("claim", "/api/claim", jsonPost({ token })),
  ]);
  const redeemed = redeems.filter((result) => result.status === 200);
  if (redeemed.length !== 1) {
    problems.push(`#${index} 同じQRで ${redeemed.length} 枚発行された（期待は1枚）`);
    return;
  }
  const ticketId = (redeemed[0]?.body as { ticketId: string }).ticketId;

  // 3. チケット画面を開く（未使用のはず）
  const ticket = await call("ticket", `/api/ticket/${ticketId}`);
  if ((ticket.body as { status?: string } | null)?.status !== "unused") {
    problems.push(`#${index} 発行直後のチケットが未使用になっていない`);
    return;
  }

  // 4. 「使う」を2回同時に押す（二度押しの想定）。成功は1回、もう1回は already_used のはず
  const uses = await Promise.all([
    call("ticket/use", "/api/ticket/use", jsonPost({ id: ticketId })),
    call("ticket/use", "/api/ticket/use", jsonPost({ id: ticketId })),
  ]);
  const usedCount = uses.filter((result) => result.status === 200).length;
  const rejectedCount = uses.filter((result) => result.status === 409).length;
  if (usedCount !== 1 || rejectedCount !== 1) {
    problems.push(`#${index} 「使う」の成功が ${usedCount} 回、拒否が ${rejectedCount} 回（期待は各1回）`);
  }
}

// people 人を、同時に concurrency 人ずつ処理する。
// 全員を一度に始めると、パソコン側の接続数の上限に当たってしまい、サーバーの性能を測れないため
async function runWithConcurrency(people: number, concurrency: number): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < people) {
      const index = next;
      next += 1;
      try {
        await simulatePerson(index);
      } catch (error) {
        problems.push(`#${index} 通信エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[position] ?? 0;
}

async function main() {
  if (!STAFF_PASSWORD) {
    throw new Error("STAFF_PASSWORD を指定してください");
  }
  console.log(`対象: ${BASE_URL} / ${PEOPLE}人 / 同時 ${CONCURRENCY}人`);

  const before = await getStats();
  const started = performance.now();
  await runWithConcurrency(PEOPLE, CONCURRENCY);
  const seconds = (performance.now() - started) / 1000;
  const after = await getStats();

  // 発行数・使用数が、ちょうど人数ぶん増えているか（多くても少なくてもおかしい）
  const expectedPerShop: Record<Shop, number> = { ando: Math.ceil(PEOPLE / 2), hayashi: Math.floor(PEOPLE / 2) };
  const issuedDelta: Record<Shop, number> = {
    ando: after.shops.ando.issued - before.shops.ando.issued,
    hayashi: after.shops.hayashi.issued - before.shops.hayashi.issued,
  };
  // ando で買ったチケットは hayashi で使うので、使用数は相手の店に増える
  const usedDelta: Record<Shop, number> = {
    ando: after.shops.ando.used - before.shops.ando.used,
    hayashi: after.shops.hayashi.used - before.shops.hayashi.used,
  };
  if (issuedDelta.ando !== expectedPerShop.ando || issuedDelta.hayashi !== expectedPerShop.hayashi) {
    problems.push(`発行数の増え方が違う: ${JSON.stringify(issuedDelta)}（期待 ${JSON.stringify(expectedPerShop)}）`);
  }
  if (usedDelta.hayashi !== expectedPerShop.ando || usedDelta.ando !== expectedPerShop.hayashi) {
    problems.push(`使用数の増え方が違う: ${JSON.stringify(usedDelta)}`);
  }

  console.log(`\n所要時間: ${seconds.toFixed(1)} 秒`);
  console.log("API ごとの応答時間（ミリ秒）");
  for (const [name, values] of Object.entries(latencies)) {
    console.log(
      `  ${name.padEnd(12)} ${String(values.length).padStart(5)}回  中央値 ${percentile(values, 0.5).toFixed(0).padStart(5)}  95% ${percentile(values, 0.95).toFixed(0).padStart(5)}  最大 ${Math.max(...values).toFixed(0).padStart(5)}`,
    );
  }
  console.log(`発行数の増加: ${JSON.stringify(issuedDelta)} / 使用数の増加: ${JSON.stringify(usedDelta)}`);

  if (problems.length > 0) {
    console.log(`\n❌ 問題が ${problems.length} 件ありました`);
    for (const problem of problems.slice(0, 20)) {
      console.log(`  - ${problem}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("\n✅ 二重発行・二重利用なし。発行数・使用数も人数と一致しました");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
