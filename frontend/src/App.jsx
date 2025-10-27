import { NavLink, Outlet } from 'react-router-dom';

const linkClasses = ({ isActive }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground shadow'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  ].join(' ');

const AppLayout = () => (
  <div className="bg-surface min-h-screen text-slate-900">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="text-primary text-lg font-semibold">
          EpiTrello
        </NavLink>
        <nav className="flex items-center gap-2">
          <NavLink to="/" end className={linkClasses}>
            Dashboard
          </NavLink>
          <NavLink to="/boards" className={linkClasses}>
            Boards
          </NavLink>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Outlet />
    </main>
  </div>
);

export default AppLayout;
