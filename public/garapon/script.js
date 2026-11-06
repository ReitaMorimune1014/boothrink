// ガラポンの回し方ページ
//
// 揺れの速さを、URL の ?duration=秒数 で変えられるようにする。
//   例: index.html?duration=2.5
// Why: 当日、実物のガラポンを回しながら速さを合わせたいとき、
//      CSS を書き換えずに URL だけで試せるようにするため。

const MIN_SECONDS = 0.5;
const MAX_SECONDS = 10;

function readDurationSeconds() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("duration");
  if (value === null) {
    return null;
  }

  const seconds = Number(value);
  // 数字でない値や極端な値は無視して、CSS の初期値（2秒）を使う
  if (Number.isNaN(seconds) || seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
    return null;
  }
  return seconds;
}

const durationSeconds = readDurationSeconds();
if (durationSeconds !== null) {
  // CSS変数を1か所変えるだけで、ゆりかごと取っ手の両方が同じ速さになる
  document.documentElement.style.setProperty("--swing-duration", durationSeconds + "s");
}
