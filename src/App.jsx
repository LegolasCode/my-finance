import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { FinanceProvider } from './context/FinanceContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login, { ConfigMissing } from './pages/Login.jsx';
import Provisioning from './pages/Provisioning.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Budget from './pages/Budget.jsx';
import Settings from './pages/Settings.jsx';

function Gate() {
  const { configured, phase } = useAuth();
  if (!configured) return <ConfigMissing />;
  if (phase === 'working') return <Provisioning />;
  if (phase !== 'ready') return <Login />;
  return (
    <FinanceProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transaksi" element={<Transactions />} />
          <Route path="budget" element={<Budget />} />
          <Route path="pengaturan" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
