// 日付に関係なく固定のTTL（秒）。CLAUDE.md の「Redisのキー」の表と同じ値にする。
// 「当日23:59まで」のキーは日によって長さが変わるので、time.ts の secondsUntilEndOfDayJst を使う。

// QRは90秒ごとに入れ替えるので、引換券も90秒で消える
export const CLAIM_TTL_SECONDS = 90;

// タブレットは2秒ごとに確認するので、60秒あれば確実に「読み込まれた」を受け取れる
export const CLAIMED_TTL_SECONDS = 60;

// 発行数・使用数は、翌日以降に振り返れるよう3日残す
export const COUNT_TTL_SECONDS = 3 * 24 * 60 * 60;
