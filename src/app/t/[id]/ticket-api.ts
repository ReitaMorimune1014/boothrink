import type { CustomerErrorReason } from "@/lib/customer-messages";

export type UseResult = { ok: true; usedAt: string } | { ok: false; reason: CustomerErrorReason };

// POST /api/ticket/use を呼び、結果を画面で使う形に直す
export async function requestUseTicket(id: string): Promise<UseResult> {
  let response: Response;
  try {
    response = await fetch("/api/ticket/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  const body = (await response.json().catch(() => ({}))) as { usedAt?: string; error?: string };

  if (response.ok && body.usedAt) {
    return { ok: true, usedAt: body.usedAt };
  }
  // すでに使われていた（別のタブで押した、二度押しした など）。
  // お客さんにとっては「使えた」のと同じなので、最初に使った時刻で使用済み画面を出す
  if (body.error === "already_used" && body.usedAt) {
    return { ok: true, usedAt: body.usedAt };
  }
  if (body.error === "stopped") {
    return { ok: false, reason: "stopped" };
  }
  if (body.error === "expired") {
    return { ok: false, reason: "ticket_expired" };
  }
  if (body.error === "invalid") {
    return { ok: false, reason: "invalid" };
  }
  return { ok: false, reason: "network" };
}
