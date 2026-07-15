import { useState } from "react";
import { Pencil, Trash2, CheckCircle2, Calendar, User, RotateCcw, Star, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/invoices/ConfirmDialog";
import TaskRatingDialog from "@/components/tasks/TaskRatingDialog";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// المهام التي تظهر فيها زر جدول الأصناف (يجب أن يطابق اسم المجموعة في InventoryItemsManager)
const INVENTORY_TASK_TITLES = [
  "جرد الألبان",
  "جرد الأصناف التي تقص",
  "جرد الأدوية الخاصة بالرجال",
];

const PRIORITY_MAP = {
  high: { label: "عالية", className: "bg-red-500/20 text-red-400 border border-red-500/30" },
  medium: { label: "متوسطة", className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  low: { label: "منخفضة", className: "bg-gray-500/20 text-gray-400 border border-gray-500/30" },
};

const CATEGORY_MAP = {
  weekly: "أسبوعية",
  monthly: "شهرية",
  special: "خاصة",
};

const STATUS_STYLES = {
  done: "border-green-500/40",
  in_progress: "border-blue-500/40",
  pending: "border-gray-600",
  cancelled: "border-gray-700 opacity-60",
};

export default function BranchTasksView({ tasks, onEdit, onDelete, onStatusChange, isAdmin }) {
  const [confirmId, setConfirmId] = useState(null);
  const [ratingTask, setRatingTask] = useState(null);
  const [inventoryTask, setInventoryTask] = useState(null); // المهمة التي نعرض أصنافها

  const { data: allProducts = [] } = useQuery({
    queryKey: ["inventory-products-for-tasks"],
    queryFn: () => base44.entities.InventoryProduct.list(),
    staleTime: 60000,
  });

  const isInventoryTask = (task) =>
    INVENTORY_TASK_TITLES.some(t => task.title?.trim() === t);

  // فلترة الأصناف: category = عنوان المهمة + نفس الفرع
  const getProductsForTask = (task) => {
    return allProducts.filter(p =>
      p.category === task.title?.trim() &&
      p.branch === task.branch_name &&
      p.is_active !== false
    );
  };

  const activeTasks = tasks.filter((t) => t.status !== "cancelled");

  if (!activeTasks.length) {
    return (
      <div className="text-center py-16 text-gray-500 bg-gray-800/40 rounded-xl">
        <div className="text-4xl mb-2">📋</div>
        <p>لا توجد مهام قيد التنفيذ</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTasks.map((task) => {
          const now = new Date();
          const dueDate = task.due_date ? new Date(task.due_date) : null;
          const daysPastDue = dueDate ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
          const isOverdue = dueDate && daysPastDue >= 3 && task.status !== "done";
          return (
            <div
              key={task.id}
              className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors duration-300 ${
                task.status === "done"
                  ? "bg-white border-gray-200"
                  : isOverdue
                  ? "bg-gray-800 border-red-500/60"
                  : `bg-gray-800 ${STATUS_STYLES[task.status] || "border-gray-600"}`
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => onStatusChange(task, task.status === "in_progress" ? "pending" : "in_progress")}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                      task.status === "in_progress"
                        ? "border-blue-400 bg-blue-400/20"
                        : "border-gray-500 hover:border-gray-300"
                    }`}
                  />
                  <span className={`font-bold text-sm leading-tight ${task.status === "done" ? "text-gray-700 line-through" : "text-white"}`}>{task.title}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(task)} className="text-gray-400 hover:text-yellow-400 transition-colors p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmId(task.id)} className="text-gray-400 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Description */}
              {task.notes && (
                <p className={`text-xs leading-relaxed line-clamp-2 ${task.status === "done" ? "text-gray-500" : "text-gray-400"}`}>{task.notes}</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs px-2 py-0.5 rounded font-medium">
                  معلقة
                </span>
                {task.category && (
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-0.5 rounded font-medium">
                    {CATEGORY_MAP[task.category] || task.category}
                  </span>
                )}
                {task.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_MAP[task.priority]?.className}`}>
                    {PRIORITY_MAP[task.priority]?.label}
                  </span>
                )}
              </div>

              {/* Meta */}
              <div className="space-y-1.5">
                {task.assigned_to_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className={`text-sm font-semibold ${task.status === "done" ? "text-gray-500" : "text-cyan-300"}`}>{task.assigned_to_name}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? "text-red-400 font-bold" : "text-amber-400 font-medium"}`}>
                    <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${isOverdue ? "text-red-500" : "text-amber-400"}`} />
                    <span>استحقاق: {task.due_date}</span>
                    {isOverdue && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                        متأخرة!
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Inventory Products Button */}
              {isInventoryTask(task) && (
                <button
                  onClick={() => setInventoryTask(task)}
                  className="w-full py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 text-xs font-medium flex items-center justify-center gap-2 hover:bg-cyan-500/10 transition-colors"
                >
                  <List className="w-3.5 h-3.5" />
                  عرض جدول الأصناف
                </button>
              )}

              {/* Action Button */}
              {task.status === "done" ? (
                <div className="flex flex-col gap-2 mt-auto">
                  {/* Points badge */}
                  {task.completion_score > 0 && (
                    <div className="flex items-center justify-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg py-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-yellow-700 text-xs font-bold">{task.completion_score} نقطة</span>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {isAdmin && (
                      <button
                        onClick={() => setRatingTask(task)}
                        className="flex-1 py-1.5 rounded-lg border border-yellow-400/60 text-yellow-600 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-yellow-50 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" />
                        تقييم
                      </button>
                    )}
                    <button
                      onClick={() => onStatusChange(task, "pending")}
                      className="flex-1 py-1.5 rounded-lg border border-gray-300 text-gray-500 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      إعادة تفعيل
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onStatusChange(task, "done")}
                  className="w-full mt-auto py-2 rounded-lg border border-green-500/40 text-green-400 text-xs font-medium flex items-center justify-center gap-2 hover:bg-green-500/10 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  تم الإنجاز
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        title="تأكيد الحذف"
        description="هل أنت متأكد من حذف هذه المهمة؟"
        onConfirm={() => { onDelete(confirmId); setConfirmId(null); }}
        confirmLabel="حذف"
      />

      {ratingTask && (
        <TaskRatingDialog
          open={!!ratingTask}
          onOpenChange={(v) => !v && setRatingTask(null)}
          task={ratingTask}
          onSaved={() => { setRatingTask(null); onStatusChange(ratingTask, ratingTask.status); }}
        />
      )}

      {/* Inventory Products Dialog */}
      <Dialog open={!!inventoryTask} onOpenChange={(v) => !v && setInventoryTask(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base">أصناف المهمة: {inventoryTask?.title} — {inventoryTask?.branch_name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {(() => {
              if (!inventoryTask) return null;
              const products = getProductsForTask(inventoryTask);
              if (products.length === 0) {
                return <p className="text-center py-8 text-gray-400">لا توجد أصناف مسجلة لهذا الفرع</p>;
              }
              return (
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="px-3 py-2 text-right">#</th>
                      <th className="px-3 py-2 text-right">كود الصنف</th>
                      <th className="px-3 py-2 text-right">اسم الصنف</th>
                      <th className="px-3 py-2 text-right">التصنيف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.product_code || "—"}</td>
                        <td className="px-3 py-2 font-medium">{p.product_name}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{p.category || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}