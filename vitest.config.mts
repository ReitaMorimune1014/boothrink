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
  },
});
