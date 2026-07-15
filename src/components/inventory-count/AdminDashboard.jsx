import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, Clock, User, TrendingUp, RefreshCw, XCircle, Trash2, Loader2, Eye } from "lucide-react";
import TaskEntriesDialog from "./TaskEntriesDialog";

const TODAY = new Date().toISOString().split("T")[0];
const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

const STATUS_BADGE = {
  "مجدول": "bg-yellow-100 text-yellow-800",
  "جاري": "bg-blue-100 text-blue-800",
  "مكتمل": "bg-green-100 text-green-800",
  "متأخر": "bg-red-100 text-red-800",
};

function BranchAdminView({ branch }) {
  const qc = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["inventory-tasks", branch],
    queryFn: () => base44.entities.InventoryCountTask.filter({ branch }),
    staleTime: 15000,
  });

  const markOverdueMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryCountTask.update(id, { status: "متأخر" }),
    onSuccess: () => qc.invalidateQueries(["inventory-tasks", branch]),
  });

  const closeSessionMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryCountTask.update(id, { status: "مجدول" }),
    onSuccess: () => qc.invalidateQueries(["inventory-tasks", branch]),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      const entries = await base44.entities.InventoryCountEntry.filter({ task_id: id }, null, 1000);
      await Promise.all(entries.map(e => base44.entities.InventoryCountEntry.delete(e.id)));
      await base44.entities.InventoryCountTask.delete(id);
    },
    onSuccess: () => {
      setConfirmDeleteId(null);
      qc.setQueryData(["inventory-tasks", branch], (old) => (old || []).filter(t => t.id !== deleteTaskMutation.variables));
      qc.invalidateQueries({ queryKey: ["inventory-tasks", branch] });
    },
  });

  React.useEffect(() => {
    tasks.forEach(t => {
      if (t.task_date < TODAY && t.status !== "مكتمل" && t.status !== "متأخر") {
        markOverdueMutation.mutate(t.id);
      }
    });
  }, [tasks]);

  const todayTask = tasks.find(t => t.task_date === TODAY);
  const completed = tasks.filter(t => t.status === "مكتمل");
  const overdue = tasks.filter(t => t.status === "متأخر");
  const inProgress = tasks.filter(t => t.status === "جاري");
  const recentTasks = [...tasks].sort((a, b) => b.task_date?.localeCompare(a.task_date)).slice(0, 15);

  return (
    <div className="space-y-5">
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>تنبيه: يوجد <strong>{overdue.length}</strong> مهمة متأخرة لم تُنجز في موعدها</span>
        </div>
      )}

      {/* Today's task */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" /> مهمة اليوم
          </h3>
          <span className="text-xs text-gray-400">{TODAY}</span>
        </div>
        {todayTask ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">الموظف:</span>
              <span className="font-semibold">{todayTask.assigned_employee || "—"}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={STATUS_BADGE[todayTask.status] || "bg-gray-100"}>{todayTask.status}</Badge>
              <span className="text-sm text-gray-500">{todayTask.items_count} صنف</span>
              {todayTask.status === "مكتمل" && (
                <>
                  <span className="text-sm text-green-600">✓ {todayTask.matched_count || 0} مطابق</span>
                  <span className="text-sm text-red-500">⚠ {todayTask.diff_count || 0} فارق</span>
                </>
              )}
              {todayTask.status === "جاري" && (
                <Button size="sm" variant="outline"
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                  onClick={(e) => { e.stopPropagation(); closeSessionMutation.mutate(todayTask.id); }}
                  disabled={closeSessionMutation.isPending}>
                  <XCircle className="w-3 h-3" /> إغلاق الجلسة
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">لا توجد مهمة لهذا اليوم</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700">{completed.length}</p>
          <p className="text-xs text-green-600">مكتملة</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <RefreshCw className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700">{inProgress.length}</p>
          <p className="text-xs text-blue-600">جارية</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
          <p className="text-xs text-red-500">متأخرة</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 text-teal-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-teal-700">
            {completed.length > 0
              ? Math.round(completed.reduce((s, t) => s + (t.accuracy_rate || 0), 0) / completed.length)
              : "--"}%
          </p>
          <p className="text-xs text-teal-600">متوسط الدقة</p>
        </div>
      </div>

      {/* Tasks table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm">آخر المهام</h3>
        </div>
        {isLoading ? (
          <div className="p-4 text-center text-gray-400 text-sm">جاري التحميل...</div>
        ) : recentTasks.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">لا توجد مهام بعد</div>
        ) : (
          <div className="divide-y">
            {recentTasks.map(t => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3 flex-wrap cursor-pointer hover:bg-gray-50" onClick={() => setSelectedTask(t)}>
                <span className="text-sm text-gray-500 w-24 shrink-0">{t.task_date}</span>
                <span className="text-sm font-medium text-gray-700 flex-1">{t.assigned_employee || "—"}</span>
                <Badge className={STATUS_BADGE[t.status] || "bg-gray-100 text-gray-600"}>{t.status}</Badge>
                {t.status === "مكتمل" && (
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600">✓ {t.matched_count || 0}</span>
                    <span className="text-red-500">⚠ {t.diff_count || 0}</span>
                  </div>
                )}
                {t.status === "جاري" && (
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                    onClick={(e) => { e.stopPropagation(); closeSessionMutation.mutate(t.id); }}
                    disabled={closeSessionMutation.isPending}>
                    <XCircle className="w-3 h-3" /> إغلاق الجلسة
                  </Button>
                )}
                {/* View entries button */}
                <Button size="sm" variant="ghost"
                  className="h-7 w-7 p-0 text-teal-500 hover:text-teal-700 hover:bg-teal-50"
                  onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                {/* Delete button — always visible */}
                {confirmDeleteId === t.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700"
                      onClick={(e) => { e.stopPropagation(); deleteTaskMutation.mutate(t.id); }}
                      disabled={deleteTaskMutation.isPending}>
                      {deleteTaskMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "تأكيد"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskEntriesDialog task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}

export default function AdminDashboard() {
  const [activeBranch, setActiveBranch] = useState("فرع زكريا");

  return (
    <div dir="rtl" className="space-y-4">
      <Tabs value={activeBranch} onValueChange={setActiveBranch}>
        <TabsList className="mb-4 gap-2 bg-transparent p-0 flex flex-wrap">
          {BRANCHES.map(b => (
            <TabsTrigger key={b} value={b}
              className="rounded-lg px-4 py-2 text-sm font-semibold border data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:border-gray-800 border-gray-300 text-gray-600 bg-white">
              {b}
            </TabsTrigger>
          ))}
        </TabsList>
        {BRANCHES.map(b => (
          <TabsContent key={b} value={b}>
            <BranchAdminView branch={b} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}