// 店の一覧。URL（/tablet/ando など）やRedisのキーに使う文字列はここだけで決める。
// `as const` にすると、型が string ではなく "ando" | "hayashi" になり、打ち間違いを型チェックで見つけられる。
export const SHOPS = ["ando", "hayashi"] as const;

export type Shop = (typeof SHOPS)[number];

// URLやリクエストから来た文字列が、本当に店の名前かを確かめる。
// 外から来た値は信用せず、ここを通してから Shop 型として扱う。
export function isShop(value: string): value is Shop {
  return (SHOPS as readonly string[]).includes(value);
}
