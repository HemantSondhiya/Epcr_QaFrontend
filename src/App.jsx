import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectRole } from './store/slices/authSlice';
import { hasMenuAccess } from './constants/permissions';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleGate from './components/common/RoleGate';

// Pages
import Login         from './pages/Login';
import Register      from './pages/Register';
import Dashboard     from './pages/Dashboard';
import RecordsList   from './pages/RecordsList';
import CreateRecord  from './pages/CreateRecord';
import QaReviews     from './pages/QaReviews';
import QaForms       from './pages/QaForms';
import Workflows     from './pages/Workflows';
import Deployments   from './pages/Deployments';
import Organizations from './pages/Organizations';
import Users         from './pages/Users';
import Reports       from './pages/Reports';
import Notifications from './pages/Notifications';
import FeedbackThreads from './pages/FeedbackThreads';
import AuditLogs     from './pages/AuditLogs';
import Settings      from './pages/Settings';

// Route guard: wraps ProtectedRoute + RoleGate
const GuardedRoute = ({ menuItem, roles, children }) => (
  <ProtectedRoute>
    <RoleGate menuItem={menuItem} roles={roles}>
      {children}
    </RoleGate>
  </ProtectedRoute>
);

const AppRoutes = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return (
    <Routes>
      <Route path="/login"    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />

        <Route path="epcr"       element={<GuardedRoute menuItem="EPCR"><RecordsList /></GuardedRoute>} />
        <Route path="epcr/new"   element={<GuardedRoute menuItem="EPCR"><CreateRecord /></GuardedRoute>} />

        <Route path="qa/forms"   element={<GuardedRoute menuItem="QA Forms"><QaForms /></GuardedRoute>} />
        <Route path="qa/reviews" element={<GuardedRoute menuItem="QA Reviews"><QaReviews /></GuardedRoute>} />

        <Route path="workflows"              element={<GuardedRoute menuItem="Workflows"><Workflows /></GuardedRoute>} />
        <Route path="deployments"            element={<GuardedRoute menuItem="Deployments" roles={['ADMIN']}><Deployments /></GuardedRoute>} />

        <Route path="organizations" element={<GuardedRoute menuItem="Organizations"><Organizations /></GuardedRoute>} />
        <Route path="users"         element={<GuardedRoute menuItem="Users"><Users /></GuardedRoute>} />
        <Route path="reports"       element={<GuardedRoute menuItem="Reports"><Reports /></GuardedRoute>} />
        <Route path="feedback"      element={<GuardedRoute menuItem="Feedback"><FeedbackThreads /></GuardedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="audit-logs"    element={<GuardedRoute roles={['ADMIN']}><AuditLogs /></GuardedRoute>} />
        <Route path="settings"      element={<GuardedRoute roles={['ADMIN']}><Settings /></GuardedRoute>} />

        {/* Legacy redirect */}
        <Route path="records"     element={<Navigate to="/epcr" replace />} />
        <Route path="records/new" element={<Navigate to="/epcr/new" replace />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
