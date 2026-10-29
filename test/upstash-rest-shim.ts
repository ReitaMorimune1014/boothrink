import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createClient } from "redis";

// テスト専用: Upstash の REST API と同じ形のHTTPリクエストを受けて、本物の Redis に渡す小さな中継サーバー。
//
// なぜこれが必要か:
// - アプリは @upstash/redis を使う。これは Redis のコマンドを「HTTPでJSONを送る」形で実行する
// - 二重発行を防げているかは、Redis 本体の原子的な動き（GETDEL や SET NX）に頼っている
// - 偽物（モック）でテストすると「偽物が正しいか」しか確かめられないので、本物の redis-server で確かめたい
// - Upstash の形式はとても単純なので、ここで変換すれば @upstash/redis をそのまま本物の Redis につなげられる
//
// Upstash の形式（今回使うぶんだけ）:
// - POST /            本文 ["SET","k","v"]            → {"result": ...}
// - POST /pipeline    本文 [["SET",...],["GET",...]]  → [{"result": ...}, ...] （1つずつ順番に実行）
// - POST /multi-exec  本文は pipeline と同じ          → 同じ形（MULTI/EXEC でまとめて実行。途中に他のコマンドが割り込まない）

type RedisClient = ReturnType<typeof createClient>;
type Command = (string | number)[];
type Reply = { result: unknown } | { error: string };

function toArgs(command: Command): string[] {
  // Redis には文字列で渡す（@upstash/redis は数値をそのまま送ってくることがある）
  return command.map((part) => String(part));
}

async function runOne(redis: RedisClient, command: Command): Promise<Reply> {
  try {
    return { result: await redis.sendCommand(toArgs(command)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function runPipeline(redis: RedisClient, commands: Command[]): Promise<Reply[]> {
  const replies: Reply[] = [];
  for (const command of commands) {
    replies.push(await runOne(redis, command));
  }
  return replies;
}

async function runMultiExec(redis: RedisClient, commands: Command[]): Promise<Reply[]> {
  const multi = redis.multi();
  for (const command of commands) {
    multi.addCommand(toArgs(command));
  }
  const results = await multi.exec();
  return results.map((result) => ({ result }));
}

function readBody(request: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

export type Shim = {
  url: string;
  token: string;
  close: () => Promise<void>;
};

export async function startUpstashShim(redisUrl: string): Promise<Shim> {
  // テストでは、つながらなければすぐに失敗させたいので、自動の再接続はしない
  const redis: RedisClient = createClient({ url: redisUrl, socket: { reconnectStrategy: false } });
  // node-redis は接続エラーを 'error' イベントでも知らせる。受け取る人がいないとプロセスごと落ちるので、
  // ここでは受け取るだけにして、エラーは下の connect() の失敗として扱う
  redis.on("error", () => {});
  await redis.connect();

  const token = "local-test-token";

  const server: Server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const body = JSON.parse(await readBody(request)) as Command | Command[];
    let reply: Reply | Reply[];
    if (request.url === "/pipeline") {
      reply = await runPipeline(redis, body as Command[]);
    } else if (request.url === "/multi-exec") {
      reply = await runMultiExec(redis, body as Command[]);
    } else {
      reply = await runOne(redis, body as Command);
    }

    // 1つのコマンドが失敗したときだけ、Upstash と同じく 400 を返す
    const status = !Array.isArray(reply) && "error" in reply ? 400 : 200;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(reply));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    token,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await redis.quit();
    },
  };
}
