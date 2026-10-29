import { CUSTOMER_ERROR_MESSAGES, type CustomerErrorReason } from "@/lib/customer-messages";
import styles from "./customer.module.css";

// お客さん用のエラー画面。理由ごとの文言は customer-messages.ts にまとめてある
export function ErrorView({ reason }: { reason: CustomerErrorReason }) {
  const message = CUSTOMER_ERROR_MESSAGES[reason];
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{message.title}</h1>
      <p className={styles.description}>{message.description}</p>
    </main>
  );
}
