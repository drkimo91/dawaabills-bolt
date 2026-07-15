import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarDays, CalendarRange, Receipt, TrendingDown, Hash, Percent, ChevronLeft, StickyNote, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
}

function monthStr() {
  return new Date().toISOString().substring(0, 7);
}

function monthStartStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ExpenseAnalysis() {
  const [periodMode, setPeriodMode] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const today = todayStr();
  const monthStart = monthStartStr();
  const month = monthStr();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["shift-handovers"],
    queryFn: () => base44.entities.ShiftHandover.list("-date", 500),
  });

  const { expenseData, grandTotal } = useMemo(() => {
    const pd = (r) => r.posting_date || r.date;
    let filtered = records;

    if (periodMode === "month") {
      filtered = records.filter((r) => pd(r)?.startsWith(month));
    } else if (periodMode === "custom") {
      filtered = records.filter((r) => {
        if (customFrom && pd(r) < customFrom) return false;
        if (customTo && pd(r) > customTo) return false;
        return true;
      });
    }

    const map = {};
    filtered.forEach((r) => {
      (r.expenses || []).forEach((e) => {
        if (e.template_name && e.amount) {
          if (!map[e.template_name]) map[e.template_name] = { total: 0, count: 0, branches: new Set(), entries: [] };
          map[e.template_name].total += Number(e.amount) || 0;
          map[e.template_name].count += 1;
          if (r.branch) map[e.template_name].branches.add(r.branch);
          map[e.template_name].entries.push({
            date: pd(r),
            time: r.handover_time,
            amount: Number(e.amount) || 0,
            notes: e.notes || "",
            branch: r.branch || "",
            employee: r.employee_name || "",
            shift_type: r.shift_type || "",
          });
        }
      });
    });

    const total = Object.values(map).reduce((s, v) => s + v.total, 0);
    const data = Object.entries(map)
      .map(([name, d]) => ({
        name,
        total: d.total,
        count: d.count,
        percent: total > 0 ? (d.total / total) * 100 : 0,
        branches: [...d.branches],
        entries: d.entries.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      }))
      .sort((a, b) => b.total - a.total);

    return { expenseData: data, grandTotal: total };
  }, [records, periodMode, month, customFrom, customTo]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const isCurrentMonthActive = periodMode === "month";
  const isCustomActive = periodMode === "custom";

  const CARD_COLORS = [
    { bg: "bg-blue-50", border: "border-blue-200", accent: "bg-blue-500", text: "text-blue-700", icon: "text-blue-500" },
    { bg: "bg-red-50", border: "border-red-200", accent: "bg-red-500", text: "text-red-700", icon: "text-red-500" },
    { bg: "bg-green-50", border: "border-green-200", accent: "bg-green-500", text: "text-green-700", icon: "text-green-500" },
    { bg: "bg-amber-50", border: "border-amber-200", accent: "bg-amber-500", text: "text-amber-700", icon: "text-amber-500" },
    { bg: "bg-purple-50", border: "border-purple-200", accent: "bg-purple-500", text: "text-purple-700", icon: "text-purple-500" },
    { bg: "bg-teal-50", border: "border-teal-200", accent: "bg-teal-500", text: "text-teal-700", icon: "text-teal-500" },
    { bg: "bg-indigo-50", border: "border-indigo-200", accent: "bg-indigo-500", text: "text-indigo-700", icon: "text-indigo-500" },
    { bg: "bg-pink-50", border: "border-pink-200", accent: "bg-pink-500", text: "text-pink-700", icon: "text-pink-500" },
  ];

  const periodLabel = periodMode === "month"
    ? `الشهر الحالي (${month})`
    : customFrom || customTo
      ? `من ${customFrom || "..."} إلى ${customTo || "..."}`
      : "كل الفترات";

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-800">تحليل المصروفات</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPeriodMode("month")}
            className={`h-8 rounded-md border px-3 text-xs font-medium flex items-center gap-1.5 transition-colors ${isCurrentMonthActive ? "bg-blue-600 text-white border-blue-600" : "bg-transparent hover:bg-gray-50"}`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> الشهر الحالي
          </button>
          <button
            onClick={() => setPeriodMode("custom")}
            className={`h-8 rounded-md border px-3 text-xs font-medium flex items-center gap-1.5 transition-colors ${isCustomActive ? "bg-blue-600 text-white border-blue-600" : "bg-transparent hover:bg-gray-50"}`}
          >
            <CalendarRange className="w-3.5 h-3.5" /> فترة محددة
          </button>
        </div>
      </div>

      {periodMode === "custom" && (
        <div className="bg-white rounded-xl border p-3 mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">من:</span>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none" />
          <span className="text-xs text-gray-500">إلى:</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none" />
          {(customFrom || customTo) && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); }}
              className="h-8 rounded-md border px-2 text-xs text-gray-500 hover:bg-gray-50">
              مسح
            </button>
          )}
        </div>
      )}

      {/* Summary bar */}
      {expenseData.length > 0 && (
        <div className="bg-gradient-to-l from-blue-50 to-white rounded-xl border border-blue-100 p-4 mb-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <Receipt className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500">عدد الأنواع</p>
            <p className="text-sm font-bold text-gray-800">{expenseData.length}</p>
          </div>
          <div>
            <Hash className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500">إجمالي البنود</p>
            <p className="text-sm font-bold text-gray-800">{expenseData.reduce((s, e) => s + e.count, 0)}</p>
          </div>
          <div>
            <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500">إجمالي المصروفات</p>
            <p className="text-sm font-bold text-red-600">{grandTotal.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م</p>
          </div>
        </div>
      )}

      {/* Expense type cards */}
      {expenseData.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          لا توجد بيانات مصروفات {periodMode === "custom" ? "في هذه الفترة" : "هذا الشهر"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {expenseData.map((e, idx) => {
            const c = CARD_COLORS[idx % CARD_COLORS.length];
            return (
              <div key={e.name} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelectedExpense(e)}>
                <div className={`h-1.5 ${c.accent}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                        <Receipt className={`w-4 h-4 ${c.icon}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{e.name}</p>
                        {e.branches.length > 0 && (
                          <p className="text-[10px] text-gray-400">{e.branches.join(" · ")}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-white ${c.text} border ${c.border}`}>
                      {e.percent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> الإجمالي</span>
                      <span className={`text-lg font-bold ${c.text}`}>{e.total.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                        <Hash className="w-3 h-3 text-gray-400 mx-auto mb-0.5" />
                        <p className="text-[10px] text-gray-500">عدد المرات</p>
                        <p className="text-sm font-bold text-gray-700">{e.count}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                        <Percent className="w-3 h-3 text-gray-400 mx-auto mb-0.5" />
                        <p className="text-[10px] text-gray-500">متوسط المرة</p>
                        <p className="text-sm font-bold text-gray-700">{(e.total / e.count).toLocaleString("ar-EG", { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${c.accent} rounded-full transition-all`} style={{ width: `${e.percent}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-blue-600 font-medium">
                    عرض التفاصيل ({e.count} مرة)
                    <ChevronLeft className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center mt-4">
        {periodMode === "month" ? "عرض بيانات الشهر الحالي" : periodLabel} — يعتمد التحليل على تاريخ الاحتساب
      </p>

      {/* Detail dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(v) => !v && setSelectedExpense(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              {selectedExpense?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <TrendingDown className="w-3.5 h-3.5 text-blue-500 mx-auto mb-0.5" />
                  <p className="text-[10px] text-gray-500">الإجمالي</p>
                  <p className="text-sm font-bold text-blue-700">{selectedExpense.total.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                  <Hash className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-0.5" />
                  <p className="text-[10px] text-gray-500">عدد المرات</p>
                  <p className="text-sm font-bold text-indigo-700">{selectedExpense.count}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                  <Percent className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
                  <p className="text-[10px] text-gray-500">النسبة</p>
                  <p className="text-sm font-bold text-amber-700">{selectedExpense.percent.toFixed(1)}%</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">السجل ({selectedExpense.entries.length} مرة)</p>
                <div className="space-y-2">
                  {selectedExpense.entries.map((entry, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-bold text-gray-800">{entry.date}</span>
                          {entry.time && (
                            <span className="text-[10px] text-gray-400">
                              {new Date(entry.time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-red-600">{entry.amount.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
                        {entry.branch && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {entry.branch}
                          </span>
                        )}
                        {entry.shift_type && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{entry.shift_type}</span>
                        )}
                        {entry.employee && <span>· {entry.employee}</span>}
                      </div>
                      {entry.notes && (
                        <div className="mt-1.5 flex items-start gap-1 text-xs text-gray-600 bg-white rounded-md px-2 py-1 border">
                          <StickyNote className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                          <span>{entry.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}