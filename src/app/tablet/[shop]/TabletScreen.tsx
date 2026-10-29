"use client";

import { StaffPasswordGate } from "@/components/staff/StaffPasswordGate";
import { BENEFITS, partnerShop, SHOP_NAMES, type Shop } from "@/lib/shops";
import { TabletQrLoop } from "./TabletQrLoop";
import styles from "./tablet.module.css";

// タブレット画面の外枠。
// パスワードの確認は StaffPasswordGate に任せ、パスワードがあれば QR を回す部品（TabletQrLoop）を出す。
export function TabletScreen({ shop }: { shop: Shop }) {
  const validAt = partnerShop(shop);

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.shopName}>{SHOP_NAMES[shop]}</p>
        <p className={styles.benefit}>
          {SHOP_NAMES[validAt]}で <strong>{BENEFITS[validAt]}</strong>
        </p>
      </header>

      <section className={styles.body}>
        <StaffPasswordGate>
          {/* key にパスワードを渡すと、パスワードが変わったときに QR の状態を最初からやり直せる */}
          {(password, onUnauthorized) => (
            <TabletQrLoop key={password} shop={shop} password={password} onUnauthorized={onUnauthorized} />
          )}
        </StaffPasswordGate>
      </section>
    </main>
  );
}
