import PropTypes from 'prop-types';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { selectAuth } from '../features/auth/authSlice.js';
import { useAppSelector } from '../hooks/index.js';

const ProtectedRoute = ({ redirectTo = '/login' }) => {
  const location = useLocation();
  const { user, initialized } = useAppSelector(selectAuth);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-slate-600">
        Checking your session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

ProtectedRoute.propTypes = {
  redirectTo: PropTypes.string,
};

export default ProtectedRoute;
