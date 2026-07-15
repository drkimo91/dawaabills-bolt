import { CalendarCheck, Eye, Pencil, Trash2 } from "lucide-react";

const BRANCH_COLORS = {
  "فرع زكريا": { dot: "bg-purple-500", accent: "border-r-purple-400" },
  "فرع بسيسة": { dot: "bg-teal-500", accent: "border-r-teal-400" },
  "فرع المنشية": { dot: "bg-amber-500", accent: "border-r-amber-400" },
};

const SHIFT_ORDER = { "صباحي": 0, "مسائي": 1, "نايت": 2 };

const SHIFT_COLORS = {
  "صباحي": "bg-yellow-100 text-yellow-700",
  "مسائي": "bg-orange-100 text-orange-700",
  "نايت": "bg-indigo-100 text-indigo-700",
};

const ACCENTS = {
  today: { bg: "bg-green-100", text: "text-green-600", gradient: "from-green-50 to-white", border: "border-green-100" },
  yesterday: { bg: "bg-amber-100", text: "text-amber-600", gradient: "from-amber-50 to-white", border: "border-amber-100" },
  day2: { bg: "bg-blue-100", text: "text-blue-600", gradient: "from-blue-50 to-white", border: "border-blue-100" },
  day3: { bg: "bg-violet-100", text: "text-violet-600", gradient: "from-violet-50 to-white", border: "border-violet-100" },
};

export default function TodayHandoverSection({ records, canFilter, onView, onEdit, onDelete, title = "تسليمات اليوم", variant = "today", dateLabel }) {
  const accent = ACCENTS[variant] || ACCENTS.today;
  const Icon = CalendarCheck;
  if (!records || records.length === 0) return null;

  const branches = [...new Set(records.map((r) => r.branch))];
  const totalSales = records.reduce((s, r) => s + (r.total_sales || 0), 0);
  const totalExpenses = records.reduce((s, r) => s + (r.total_expenses || 0), 0);
  const netAmount = records.reduce((s, r) => s + (r.net_amount || 0), 0);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${accent.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${accent.text}`} />
        </div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {dateLabel && <span className="text-xs text-gray-400">{dateLabel}</span>}
        <span className="text-xs text-gray-400">({records.length} تسليم)</span>
      </div>

      <div className={`bg-gradient-to-l ${accent.gradient} rounded-xl border ${accent.border} p-3 mb-3 grid grid-cols-3 gap-2 text-center`}>
        <div>
          <p className="text-[10px] text-gray-500">إجمالي المبيعات</p>
          <p className="text-sm font-bold text-blue-600">{totalSales.toLocaleString("ar-EG")}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">إجمالي المصروفات</p>
          <p className="text-sm font-bold text-red-600">{totalExpenses.toLocaleString("ar-EG")}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">الصافي</p>
          <p className="text-sm font-bold text-green-600">{netAmount.toLocaleString("ar-EG")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {branches.map((branch) => {
          const branchRecords = records
            .filter((r) => r.branch === branch)
            .sort((a, b) => (SHIFT_ORDER[a.shift_type] ?? 99) - (SHIFT_ORDER[b.shift_type] ?? 99));
          const colors = BRANCH_COLORS[branch] || BRANCH_COLORS["فرع زكريا"];
          const bNet = branchRecords.reduce((s, r) => s + (r.net_amount || 0), 0);
          return (
            <div key={branch} className={`bg-white rounded-xl border border-r-4 ${colors.accent} overflow-hidden`}>
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className="text-sm font-bold text-gray-700">{branch}</span>
                </div>
                <span className="text-xs text-gray-400">{branchRecords.length} تسليم</span>
              </div>
              <div className="divide-y">
                {branchRecords.map((r) => (
                  <div key={r.id} className="px-3 py-2 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SHIFT_COLORS[r.shift_type] || "bg-gray-100"}`}>{r.shift_type}</span>
                        <span className="text-xs font-medium text-gray-700">{r.employee_name}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onView(r)} className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100">
                          <Eye className="w-3 h-3" />
                        </button>
                        {canFilter && (
                          <>
                            <button onClick={() => onEdit(r)} className="w-6 h-6 flex items-center justify-center rounded text-blue-600 hover:bg-blue-50">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => onDelete(r)} className="w-6 h-6 flex items-center justify-center rounded text-red-500 hover:bg-red-50">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{r.handover_time ? new Date(r.handover_time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      <div className="flex gap-2">
                        <span className="text-gray-500">مبيعات: <span className="font-medium">{(r.total_sales || 0).toLocaleString("ar-EG")}</span></span>
                        <span className="text-green-600 font-bold">صافي: {(r.net_amount || 0).toLocaleString("ar-EG")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 bg-gray-50 border-t flex justify-between text-xs">
                <span className="text-gray-500">إجمالي الفرع</span>
                <span className="font-bold text-green-600">{bNet.toLocaleString("ar-EG")} ج.م</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}