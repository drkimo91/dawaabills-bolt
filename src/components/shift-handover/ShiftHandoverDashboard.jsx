import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Wallet, BarChart3, Calendar, Repeat } from "lucide-react";

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
}

function monthStr() {
  return new Date().toISOString().substring(0, 7);
}

export default function ShiftHandoverDashboard() {
  const today = todayStr();
  const month = monthStr();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["shift-handovers"],
    queryFn: () => base44.entities.ShiftHandover.list("-date", 500),
  });

  const stats = useMemo(() => {
    const todayRecs = records.filter((r) => (r.posting_date || r.date) === today);
    const monthRecs = records.filter((r) => (r.posting_date || r.date)?.startsWith(month));
    const sum = (arr, field) => arr.reduce((s, r) => s + (Number(r[field]) || 0), 0);
    return {
      todaySales: sum(todayRecs, "total_sales"),
      monthSales: sum(monthRecs, "total_sales"),
      todayExpenses: sum(todayRecs, "total_expenses"),
      monthExpenses: sum(monthRecs, "total_expenses"),
      todayNet: sum(todayRecs, "net_amount"),
      monthNet: sum(monthRecs, "net_amount"),
      shiftCount: monthRecs.length,
      avgShift: monthRecs.length > 0 ? sum(monthRecs, "total_sales") / monthRecs.length : 0,
    };
  }, [records, today, month]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const cards = [
    { label: "مبيعات اليوم", value: stats.todaySales, icon: TrendingUp, color: "green" },
    { label: "مبيعات الشهر", value: stats.monthSales, icon: Calendar, color: "green" },
    { label: "مصروفات اليوم", value: stats.todayExpenses, icon: TrendingDown, color: "red" },
    { label: "مصروفات الشهر", value: stats.monthExpenses, icon: Calendar, color: "red" },
    { label: "صافي اليوم", value: stats.todayNet, icon: Wallet, color: "blue" },
    { label: "صافي الشهر", value: stats.monthNet, icon: Wallet, color: "blue" },
    { label: "عدد الشيفتات", value: stats.shiftCount, icon: Repeat, color: "indigo", isCount: true },
    { label: "متوسط الشيفت", value: stats.avgShift, icon: BarChart3, color: "amber" },
  ];

  const colorMap = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const iconColorMap = {
    green: "text-green-600", red: "text-red-600", blue: "text-blue-600",
    indigo: "text-indigo-600", amber: "text-amber-600",
  };

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <h2 className="text-lg font-bold text-gray-800 mb-4">لوحة الإحصائيات</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-3 ${colorMap[c.color]}`}>
            <div className="flex items-center justify-between mb-2">
              <c.icon className={`w-5 h-5 ${iconColorMap[c.color]}`} />
            </div>
            <p className="text-[11px] text-gray-500 mb-0.5">{c.label}</p>
            <p className="text-lg font-bold">
              {c.isCount ? c.value : `${Number(c.value).toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}