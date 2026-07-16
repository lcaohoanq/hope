import Link from "next/link";

const footerItems = [
  { href: "/terms-of-service", label: "Điều khoản" },
  { href: "/privacy-policy", label: "Quyền riêng tư" },
];

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-app px-4 py-6 text-[11px] text-muted sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <span className="font-semibold text-muted">Hope</span>
        <span>© 2026 Hope</span>
        {footerItems.map((item) => (
          <Link className="transition hover:text-accent" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
