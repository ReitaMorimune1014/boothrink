import type { CustomerErrorReason } from "@/lib/customer-messages";

export type RedeemResult = { ok: true; ticketId: string } | { ok: false; reason: CustomerErrorReason };

// POST /api/claim を呼び、結果を画面で使う形に直す
export async function requestRedeem(token: string): Promise<RedeemResult> {
  let response: Response;
  try {
    response = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (response.ok) {
    const body = (await response.json()) as { ticketId: string };
    return { ok: true, ticketId: body.ticketId };
  }

  // API が返す error を、お客さんに見せる理由に直す
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (body.error === "already_claimed") {
    return { ok: false, reason: "already_claimed" };
  }
  if (body.error === "expired") {
    return { ok: false, reason: "claim_expired" };
  }
  if (body.error === "stopped") {
    return { ok: false, reason: "stopped" };
  }
  if (body.error === "invalid") {
    return { ok: false, reason: "invalid" };
  }
  return { ok: false, reason: "network" };
}
