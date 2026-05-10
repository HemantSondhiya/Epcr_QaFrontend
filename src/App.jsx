import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsInitializing, checkAuth } from './store/slices/authSlice';
import { hasMenuAccess } from './constants/permissions';
import { RefreshCw } from 'lucide-react';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleGate from './components/common/RoleGate';

// Pages
import LandingPage   from './pages/LandingPage';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import RecordsList   from './pages/RecordsList';
import CreateRecord  from './pages/CreateRecord';
import QaReviews     from './pages/QaReviews';
import QaForms       from './pages/QaForms';
import QaRules       from './pages/QaRules';
import FormTemplates from './pages/FormTemplates';
import Workflows     from './pages/Workflows';
import Deployments   from './pages/Deployments';
import Organizations from './pages/Organizations';
import Users         from './pages/Users';
import Reports       from './pages/Reports';
import Notifications from './pages/Notifications';
import FeedbackThreads from './pages/FeedbackThreads';
import AuditLogs     from './pages/AuditLogs';
import Settings      from './pages/Settings';
import HipaaConsent  from './pages/HipaaConsent';
import HipaaDisclosure from './pages/HipaaDisclosure';
import PatientPortal from './pages/PatientPortal';
import BreakGlass    from './pages/BreakGlass';
import BusinessAssociate from './pages/BusinessAssociate';
import DeIdentification from './pages/DeIdentification';
import PatientHistory   from './pages/PatientHistory';

// Route guard: wraps ProtectedRoute + RoleGate
const GuardedRoute = ({ menuItem, roles, children }) => (
  <ProtectedRoute>
    <RoleGate menuItem={menuItem} roles={roles}>
      {children}
    </RoleGate>
  </ProtectedRoute>
);

const AppRoutes = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInitializing = useSelector(selectIsInitializing);
  const role = useSelector(state => state.auth.user?.role);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <RefreshCw className="animate-spin text-brand-blue w-8 h-8" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      <Route path="/login" element={isAuthenticated ? <Navigate to={role === 'PATIENT' ? '/patient-portal' : '/dashboard'} replace /> : <Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={role === 'PATIENT' ? <Navigate to="/patient-portal" replace /> : <Dashboard />} />
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="epcr"       element={<GuardedRoute menuItem="EPCR"><RecordsList /></GuardedRoute>} />
        <Route path="epcr/new"   element={<GuardedRoute menuItem="EPCR"><CreateRecord /></GuardedRoute>} />

        <Route path="qa/forms"   element={<GuardedRoute menuItem="QA Forms"><QaForms /></GuardedRoute>} />
        <Route path="qa/reviews" element={<GuardedRoute menuItem="QA Reviews"><QaReviews /></GuardedRoute>} />
        <Route path="qa/rules"   element={<GuardedRoute menuItem="QA Rules"><QaRules /></GuardedRoute>} />

        <Route path="form-templates" element={<GuardedRoute menuItem="Form Templates"><FormTemplates /></GuardedRoute>} />

        <Route path="workflows"              element={<GuardedRoute menuItem="Workflows"><Workflows /></GuardedRoute>} />
        <Route path="deployments"            element={<GuardedRoute menuItem="Deployments" roles={['ADMIN']}><Deployments /></GuardedRoute>} />

        <Route path="organizations" element={<GuardedRoute menuItem="Organizations"><Organizations /></GuardedRoute>} />
        <Route path="users"         element={<GuardedRoute menuItem="Users"><Users /></GuardedRoute>} />
        <Route path="reports"       element={<GuardedRoute menuItem="Reports"><Reports /></GuardedRoute>} />
        <Route path="feedback"      element={<GuardedRoute menuItem="Feedback"><FeedbackThreads /></GuardedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="audit-logs"    element={<GuardedRoute roles={['ADMIN']}><AuditLogs /></GuardedRoute>} />
        <Route path="settings"      element={<GuardedRoute roles={['ADMIN']}><Settings /></GuardedRoute>} />

        {/* HIPAA & Patient Routes */}
        <Route path="hipaa/consent"   element={<GuardedRoute menuItem="HIPAA Consent"><HipaaConsent /></GuardedRoute>} />
        <Route path="hipaa/disclosure" element={<GuardedRoute menuItem="HIPAA Disclosure"><HipaaDisclosure /></GuardedRoute>} />
        <Route path="hipaa/baa"       element={<GuardedRoute menuItem="Business Associates"><BusinessAssociate /></GuardedRoute>} />
        <Route path="hipaa/deid"      element={<GuardedRoute menuItem="De-Identification"><DeIdentification /></GuardedRoute>} />
        <Route path="patient-portal"  element={<GuardedRoute menuItem="Patient Portal"><PatientPortal /></GuardedRoute>} />
        <Route path="patient-history/:patientId" element={<GuardedRoute menuItem="Patient History"><PatientHistory /></GuardedRoute>} />
        <Route path="patient-history" element={<GuardedRoute menuItem="Patient History"><PatientHistory /></GuardedRoute>} />
        <Route path="break-glass"     element={<GuardedRoute menuItem="Break-Glass"><BreakGlass /></GuardedRoute>} />

        {/* Legacy redirect */}
        <Route path="records"     element={<Navigate to="/epcr" replace />} />
        <Route path="records/new" element={<Navigate to="/epcr/new" replace />} />

        <Route path="*" element={<Navigate to={role === 'PATIENT' ? '/patient-portal' : '/dashboard'} replace />} />
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
