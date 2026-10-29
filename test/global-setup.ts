import { startUpstashShim } from "./upstash-rest-shim";

// Vitest がテストを始める前に1回だけ動く。
// 本物の Redis につながる中継サーバーを立て、アプリが読む環境変数をそこに向ける。
//
// 開発用のデータを消さないよう、テストは Redis の15番のDBを使う（各テストの前に中身を空にするため）。
const DEFAULT_TEST_REDIS_URL = "redis://127.0.0.1:6379/15";

export default async function setup() {
  const redisUrl = process.env.TEST_REDIS_URL ?? DEFAULT_TEST_REDIS_URL;

  let shim;
  try {
    shim = await startUpstashShim(redisUrl);
  } catch (error) {
    // 元のエラー（ECONNREFUSED など）も読めるように、メッセージに含める
    const reason = error instanceof Error ? error.message || error.name : String(error);
    const message = `テスト用の Redis（${redisUrl}）につながりません。redis-server を起動してください（README の「テスト」を参照）。原因: ${reason}`;
    // Vitest 5.0.5 では、ここで投げたエラーを表示する途中で別のエラーが起き、メッセージが見えなくなる。
    // そのため、投げる前に自分で表示しておく
    console.error(message);
    throw new Error(message);
  }

  // ここで設定した環境変数は、このあと起動するテストのプロセスに引き継がれる
  process.env.UPSTASH_REDIS_REST_URL = shim.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = shim.token;
  process.env.STAFF_PASSWORD = "test-staff-password";

  return async () => {
    await shim.close();
  };
}
