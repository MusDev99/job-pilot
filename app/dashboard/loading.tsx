// Doherty threshold: skeletons shaped like the real page appear at once while the jobs load from the sheet.
export default function DashboardLoading() {
  return (
    <div className="glow min-h-dvh" aria-busy="true">
      <div className="navbar h-16 border-b border-border" />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:py-12">
        <span className="sr-only" role="status">Loading your jobs</span>
        <div className="skeleton h-14 w-72 max-w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
        </div>
        <div className="skeleton h-28" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-52" />)}
        </div>
      </main>
    </div>
  );
}
