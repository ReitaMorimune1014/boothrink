import { useSyncExternalStore } from "react";

// 店員用パスワードを、タブレット（店のブラウザ）に覚えさせておく。
// 毎回入力するのは屋外では大変なので、1回入れたら localStorage に保存する。
//
// localStorage は、そのブラウザで動くJavaScriptなら誰でも読める。
// お客さんの端末ではなく、店が管理するタブレットだけで使う前提で、この方法にしている。

const STORAGE_KEY = "boothrink:staffPassword";

// 保存・削除したことを、画面（React）に知らせるための登録先
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // プライベートモードなどで localStorage が使えないときは「保存されていない」として扱う
    return null;
  }
}

export function saveStaffPassword(password: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, password);
  } catch {
    // 保存できなかった。画面には「保存されていない」と見えるので、もう一度入力してもらう
  }
  notify();
}

export function clearStaffPassword(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても、次に 401 が返れば、また入力画面になる
  }
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // 別のタブで保存・削除されたときも知らせる
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// 保存されたパスワードを読む React のフック。
// - string: 保存されている / null: 保存されていない / undefined: まだわからない（サーバーで描画中）
//
// なぜ useEffect + useState ではなく useSyncExternalStore なのか:
// localStorage は React の外にあるデータ。React はこういうデータを読むために useSyncExternalStore を用意しており、
// 保存・削除されたら自動で描き直してくれる。useEffect の中で setState すると、描画が二度手間になる。
export function useStaffPassword(): string | null | undefined {
  return useSyncExternalStore<string | null | undefined>(subscribe, read, () => undefined);
}
