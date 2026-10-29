"use client";

import { StaffPasswordGate } from "@/components/staff/StaffPasswordGate";
import { AdminDashboard } from "./AdminDashboard";
import styles from "./admin.module.css";

// 管理画面の外枠。パスワードの確認は、タブレットと同じ StaffPasswordGate に任せる
export function AdminScreen() {
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>boothrink 管理画面</h1>
      <StaffPasswordGate>
        {(password, onUnauthorized) => (
          <AdminDashboard key={password} password={password} onUnauthorized={onUnauthorized} />
        )}
      </StaffPasswordGate>
    </main>
  );
}
