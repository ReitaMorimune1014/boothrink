// 日本時間（JST）の日付と、「今日の終わり」までの秒数を計算する。
//
// なぜ Date#getHours() などを使わないのか:
// - getHours() は「実行しているマシンのタイムゾーン」で計算する
// - Vercel のサーバーは UTC で動くので、そのまま使うと日付の区切りが9時間ずれる
// - そこで「UTCの時刻 + 9時間」を作り、それを getUTC〜 で読むことで、どこで動かしても日本時間になるようにする
// - 日本には夏時間がないので、+9時間の固定で正しい

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 日本時間での日付を "YYYY-MM-DD" で返す（発行数のキーや validAt に使う）
export function jstDateString(now: Date): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 日本時間の「今日の終わり（翌日 0:00:00）」までの秒数。Redis の EX にそのまま渡す。
//
// - 仕様の「23:59まで」は「23:59台のうちは有効」と解釈し、翌日0:00ちょうどに消える
// - Redis の EX は1以上の整数が必要。秒の端数は切り上げて、期限より早く消えないようにする
//   （例: 23:59:59.5 → 0.5秒 → 1秒）
export function secondsUntilEndOfDayJst(now: Date): number {
  const msSinceJstMidnight = (now.getTime() + JST_OFFSET_MS) % DAY_MS;
  const msUntilEnd = DAY_MS - msSinceJstMidnight;
  return Math.ceil(msUntilEnd / 1000);
}
