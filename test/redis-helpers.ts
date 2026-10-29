import { getRedis } from "@/lib/redis";

// テスト用の Redis（15番のDB）を空にする。各テストの前に呼び、前のテストのデータを持ち越さない
export async function resetRedis(): Promise<void> {
  await getRedis().flushdb();
}

// パターンに合うキーの一覧（テストで「チケットが何枚できたか」を数えるため）
export async function keysMatching(pattern: string): Promise<string[]> {
  return getRedis().keys(pattern);
}
