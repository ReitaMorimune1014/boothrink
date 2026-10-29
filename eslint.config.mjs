import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// Next.js 公式の推奨ルール（React / Hooks / アクセシビリティ / TypeScript）をそのまま使う。
// 独自ルールを足すのは、困ったことが起きてからにする（最初から増やすと理由を説明できないルールが残るため）。
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
