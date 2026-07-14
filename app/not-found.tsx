import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Không tìm thấy trang | Hope",
  description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.",
};

export default function NotFound() {
  return (
    <main className="relative grid min-h-[calc(100dvh-65px)] overflow-hidden bg-app px-4 py-10 text-text sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(68,64,60,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(68,64,60,0.055) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(219,232,220,0.8),transparent_30%),radial-gradient(circle_at_74%_70%,rgba(254,243,199,0.4),transparent_25%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.72),rgba(247,245,240,0.3)_48%,rgba(247,245,240,0.9)_80%)]"
      />

      <section className="relative mx-auto grid w-full max-w-2xl place-items-center text-center">
        <div>
          <Link
            className="mx-auto inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-text"
            href="/"
          >
            <span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-panel/80 text-accent shadow-[0_10px_30px_rgba(17,17,17,0.05)]">
              H
            </span>
            Hope
          </Link>

          <p className="mt-14 font-mono text-sm font-semibold uppercase tracking-[0.22em] text-accent">
            Lỗi 404
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-text sm:text-6xl">
            Không tìm thấy trang
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
            Đường dẫn này không tồn tại hoặc trang đã được di chuyển. Bạn có thể quay về trang chủ
            để tiếp tục.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 min-w-40 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 active:scale-[0.98]"
              href="/"
            >
              Về trang chủ
            </Link>
            <Link
              className="inline-flex h-12 min-w-40 items-center justify-center rounded-md border border-border bg-panel/80 px-5 text-sm font-semibold text-text transition hover:border-accent/40 hover:text-accent active:scale-[0.98]"
              href="/login"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
