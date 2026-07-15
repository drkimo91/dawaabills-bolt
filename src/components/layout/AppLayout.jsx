import { Link, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Receipt, Menu, X, BarChart2,
  HandCoins, ClipboardList, ShieldCheck, UserCheck, FlaskConical,
  RotateCcw, PackageX, ShoppingBag, PackageSearch, CheckSquare,
  Gauge, Bike, Wallet, DatabaseBackup, LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";
import { useAuth } from "@/lib/AuthContext";
import SmartAlerts from "@/components/layout/SmartAlerts";

const navItems = [
  { path: "/dashboard", label: "الصفحة الرئيسية", icon: LayoutDashboard },
  { path: "/invoices", label: "فواتير الشراء", icon: FileText },
  { path: "/pending-invoices", label: "انتظار المراجعة", icon: ClipboardList, badge: true },
  { path: "/branch-efficiency", label: "كفاءة الفروع", icon: Gauge },
  { path: "/medicine-list", label: "أدوية اللسته", icon: FlaskConical },
  { path: "/expenses", label: "المصروفات", icon: Receipt },
  { path: "/returns", label: "المرتجعات", icon: RotateCcw },
  { path: "/inventory", label: "الراكد والأكسبير", icon: PackageX },
  { path: "/inventory-count", label: "الجرد الدوري", icon: PackageSearch },
  { path: "/customer-orders", label: "طلبات العملاء", icon: ShoppingBag },
  { path: "/tasks", label: "توزيع المهام", icon: CheckSquare },
  { path: "/delivery-riders", label: "مناديب التوصيل", icon: Bike },
  { path: "/shift-handover", label: "تسليم الشيفت", icon: Wallet },
  { path: "/suppliers", label: "الموردين", icon: Users, adminOnly: true },
  { path: "/reports", label: "التقارير", icon: BarChart2, adminOnly: true },
  { path: "/supplier-balances", label: "أرصدة الموردين", icon: HandCoins, adminOnly: true },
  { path: "/activity-log", label: "سجل العمليات", icon: ClipboardList, adminOnly: true },
  { path: "/user-management", label: "المستخدمين والصلاحيات", icon: ShieldCheck, adminOnly: true },
  { path: "/team-members", label: "فريق العمل", icon: UserCheck, adminOnly: true },
  { path: "/backup-status", label: "النسخ الاحتياطي", icon: DatabaseBackup, adminOnly: true },
];

function NavItem({ item, active, pendingCount, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon
        className={cn(
          "w-[18px] h-[18px] shrink-0 transition-transform duration-200",
          !active && "group-hover:scale-110"
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && pendingCount > 0 && (
        <span className="bg-warning text-warning-foreground text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full animate-scale-in">
          {pendingCount}
        </span>
      )}
      {active && (
        <span className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
      )}
    </Link>
  );
}

function SidebarContent({ visibleNavItems, location, pendingCount, onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border bg-gradient-to-br from-primary to-primary/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">صيدليات دواء</h1>
            <p className="text-white/70 text-xs">نظام إدارة المشتريات</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleNavItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            pendingCount={pendingCount}
            onClick={onNavigate}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-bold">
              {(user?.full_name || user?.email || "؟").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.full_name || user?.email || "مستخدم"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { isAdmin, hasDeliveryAccess, isDeliveryRider } = useUserRole();

  const isRiderOnly = isDeliveryRider && !isAdmin;

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.path === "/delivery-riders" && !hasDeliveryAccess && !isAdmin) return false;
    if (isRiderOnly && item.path !== "/delivery-riders") return false;
    return true;
  });

  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ["pending-invoices-count"],
    queryFn: () => base44.entities.PurchaseInvoice.filter({ status: "انتظار المراجعة" }),
    staleTime: 30000,
  });
  const pendingCount = pendingInvoices.length;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div dir="rtl" className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-l border-sidebar-border shrink-0">
        <SidebarContent
          visibleNavItems={visibleNavItems}
          location={location}
          pendingCount={pendingCount}
        />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-50 bg-gradient-to-r from-primary to-primary/80 backdrop-blur-md flex items-center justify-between px-4 py-3 shadow-md">
        <button
          onClick={() => setOpen(!open)}
          className="text-white p-1.5 -mr-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-white font-bold text-sm">صيدليات دواء</h1>
        </div>
        <div className="w-7" />
      </div>

      {/* Mobile Nav Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div
            className="absolute top-[56px] right-0 w-72 max-w-[85vw] h-[calc(100%-56px)] bg-sidebar shadow-2xl animate-slide-down"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              visibleNavItems={visibleNavItems}
              location={location}
              pendingCount={pendingCount}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:overflow-auto pt-[56px] md:pt-0 flex flex-col min-w-0">
        <div className="px-3 md:px-6 pt-3 md:pt-4 pb-0 flex justify-end">
          <SmartAlerts />
        </div>
        <div className="flex-1 px-3 md:px-6 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
