export default function WorkoutPostLoading() {
  return (
    <main className="min-h-dvh bg-app px-4 py-8 text-text">
      <div
        aria-label="Loading workout"
        className="mx-auto h-[34rem] max-w-2xl animate-pulse rounded-lg border border-border bg-panel motion-reduce:animate-none"
        role="status"
      />
    </main>
  );
}
