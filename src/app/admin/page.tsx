import type { Metadata } from "next";
import { AdminScreen } from "./AdminScreen";

export const metadata: Metadata = {
  title: "管理画面 | boothrink",
  // 店員用の画面なので、検索エンジンに載せない
  robots: { index: false, follow: false },
};

// /admin: 今日の発行数・使用数と、受付停止の切り替え
export default function AdminPage() {
  return <AdminScreen />;
}
