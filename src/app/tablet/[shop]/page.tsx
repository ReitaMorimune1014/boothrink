import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isShop } from "@/lib/shops";
import { TabletScreen } from "./TabletScreen";

export const metadata: Metadata = {
  title: "タブレット | boothrink",
  // 店員用の画面なので、検索エンジンに載せない
  robots: { index: false, follow: false },
};

// /tablet/ando と /tablet/hayashi。それ以外の店名は 404 にする
export default async function TabletPage({ params }: { params: Promise<{ shop: string }> }) {
  const { shop } = await params;
  if (!isShop(shop)) {
    notFound();
  }
  return <TabletScreen shop={shop} />;
}
