import { GoogleIcon } from "@/components/google-icon";
import { Icon, type IconName } from "@/components/icons";
import { LandingPreview } from "@/components/landing-preview";
import { ButtonLink } from "@/components/ui/button";

// Miller: four short chunks, each in its own card (Common Region). Only what v1.0.0 really does.
const FEATURES = [
  { icon: "mail", title: "Collect", body: "Job alerts from your Gmail" },
  { icon: "list", title: "Extract", body: "Skills, salary, seniority" },
  { icon: "target", title: "One list", body: "Newest first, one tap to apply" },
  { icon: "lock", title: "Private", body: "Read-only, no emails stored" },
] as const satisfies readonly { icon: IconName; title: string; body: string }[];

export default function Home() {
  return (
    <div className="glow min-h-dvh overflow-x-clip">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <span className="text-lg font-semibold tracking-tight">
          Job<span className="text-primary">Pilot</span>
        </span>
        {/* Von Restorff: the filled button is reserved for the one primary action, so the nav link is quiet. */}
        <ButtonLink href="/login" variant="soft">
          Sign in
        </ButtonLink>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-8 lg:grid-cols-2 lg:gap-10 lg:pt-16">
        <section className="flex flex-col gap-6">
          <h1 className="lp-rise text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            All your job alerts.
            <br />
            <span className="lp-headline">One clean list.</span>
          </h1>
          <p className="lp-rise max-w-lg text-pretty text-lg text-muted" style={{ "--d": "0.1s" } as React.CSSProperties}>
            JobPilot reads the job alert emails in your Gmail and pulls out the role, company, skills and salary, so you scan instead of dig.
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="lp-rise flex items-start gap-3 rounded-box border border-border bg-surface/70 p-4" style={{ "--d": `${0.2 + i * 0.08}s` } as React.CSSProperties}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon name={f.icon} />
                </span>
                <div>
                  <h2 className="text-sm font-medium">{f.title}</h2>
                  <p className="text-xs text-muted">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Fitts: large, full-width on phones. Jakob: the familiar Google sign-in. */}
          <ButtonLink href="/login" variant="primary" size="lg" className="w-full gap-3">
            <GoogleIcon />
            Continue with Google
          </ButtonLink>
          <p className="text-center text-xs text-muted">We only ask for your name and email to sign you in. Gmail access is asked separately, read-only, when you press Sync.</p>
        </section>

        <LandingPreview />
      </main>
    </div>
  );
}
