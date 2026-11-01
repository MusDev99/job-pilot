import Link from "next/link";
import { GoogleIcon } from "@/components/google-icon";
import { Icon, type IconName } from "@/components/icons";

const STEPS = [
  { icon: "mail", title: "Connect Gmail", body: "JobPilot reads only the job alert emails already in your inbox." },
  { icon: "list", title: "See one clean list", body: "Role, company, skills and salary pulled out, or \"not stated\" when unsure." },
  { icon: "target", title: "Know your fit", body: "Every job scored 0 to 100 against your ATS resume, with matching and missing skills." },
] as const satisfies readonly { icon: IconName; title: string; body: string }[];

export default function Home() {
  return (
    <div className="glow min-h-dvh">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <span className="text-lg font-semibold tracking-tight">JobPilot</span>
        {/* Von Restorff: the filled button is reserved for the one primary action, so the nav link is quiet. */}
        <Link href="/login" className="btn btn-soft btn-primary min-h-11">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-5 pb-20 pt-10 sm:pt-20">
        <section className="flex flex-col items-center gap-6 text-center">
          <span className="badge badge-soft badge-primary">Free while in beta</span>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Fewer, better applications. Ranked by fit.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-muted">
            JobPilot turns the job alerts in your inbox into one list, scored against your resume, so you spend time on the roles that fit.
          </p>
          {/* Fitts: large, full-width on phones, 44px+ target. Jakob: the familiar Google sign-in. */}
          <Link href="/login" className="btn btn-primary btn-lg min-h-12 w-full gap-3 sm:w-auto">
            <GoogleIcon />
            Continue with Google
          </Link>
          <p className="text-sm text-muted">We only ask for your name and email to sign you in.</p>
        </section>

        {/* Miller / Common Region: three steps, each in its own card. */}
        <section aria-labelledby="how" className="flex flex-col gap-6">
          <h2 id="how" className="text-center text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card border border-border bg-surface">
                <div className="card-body gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name={step.icon} />
                  </span>
                  <h3 className="card-title text-base">
                    <span className="text-muted">{i + 1}.</span> {step.title}
                  </h3>
                  <p className="text-sm text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col items-center gap-3 rounded-box border border-border bg-surface p-8 text-center">
          <Icon name="shield" className="size-7 text-primary" />
          <h2 className="text-xl font-semibold">Your data stays yours</h2>
          <p className="max-w-lg text-sm text-muted">
            Read-only Gmail access, job alerts only. Your resume is read in memory and only the structured profile is kept. Disconnect and delete everything any time.
          </p>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted">JobPilot</footer>
    </div>
  );
}
