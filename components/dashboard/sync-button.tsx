"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

// Doherty threshold: the button reacts at once, because the hop through Google takes a moment.
export function SyncButton() {
  const [pending, setPending] = useState(false);
  // Coming back with the browser's Back button restores this page from cache: don't stay stuck on "Opening Google".
  useEffect(() => {
    const reset = () => setPending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return (
    <a
      href="/api/gmail/start"
      aria-busy={pending}
      onClick={(e) => (pending ? e.preventDefault() : setPending(true))}
      className="btn btn-primary btn-lg min-h-12 w-full gap-2 sm:w-auto"
    >
      {pending ? <span className="loading loading-spinner loading-sm" aria-hidden="true" /> : <Icon name="refresh" />}
      {pending ? "Opening Google…" : "Sync Gmail"}
    </a>
  );
}
