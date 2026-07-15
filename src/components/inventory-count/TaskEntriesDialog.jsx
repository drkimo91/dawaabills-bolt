import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const STATUS_BADGE = {
  "مجدول": "bg-yellow-100 text-yellow-800",
  "جاري": "bg-blue-100 text-blue-800",
  "مكتمل": "bg-green-100 text-green-800",
  "متأخر": "bg-red-100 text-red-800",
};

export default function TaskEntriesDialog({ task, onClose }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["task-entries", task?.id],
    queryFn: () => base44.entities.InventoryCountEntry.filter({ task_id: task.id }, null, 1000),
    enabled: !!task?.id,
  });

  const sorted = [...entries].sort((a, b) => {
    if (a.status === "لم يُجرَد" && b.status !== "لم يُجرَد") return -1;
    if (b.status === "لم يُجرَد" && a.status !== "لم يُجرَد") return 1;
    return 0;
  });

  const matched = entries.filter(e => e.difference === 0 && e.status === "مكتمل").length;
  const diff = entries.filter(e => e.difference !== 0 && e.status === "مكتمل").length;
  const notCounted = entries.filter(e => e.status === "لم يُجرَد").length;

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Package className="w-5 h-5 text-teal-600" />
            <span>أصناف مهمة الجرد</span>
            {task && <Badge className={STATUS_BADGE[task.status]}>{task.status}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {task && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">التاريخ</p>
              <p className="font-semibold text-gray-700">{task.task_date}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">الموظف</p>
              <p className="font-semibold text-gray-700 truncate">{task.assigned_employee || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">عدد الأصناف</p>
              <p className="font-semibold text-gray-700">{entries.length}</p>
            </div>
            {task.status === "مكتمل" && (
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-400">نسبة الدقة</p>
                <p className="font-bold text-teal-600">{task.accuracy_rate || 0}%</p>
              </div>
            )}
          </div>
        )}

        {/* Summary badges */}
        {!isLoading && entries.length > 0 && (
          <div className="flex gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> {matched} مطابق
            </span>
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" /> {diff} فارق
            </span>
            {notCounted > 0 && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                <XCircle className="w-3.5 h-3.5" /> {notCounted} لم يُجرَد
              </span>
            )}
          </div>
        )}

        {/* Entries list */}
        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <p className="text-center text-gray-400 text-sm py-6">جاري التحميل...</p>
          ) : sorted.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">لا توجد أصناف في هذه المهمة</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((e) => {
                const isDiff = e.status === "مكتمل" && e.difference !== 0;
                const isMatch = e.status === "مكتمل" && e.difference === 0;
                return (
                  <div key={e.id} className={`rounded-lg border p-3 ${isDiff ? "border-red-200 bg-red-50/50" : isMatch ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{e.product_name}</p>
                        {e.product_code && <p className="text-xs text-gray-400">{e.product_code}</p>}
                      </div>
                      {e.status === "لم يُجرَد" ? (
                        <Badge className="bg-gray-100 text-gray-500 text-xs">لم يُجرَد</Badge>
                      ) : isDiff ? (
                        <Badge className="bg-red-100 text-red-700 text-xs">فارق</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-xs">مطابق</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg py-1.5">
                        <p className="text-xs text-gray-400 mb-0.5">الرصيد</p>
                        <p className="text-sm font-bold text-gray-700 tabular-nums">{e.expected_quantity ?? "—"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg py-1.5">
                        <p className="text-xs text-gray-400 mb-0.5">الفعلي</p>
                        <p className={`text-sm font-bold tabular-nums ${e.status === "مكتمل" ? "text-gray-700" : "text-gray-300"}`}>
                          {e.status === "مكتمل" ? (e.actual_quantity ?? "—") : "—"}
                        </p>
                      </div>
                      <div className={`rounded-lg py-1.5 ${isDiff ? "bg-red-100" : "bg-gray-50"}`}>
                        <p className="text-xs text-gray-400 mb-0.5">الفرق</p>
                        <p className={`text-sm font-bold tabular-nums ${isDiff ? "text-red-600" : e.status === "مكتمل" ? "text-green-600" : "text-gray-300"}`}>
                          {e.status === "مكتمل" ? (e.difference > 0 ? `+${e.difference}` : e.difference ?? "—") : "—"}
                        </p>
                      </div>
                    </div>
                    {e.notes && (
                      <p className="text-xs text-gray-500 mt-2">📝 {e.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}