// Doherty threshold: show feedback at once while a server page loads.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl items-center justify-center px-5" role="status" aria-live="polite">
      <span className="loading loading-spinner loading-lg text-accent" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </main>
  );
}
