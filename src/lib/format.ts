// 画面に出す時刻の書式。
// サーバー（UTC）でもお客さんのスマホ（海外設定のこともある）でも、必ず日本時間で表示する。
// 時刻の計算を自分で書かず Intl.DateTimeFormat を使うのは、タイムゾーンの扱いをブラウザ・Node.js に任せられるため。

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

// 例: "14:05:09"
export function formatJstTime(date: Date): string {
  return timeFormatter.format(date);
}
