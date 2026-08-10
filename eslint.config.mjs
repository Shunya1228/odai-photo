// Next.js 16 の eslint-config-next は flat config 形式の配列を直接エクスポートしている。
// FlatCompat 経由で読み込むと循環参照で JSON.stringify が落ちるので、直接 import + spread する。
// 参考: node_modules/eslint-config-next/dist/index.js が `module.exports = [{...}]` の形
import nextConfig from "eslint-config-next";
import nextTypescriptConfig from "eslint-config-next/typescript";
import nextCoreWebVitalsConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  ...nextCoreWebVitalsConfig,
  ...nextTypescriptConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
      ],
    },
  },
  {
    // ビルド成果物・依存・自動生成物は無視
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
