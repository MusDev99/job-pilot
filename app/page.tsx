const FEATURES = [
  { title: "Job alerts, collected", body: "Reads the job alert emails already in your Gmail and turns them into one clean list." },
  { title: "Match score", body: "Scores every job 0 to 100 against your ATS resume, and shows which skills match or are missing." },
  { title: "Tailored resume", body: "Suggests edits for the job you pick. You approve each one; nothing is invented." },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">JobPilot</h1>
        <p className="text-lg text-muted">Fewer, better applications: the right jobs, ranked by fit, with a resume ready to tune.</p>
        {/* Von Restorff: one primary action. Fitts: 44px+ touch target. Signed-out visitors are sent on to /login. */}
        <a
          href="/dashboard"
          className="flex min-h-11 w-full items-center justify-center rounded-card bg-accent px-5 font-medium text-bg sm:w-auto sm:self-start"
        >
          Sign in with Google
        </a>
      </header>
      {/* Miller / Common Region: three chunks, each in its own card. */}
      <ul className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-card border border-border bg-surface p-5">
            <h2 className="font-medium">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted">{feature.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
