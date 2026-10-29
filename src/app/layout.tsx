import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "boothrink",
  description: "安藤ゼミ×林ゼミ 模擬店の相互チケット",
};

// お客さんはスマホで開くので、端末の幅に合わせて表示する
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
