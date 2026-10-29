import type { Metadata } from "next";
import { ErrorView } from "@/components/customer/ErrorView";
import { isUuid } from "@/lib/validation";
import { ClaimScreen } from "./ClaimScreen";

export const metadata: Metadata = {
  title: "チケット発行 | boothrink",
  // 1回限りのURLなので、検索エンジンに載せない
  robots: { index: false, follow: false },
};

// /c/{token}: タブレットのQRを読み込むと開くページ
export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // 形がおかしい token は、ブラウザで交換を試すまでもなくエラーにする
  if (!isUuid(token)) {
    return <ErrorView reason="invalid" />;
  }
  return <ClaimScreen token={token} />;
}
