import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import CommandPalette from './components/CommandPalette';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import Customer360Page from './pages/Customer360Page';
import ProductsPage from './pages/ProductsPage';
import StockPage from './pages/StockPage';
import UsersPage from './pages/UsersPage';
import LeadsPage from './pages/LeadsPage';
import DemosPage from './pages/DemosPage';
import QuotationsPage from './pages/QuotationsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import InstallationsPage from './pages/InstallationsPage';
import AssetsPage from './pages/AssetsPage';
import PmSchedulePage from './pages/PmSchedulePage';
import ServiceTicketsPage from './pages/ServiceTicketsPage';
import WarrantyRenewalPage from './pages/WarrantyRenewalPage';
import RmaPage from './pages/RmaPage';
import WmsSyncLogsPage from './pages/WmsSyncLogsPage';
import SparePartsPage from './pages/SparePartsPage';
import ServiceAgreementsPage from './pages/ServiceAgreementsPage';
import SettingsPage from './pages/SettingsPage';
import FeedbackPage from './pages/FeedbackPage';
import FeedbackButton from './components/FeedbackButton';
import ReportsPage from './pages/ReportsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuth } from './store/auth';

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/demos" element={<DemosPage />} />
        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/sales-orders" element={<SalesOrdersPage />} />
        <Route path="/installations" element={<InstallationsPage />} />
        <Route path="/customer-assets" element={<AssetsPage />} />
        <Route path="/pm-schedules" element={<PmSchedulePage />} />
        <Route path="/tickets" element={<ServiceTicketsPage />} />
        <Route path="/renewals" element={<WarrantyRenewalPage />} />
        <Route path="/rmas" element={<RmaPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/wms" element={<AdminOnly><WmsSyncLogsPage /></AdminOnly>} />
        <Route path="/settings" element={<AdminOnly><SettingsPage /></AdminOnly>} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<Customer360Page />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/spare-parts" element={<SparePartsPage />} />
        <Route path="/service-agreements" element={<ServiceAgreementsPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route
          path="/users"
          element={
            <AdminOnly>
              <UsersPage />
            </AdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <FeedbackButton source="admin" />
    <CommandPalette />
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'font-[Sarabun,system-ui,sans-serif]',
        },
      }}
    />
    </>
  );
}
