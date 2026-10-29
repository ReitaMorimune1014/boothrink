// 「このQR（token）で受け取ったチケットID」を、お客さんのスマホに覚えておく。
//
// なぜ必要か:
// /c/{token} でチケットを受け取ったあとに、ページを再読み込みしたり「戻る」で戻ったりすると、
// 引換券はもう使われているので「このQRは使用済みです」と出てしまい、自分のチケットを見失う。
// 覚えておけば、2回目以降はサーバーに問い合わせず、すぐ自分のチケットに移動できる。
//
// サーバーに「交換済みならチケットIDを返す」機能を作らないのは、
// 同じQRを後ろの人が読み込んだときに、前の人のチケットが見えてしまうため。

function storageKey(token: string): string {
  return `boothrink:claimed:${token}`;
}

export function loadClaimedTicketId(token: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(token));
  } catch {
    // プライベートモードなどで使えないときは「覚えていない」として扱う
    return null;
  }
}

export function saveClaimedTicketId(token: string, ticketId: string): void {
  try {
    window.localStorage.setItem(storageKey(token), ticketId);
  } catch {
    // 保存できなくても、チケットのページへの移動はできる
  }
}
