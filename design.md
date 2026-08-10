# odai-photo MVP 設計仕様書

## 1. 概要

### コンセプト
ボタンを押すと AI がお題を出してくれて、写真を撮って AI に採点してもらう PWA。さんぽ神テイストの「日常に刺激を与える」アプリ。

### MVP のスコープ
**「1人で気軽に遊ぶ」** の最小構成。

- ログインなし
- データ保存なし(履歴は残らない)
- **1人モードのみ**(2人対戦は v1.1 で追加)
- 1画面で完結(お題生成 → 写真投稿 → 採点 → リセット)

将来的に「2人モード」「ペア機能」「履歴保存」「リアルタイム同期」を追加していく前提。MVP は **「動いて楽しい」を最速で確認する** のが目的。

### 設計方針
- 最小構成・最速リリース
- セキュリティ要件は妥協しない(最新の Next.js / React 脆弱性対応)
- PWA 対応(ホーム画面に追加で全画面起動)
- モバイル優先

---

## 2. 技術スタック

### 採用バージョン(2026-06-02 時点、Phase 1 完了時の実装)

| レイヤー | 採用技術 | 実装バージョン |
|---------|---------|--------------|
| ランタイム | Node.js | **24.16.0**(Volta で固定) |
| パッケージマネージャ | pnpm | **11.2.2**(Volta で固定) |
| フレームワーク | Next.js (App Router) + TypeScript | **16.2.6** |
| React | React + React DOM | **19.2.6** |
| スタイリング | Tailwind CSS | **4.x**(config ファイルなし、`@theme` で CSS 変数定義) |
| ホスティング | Vercel | 未デプロイ |
| LLM | Google Gemini 2.5 Flash(画像入力対応) | Phase 2 で導入予定 |
| 画像圧縮 | browser-image-compression | Phase 3 で導入予定 |
| バリデーション | zod | Phase 2 / 4 で導入予定 |
| PWA | next-pwa or 手動実装 | Phase 6 で導入時に検討(Next.js 16 動作要確認) |

### バージョン要件の下限(セキュリティ要件、絶対遵守)

- Node.js: **22 LTS 以降**(セキュリティパッチ受領中)
- Next.js: **16.2.6 以降** または **15.5.18 以降**(CVE-2026-23870 等の対応必須)
- React: **19.2.6 以降**(または 19.0.6 / 19.1.7 以降。CVE-2025-55182 対応)
- pnpm: **10.x 以降**(11.x も問題なし)

### Volta による Node.js / pnpm の固定

`package.json` の `volta` フィールドに記載済み:

```json
"volta": {
  "node": "24.16.0",
  "pnpm": "11.2.2"
}
```

Volta がインストールされていれば、プロジェクトディレクトリで自動的にこのバージョンに切り替わる。

### pnpm 設定

pnpm 11 以降は **`package.json` の `"pnpm"` フィールドは読まれない**。設定は `pnpm-workspace.yaml` に書く:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  sharp: true              # Next.js の next/image が使う画像処理ライブラリ
  unrs-resolver: true      # eslint-config-next 経由のモジュール解決
```

ビルドスクリプト(postinstall など任意コード実行)はデフォルトで全て無効化されており、明示的に許可したパッケージのみ実行される。

### Lint 設定

Next.js 16 で **`next lint` コマンドは削除された**。`package.json` の lint スクリプトは `eslint .` を直接呼ぶ。

`eslint-config-next` 16 系は flat config 配列を直接エクスポートしているので、`eslint.config.mjs` では `FlatCompat` を経由せず直接 import + spread する:

```js
import nextConfig from "eslint-config-next";
import nextTypescriptConfig from "eslint-config-next/typescript";
import nextCoreWebVitalsConfig from "eslint-config-next/core-web-vitals";
export default [...nextConfig, ...nextCoreWebVitalsConfig, ...nextTypescriptConfig, /* 追加ルール */];
```

`FlatCompat` 経由で読むと循環参照で `JSON.stringify` エラーになる。

### MVP では使わないもの

- Supabase(DB・Auth・Storage 全部不要)
- 認証ライブラリ
- 状態管理ライブラリ(useState だけで十分)
- shadcn/ui(必要になったら入れる、最初は Tailwind 直書きで十分)

### バージョン管理方針

- `package.json` の dependencies / devDependencies は **完全固定 or `^` キャレット**
- `pnpm-lock.yaml` を必ずコミット
- Dependabot を weekly で有効化(`.github/dependabot.yml`)
- 新しいライブラリ追加前は `pnpm info <pkg>` で最新版・互換性を確認

---

## 3. UI 開発方針

> **2026-06-02 方針変更**: 当初は Claude Design でビジュアル設計を先行させる前提だったが、Claude Code 内で各フェーズと並行して UI も作る方針に変更した。以下の Claude Design 関連の記述は **当初設計の参考情報** として残しておく。

### 現在の方針(2026-06-02 以降)

- UI は Claude Code で実装。各フェーズで必要な画面要素を Tailwind v4 で組む
- デザイントークン(色・フォント)は `src/app/globals.css` の `@theme` に集約
- **トーン**: 落ち着いた大人カジュアル(さんぽ神寄りの日常感)
- **カラー**: ライトモード基調、アクセント1色は暖色系(`#e07a5f`)
- **ガチャ感**: シンプルにスッと表示(過度な演出はなし)

### 当初設計(参考・現在は非採用)

#### 進め方
1. **Claude Design でビジュアル設計** — 「個人向けのお題写真ガチャ、モバイル前提、3つの状態(idle/has-prompt/result)」のプロンプトでデザイン生成
2. **デザインを調整** — 色味・タイポ・余白などを自然言語で詰める
3. **handoff bundle として書き出し** — Tailwind ベースのコードが出力される
4. **Claude Code に渡す** — `design.md`(この設計書)+ Claude Design の出力 を一緒に渡して実装依頼

#### Claude Design に伝えるとよい要件
- モバイル前提(スマホで遊ぶアプリ)
- PWA としてホーム画面起動を想定
- カジュアル・遊び心のあるトーン(暗すぎず、ガチャ感)
- 3つの状態の遷移をデザインに含める
  - 初期状態(お題を引く前)
  - お題が出た状態(写真撮影フェーズ)
  - 採点結果表示

#### 注意点
- Claude Design はビジュアルのみ。ロジック・Server Action・API 呼び出しは別途実装
- 完璧を求めすぎない。MVP の見た目として「最低限ちゃんとしてる」で十分
- 生成された Tailwind コードは、Claude Code 側で本設計書のロジックに統合する

---

## 4. 画面仕様

### 4.1 画面構成

**1画面で完結**。ルートパス `/` のみ。

```
[ 状態: idle ]
┌────────────────────────────────┐
│   お題写真ガチャ                │
│                                │
│   [ お題を引く ] ← 大きく       │
│                                │
└────────────────────────────────┘

   ↓ タップ

[ 状態: has-prompt ]
┌────────────────────────────────┐
│   📜 お題                       │
│   「今いちばん幸せそうなもの」    │
│                                │
│   [ お題を引き直す ]            │
│                                │
│   ┌──────────────────────┐    │
│   │  写真をここに         │    │
│   │  [ 撮影する ]         │    │
│   └──────────────────────┘    │
│                                │
│   [ 採点する ] ← 写真があれば有効  │
└────────────────────────────────┘

   ↓ 採点

[ 状態: grading ]
┌────────────────────────────────┐
│   📜 お題                       │
│   「今いちばん幸せそうなもの」    │
│                                │
│   [ 写真プレビュー ]            │
│                                │
│   ⏳ 審査員が悩んでいます...    │
└────────────────────────────────┘

   ↓ 結果

[ 状態: result ]
┌────────────────────────────────┐
│   結果発表 🏆                   │
│                                │
│   📜 お題                       │
│   「今いちばん幸せそうなもの」    │
│                                │
│   [ 写真 ]                      │
│                                │
│   スコア: 85点                  │
│                                │
│   講評:                         │
│   「公園のベンチに置かれた...   │
│    やさしい時間が伝わります」   │
│                                │
│   [ もう一回 ] ← お題と写真をリセット │
└────────────────────────────────┘
```

### 4.2 状態遷移

クライアント側の `useState` で管理する状態:

```typescript
type Phase = 'idle' | 'has-prompt' | 'grading' | 'result';

interface AppState {
  phase: Phase;
  prompt: string | null;
  image: File | null;
  result: GradeResult | null;
}

interface GradeResult {
  score: number;        // 0〜100
  comment: string;      // 講評
}
```

| phase | 表示内容 |
|------|---------|
| `idle` | 「お題を引く」ボタンだけ |
| `has-prompt` | お題 + 写真アップロード枠 + 採点ボタン |
| `grading` | お題 + 写真 + ローディング表示(「審査員が悩んでいます...」) |
| `result` | 結果発表画面 + 「もう一回」ボタン |

「もう一回」を押すと `idle` に戻る(state を全部リセット)。
「お題を引き直す」を押すと写真もリセットして新しいお題を取得。

### 4.3 ローディング UI

- お題生成中: 「お題を選んでいます...」のスピナー
- 採点中: 「審査員が悩んでいます...」のスケルトン表示

ローディング時間が長い(Gemini API は数秒かかる)ので、退屈させないテキストや動きを工夫する。

---

## 5. データフロー

```
[ ユーザー ]                       [ Next.js Server Action ]                  [ Gemini API ]
       │                                       │                                  │
   「お題を引く」                                │                                  │
       │ ─────────────────────────────────────▶│                                  │
       │   createChallenge()                   │                                  │
       │                                       │ お題生成プロンプトを送信             │
       │                                       │ ─────────────────────────────────▶│
       │                                       │ ◀─────────────────────────────────│
       │                                       │   お題テキスト                     │
       │ ◀─────────────────────────────────────│                                  │
       │   { prompt: "..." }                   │                                  │
       │                                       │                                  │
   写真を撮影                                   │                                  │
   (クライアント側で圧縮)                       │                                  │
       │                                       │                                  │
   「採点する」                                  │                                  │
       │ ─────────────────────────────────────▶│                                  │
       │   gradeChallenge(prompt, image)       │                                  │
       │                                       │ 画像 + お題 + 採点プロンプトを送信   │
       │                                       │ ─────────────────────────────────▶│
       │                                       │ ◀─────────────────────────────────│
       │                                       │   JSON 結果                       │
       │ ◀─────────────────────────────────────│                                  │
       │   { score, comment }                  │                                  │
```

**ポイント**:
- 画像はサーバーに保存しない(メモリ上で受け取って Gemini に渡して破棄)
- DB なし、Storage なし
- セッション情報も持たない(リロードしたら全部リセット)

---

## 6. Server Actions 仕様

すべて `app/actions.ts` に配置。

### 6.1 createChallenge

```typescript
'use server'

export async function createChallenge(): Promise<{
  prompt: string
}>
```

- 引数なし
- Gemini API でお題を生成して返すだけ
- レート制限あり(後述)

### 6.2 gradeChallenge

```typescript
'use server'

export async function gradeChallenge(formData: FormData): Promise<{
  score: number,
  comment: string
}>
```

FormData に含めるもの:
- `prompt`: string(お題)
- `image`: File(写真)

**入力バリデーション(zod)**:
- `prompt`: 1〜200文字
- `image`: File、MIME type が `image/jpeg` / `image/png` / `image/webp`、サイズ 5MB 以下

バリデーション失敗時はエラーを投げる。

---

## 7. Gemini プロンプト設計

### 7.1 お題生成プロンプト

```
あなたは「お題ガチャ」アプリの出題者です。
写真を撮って楽しむための、面白くて実行可能なお題を1つだけ生成してください。

# 条件
- 場所を選ばず、その場で撮れるお題
- 1人でも複数人でも楽しめる内容
- 解釈の幅があるお題(人によって違う写真が撮れる)
- 30文字以内、簡潔に
- 日本語で

# 例
- 「今いちばん幸せそうなもの」
- 「やさしさを感じる瞬間」
- 「昭和の哀愁を感じるもの」
- 「主人公感のある物体」
- 「today's MVP」

# 出力形式
お題の文字列のみ。説明・前置き・引用符は不要。
```

**実装時の工夫**:
- temperature を 0.9〜1.0 にして多様性確保
- 失敗時のリトライ(最大2回)

### 7.2 採点プロンプト

```
あなたは写真ガチャアプリの審査員です。
以下のお題に対して投稿された写真を、楽しく評価してください。

# お題
{prompt}

# 評価方法
- 0〜100点でスコアをつける
- お題への合致度、ユーモア、撮影の工夫を総合的に評価
- 100字以内の楽しい一言講評をつける
- 厳しすぎず、甘すぎず。基本ポジティブに、たまにツッコミを入れる

# 出力形式(厳密にJSON、他の文字列を含めない)
{
  "score": 85,
  "comment": "..."
}
```

**実装時の注意**:
- Gemini の構造化出力(`responseMimeType: "application/json"`)を使う
- zod でレスポンスをバリデーション
- 失敗時のリトライ(最大2回)

---

## 8. PWA 設定

### 8.1 manifest.json

`public/manifest.json` に配置:

```json
{
  "name": "お題写真ガチャ",
  "short_name": "お題ガチャ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 8.2 アイコン

MVP では暫定で OK。フリーのアイコンジェネレーターで作る or 簡単な絵文字+背景で作る。
将来的にデザインを差し替え。

### 8.3 Service Worker

`next-pwa` を導入。デフォルト設定で十分。
- 静的アセットのキャッシュ
- API レスポンス(Server Action)はキャッシュしない

### 8.4 メタタグ

`app/layout.tsx` に以下を追加:

```typescript
export const metadata = {
  title: 'お題写真ガチャ',
  description: 'AIがお題を出して、撮った写真を採点するアプリ',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'お題ガチャ'
  },
  icons: {
    apple: '/icon-192.png'
  }
};
```

### 8.5 ホーム画面追加促進

初回訪問時に「ホーム画面に追加すると便利だよ」というバナーを軽く表示。
iOS Safari は自動の追加プロンプトがないので、手順を1行で案内する。

---

## 9. 画像処理仕様

### 9.1 撮影 UI

```html
<input type="file" accept="image/*" capture="environment" />
```

- `accept="image/*"`: 画像ファイルのみ
- `capture="environment"`: 背面カメラを優先起動(スマホ)
- ライブラリからの選択も可能(PC やテスト用)

### 9.2 クライアント側圧縮

`browser-image-compression` を使用:

```typescript
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp'  // WebP に変換してさらに容量削減
};

const compressed = await imageCompression(file, options);
```

**ライブラリの仕組み(参考)**:
- Web Worker で別スレッド処理 → UI が固まらない
- Canvas API でリサイズ + 再圧縮 → ブラウザ標準機能のみ使用
- すべてブラウザ内で完結、外部通信なし

### 9.3 プレビュー表示

`URL.createObjectURL(file)` でプレビュー用の URL を生成。
コンポーネントアンマウント時に `URL.revokeObjectURL()` でメモリ解放。

### 9.4 サーバー側でのバリデーション

クライアントの圧縮を信用せず、サーバー側でも確認:

- ファイルサイズ: 5MB 以下
- MIME type: `image/jpeg` / `image/png` / `image/webp` のいずれか
- マジックバイトでの検証(理想)

---

## 10. セキュリティ考慮事項

> **重要**: 2025年〜2026年にかけて Next.js / React Server Components で重大な脆弱性が立て続けに発見されている。Vercel ホスティングでも WAF で完全には防げないケースがあり、**フレームワークのバージョンを最新に保つこと自体がセキュリティ対策の中核**。

### 10.1 最近の重大脆弱性(2025〜2026)

実装前に必ず https://github.com/vercel/next.js/security/advisories で最新情報を確認すること。

| CVE | 概要 | 修正版 |
|-----|------|--------|
| **CVE-2026-23870** (High) | React Server Components の DoS(不正な HTTP リクエストで CPU 枯渇) | Next.js 15.5.18 / 16.2.6、React 19.0.6 / 19.1.7 / 19.2.6 |
| **2026年5月セキュリティリリース** | 13件のアドバイザリ(DoS、ミドルウェアバイパス、SSRF、キャッシュポイズニング、XSS) | 15.5.18 / 16.2.6 |
| **CVE-2025-55182** ("React2Shell", **Critical CVSS 10.0**) | React Flight プロトコルの insecure deserialization による RCE | React 19 系の patched 版 |
| **CVE-2025-29927** (Critical) | Middleware の認可バイパス(`x-middleware-subrequest` ヘッダ悪用) | 15.2.3 / 14.2.25 / 13.5.9 |
| **CVE-2025-48068** (Low) | dev server で App Router 使用時のソースコード漏洩 | 14.2.30 / 15.2.2 |

### 10.2 実装時の必須対策

#### (a) バージョン管理
- Next.js **16.2.6 以降**(または 15.5.18 以降)
- React **19.2.6 以降**
- Node.js **22 LTS 以降(24 LTS 推奨)**
- Dependabot 有効化、新しい CVE が出たら即アップデート
- Vercel WAF に依存しない設計(2026年5月のリリースは WAF で完全には防げないと Vercel 自身が公言)

#### (b) Middleware を使わない
MVP では認証もないので middleware.ts は作らない。CVE-2025-29927 の教訓。

#### (c) Server Actions の入力検証
- すべての Server Action の入力を **zod スキーマで厳密にバリデーション**
- 特に `gradeChallenge` はファイルを受け取るのでサイズ・MIME を厳密チェック

#### (d) レート制限(MVP でも必須)
Server Action は誰でも叩ける HTTP エンドポイント。**Gemini API キーが無料枠を持つため、悪用されると即枯渇する**。

MVP の実装案:
- **Vercel Firewall**(無料枠あり、設定だけで導入可能)で IP ベースの簡易制限
- もしくは Server Action 内で簡易制限(IP ごとに直近1分のリクエスト数をメモリ管理)
  - サーバーレスでは再起動でリセットされる前提だが、軽い悪用には十分
- 将来: Upstash Redis(無料枠あり)で永続的なレート制限

推奨制限値(MVP):
- `createChallenge`: 1分あたり10回 / IP
- `gradeChallenge`: 1分あたり5回 / IP

#### (e) Gemini API キーの保護
- `GEMINI_API_KEY` は **絶対に `NEXT_PUBLIC_` 接頭辞をつけない**
- Server Action 内のみで使用
- Vercel の Environment Variables で Production / Preview / Development を分けて管理
- 漏洩したら即ローテーション

#### (f) 画像のサイズ・MIME検証
- クライアント側だけのチェックは信用しない
- サーバー側で必ず再検証
- 不正なファイルは即エラー

#### (g) Dev Server の取り扱い
CVE-2025-48068 を踏まえ、`pnpm dev` で開発サーバー起動中は同じブラウザで信頼できないサイトを開かない。

### 10.3 セキュリティヘッダー

`next.config.ts` で設定:

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  }
};
```

### 10.4 環境変数

```env
# .env.local(gitignore する)

GEMINI_API_KEY=                # サーバー側のみ、NEXT_PUBLIC_ を絶対につけない
```

`.env.local.example` は安全な状態でコミット:

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

### 10.5 LLM プロンプトインジェクション対策

- お題生成プロンプトには **ユーザー入力を含めない**(MVPはランダム生成のみなので問題なし)
- 採点プロンプトには「自分のサーバーで生成したお題」と「画像」しか渡さないので、汚染リスクは低い
- 画像経由のプロンプトインジェクション(画像内のテキストで指示を上書きする攻撃)は理論上存在するが、Gemini 側の対策に任せる

### 10.6 依存ライブラリの監査

- `.github/dependabot.yml` で weekly セキュリティアップデート PR
- CI で `pnpm audit --audit-level=high` を実行、High 以上で fail
- 月1で `pnpm outdated` の手動確認

### 10.7 リリース前セキュリティチェックリスト

- [ ] Next.js が 15.5.18 / 16.2.6 以降
- [ ] React が 19.0.6 / 19.1.7 / 19.2.6 以降
- [ ] Node.js が 22 LTS 以降
- [ ] `pnpm audit` で High 以上の脆弱性なし
- [ ] `GEMINI_API_KEY` に `NEXT_PUBLIC_` がついていない
- [ ] `.env.local` が `.gitignore` に含まれている
- [ ] Vercel の Environment Variables が正しく設定
- [ ] Server Action で zod バリデーション実装済み
- [ ] レート制限実装済み(最低限)
- [ ] セキュリティヘッダー設定済み
- [ ] Dependabot 有効化

---

## 11. ディレクトリ構成

### Phase 1 完了時点の実装(2026-06-02)

```
odai-photo/
├── src/
│   └── app/
│       ├── layout.tsx              # ルートレイアウト、メタタグ
│       ├── page.tsx                # メイン画面(現状は「準備中」表示のみ)
│       └── globals.css             # Tailwind import + @theme でデザイントークン
├── .env.local.example              # GEMINI_API_KEY のテンプレート
├── .gitignore
├── .github/
│   ├── dependabot.yml              # weekly セキュリティアップデート PR
│   └── workflows/
│       └── ci.yml                  # typecheck / lint / build / audit
├── eslint.config.mjs               # ESLint flat config(eslint-config-next 16 を直接 import)
├── next-env.d.ts                   # Next.js 自動生成(コミット対象外、.gitignore 済み)
├── next.config.ts                  # セキュリティヘッダー
├── package.json                    # 依存・スクリプト・volta pin
├── pnpm-lock.yaml                  # 必ずコミット
├── pnpm-workspace.yaml             # allowBuilds(sharp / unrs-resolver)
├── postcss.config.mjs              # @tailwindcss/postcss
├── tsconfig.json                   # strict + noUncheckedIndexedAccess など
├── design.md                       # この設計書
├── CLAUDE.md                       # Claude Code 向けプロジェクト規約
└── README.md
```

### 後続フェーズで追加されるファイル(計画)

```
odai-photo/
├── public/                         # Phase 6 で PWA アイコン・manifest を配置
│   ├── manifest.json
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable.png
│   └── apple-touch-icon.png
├── src/
│   ├── app/
│   │   └── actions.ts              # Phase 2 / 4 — Server Actions(createChallenge, gradeChallenge)
│   ├── components/                 # Phase 2 〜 4 で順次追加
│   │   ├── prompt-card.tsx         # お題表示カード
│   │   ├── photo-uploader.tsx      # 写真撮影・プレビュー
│   │   ├── result-view.tsx         # 結果表示
│   │   └── loading-states.tsx      # ローディング UI
│   ├── lib/                        # Phase 2 〜 5 で順次追加
│   │   ├── gemini.ts               # Gemini クライアント
│   │   ├── prompts.ts              # プロンプト定数
│   │   ├── image-utils.ts          # 圧縮ロジック
│   │   ├── rate-limit.ts           # レート制限
│   │   └── schemas.ts              # zod スキーマ
│   └── types/
│       └── index.ts                # 型定義
```

> Tailwind v4 は config ファイル不要(`tailwind.config.ts` は使わない)。デザイントークンは `src/app/globals.css` の `@theme` ブロックに集約する。

---

## 12. 実装フェーズ分け

Claude Code に渡す際は、以下の順で1フェーズずつ完了させる。

### Phase 0: UI デザイン
- ~~Claude Design でビジュアル設計~~(2026-06-02 廃止)
- **現方針**: Claude Code 内で各フェーズと並行して UI を実装する。§3 の現在の方針を参照

### Phase 1: 基盤セットアップ ✅ 完了(2026-06-02)
- [x] Next.js 16.2.6 / React 19.2.6 / TypeScript / Tailwind v4 をインストール(完全固定バージョン)
- [x] Volta で Node 24.16.0 / pnpm 11.2.2 を pin
- [x] `pnpm-workspace.yaml` で `sharp` / `unrs-resolver` のビルドを許可
- [x] 環境変数の設定(`.env.local.example`、`.gitignore`)
- [x] `next.config.ts` にセキュリティヘッダー設定(§10.3)
- [x] `eslint.config.mjs`(flat config + `any` 禁止 + `consistent-type-assertions`)
- [x] `tsconfig.json`(strict + `noUncheckedIndexedAccess`)
- [x] Dependabot 設定(`.github/dependabot.yml`)
- [x] GitHub Actions の CI(typecheck / lint / build / audit)
- [x] 最小レイアウト(「お題写真ガチャ / 準備中」のトップページ)
- [x] README を日本語で整備

### Phase 2: Gemini クライアント + お題生成
- `lib/gemini.ts` 実装(Server 専用)
- `lib/prompts.ts` にプロンプト定数
- `createChallenge` Server Action 実装
- メイン画面に「お題を引く」ボタン、お題表示
- ローディング UI

### Phase 3: 写真撮影 + プレビュー
- `components/photo-uploader.tsx` 実装
- カメラ起動 (`<input type="file" capture>`)
- `browser-image-compression` で圧縮
- プレビュー表示、撮り直し機能
- 状態管理(写真を保持)

### Phase 4: 採点機能
- 採点プロンプトの実装
- `gradeChallenge` Server Action 実装(zod バリデーション、画像受け取り、Gemini に送信)
- `components/result-view.tsx` 実装
- 「もう一回」でリセット
- 採点中のローディング UI

### Phase 5: レート制限 + セキュリティ仕上げ
- `lib/rate-limit.ts` 実装(Vercel Firewall or 簡易実装)
- セキュリティヘッダー最終確認
- §10.7 のチェックリストを全項目確認
- `pnpm audit` で High 以上の脆弱性なし
- エラーハンドリング強化

### Phase 6: PWA 化
- `public/manifest.json`
- アイコン作成(暫定)
- `next-pwa` 導入
- iOS 向けメタタグ
- ホーム画面追加促進バナー
- Lighthouse で PWA スコア確認

### Phase 7: UX 仕上げ
- ローディング演出の改善(楽しいテキスト、アニメーション)
- エラー時のフォールバック UI
- アクセシビリティ(最低限)
- 実機テスト(iOS / Android)

---

## 13. 将来の拡張計画(MVP 後)

```
MVP(今ここ)
  └─ 1人モード・ログインなし・保存なし・PWA対応

v1.1 2人モード
  └─ モード選択画面(1人 / 2人)
  └─ 2人分の写真投稿
  └─ 採点に勝敗判定追加(同じ端末で交互に使う想定)

v1.2 ペア機能(招待リンク方式)
  └─ Supabase 導入、招待リンクで2人を紐付け
  └─ 別々の端末から遊べる
  └─ localStorage で user_id 管理
  └─ Server Action で actor_user_id の所属チェック

v1.3 履歴保存
  └─ 過去のお題・写真・スコアを Supabase に保存
  └─ Supabase Storage(private bucket、Signed URL)
  └─ 履歴一覧画面

v1.4 リアルタイム同期
  └─ Supabase Realtime
  └─ 相手の投稿が即時反映される体験

v1.5 ガチャ要素強化
  └─ 難易度選択、ジャンル選択
  └─ 称号システム

v1.6 ソーシャル
  └─ 月間ランキング
  └─ シェア機能
```

各段階で「ここまでで満足」と感じたら止められる構成。

---

## 14. やらないこと(MVP対象外、明示)

- 2人モード・対戦・勝敗判定(v1.1 で追加)
- ログイン・アカウント・認証
- データ保存(DB なし)
- ペア機能・招待リンク
- 履歴一覧
- リアルタイム同期
- 難易度選択・ジャンル選択
- 対戦履歴・ランキング
- 称号・レベル
- 通知(プッシュ通知)
- 画像編集・フィルター
- シェア機能(SNS)
- 多言語対応(日本語のみ)

---

## 15. Claude Code に渡す際の指示テンプレ

最初に投げる指示例:

```
このリポジトリ(odai-photo)のルートにある design.md と CLAUDE.md を読んでください。
MVP版の「お題写真ガチャ」PWAを実装します(1人モードのみ)。

UI は Claude Code 内で各フェーズと並行して実装します(§3 参照)。

特に重要:
- §2 のバージョン要件は厳守(Node.js 22 LTS以降、Next.js 16.2.6以降、React 19.2.6以降)
- §10 のセキュリティ考慮事項を実装中ずっと意識
- 全 Server Action で zod バリデーション
- Gemini API キーは絶対にクライアント側に流出させない

今回は Phase X を実装してください。
- パッケージマネージャは pnpm(11.x)
- 新しいライブラリ追加前は最新版・互換性を確認すること
- 完了したら動作確認手順を提示すること

設計に不明点や改善案があれば、実装前に質問してください。
```

各 Phase 完了時には:

```
Phase X を実装してください。design.md §12 を参照。
完了したら動作確認方法を教えてください。
```

---

## 16. 参考リンク

- [Next.js Security Advisories](https://github.com/vercel/next.js/security/advisories)
- [Vercel Changelog](https://vercel.com/changelog)
- [Google AI Studio (Gemini)](https://ai.google.dev/)
- [Gemini API Pricing & Free Tier](https://ai.google.dev/pricing)
- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
- [Claude Design](https://claude.ai/design)
- [Node.js Release Schedule](https://github.com/nodejs/Release)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
