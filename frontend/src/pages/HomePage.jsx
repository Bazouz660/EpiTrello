const HomePage = () => (
  <section className="space-y-6">
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold text-slate-900">Welcome to EpiTrello</h1>
      <p className="max-w-2xl text-sm text-slate-600">
        Organize teamwork with collaborative boards, track project progress in real time, and stay
        aligned across your organization. Use the navigation to explore boards or create new ones as
        we build out the core experience.
      </p>
    </header>
    <div className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-6">
      <h2 className="text-lg font-medium text-slate-800">What&apos;s coming next</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
        <li>Board creation and sharing</li>
        <li>List and card management with drag-and-drop</li>
        <li>Real-time updates via Socket.io</li>
      </ul>
    </div>
  </section>
);

export default HomePage;
