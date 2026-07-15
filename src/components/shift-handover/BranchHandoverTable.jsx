import { Eye, Pencil, Trash2 } from "lucide-react";

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

export default function BranchHandoverTable({ branch, records, canFilter, onView, onEdit, onDelete }) {
  const colors = BRANCH_COLORS[branch] || BRANCH_COLORS["فرع زكريا"];
  const sortedRecords = [...records].sort((a, b) => (SHIFT_ORDER[a.shift_type] ?? 99) - (SHIFT_ORDER[b.shift_type] ?? 99));
  const totalNet = records.reduce((s, r) => s + (r.net_amount || 0), 0);

  return (
    <div className={`bg-white rounded-xl border border-r-4 ${colors.accent} overflow-hidden`}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <span className="text-sm font-bold text-gray-700">{branch}</span>
          <span className="text-xs text-gray-400">({records.length})</span>
        </div>
        <span className="text-xs text-gray-500">إجمالي الصافي: <span className="font-bold text-green-600">{totalNet.toLocaleString("ar-EG")}</span></span>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-right">تاريخ الاحتساب</th>
              <th className="px-3 py-2 text-right">الشيفت</th>
              <th className="px-3 py-2 text-right">الموظف</th>
              <th className="px-3 py-2 text-left">المبيعات</th>
              <th className="px-3 py-2 text-left">المصروفات</th>
              <th className="px-3 py-2 text-left">الصافي</th>
              <th className="px-3 py-2 text-right">وقت التسليم</th>
              <th className="px-3 py-2 text-right">أنشأه</th>
              <th className="px-3 py-2 text-center">عرض</th>
              {canFilter && <th className="px-3 py-2 text-center">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedRecords.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{r.posting_date || r.date}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${SHIFT_COLORS[r.shift_type] || "bg-gray-100"}`}>{r.shift_type}</span></td>
                <td className="px-3 py-2">{r.employee_name}</td>
                <td className="px-3 py-2 text-left font-medium">{(r.total_sales || 0).toLocaleString("ar-EG")}</td>
                <td className="px-3 py-2 text-left text-red-600">{(r.total_expenses || 0).toLocaleString("ar-EG")}</td>
                <td className="px-3 py-2 text-left font-bold text-green-600">{(r.net_amount || 0).toLocaleString("ar-EG")}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.handover_time ? new Date(r.handover_time).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.created_by_name || "-"}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => onView(r)} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
                {canFilter && (
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(r)} className="w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y">
        {sortedRecords.map((r) => (
          <div key={r.id} className="px-3 py-2">
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
                <span className="text-xs text-gray-400 mr-1">{r.posting_date || r.date}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-gray-400">مبيعات</p><p className="text-xs font-medium">{(r.total_sales || 0).toLocaleString("ar-EG")}</p></div>
              <div><p className="text-[10px] text-gray-400">مصروفات</p><p className="text-xs font-medium text-red-600">{(r.total_expenses || 0).toLocaleString("ar-EG")}</p></div>
              <div><p className="text-[10px] text-gray-400">الصافي</p><p className="text-xs font-bold text-green-600">{(r.net_amount || 0).toLocaleString("ar-EG")}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}