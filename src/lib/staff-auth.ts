import { createHash, timingSafeEqual } from "node:crypto";

// 店員用API（タブレット・管理画面）のパスワード確認。
// タブレットは毎回 `x-staff-password` ヘッダーにパスワードをつけてAPIを呼ぶ。
export const STAFF_PASSWORD_HEADER = "x-staff-password";

// 文字列を同じ長さ（32バイト）のハッシュにする。
// timingSafeEqual は長さが違うとエラーになるので、先にそろえてから比べる。
function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isStaffRequest(request: Request): boolean {
  const expected = process.env.STAFF_PASSWORD;
  // パスワードが設定されていないときは、誰も通さない（設定し忘れで全員が店員扱いになるのを防ぐ）
  if (!expected) {
    return false;
  }

  const given = request.headers.get(STAFF_PASSWORD_HEADER);
  if (!given) {
    return false;
  }

  // `===` で比べると「先頭から何文字合っているか」で処理時間が変わり、少しずつ推測される恐れがある。
  // timingSafeEqual は、合っていても違っていても同じ時間で比べる。
  return timingSafeEqual(digest(given), digest(expected));
}
