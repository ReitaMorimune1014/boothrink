// 手元の PC だけでアプリを動かすための、Upstash の代わり（Upstash のアカウントなしで動作確認・負荷テストをしたいとき用）。
// テストで使っている中継サーバー（test/upstash-rest-shim.ts）を、手元の redis-server につないで起動し続ける。
//
// 使い方:
//   1. redis-server を起動する（docker run --rm -p 6379:6379 redis:7 など）
//   2. npm run local-redis   → 表示された URL と TOKEN を .env.local に書く
//   3. 別のターミナルで npm run dev
//
// 本番（Vercel）では使わない。

import { startUpstashShim } from "../test/upstash-rest-shim.ts";

// テスト（15番）とは別の DB を使い、テストを流しても手元の動作確認のデータが消えないようにする
const redisUrl = process.env.LOCAL_REDIS_URL ?? "redis://127.0.0.1:6379/0";

// .env.local に書く URL が毎回同じになるよう、ポートは固定する
const port = Number(process.env.LOCAL_SHIM_PORT ?? 8079);

const shim = await startUpstashShim(redisUrl, port);
console.log(`手元の Redis（${redisUrl}）につなぎました。.env.local に次の2行を書いてください:`);
console.log(`UPSTASH_REDIS_REST_URL=${shim.url}`);
console.log(`UPSTASH_REDIS_REST_TOKEN=${shim.token}`);
console.log("止めるときは Ctrl+C");
