import { requirePageSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageSession();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Your jobs</h1>
        <form method="post" action="/api/auth/logout">
          <button type="submit" className="min-h-11 rounded-card border border-border px-5 text-sm">
            Sign out
          </button>
        </form>
      </header>
      <p className="text-muted">Signed in as {user.email}.</p>
      {/* Empty state: nothing to show until Gmail is connected (Week 2). */}
      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-medium">No jobs yet</h2>
        <p className="mt-2 text-sm text-muted">Connecting your Gmail job alerts is the next step. It arrives in Week 2.</p>
      </section>
    </main>
  );
}
