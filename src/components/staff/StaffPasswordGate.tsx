"use client";

import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { clearStaffPassword, saveStaffPassword, useStaffPassword } from "@/lib/staff-password-storage";
import styles from "./staff.module.css";

type Props = {
  // パスワードがあるときに表示する中身。
  // onUnauthorized は、API が 401 を返したときに呼んでもらう（パスワードを消して入力画面に戻す）
  children: (password: string, onUnauthorized: () => void) => ReactNode;
};

// 店員用の画面（タブレット・管理画面）の入口。
// パスワードが保存されていなければ入力画面を、あれば中身を表示する。
// タブレットと管理画面で同じ処理を2回書かないように、1つの部品にしている。
export function StaffPasswordGate({ children }: Props) {
  const password = useStaffPassword();
  const [wrongPassword, setWrongPassword] = useState(false);

  // useCallback で包むのは、中身の useEffect がこの関数に依存しているため。
  // 包まないと描画のたびに新しい関数になり、通信のやり直しが起きてしまう。
  const handleUnauthorized = useCallback(() => {
    setWrongPassword(true);
    // 間違ったパスワードを残さない。消すと useStaffPassword が null になり、入力画面に戻る
    clearStaffPassword();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = new FormData(event.currentTarget).get("password");
    if (typeof input !== "string" || input === "") {
      return;
    }
    setWrongPassword(false);
    saveStaffPassword(input);
  }

  // サーバーで描画している間は、パスワードが保存されているかわからない
  if (password === undefined) {
    return <p className={styles.message}>準備中…</p>;
  }

  if (password === null) {
    return (
      <form className={styles.passwordForm} onSubmit={handleSubmit}>
        <label htmlFor="password">店員用パスワード</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        {wrongPassword && <p className={styles.errorText}>パスワードが違います</p>}
        <button type="submit">はじめる</button>
      </form>
    );
  }

  return children(password, handleUnauthorized);
}
