import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

const COLORS = ["#0d9488", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

function getMonthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("ar-EG", { month: "long", year: "numeric" });
}

export default function ExpensesReport({ expenses, allExpenses = [], currentMonthKey = "" }) {
  const [compareCategory, setCompareCategory] = useState("الكل");

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const branchCategoryData = useMemo(() => {
    const result = {};
    const allCategories = new Set();
    expenses.forEach((e) => {
      const branch = e.branch || "غير محدد";
      const cat = e.category || "أخرى";
      allCategories.add(cat);
      if (!result[branch]) result[branch] = {};
      result[branch][cat] = (result[branch][cat] || 0) + (e.amount || 0);
    });
    return { result, allCategories: [...allCategories].sort() };
  }, [expenses]);

  const branchTotals = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const branch = e.branch || "غير محدد";
      map[branch] = (map[branch] || 0) + (e.amount || 0);
    });
    return map;
  }, [expenses]);

  // بيانات المقارنة الشهرية
  const monthlyComparison = useMemo(() => {
    const map = {};
    allExpenses.forEach((e) => {
      if (!e.date) return;
      const ym = e.date.slice(0, 7);
      if (!map[ym]) map[ym] = { total: 0, categories: {} };
      map[ym].total += e.amount || 0;
      const cat = e.category || "أخرى";
      map[ym].categories[cat] = (map[ym].categories[cat] || 0) + (e.amount || 0);
    });
    // ترتيب الأشهر تنازلياً
    const sorted = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return { map, months: sorted };
  }, [allExpenses]);

  const allCategories = useMemo(() => {
    const cats = new Set();
    allExpenses.forEach((e) => cats.add(e.category || "أخرى"));
    return ["الكل", ...Array.from(cats).sort()];
  }, [allExpenses]);

  const { result, allCategories: reportCategories } = branchCategoryData;

  if (expenses.length === 0) {
    return <div className="text-center py-16 text-gray-400">لا توجد بيانات للعرض</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-teal-50 border-teal-200">
          <p className="text-xs text-teal-600">إجمالي المصروفات</p>
          <p className="text-xl font-bold text-teal-800">{total.toLocaleString("ar-EG")} ج</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-600">عدد السجلات</p>
          <p className="text-xl font-bold text-blue-800">{expenses.length}</p>
        </Card>
        {BRANCHES.map((b, i) => (
          <Card key={b} className="p-4" style={{ borderColor: COLORS[i] + "66", backgroundColor: COLORS[i] + "11" }}>
            <p className="text-xs font-medium" style={{ color: COLORS[i] }}>{b}</p>
            <p className="text-xl font-bold text-gray-800">{(branchTotals[b] || 0).toLocaleString("ar-EG")} ج</p>
            <p className="text-xs text-gray-400">{total > 0 ? ((branchTotals[b] || 0) / total * 100).toFixed(1) : 0}%</p>
          </Card>
        ))}
      </div>

      {/* جدول المصروفات لكل فرع حسب النوع */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">مصروفات كل فرع حسب النوع</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-right px-3 py-2.5 font-semibold text-gray-600">نوع المصروف</th>
                {BRANCHES.map((b) => (
                  <th key={b} className="text-center px-3 py-2.5 font-semibold text-gray-600">{b}</th>
                ))}
                <th className="text-center px-3 py-2.5 font-semibold text-gray-600">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {reportCategories.map((cat, idx) => {
                const rowTotal = BRANCHES.reduce((s, b) => s + (result[b]?.[cat] || 0), 0);
                if (rowTotal === 0) return null;
                return (
                  <tr key={cat} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2.5 font-medium text-gray-700">{cat}</td>
                    {BRANCHES.map((b) => (
                      <td key={b} className="px-3 py-2.5 text-center text-gray-700">
                        {result[b]?.[cat] ? result[b][cat].toLocaleString("ar-EG") + " ج" : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-bold text-gray-800">
                      {rowTotal.toLocaleString("ar-EG")} ج
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 font-bold">
                <td className="px-3 py-2.5 text-gray-700">الإجمالي</td>
                {BRANCHES.map((b) => (
                  <td key={b} className="px-3 py-2.5 text-center text-gray-800">
                    {(branchTotals[b] || 0).toLocaleString("ar-EG")} ج
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center text-teal-700">{total.toLocaleString("ar-EG")} ج</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* نسبة مصروفات كل فرع */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">نسبة مصروفات كل فرع من الإجمالي</h3>
        <div className="space-y-3">
          {BRANCHES.map((b, i) => {
            const val = branchTotals[b] || 0;
            const pct = total > 0 ? (val / total) * 100 : 0;
            return (
              <div key={b}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{b}</span>
                  <span className="font-bold text-gray-800">
                    {val.toLocaleString("ar-EG")} ج{" "}
                    <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full">
                  <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* مقارنة الأشهر */}
      {monthlyComparison.months.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-700">مقارنة المصروفات بين الأشهر</h3>
            <div className="flex gap-1.5 flex-wrap">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCompareCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    compareCategory === cat
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600">الشهر</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600">الإجمالي</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600">التغيير</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600">شريط المقارنة</th>
                </tr>
              </thead>
              <tbody>
                {monthlyComparison.months.map((ym, idx) => {
                  const data = monthlyComparison.map[ym];
                  const value = compareCategory === "الكل"
                    ? data.total
                    : (data.categories[compareCategory] || 0);
                  const maxVal = Math.max(...monthlyComparison.months.map((m) => {
                    const d = monthlyComparison.map[m];
                    return compareCategory === "الكل" ? d.total : (d.categories[compareCategory] || 0);
                  }));
                  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
                  const prevYm = monthlyComparison.months[idx + 1];
                  let change = null;
                  if (prevYm) {
                    const prevData = monthlyComparison.map[prevYm];
                    const prevValue = compareCategory === "الكل"
                      ? prevData.total
                      : (prevData.categories[compareCategory] || 0);
                    if (prevValue > 0) change = ((value - prevValue) / prevValue * 100).toFixed(1);
                  }
                  const isCurrent = ym === currentMonthKey;
                  return (
                    <tr key={ym} className={`border-b last:border-0 ${isCurrent ? "bg-teal-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-3 py-2.5 font-medium text-gray-800">
                        {getMonthLabel(ym)}
                        {isCurrent && <span className="mr-2 text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">الحالي</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-800">
                        {value.toLocaleString("ar-EG")} ج
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs">
                        {change === null ? "—" : (
                          <span className={Number(change) > 0 ? "text-red-600" : "text-green-600"}>
                            {Number(change) > 0 ? "▲" : "▼"} {Math.abs(Number(change))}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="w-full h-2 bg-gray-100 rounded-full min-w-24">
                          <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}