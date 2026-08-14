# odai-photo

AI が出すお題で写真を撮って、AI に採点してもらう PWA。さんぽ神テイストの「日常に刺激を与える」アプリ。

MVP は **1 人モードのみ**。詳細な設計は [`design.md`](./design.md) を参照してください。

---

## 必要なもの

| ツール | バージョン | 備考 |
|------|----------|------|
| Node.js | **22 LTS 以降(24 LTS 推奨)** | `package.json` の `engines` / `volta` で固定 |
| pnpm | **10.x 以降** | Volta 経由で固定推奨 |

Volta を使っている場合、`pnpm install` 実行時に自動で適切なバージョンが選ばれます。

---

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、Gemini API キーを設定してください。

```bash
cp .env.local.example .env.local
```

```env
# .env.local
GEMINI_API_KEY=（Google AI Studio で取得した API キー）
```

> **重要**: `GEMINI_API_KEY` には絶対に `NEXT_PUBLIC_` 接頭辞をつけないでください。Server Action 内のみで使用します。

Gemini API キーは [Google AI Studio](https://aistudio.google.com/app/apikey) から無料で取得できます。

---

## よく使うコマンド

```bash
pnpm dev          # 開発サーバー起動 (http://localhost:3000)
pnpm build        # 本番ビルド
pnpm start        # 本番ビルドを起動
pnpm lint         # ESLint
pnpm typecheck    # 型チェックのみ実行
pnpm audit        # セキュリティ監査
```

---

## ディレクトリ構成

```
odai-photo/
├── public/                       # 静的アセット(後フェーズで manifest.json など追加)
├── src/
│   ├── app/                      # App Router(ページ、レイアウト、Server Actions)
│   ├── components/               # UI コンポーネント
│   ├── lib/                      # Gemini クライアント、zod スキーマ、ユーティリティ
│   └── types/                    # 型定義
├── .github/
│   ├── dependabot.yml            # 依存ライブラリの自動アップデート PR
│   └── workflows/ci.yml          # lint / build / audit を実行
├── design.md                     # 設計仕様書
├── CLAUDE.md                     # Claude Code 向けの開発ルール
└── README.md
```

詳細は [`design.md` §11](./design.md) を参照。

---

## 開発フェーズ

| フェーズ | 内容 | 状態 |
|--------|------|------|
| Phase 1 | 基盤セットアップ | 進行中 / 完了予定 |
| Phase 2 | Gemini クライアント + お題生成 | 未着手 |
| Phase 3 | 写真撮影 + プレビュー | 未着手 |
| Phase 4 | 採点機能 | 未着手 |
| Phase 5 | レート制限 + セキュリティ仕上げ | 未着手 |
| Phase 6 | PWA 化 | 未着手 |
| Phase 7 | UX 仕上げ | 未着手 |

詳細は [`design.md` §12](./design.md) を参照。

---

## セキュリティ

実装中・リリース前に [`design.md` §10](./design.md) を必ず参照してください。特に:

- Next.js / React のバージョン要件を絶対に下げない
- 全 Server Action で zod バリデーション
- Gemini API キーをクライアント側に流出させない
- レート制限を必ず実装する

Dependabot が weekly で依存関係の更新 PR を作ります。新しい CVE が出たら即マージ → デプロイの方針。
