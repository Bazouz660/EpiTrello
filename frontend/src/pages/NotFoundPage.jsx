import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <section className="space-y-4 text-center">
    <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
    <p className="text-sm text-slate-600">
      The page you are looking for doesn&apos;t exist yet. Let&apos;s take you back to the
      dashboard.
    </p>
    <Link
      to="/"
      className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
    >
      Return home
    </Link>
  </section>
);

export default NotFoundPage;
