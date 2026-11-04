"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";

// User-facing text is generic; details go to console.error only.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled page error", error.digest ?? "no digest");
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <Icon name="alert" className="size-10 text-danger" />
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted">We couldn't load this page. Please try again.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </main>
  );
}
