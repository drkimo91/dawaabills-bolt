import { Link, useLocation, Outlet } from "react-router-dom";
import { LayoutDashboard, FileText, Users, Receipt, Menu, X, BarChart2, HandCoins, ClipboardList, ShieldCheck, UserCheck, FlaskConical, RotateCcw, PackageX, ShoppingBag, PackageSearch, CheckSquare, Gauge, Bike, Wallet, DatabaseBackup } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";
import SmartAlerts from "@/components/layout/SmartAlerts";

const navItems = [
{ path: "/dashboard", label: "الصفحة الرئيسية", icon: LayoutDashboard },
{ path: "/invoices", label: "فواتير الشراء", icon: FileText },
{ path: "/pending-invoices", label: "انتظار المراجعة", icon: ClipboardList, badge: true },
{ path: "/branch-efficiency", label: "كفاءة الفروع", icon: Gauge, rose: true },
{ path: "/medicine-list", label: "أدوية اللسته", icon: FlaskConical, gold: true },
{ path: "/expenses", label: "المصروفات", icon: Receipt },
{ path: "/returns", label: "المرتجعات", icon: RotateCcw, pink: true },
{ path: "/inventory", label: "الراكد والأكسبير", icon: PackageX, dark: true },
{ path: "/inventory-count", label: "الجرد الدوري", icon: PackageSearch, cyan: true },
{ path: "/customer-orders", label: "طلبات العملاء", icon: ShoppingBag, teal: true },
{ path: "/tasks", label: "توزيع المهام", icon: CheckSquare, indigo: true },
{ path: "/delivery-riders", label: "مناديب التوصيل", icon: Bike, orange: true },
{ path: "/shift-handover", label: "تسليم الشيفت", icon: Wallet, violet: true },
{ path: "/suppliers", label: "الموردين", icon: Users, adminOnly: true },
{ path: "/reports", label: "التقارير", icon: BarChart2, adminOnly: true },
{ path: "/supplier-balances", label: "أرصدة الموردين", icon: HandCoins, adminOnly: true },
{ path: "/activity-log", label: "سجل العمليات", icon: ClipboardList, adminOnly: true },
{ path: "/user-management", label: "المستخدمين والصلاحيات", icon: ShieldCheck, adminOnly: true },
{ path: "/team-members", label: "فريق العمل", icon: UserCheck, adminOnly: true },
{ path: "/backup-status", label: "النسخ الاحتياطي", icon: DatabaseBackup, adminOnly: true }];


export default function AppLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { isAdmin, hasDeliveryAccess, isDeliveryRider, isDeliveryAdmin } = useUserRole();

  // مندوب التوصيل فقط يرى صفحة المناديب فقط
  const isRiderOnly = isDeliveryRider && !isAdmin;

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.path === "/delivery-riders" && !hasDeliveryAccess && !isAdmin) return false;
    // المندوب فقط (وليس المشرف أو الأدمن) يرى صفحة المناديب فقط
    if (isRiderOnly && item.path !== "/delivery-riders") return false;
    return true;
  });

  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ["pending-invoices-count"],
    queryFn: () => base44.entities.PurchaseInvoice.filter({ status: "انتظار المراجعة" }),
    staleTime: 30000
  });
  const pendingCount = pendingInvoices.length;

  return (
    <div dir="rtl" className="flex min-h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-l shadow-sm">
        <div className="p-4 border-b bg-teal-600">
          <h1 className="text-white font-bold text-lg">صيدليات دواء</h1>
          <p className="text-teal-100 text-xs mt-0.5">مشتريات</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleNavItems.map((item) =>
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              item.gold ?
              "bg-yellow-50 text-yellow-700 border border-yellow-300" :
              item.pink ?
              "bg-pink-50 text-pink-700 border border-pink-200" :
              item.dark ?
              "bg-gray-900 text-white border border-gray-700" :
              item.teal ?
              "bg-teal-600 text-white border border-teal-700" :
              item.cyan ?
              "bg-cyan-600 text-white border border-cyan-700" :
              item.indigo ?
              "bg-indigo-600 text-white border border-indigo-700" :
              item.orange ?
              "bg-orange-500 text-white border border-orange-600" :
              item.violet ?
              "bg-violet-600 text-white border border-violet-700" :
              item.rose ?
              "bg-rose-600 text-white border border-rose-700" :
              location.pathname === item.path ?
              "bg-teal-50 text-teal-700" :
              "text-gray-600 hover:bg-gray-100"
            )}>
            
              <item.icon className={cn("w-4 h-4", item.gold && "text-yellow-500", item.pink && "text-pink-500", item.dark && "text-white", item.teal && "text-white", item.cyan && "text-white", item.indigo && "text-white", item.rose && "text-white", item.violet && "text-white", item.orange && "text-white")} />
              <span className="flex-1">{item.label}</span>
              {item.badge && pendingCount > 0 &&
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            }
            </Link>
          )}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 right-0 left-0 z-50 bg-teal-600 flex items-center justify-between px-3 py-3 shadow-md">
        <button onClick={() => setOpen(!open)} className="text-white p-1.5 -mr-1">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <img src="https://media.base44.com/images/public/6a00735e63f2bcce7f4bb37e/b3f96ed2b_.jpg" alt="صيدليات دواء" className="w-7 h-7 object-contain mix-blend-multiply" />
          <h1 className="text-white font-bold text-sm">صيدليات دواء</h1>
        </div>
        <div className="w-7" />
      </div>

      {/* Mobile Nav */}
      {open &&
      <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div className="absolute top-[52px] right-0 w-64 max-w-[80vw] bg-white h-full shadow-2xl p-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1 mt-2">
              {visibleNavItems.map((item) =>
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                item.gold ?
                "bg-yellow-50 text-yellow-700 border border-yellow-300" :
                item.pink ?
                "bg-pink-50 text-pink-700 border border-pink-200" :
                item.dark ?
                "bg-gray-900 text-white border border-gray-700" :
                item.teal ?
                "bg-teal-600 text-white border border-teal-700" :
                item.cyan ?
                "bg-cyan-600 text-white border border-cyan-700" :
                item.indigo ?
                "bg-indigo-600 text-white border border-indigo-700" :
                item.orange ?
                "bg-orange-500 text-white border border-orange-600" :
                item.violet ?
                "bg-violet-600 text-white border border-violet-700" :
                item.rose ?
                "bg-rose-600 text-white border border-rose-700" :
                location.pathname === item.path ?
                "bg-teal-50 text-teal-700" :
                "text-gray-600 hover:bg-gray-100"
              )}>
              
                      <item.icon className={cn("w-4 h-4", item.gold && "text-yellow-500", item.pink && "text-pink-500", item.dark && "text-white", item.teal && "text-white", item.cyan && "text-white", item.indigo && "text-white", item.rose && "text-white", item.violet && "text-white", item.orange && "text-white")} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && pendingCount > 0 &&
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              }
                </Link>
            )}
            </nav>
          </div>
        </div>
      }

      {/* Main Content */}
      <main className="flex-1 md:overflow-auto pt-[52px] md:pt-0 flex flex-col">
        {/* Alerts bar */}
        <div className="px-3 md:px-4 pt-2 md:pt-3 pb-0 flex justify-end">
          <SmartAlerts />
        </div>
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>);

}