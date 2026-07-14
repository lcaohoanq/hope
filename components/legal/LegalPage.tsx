import Link from "next/link";
import type { ReactNode } from "react";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalPageProps = {
  title: string;
  description: string;
  effectiveDate: string;
  sections: LegalSection[];
  alternate: {
    href: string;
    label: string;
  };
};

export function LegalPage({
  title,
  description,
  effectiveDate,
  sections,
  alternate,
}: LegalPageProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-app text-text">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 5%, oklch(var(--color-accent) / 0.14), transparent 34%), radial-gradient(circle at 84% 12%, oklch(var(--color-panel-muted) / 0.72), transparent 26%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(oklch(var(--color-border) / 0.28) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--color-border) / 0.28) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border/80">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-text transition hover:text-accent"
            href="/"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md border border-border bg-panel/80 text-accent shadow-[0_10px_30px_rgba(17,17,17,0.05)]">
              H
            </span>
            Hope
          </Link>

          <Link
            className="text-sm font-medium text-muted underline decoration-border underline-offset-4 transition hover:text-accent hover:decoration-accent"
            href={alternate.href}
          >
            {alternate.label}
          </Link>
        </header>

        <section className="max-w-4xl py-14 sm:py-20 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Thông tin pháp lý
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-text sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            {description}
          </p>
          <p className="mt-5 font-mono text-xs text-muted">Có hiệu lực từ {effectiveDate}</p>
        </section>

        <div className="grid items-start gap-8 pb-20 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14 lg:pb-28">
          <nav
            aria-label={`Mục lục ${title}`}
            className="rounded-lg border border-border bg-panel/72 p-4 backdrop-blur lg:sticky lg:top-6"
          >
            <p className="px-2 text-sm font-semibold text-text">Nội dung</p>
            <ol className="mt-3 grid gap-1">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 rounded-md px-2 py-2 text-sm leading-5 text-muted transition hover:bg-panel-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    href={`#${section.id}`}
                  >
                    <span aria-hidden="true" className="font-mono text-xs leading-5 text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="rounded-lg border border-border bg-panel/90 px-5 shadow-panel sm:px-8 lg:px-12">
            {sections.map((section) => (
              <section
                className="scroll-mt-8 border-b border-border py-9 last:border-b-0 sm:py-11"
                id={section.id}
                key={section.id}
              >
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-text sm:text-2xl">
                  {section.title}
                </h2>
                <div className="mt-5 space-y-4 text-sm leading-7 text-muted sm:text-base sm:leading-8 [&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-text [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
}
