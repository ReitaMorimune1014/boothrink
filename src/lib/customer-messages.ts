// お客さんに見せるエラーの文言。API が返す理由（reason）ごとに、何が起きて・どうすればいいかを書く。
// 文言を1か所に集めておくと、画面ごとに言い方がばらばらになるのを防げる。

export type CustomerErrorReason =
  | "already_claimed" // QRがすでに読み込まれていた
  | "claim_expired" // QRの期限切れ
  | "ticket_expired" // チケットの期限切れ（当日が終わった）
  | "stopped" // 受付停止中
  | "invalid" // URL がおかしい
  | "network"; // 通信できなかった

export type CustomerErrorMessage = {
  title: string;
  description: string;
};

export const CUSTOMER_ERROR_MESSAGES: Record<CustomerErrorReason, CustomerErrorMessage> = {
  already_claimed: {
    title: "このQRは使用済みです",
    description: "ほかの方がすでに読み込みました。お店のタブレットに表示されている新しいQRを読み込んでください。",
  },
  claim_expired: {
    title: "QRの有効期限が切れています",
    description: "お店のタブレットに表示されている新しいQRを読み込んでください。",
  },
  ticket_expired: {
    title: "チケットの有効期限が切れています",
    description: "チケットは発行した日の23:59まで使えます。",
  },
  stopped: {
    title: "ただいま受付を停止しています",
    description: "お手数ですが、お店の人に声をかけてください。",
  },
  invalid: {
    title: "このURLは使えません",
    description: "お店のタブレットのQRを、もう一度読み込んでください。",
  },
  network: {
    title: "通信できませんでした",
    description: "電波のよい場所で、ページを再読み込みしてください。",
  },
};
