"use client";

import { useCallback, useState, type FormEvent } from "react";
import { BENEFITS, partnerShop, SHOP_NAMES, type Shop } from "@/lib/shops";
import { clearStaffPassword, saveStaffPassword, useStaffPassword } from "@/lib/staff-password-storage";
import { TabletQrLoop } from "./TabletQrLoop";
import styles from "./tablet.module.css";

// タブレット画面の外枠。
// パスワードがなければ入力画面を、あれば QR を回す部品（TabletQrLoop）を出す。
// パスワードの扱いと QR の扱いを分けることで、それぞれを短く読みやすくしている。
export function TabletScreen({ shop }: { shop: Shop }) {
  const password = useStaffPassword();
  const [wrongPassword, setWrongPassword] = useState(false);

  // useCallback で包むのは、TabletQrLoop の useEffect がこの関数に依存しているため。
  // 包まないと描画のたびに新しい関数になり、通信のやり直しが起きてしまう。
  const handleUnauthorized = useCallback(() => {
    setWrongPassword(true);
    // 間違ったパスワードを残さない。消すと useStaffPassword が null になり、入力画面に戻る
    clearStaffPassword();
  }, []);

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget).get("password");
    if (typeof input !== "string" || input === "") {
      return;
    }
    setWrongPassword(false);
    saveStaffPassword(input);
  }

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
        {/* サーバーで描画している間は、パスワードが保存されているかわからない */}
        {password === undefined && <p className={styles.message}>準備中…</p>}

        {password === null && (
          <form className={styles.passwordForm} onSubmit={handlePasswordSubmit}>
            <label htmlFor="password">店員用パスワード</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            {wrongPassword && <p className={styles.errorText}>パスワードが違います</p>}
            <button type="submit">はじめる</button>
          </form>
        )}

        {/* key にパスワードを渡すと、パスワードが変わったときに QR の状態を最初からやり直せる */}
        {typeof password === "string" && (
          <TabletQrLoop key={password} shop={shop} password={password} onUnauthorized={handleUnauthorized} />
        )}
      </section>
    </main>
  );
}
