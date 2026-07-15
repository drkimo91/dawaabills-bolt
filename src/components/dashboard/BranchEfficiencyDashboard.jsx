import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Trophy, ShoppingBag, ClipboardList, CheckSquare, RotateCcw, Package } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

const BRANCH_COLORS = {
  "فرع زكريا": { ring: "#3b82f6", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  "فرع بسيسة": { ring: "#a855f7", bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
  "فرع المنشية": { ring: "#f97316", bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
};

function RingChart({ pct, color, size = 56 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetricRow({ icon: IconComp, label, pct, color, detail }) {
  return (
    <div className="flex items-center gap-2">
      <IconComp className={`w-3.5 h-3.5 shrink-0 ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-600">{label}</span>
          <span className={`font-bold ${color}`}>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color.replace("text-", "").includes("#") ? color : undefined, background: pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626" }} />
        </div>
        {detail && <p className="text-gray-400 text-xs mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

export default function BranchEfficiencyDashboard() {
  const { data: tasks = [] } = useQuery({
    queryKey: ["dash-tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 1000),
    staleTime: 30000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["dash-orders"],
    queryFn: () => base44.entities.CustomerOrder.list("-created_date", 1000),
    staleTime: 30000,
  });

  const { data: countTasks = [] } = useQuery({
    queryKey: ["dash-count-tasks"],
    queryFn: () => base44.entities.InventoryCountTask.list("-created_date", 500),
    staleTime: 30000,
  });

  const { data: returns = [] } = useQuery({
    queryKey: ["dash-returns"],
    queryFn: () => base44.entities.Return.list("-created_date", 500),
    staleTime: 30000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["dash-invoices-eff"],
    queryFn: () => base44.entities.PurchaseInvoice.list("-created_date", 2000),
    staleTime: 30000,
  });

  const { data: medicineSales = [] } = useQuery({
    queryKey: ["dash-medicine-sales"],
    queryFn: () => base44.entities.MedicineSale.list("-week_start", 500),
    staleTime: 30000,
  });

  const branchData = useMemo(() => {
    return BRANCHES.map((branch) => {
      // 1. اتمام المهام
      const branchTasks = tasks.filter((t) => t.branch_name === branch);
      const doneTasks = branchTasks.filter((t) => t.status === "done").length;
      const tasksRate = branchTasks.length > 0 ? Math.round((doneTasks / branchTasks.length) * 100) : 0;

      // 2. طلبات العملاء
      const branchOrders = orders.filter((o) => o.branch === branch);
      const deliveredOrders = branchOrders.filter((o) => o.status === "تم التوصيل").length;
      const ordersRate = branchOrders.length > 0 ? Math.round((deliveredOrders / branchOrders.length) * 100) : 0;

      // 3. الجرد الدوري
      const branchCounts = countTasks.filter((c) => c.branch === branch);
      const completedCounts = branchCounts.filter((c) => c.status === "مكتمل").length;
      const countRate = branchCounts.length > 0 ? Math.round((completedCounts / branchCounts.length) * 100) : 0;

      // 4. المرتجعات (Approved + Returned)
      const branchReturns = returns.filter((r) => r.branch_name === branch);
      const doneReturns = branchReturns.filter((r) => ["Approved", "Returned"].includes(r.status)).length;
      const returnsRate = branchReturns.length > 0 ? Math.round((doneReturns / branchReturns.length) * 100) : 0;

      // 5. تنفيذ اللستة = إجمالي كل الكميات المسجلة في اللستة الحالية (كل السجلات الموجودة)
      const branchAllSales = medicineSales.filter((s) => s.branch === branch && (!s.record_type || s.record_type === "sales"));
      const totalSoldQty = branchAllSales.reduce((sum, record) => {
        return sum + (record.sales || []).reduce((s, item) => s + (Number(item.quantity) || 0), 0);
      }, 0);
      const SALES_TARGET = 100;
      const invoicesRate = Math.min(Math.round((totalSoldQty / SALES_TARGET) * 100), 100);
      const totalSoldDisplay = Number.isInteger(totalSoldQty) ? totalSoldQty : totalSoldQty.toFixed(2);

      // المعدل الإجمالي
      const rates = [tasksRate, ordersRate, countRate, returnsRate, invoicesRate];
      const overallRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);

      return {
        branch,
        overallRate,
        metrics: [
          { label: "تنفيذ اللستة", pct: invoicesRate, icon: ClipboardList, detail: `${totalSoldDisplay} وحدة من 100 مستهدفة` },
          { label: "إتمام المهام", pct: tasksRate, icon: CheckSquare, detail: `${doneTasks} من ${branchTasks.length}` },
          { label: "طلبات العملاء", pct: ordersRate, icon: ShoppingBag, detail: `${deliveredOrders} من ${branchOrders.length}` },
          { label: "الجرد الدوري", pct: countRate, icon: Package, detail: `${completedCounts} من ${branchCounts.length}` },
          { label: "إنجاز المرتجعات", pct: returnsRate, icon: RotateCcw, detail: `${doneReturns} من ${branchReturns.length}` },
        ],
      };
    });
  }, [tasks, orders, countTasks, returns, medicineSales]);

  const topBranch = [...branchData].sort((a, b) => b.overallRate - a.overallRate)[0]?.branch;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h2 className="text-base font-semibold text-gray-700">مؤشر كفاءة الفروع</h2>
        <span className="text-xs text-gray-400 mr-1">إجمالي الأداء عبر جميع المحاور</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branchData.map(({ branch, overallRate, metrics }) => {
          const colors = BRANCH_COLORS[branch];
          const isTop = branch === topBranch;
          const ringColor = overallRate >= 70 ? "#16a34a" : overallRate >= 40 ? "#d97706" : "#dc2626";

          return (
            <Card key={branch} className={`p-4 border-2 ${colors.bg} ${colors.border} ${isTop ? "ring-2 ring-amber-400" : ""}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-gray-800">{branch}</span>
                {isTop && (
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                    <Trophy className="w-3 h-3" /> الأفضل
                  </span>
                )}
              </div>

              {/* Ring + Overall */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative shrink-0">
                  <RingChart pct={overallRate} color={ringColor} size={64} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold" style={{ color: ringColor }}>{overallRate}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">الكفاءة الإجمالية</p>
                  <p className="text-sm font-bold" style={{ color: ringColor }}>
                    {overallRate >= 70 ? "ممتاز 🟢" : overallRate >= 40 ? "متوسط 🟡" : "يحتاج تحسين 🔴"}
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2.5">
                {metrics.map((m) => (
                  <MetricRow
                    key={m.label}
                    icon={m.icon}
                    label={m.label}
                    pct={m.pct}
                    color={m.pct >= 70 ? "text-green-600" : m.pct >= 40 ? "text-amber-600" : "text-red-500"}
                    detail={m.detail}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}