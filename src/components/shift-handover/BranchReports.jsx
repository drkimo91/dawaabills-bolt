import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2 } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
}

function weekStart() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function monthStr() {
  return new Date().toISOString().substring(0, 7);
}

export default function BranchReports() {
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const today = todayStr();
  const wStart = weekStart();
  const month = monthStr();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["shift-handovers"],
    queryFn: () => base44.entities.ShiftHandover.list("-date", 500),
  });

  const branchStats = useMemo(() => {
    let filtered = records;
    const pd = (r) => r.posting_date || r.date;
    if (period === "today") filtered = records.filter((r) => pd(r) === today);
    else if (period === "week") filtered = records.filter((r) => pd(r) >= wStart);
    else if (period === "month") filtered = records.filter((r) => pd(r)?.startsWith(month));
    else if (period === "custom") {
      filtered = records.filter((r) => {
        if (customFrom && pd(r) < customFrom) return false;
        if (customTo && pd(r) > customTo) return false;
        return true;
      });
    }

    return BRANCHES.map((b) => {
      const branchRecs = filtered.filter((r) => r.branch === b);
      const sum = (field) => branchRecs.reduce((s, r) => s + (Number(r[field]) || 0), 0);
      const sales = sum("total_sales");
      const count = branchRecs.length;
      return {
        branch: b,
        sales,
        expenses: sum("total_expenses"),
        net: sum("net_amount"),
        count,
        avg: count > 0 ? sales / count : 0,
      };
    });
  }, [records, period, today, wStart, month, customFrom, customTo]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-800">تقارير الفروع</h2>
        <div className="flex gap-2 flex-wrap">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none">
            <option value="today">اليوم</option>
            <option value="week">الأسبوع</option>
            <option value="month">الشهر</option>
            <option value="custom">فترة مخصصة</option>
          </select>
          {period === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {branchStats.map((s) => (
          <div key={s.branch} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-700">{s.branch}</h3>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">المبيعات</span><span className="font-medium">{s.sales.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المصروفات</span><span className="font-medium text-red-600">{s.expenses.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م</span></div>
              <div className="flex justify-between border-t pt-1.5"><span className="font-bold">الصافي</span><span className="font-bold text-green-600">{s.net.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الشيفتات</span><span className="font-medium">{s.count}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المتوسط</span><span className="font-medium">{s.avg.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}