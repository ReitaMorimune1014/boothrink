import type { Metadata } from "next";
import { ErrorView } from "@/components/customer/ErrorView";
import { getTicket } from "@/lib/ticket";
import { isUuid } from "@/lib/validation";
import { TicketScreen } from "./TicketScreen";

export const metadata: Metadata = {
  title: "チケット | boothrink",
  // チケットのURLは本人だけのものなので、検索エンジンに載せない
  robots: { index: false, follow: false },
};

// 開くたびに Redis から最新の状態を読む（使用済みになったあとに、古い「未使用」を見せないため）
export const dynamic = "force-dynamic";

// /t/{id}: お客さんのチケット
// 最初の状態はサーバーで Redis から読んで描画する。スマホ側で読み込みを待たずに、すぐチケットが表示される
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) {
    return <ErrorView reason="invalid" />;
  }

  const view = await getTicket(id);
  if (view.status === "expired") {
    return <ErrorView reason="ticket_expired" />;
  }
  if (view.status === "stopped") {
    return <ErrorView reason="stopped" />;
  }

  const initialUsedAt = view.status === "used" ? view.usedAt : null;
  return <TicketScreen id={id} ticket={view.ticket} initialUsedAt={initialUsedAt} />;
}
