import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectIsAuthenticated } from '../../store/slices/authSlice';

/**
 * Wraps any route that requires the user to be logged in.
 * Unauthenticated users are redirected to /login.
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
