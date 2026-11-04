// Doherty threshold: skeleton cards appear at once while the jobs load from the sheet.
export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:py-12" aria-busy="true">
      <span className="sr-only" role="status">Loading your jobs</span>
      <div className="skeleton h-10 w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}
      </div>
      {[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}
    </main>
  );
}
