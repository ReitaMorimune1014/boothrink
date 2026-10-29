import { Redis } from "@upstash/redis";

// Upstash Redis のクライアントを1つだけ作って使い回す。
//
// なぜ「importした瞬間」ではなく「最初に呼ばれたとき」に作るのか:
// - `npm run build` やテストは環境変数なしで動く。import時に作ると、Redisを使わない処理まで落ちてしまう
// - 環境変数が足りないときは、実際にRedisが必要になった場所で、原因がわかるエラーを出したい
let client: Redis | undefined;

export function getRedis(): Redis {
  if (client) {
    return client;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL と UPSTASH_REDIS_REST_TOKEN を設定してください（.env.example を参照）",
    );
  }

  client = new Redis({ url, token });
  return client;
}
