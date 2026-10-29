// 外から来た値の形を確かめる小さな関数たち。

// crypto.randomUUID() が作る形（8-4-4-4-12 の16進数）。
// これ以外の文字列は Redis に問い合わせる前に弾く（ムダなコマンドを使わず、変なキーも作らない）。
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// リクエスト本文をJSONとして読む。JSONでなければ null（例外で500にせず、400で返すため）
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// { [name]: 値 } の形なら、その値を取り出す
export function pickField(body: unknown, name: string): unknown {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  return (body as Record<string, unknown>)[name];
}
