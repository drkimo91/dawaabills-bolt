import { CheckSquare, RotateCcw, ShoppingBag, ClipboardList, PackageSearch } from "lucide-react";

const ORDER_FINAL = ["تم التوصيل", "تم الإلغاء", "النواقص"];
const RETURN_DONE = ["Returned", "Approved"];

function colorFor(pct) {
  if (pct >= 70) return { bar: "bg-green-500", text: "text-green-600" };
  if (pct >= 40) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-red-500", text: "text-red-500" };
}

function FactorBar({ icon: Icon, label, pct }) {
  const c = colorFor(pct);
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-600 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-left ${c.text}`}>{pct}%</span>
    </div>
  );
}

export default function BranchEfficiencyBars({ branch, tasks, orders, countTasks, returns, medicineSales }) {
  const bTasks = tasks.filter(t => t.branch_name === branch);
  const tasksTotal = bTasks.length;
  const tasksDone = bTasks.filter(t => t.status === "done").length;
  const tasksPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const bOrders = orders.filter(o => o.branch === branch);
  const ordersTotal = bOrders.length;
  const ordersDone = bOrders.filter(o => ORDER_FINAL.includes(o.status)).length;
  const ordersPct = ordersTotal > 0 ? Math.round((ordersDone / ordersTotal) * 100) : 0;

  const bReturns = returns.filter(r => r.branch_name === branch);
  const returnsTotal = bReturns.length;
  const returnsDone = bReturns.filter(r => RETURN_DONE.includes(r.status)).length;
  const returnsPct = returnsTotal > 0 ? Math.round((returnsDone / returnsTotal) * 100) : 0;

  const bCounts = countTasks.filter(c => c.branch === branch);
  const countsTotal = bCounts.length;
  const countsDone = bCounts.filter(c => c.status === "مكتمل").length;
  const countsPct = countsTotal > 0 ? Math.round((countsDone / countsTotal) * 100) : 0;

  const bSales = medicineSales.filter(s => s.branch === branch);
  const totalSoldQty = bSales.reduce((sum, r) => sum + (r.sales || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0), 0);
  const listPct = Math.min(Math.round((totalSoldQty / 100) * 100), 100);

  const factors = [
    { icon: CheckSquare, label: "المهام", pct: tasksPct },
    { icon: ShoppingBag, label: "الطلبات", pct: ordersPct },
    { icon: RotateCcw, label: "المرتجعات", pct: returnsPct },
    { icon: ClipboardList, label: "اللستة", pct: listPct },
    { icon: PackageSearch, label: "الجرد", pct: countsPct },
  ];

  return (
    <div className="bg-white/70 rounded-lg p-2.5 space-y-1.5">
      <p className="text-xs font-semibold text-gray-500 mb-1">مؤشرات النجاح</p>
      {factors.map(f => <FactorBar key={f.label} {...f} />)}
    </div>
  );
}