// 店員用パスワードを送るヘッダーの名前。
// staff-auth.ts は node:crypto を使うのでブラウザでは読み込めない。
// タブレット画面（ブラウザ）からも使えるよう、名前だけをこのファイルに分けている。
export const STAFF_PASSWORD_HEADER = "x-staff-password";
