import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import PurchaseInvoices from './pages/PurchaseInvoices.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import SupplierBalances from './pages/SupplierBalances';
import ActivityLog from './pages/ActivityLog';
import UserManagement from './pages/UserManagement';
import TeamMembers from './pages/TeamMembers';
import PendingInvoices from './pages/PendingInvoices';
import MedicineList from './pages/MedicineList';
import Returns from './pages/Returns';
import InventoryManagement from './pages/InventoryManagement';
import CustomerOrders from './pages/CustomerOrders';
import InventoryCount from './pages/InventoryCount';
import TasksDistribution from './pages/TasksDistribution';
import BranchEfficiency from './pages/BranchEfficiency';
import DeliveryRiders from './pages/DeliveryRiders';
import RiderLogin from './pages/RiderLogin';
import ShiftHandover from './pages/ShiftHandover';
import BackupStatus from './pages/BackupStatus';
import { useUserRole } from '@/lib/useUserRole';

const RiderHomeRedirect = () => {
  const { isDeliveryRider, isAdmin, isDeliverySupervisor, isDeliveryAdmin } = useUserRole();
  if (isDeliveryRider && !isAdmin && !isDeliverySupervisor && !isDeliveryAdmin) {
    return <Navigate to="/delivery-riders" replace />;
  }
  return <Dashboard />;
};

const FullScreenLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
    <div className="w-10 h-10 border-[3px] border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const isLoginRoute = location.pathname === '/rider-login';

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <FullScreenLoader />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered' && !isLoginRoute) {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'auth_required' && !isLoginRoute) {
      return <Navigate to="/rider-login" replace />;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<RiderHomeRedirect />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/invoices" element={<PurchaseInvoices />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/supplier-balances" element={<SupplierBalances />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/team-members" element={<TeamMembers />} />
        <Route path="/pending-invoices" element={<PendingInvoices />} />
        <Route path="/medicine-list" element={<MedicineList />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/customer-orders" element={<CustomerOrders />} />
        <Route path="/inventory-count" element={<InventoryCount />} />
        <Route path="/tasks" element={<TasksDistribution />} />
        <Route path="/branch-efficiency" element={<BranchEfficiency />} />
        <Route path="/delivery-riders" element={<DeliveryRiders />} />
        <Route path="/shift-handover" element={<ShiftHandover />} />
        <Route path="/backup-status" element={<BackupStatus />} />
      </Route>
      <Route path="/rider-login" element={<RiderLogin />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
