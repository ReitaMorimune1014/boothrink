// 店の一覧。URL（/tablet/ando など）やRedisのキーに使う文字列はここだけで決める。
// `as const` にすると、型が string ではなく "ando" | "hayashi" になり、打ち間違いを型チェックで見つけられる。
export const SHOPS = ["ando", "hayashi"] as const;

export type Shop = (typeof SHOPS)[number];

// URLやリクエストから来た文字列が、本当に店の名前かを確かめる。
// 外から来た値は信用せず、ここを通してから Shop 型として扱う。
export function isShop(value: string): value is Shop {
  return (SHOPS as readonly string[]).includes(value);
}

// チケットを使える店（＝買った店の相手）。ando で買ったら hayashi で使う
export function partnerShop(shop: Shop): Shop {
  if (shop === "ando") {
    return "hayashi";
  }
  return "ando";
}

// 画面に出す店の名前
export const SHOP_NAMES: Record<Shop, string> = {
  ando: "安藤ゼミ（たこ焼き）",
  hayashi: "林ゼミ（唐揚げ）",
};

// チケットを「使う店」ごとの特典。hayashi で使えば唐揚げ＋1個、ando で使えばたこ焼き＋2個
export const BENEFITS: Record<Shop, string> = {
  ando: "たこ焼き＋2個",
  hayashi: "唐揚げ＋1個",
};
