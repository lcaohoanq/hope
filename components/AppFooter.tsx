const footerItems = [
  "Privacy",
  "Consistency",
  "Movement",
  "Progress",
  "Contact",
];

export function AppFooter() {
  return (
    <footer className="border-t border-stone-300 bg-paper px-4 py-6 text-[11px] text-stone-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <span className="font-semibold text-stone-700">Hope</span>
        <span>© 2026 Hope</span>
        {footerItems.map((item) => (
          <span className="transition hover:text-moss" key={item}>
            {item}
          </span>
        ))}
      </div>
    </footer>
  );
}
