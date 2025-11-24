import { Link } from 'react-router-dom';

import { selectAuth } from '../features/auth/authSlice.js';
import { useAppSelector } from '../hooks/index.js';

const HomePage = () => {
  const { user, initialized } = useAppSelector(selectAuth);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {user ? `Welcome back, ${user.username}` : 'Welcome to EpiTrello'}
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Organize teamwork with collaborative boards, track project progress in real time, and stay
          aligned across your organization. Build powerful workflows as the platform expands over
          the next sprints.
        </p>
      </header>
      <div className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-lg font-medium text-slate-800">Get started</h2>
        <p className="text-sm text-slate-600">
          {user
            ? 'Create a board to outline your next sprint, invite collaborators, and keep every task within reach.'
            : 'Sign up or log in to create your first board and unlock collaborative planning features.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <Link
              to="/boards"
              className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
            >
              Go to boards
            </Link>
          ) : (
            initialized && (
              <>
                <Link
                  to="/register"
                  className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
                >
                  Sign up
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  Log in
                </Link>
              </>
            )
          )}
        </div>
      </div>
      <div className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-lg font-medium text-slate-800">What&apos;s coming next</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>List and card management with drag-and-drop</li>
          <li>Role-based workspace permissions</li>
          <li>Real-time collaboration powered by WebSockets</li>
        </ul>
      </div>
    </section>
  );
};

export default HomePage;
