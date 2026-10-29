import type { Shop } from "@/lib/shops";

// Redisのキー名は、すべてこのファイルの関数で作る。
// 文字列をあちこちで組み立てると、1文字の違い（claim と claims など）で別のキーになり、
// 「保存したはずなのに読めない」バグになる。ここに集めれば、仕様（CLAUDE.md）との照合もこの1ファイルで済む。

// 同じRedisを他の用途と共有しても衝突しないよう、すべてのキーの先頭につける
const PREFIX = "mogiten:";

// 引換券（QR1回分）。中身は { issuedBy, validAt }
export function claimKey(token: string): string {
  return `${PREFIX}claim:${token}`;
}

// 引換券から発行されたチケットID。タブレットが「読み込まれた」ことを知るために使う
export function claimedKey(token: string): string {
  return `${PREFIX}claimed:${token}`;
}

// チケット本体。中身は { validAt, issuedBy, createdAt }
export function ticketKey(id: string): string {
  return `${PREFIX}ticket:${id}`;
}

// チケットの使用時刻。このキーがあれば使用済み
export function usedKey(id: string): string {
  return `${PREFIX}used:${id}`;
}

export type CountKind = "issued" | "used";

// 日ごと・店ごとの発行数／使用数。date は "YYYY-MM-DD"（日本時間）
export function countKey(date: string, shop: Shop, kind: CountKind): string {
  return `${PREFIX}count:${date}:${shop}:${kind}`;
}

// 受付停止中かどうか
export function stopKey(shop: Shop): string {
  return `${PREFIX}stop:${shop}`;
}
