import type { TicketData } from "@/lib/claim";
import { countKey, stopKey, ticketKey, usedKey } from "@/lib/keys";
import { getRedis } from "@/lib/redis";
import type { Shop } from "@/lib/shops";
import { jstDateString, secondsUntilEndOfDayJst } from "@/lib/time";
import { COUNT_TTL_SECONDS } from "@/lib/ttl";

// チケットの取得と使用。
// 「使用済みかどうか」は、必ずここ（サーバー側）で Redis を見て決める。
// 画面側で判定すると、ブラウザを操作すれば何度でも「未使用」に見せられてしまうため。

export type TicketView =
  | { status: "unused"; ticket: TicketData }
  | { status: "used"; ticket: TicketData; usedAt: string }
  | { status: "stopped"; ticket: TicketData }
  | { status: "expired" };

// お客さんのチケット画面を開いたときの状態
export async function getTicket(id: string): Promise<TicketView> {
  const redis = getRedis();

  // チケット本体・使用時刻・両店の受付停止を、MGET 1回でまとめて読む。
  // チケット画面は何度も開かれるので、コマンド数を節約する。
  const [ticket, usedAt, andoStopped, hayashiStopped] = await redis.mget<
    [TicketData | null, string | null, string | null, string | null]
  >(ticketKey(id), usedKey(id), stopKey("ando"), stopKey("hayashi"));

  // チケットがない ＝ 当日の終わりを過ぎて消えた（または最初から存在しない）
  if (!ticket) {
    return { status: "expired" };
  }

  // 使用済みは、受付停止よりも優先して見せる（「使った」という事実のほうが大事なため）
  if (usedAt) {
    return { status: "used", ticket, usedAt };
  }

  const stopped: Record<Shop, boolean> = { ando: andoStopped !== null, hayashi: hayashiStopped !== null };
  if (stopped[ticket.validAt]) {
    return { status: "stopped", ticket };
  }

  return { status: "unused", ticket };
}

export type MarkTicketUsedResult =
  | { ok: true; usedAt: string }
  | { ok: false; reason: "already_used"; usedAt: string }
  | { ok: false; reason: "expired" | "stopped" };

// お客さんが店員の前で「使う」を押したとき。
// 名前を useTicket にしないのは、use〜 で始まる関数は React の Hooks と見なされ、lint のルールで止められるため
export async function markTicketUsed(id: string, now: Date = new Date()): Promise<MarkTicketUsedResult> {
  const redis = getRedis();

  const ticket = await redis.get<TicketData>(ticketKey(id));
  if (!ticket) {
    return { ok: false, reason: "expired" };
  }

  // チケットを使える店（validAt）が受付停止中なら、使わせない
  if ((await redis.exists(stopKey(ticket.validAt))) === 1) {
    return { ok: false, reason: "stopped" };
  }

  // ここが二重利用を防ぐ中心。
  // SET ... NX は「キーがまだないときだけ書く」を Redis の中で一度に行う。
  // 同時に2回押されても、書けるのは最初の1回だけで、2回目は null が返る。
  // 「used を GET して、なければ SET」の2段階にすると、2回とも「まだない」と判断して両方成功してしまう。
  const usedAt = now.toISOString();
  const written = await redis.set(usedKey(id), usedAt, { nx: true, ex: secondsUntilEndOfDayJst(now) });

  if (written === null) {
    // すでに使われていた。いつ使われたかを返して、画面に表示できるようにする
    const firstUsedAt = await redis.get<string>(usedKey(id));
    return { ok: false, reason: "already_used", usedAt: firstUsedAt ?? usedAt };
  }

  // 使用数は「使われた店（validAt）」で数える。管理画面で「その店で何枚使われたか」を見るため
  const usedCountKey = countKey(jstDateString(now), ticket.validAt, "used");
  await redis.multi().incr(usedCountKey).expire(usedCountKey, COUNT_TTL_SECONDS).exec();

  return { ok: true, usedAt };
}
