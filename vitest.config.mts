import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // tsconfig.json の "@/*" と同じ対応をVitestにも教える。
    // これがないと、テストから `@/lib/...` をimportしたときに見つからない。
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // 当面テストするのはAPIやRedisまわりの「サーバー側の処理」なので、ブラウザ環境（jsdom）は使わない。
    environment: "node",
    include: ["src/**/*.test.ts"],
    // 本物の Redis に中継サーバー経由でつなぐ（test/global-setup.ts）
    globalSetup: ["./test/global-setup.ts"],
    // テストファイルを同時に動かすと、1つの Redis を取り合って、あるテストの flushdb が別のテストのデータを消してしまう。
    // テストは数秒で終わるので、ファイルは1つずつ順番に動かす。
    fileParallelism: false,
  },
});
