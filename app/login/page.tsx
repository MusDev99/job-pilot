import { safeNext } from "@/lib/auth-core";

const ERRORS: Record<string, string> = {
  "1": "We couldn't sign you in. Please try again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again in a few minutes.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS["1"]) : null;
  const href = `/api/auth/google?next=${encodeURIComponent(safeNext(next))}`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in to JobPilot</h1>
      {message && (
        <p role="alert" className="rounded-card border border-danger bg-surface p-4 text-sm">
          {message}
        </p>
      )}
      {/* Von Restorff: the one filled button. Fitts: 44px+ target, full width on phones. Jakob: the familiar Google button. */}
      <a
        href={href}
        className="flex min-h-11 w-full items-center justify-center rounded-card bg-accent px-5 font-medium text-bg"
      >
        Continue with Google
      </a>
      <p className="text-sm text-muted">We only ask for your name and email to sign you in.</p>
    </main>
  );
}
