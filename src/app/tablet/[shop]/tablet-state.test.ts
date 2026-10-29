import { describe, expect, it } from "vitest";
import { tabletReducer, type TabletState } from "./tablet-state";

const showing: TabletState = { kind: "showing", token: "token-1" };

describe("tabletReducer", () => {
  it("引換券ができたらQRを表示する", () => {
    expect(tabletReducer({ kind: "loading" }, { type: "claimCreated", token: "token-1" })).toEqual(showing);
  });

  it("読み込まれたら「発行しました ✓」→ 表示し終えたら次のQRを取りに行く", () => {
    const issued = tabletReducer(showing, { type: "statusChecked", token: "token-1", status: "claimed" });
    expect(issued).toEqual({ kind: "issued" });
    expect(tabletReducer(issued, { type: "issuedShown" })).toEqual({ kind: "loading" });
  });

  it("まだ読まれていなければ、同じ state をそのまま返す（描き直さない）", () => {
    expect(tabletReducer(showing, { type: "statusChecked", token: "token-1", status: "waiting" })).toBe(showing);
  });

  it("期限切れなら次のQRを取りに行く", () => {
    expect(tabletReducer(showing, { type: "statusChecked", token: "token-1", status: "expired" })).toEqual({
      kind: "loading",
    });
  });

  it("入れ替える時間になったら次のQRを取りに行く", () => {
    expect(tabletReducer(showing, { type: "rotationTimeReached", token: "token-1" })).toEqual({ kind: "loading" });
  });

  it("古いQRの結果やタイマーが遅れて届いても無視する", () => {
    const newer: TabletState = { kind: "showing", token: "token-2" };
    expect(tabletReducer(newer, { type: "statusChecked", token: "token-1", status: "claimed" })).toBe(newer);
    expect(tabletReducer(newer, { type: "rotationTimeReached", token: "token-1" })).toBe(newer);
  });

  it("受付停止になったらQRを隠し、時間をおいてもう一度試す", () => {
    const stopped = tabletReducer(showing, { type: "statusChecked", token: "token-1", status: "stopped" });
    expect(stopped).toEqual({ kind: "stopped" });
    expect(tabletReducer({ kind: "loading" }, { type: "claimRefusedBecauseStopped" })).toEqual({ kind: "stopped" });
    expect(tabletReducer(stopped, { type: "retryTimeReached" })).toEqual({ kind: "loading" });
  });

  it("通信エラーのあとも、時間をおいてもう一度試す", () => {
    const error = tabletReducer({ kind: "loading" }, { type: "failed" });
    expect(error).toEqual({ kind: "error" });
    expect(tabletReducer(error, { type: "retryTimeReached" })).toEqual({ kind: "loading" });
  });

  it("QR表示中にもう一度試すタイマーが届いても無視する", () => {
    expect(tabletReducer(showing, { type: "retryTimeReached" })).toBe(showing);
    expect(tabletReducer(showing, { type: "issuedShown" })).toBe(showing);
  });
});
