import { Loader2, Pencil, Trash2, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import ConfirmDialog from "@/components/invoices/ConfirmDialog";

const PRIORITY_MAP = {
  high: { label: "عالية", className: "bg-red-100 text-red-700" },
  medium: { label: "متوسطة", className: "bg-yellow-100 text-yellow-700" },
  low: { label: "منخفضة", className: "bg-gray-100 text-gray-600" },
};

const CATEGORY_MAP = {
  weekly: "أسبوعي",
  daily: "يومي",
  special: "خاص",
  monthly: "شهري",
};

const BRANCH_COLORS = {
  "فرع زكريا": "bg-blue-50 text-blue-700 border-blue-200",
  "فرع بسيسة": "bg-purple-50 text-purple-700 border-purple-200",
  "فرع المنشية": "bg-green-50 text-green-700 border-green-200",
};

export default function TasksList({ tasks, isLoading, onEdit, onDelete, onStatusChange, isDoneTab }) {
  const [confirmId, setConfirmId] = useState(null);

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (!tasks.length) return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-2">{isDoneTab ? "✅" : "📋"}</div>
      <p>{isDoneTab ? "لا توجد مهام مكتملة" : "لا توجد مهام قيد التنفيذ"}</p>
    </div>
  );

  // Group by branch
  const byBranch = tasks.reduce((acc, t) => {
    const b = t.branch_name || "غير محدد";
    if (!acc[b]) acc[b] = [];
    acc[b].push(t);
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-6">
        {Object.entries(byBranch).map(([branch, branchTasks]) => (
          <div key={branch}>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold border mb-3 ${BRANCH_COLORS[branch] || "bg-gray-100 text-gray-700"}`}>
              📍 {branch}
              <span className="text-xs font-normal opacity-70">({branchTasks.length} مهام)</span>
            </div>
            <div className="grid gap-3">
              {branchTasks.map((task) => (
                <div key={task.id} className={`bg-white rounded-xl border p-4 flex gap-4 items-start ${task.status === "done" ? "opacity-70" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{task.title}</span>
                      <Badge className={`text-xs ${PRIORITY_MAP[task.priority]?.className || "bg-gray-100"}`}>
                        {PRIORITY_MAP[task.priority]?.label || task.priority}
                      </Badge>
                      {task.category && (
                        <Badge variant="outline" className="text-xs">{CATEGORY_MAP[task.category] || task.category}</Badge>
                      )}
                    </div>
                    {task.notes && <p className="text-xs text-gray-500 mb-2">{task.notes}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {task.assigned_to_name && <span>👤 {task.assigned_to_name}</span>}
                      {task.due_date && <span>📅 {task.due_date}</span>}
                      <span className={`font-medium ${task.status === "done" ? "text-green-600" : task.status === "in_progress" ? "text-blue-600" : "text-orange-500"}`}>
                        {task.status === "done" ? "✅ مكتملة" : task.status === "in_progress" ? "🔄 جاري" : "⏳ معلقة"}
                      </span>
                    </div>
                    {task.completion_notes && (
                      <p className="text-xs text-green-700 mt-1 bg-green-50 rounded px-2 py-1">{task.completion_notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!isDoneTab && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-green-500 hover:text-green-700"
                        title="تحديد كمكتملة"
                        onClick={() => onStatusChange(task, "done")}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isDoneTab && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-orange-500 hover:text-orange-700"
                        title="إعادة تفعيل"
                        onClick={() => onStatusChange(task, "pending")}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-gray-400 hover:text-gray-600"
                      onClick={() => onEdit(task)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => setConfirmId(task.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        title="تأكيد الحذف"
        description="هل أنت متأكد من حذف هذه المهمة؟"
        onConfirm={() => { onDelete(confirmId); setConfirmId(null); }}
        confirmLabel="حذف"
      />
    </>
  );
}