import Link from "next/link";
import { GoogleIcon } from "@/components/google-icon";
import { Icon } from "@/components/icons";
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
    <main className="glow flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        JobPilot
      </Link>
      <div className="card w-full max-w-sm border border-border bg-surface shadow-xl">
        <div className="card-body gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-text">Welcome back</h1>
            <p className="text-sm text-muted">Sign in to see your ranked job list.</p>
          </div>
          {message && (
            <div role="alert" className="flex items-start gap-3 rounded-box border border-danger bg-danger/10 p-3 text-sm text-text">
              <Icon name="alert" className="size-5 shrink-0 text-danger" />
              <span>{message}</span>
            </div>
          )}
          {/* Von Restorff: the one filled button. Fitts: 48px, full width. Jakob: the familiar Google button. */}
          <a href={href} className="btn btn-primary btn-lg min-h-12 w-full gap-3">
            <GoogleIcon />
            Continue with Google
          </a>
          <p className="text-center text-xs text-muted">We only ask for your name and email. No password to remember.</p>
        </div>
      </div>
      <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
