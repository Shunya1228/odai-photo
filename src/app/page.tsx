export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-sm tracking-widest text-[color:var(--color-muted)] uppercase">
          Phase 1 — 基盤セットアップ
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          お題写真ガチャ
        </h1>
        <p className="mt-4 text-[color:var(--color-muted)] leading-relaxed">
          AI がお題を出して、撮った写真を採点してくれる PWA。
          <br />
          今は土台を組んだだけ。次フェーズからお題と採点を実装していきます。
        </p>

        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2 text-sm text-[color:var(--color-muted)]">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full bg-[color:var(--color-accent)]"
          />
          準備中
        </div>
      </div>
    </main>
  );
}
