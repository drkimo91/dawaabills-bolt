import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];
const STATUSES = ["طلب جديد", "جاري البحث", "النواقص", "تم توفير الصنف", "تم التوصيل", "الصنف غير متوفر حاليا", "تم الإلغاء"];

const STATUS_COLORS = {
  "طلب جديد": "bg-blue-100 text-blue-700",
  "جاري البحث": "bg-yellow-100 text-yellow-700",
  "النواقص": "bg-purple-100 text-purple-700",
  "تم توفير الصنف": "bg-teal-100 text-teal-700",
  "تم التوصيل": "bg-green-100 text-green-700",
  "الصنف غير متوفر حاليا": "bg-orange-100 text-orange-700",
  "تم الإلغاء": "bg-red-100 text-red-700",
};

export default function OrderAnalytics({ orders }) {
  // جدول: لكل فرع عدد الطلبات حسب كل حالة
  const branchStatusTable = useMemo(() => {
    const table = {};
    BRANCHES.forEach((b) => {
      table[b] = {};
      STATUSES.forEach((s) => { table[b][s] = 0; });
      table[b]["__total"] = 0;
    });
    orders.forEach((o) => {
      const branch = o.branch || "غير محدد";
      const status = o.status || "طلب جديد";
      if (!table[branch]) {
        table[branch] = {};
        STATUSES.forEach((s) => { table[branch][s] = 0; });
        table[branch]["__total"] = 0;
      }
      if (table[branch][status] !== undefined) table[branch][status]++;
      table[branch]["__total"]++;
    });
    return table;
  }, [orders]);

  // إجماليات لكل حالة
  const statusTotals = useMemo(() => {
    const map = {};
    STATUSES.forEach((s) => { map[s] = 0; });
    orders.forEach((o) => {
      const status = o.status || "طلب جديد";
      if (map[status] !== undefined) map[status]++;
    });
    return map;
  }, [orders]);

  const grandTotal = orders.length;

  // كفاءة كل فرع
  const branchEfficiency = useMemo(() => {
    return BRANCHES.map((b) => {
      const t = branchStatusTable[b];
      const total = t?.["__total"] || 0;
      const delivered = t?.["تم التوصيل"] || 0;
      const provided = t?.["تم توفير الصنف"] || 0;
      const cancelled = t?.["تم الإلغاء"] || 0;
      const unavailable = t?.["الصنف غير متوفر حاليا"] || 0;
      const inProgress = (t?.["طلب جديد"] || 0) + (t?.["جاري البحث"] || 0) + (t?.["النواقص"] || 0);
      // نسبة النجاح = تم التوصيل + تم توفير الصنف من الإجمالي
      const successRate = total > 0 ? Math.round(((delivered + provided) / total) * 100) : 0;
      const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
      const cancelRate = total > 0 ? Math.round(((cancelled + unavailable) / total) * 100) : 0;
      const pendingRate = total > 0 ? Math.round((inProgress / total) * 100) : 0;
      return { branch: b, total, delivered, provided, cancelled, unavailable, inProgress, successRate, deliveryRate, cancelRate, pendingRate };
    });
  }, [branchStatusTable]);

  // الأصناف الأكثر طلباً
  const productStats = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const name = o.product_name || "غير محدد";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [orders]);

  // العملاء الأكثر طلباً
  const customerStats = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const name = o.customer_name || "غير محدد";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  }, [orders]);

  if (orders.length === 0) {
    return <div className="text-center py-16 text-gray-400">لا توجد بيانات للعرض</div>;
  }

  return (
    <div className="space-y-6">

      {/* جدول الفروع × الحالات */}
      <Card className="p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-4">إحصائيات الطلبات لكل فرع حسب الحالة</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" dir="rtl">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">الفرع</th>
                {STATUSES.map((s) => (
                  <th key={s} className="px-2 py-2.5 text-center font-semibold text-gray-600 whitespace-nowrap">{s}</th>
                ))}
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {BRANCHES.map((branch, idx) => (
                <tr key={branch} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2.5 font-bold text-gray-800 whitespace-nowrap">{branch}</td>
                  {STATUSES.map((s) => {
                    const count = branchStatusTable[branch]?.[s] || 0;
                    return (
                      <td key={s} className="px-2 py-2.5 text-center">
                        {count > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[s]}`}>{count}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center font-bold text-gray-800">
                    {branchStatusTable[branch]?.["__total"] || 0}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 font-bold">
                <td className="px-3 py-2.5 text-gray-700">الإجمالي</td>
                {STATUSES.map((s) => (
                  <td key={s} className="px-2 py-2.5 text-center text-gray-800">
                    {statusTotals[s] > 0 ? statusTotals[s] : "—"}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center text-teal-700">{grandTotal}</td>
              </tr>
              <tr className="bg-blue-50 border-t text-xs">
                <td className="px-3 py-2 text-blue-700 font-semibold">النسبة %</td>
                {STATUSES.map((s) => {
                  const pct = grandTotal > 0 ? Math.round((statusTotals[s] / grandTotal) * 100) : 0;
                  return (
                    <td key={s} className="px-2 py-2 text-center">
                      {pct > 0 ? (
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[s]}`}>{pct}%</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center text-blue-700 font-bold">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* إنفوجراف كفاءة الفروع */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-gray-700">مؤشر كفاءة الفروع</h3>
          <span className="text-xs text-gray-400 mr-auto">نسبة النجاح = تم التوصيل + تم توفير الصنف</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branchEfficiency.map((b, idx) => {
            const rank = [...branchEfficiency].sort((a, z) => z.successRate - a.successRate).findIndex(x => x.branch === b.branch);
            const isTop = rank === 0;
            const ringColor = b.successRate >= 70 ? "#16a34a" : b.successRate >= 40 ? "#d97706" : "#dc2626";
            const circumference = 2 * Math.PI * 36;
            const offset = circumference - (b.successRate / 100) * circumference;

            return (
              <div key={b.branch} className={`rounded-xl border p-4 flex flex-col gap-3 ${isTop ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
                {/* اسم الفرع + وسام */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-sm">{b.branch}</span>
                  {isTop && b.total > 0 && (
                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                      <Trophy className="w-3 h-3" /> الأفضل
                    </span>
                  )}
                </div>

                {/* دائرة النسبة */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
                      <circle cx="42" cy="42" r="36" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle
                        cx="42" cy="42" r="36" fill="none"
                        stroke={ringColor} strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={b.total > 0 ? offset : circumference}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold" style={{ color: ringColor }}>{b.successRate}%</span>
                      <span className="text-xs text-gray-400">نجاح</span>
                    </div>
                  </div>

                  {/* تفاصيل */}
                  <div className="flex flex-col gap-1.5 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="w-3 h-3" /> تم التوصيل</span>
                      <span className="font-bold text-green-700">{b.delivered} <span className="text-gray-400 font-normal">({b.deliveryRate}%)</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-teal-700"><CheckCircle2 className="w-3 h-3" /> تم التوفير</span>
                      <span className="font-bold text-teal-700">{b.provided}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3" /> جاري</span>
                      <span className="font-bold text-amber-600">{b.inProgress} <span className="text-gray-400 font-normal">({b.pendingRate}%)</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3 h-3" /> ملغي/غير متوفر</span>
                      <span className="font-bold text-red-600">{b.cancelled + b.unavailable} <span className="text-gray-400 font-normal">({b.cancelRate}%)</span></span>
                    </div>
                    <div className="border-t pt-1 flex items-center justify-between text-gray-500">
                      <span>الإجمالي</span>
                      <span className="font-bold text-gray-700">{b.total} طلب</span>
                    </div>
                  </div>
                </div>

                {/* شريط تقدم مقسّم */}
                <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
                  {b.deliveryRate > 0 && <div className="bg-green-500 h-full rounded-r-full" style={{ width: `${b.deliveryRate}%` }} />}
                  {b.provided > 0 && <div className="bg-teal-400 h-full" style={{ width: `${b.total > 0 ? Math.round((b.provided / b.total) * 100) : 0}%` }} />}
                  {b.pendingRate > 0 && <div className="bg-amber-400 h-full" style={{ width: `${b.pendingRate}%` }} />}
                  {b.cancelRate > 0 && <div className="bg-red-400 h-full rounded-l-full" style={{ width: `${b.cancelRate}%` }} />}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />توصيل</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />توفير</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />جاري</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />ملغي</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* الأصناف الأكثر طلباً */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-4">الأصناف الأكثر طلبًا</h3>
          {productStats.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات</p> : (
            <div className="space-y-2">
              {productStats.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-700 truncate">{p.name}</span>
                      <span className="text-sm font-bold text-teal-700">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-teal-500 rounded-full" style={{ width: `${(p.count / productStats[0].count) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* العملاء الأكثر طلباً */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-4">العملاء الأكثر طلبًا</h3>
          {customerStats.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات</p> : (
            <div className="space-y-2">
              {customerStats.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{c.count} طلب</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}