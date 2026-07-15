import { Card } from "@/components/ui/card";
import { ShoppingBag, CheckSquare, RotateCcw, PackageSearch, ArrowLeft } from "lucide-react";
import BranchEfficiencyBars from "./BranchEfficiencyBars";

const BRANCH_COLORS = {
  "فرع زكريا": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  "فرع بسيسة": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  "فرع المنشية": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
};

const ORDER_FINAL = ["تم التوصيل", "تم الإلغاء", "النواقص"];

export default function BranchOverviewCard({ branch, tasks, orders, countTasks, returns, medicineSales, onClick }) {
  const c = BRANCH_COLORS[branch];

  const bTasks = tasks.filter(t => t.branch_name === branch);
  const bOrders = orders.filter(o => o.branch === branch);
  const pendingOrders = bOrders.filter(o => !ORDER_FINAL.includes(o.status));
  const newOrders = bOrders.filter(o => o.status === "طلب جديد");
  const bCounts = countTasks.filter(c => c.branch === branch);
  const bReturns = returns.filter(r => r.branch_name === branch);

  const today = new Date();
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
  const lateOrders = pendingOrders.filter(o => {
    const d = new Date((o.request_date || o.created_date?.split("T")[0]) + "T12:00:00");
    return d < twoDaysAgo;
  });

  const bSales = medicineSales.filter(s => s.branch === branch);
  const totalSoldQty = bSales.reduce((sum, r) => sum + (r.sales || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0), 0);
  const listRate = Math.min(Math.round((totalSoldQty / 100) * 100), 100);

  const stats = [
    { label: "طلبات معلقة", value: pendingOrders.length, sub: `${lateOrders.length} متأخر • ${newOrders.length} جديد`, icon: ShoppingBag, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "مهام غير منفذة", value: bTasks.filter(t => t.status !== "done" && t.status !== "cancelled").length, sub: `${bTasks.filter(t => t.status === "done").length} منفذة`, icon: CheckSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "مرتجعات معلقة", value: bReturns.filter(r => !["Returned", "Approved"].includes(r.status)).length, sub: `${bReturns.filter(r => ["Returned", "Approved"].includes(r.status)).length} منفذة`, icon: RotateCcw, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "جرد غير مكتمل", value: bCounts.filter(c => c.status !== "مكتمل").length, sub: `${bCounts.filter(c => c.status === "مكتمل").length} مكتمل`, icon: PackageSearch, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  return (
    <Card className={`p-4 border-2 ${c.bg} ${c.border} cursor-pointer hover:shadow-md transition-shadow`} onClick={onClick}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-lg ${c.text}`}>{branch}</h3>
        <ArrowLeft className={`w-5 h-5 ${c.text}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white/70 rounded-lg p-2.5">
            <div className={`p-1 rounded inline-block mb-1 ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>
      <BranchEfficiencyBars branch={branch} tasks={tasks} orders={orders} countTasks={countTasks} returns={returns} medicineSales={medicineSales} />
    </Card>
  );
}