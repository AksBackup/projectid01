import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import LoginPage   from './pages/Login.jsx';
import Layout      from './components/Layout.jsx';
import Dashboard   from './pages/Dashboard.jsx';
import Contacts    from './pages/Contacts.jsx';
import Subscribers from './pages/Subscribers.jsx';
import AppUsers    from './pages/AppUsers.jsx';
import Banners     from './pages/Banners.jsx';
import PlanGating  from './pages/PlanGating.jsx';
import Pricing     from './pages/Pricing.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:'12px', color:'#999' }}>
      <span className="spinner" /> Loading…
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index            element={<Dashboard />}   />
        <Route path="contacts"  element={<Contacts />}    />
        <Route path="waitlist"  element={<Subscribers />} />
        <Route path="users"     element={<AppUsers />}    />
        <Route path="banners"     element={<Banners />}     />
        <Route path="plan-gating" element={<PlanGating />}  />
        <Route path="pricing"     element={<Pricing />}     />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
