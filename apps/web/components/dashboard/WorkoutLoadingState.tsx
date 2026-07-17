export function WorkoutLoadingState() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton cards are fixed placeholders that never reorder.
        <div className="rounded-lg border border-border bg-panel p-5" key={index}>
          <div className="h-3 w-24 animate-pulse rounded bg-panel-muted" />
          <div className="mt-5 h-8 w-16 animate-pulse rounded bg-panel-muted" />
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-panel-muted" />
        </div>
      ))}
    </section>
  );
}
