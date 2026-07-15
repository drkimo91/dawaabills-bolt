import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, User, Package, PlayCircle, ArrowRight, Loader2, Trash2 } from "lucide-react";
import DailyCountScreen from "./DailyCountScreen";
import { useUserRole } from "@/lib/useUserRole";

const TODAY = new Date().toISOString().split("T")[0];
const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function EmployeeScheduleView() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();
  const [activeTask, setActiveTask] = useState(null);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);
  const [activeBranch, setActiveBranch] = useState("فرع زكريا");

  const { data: allSchedules = [], isLoading } = useQuery({
    queryKey: ["weekly-schedule-all"],
    queryFn: () => base44.entities.WeeklySchedule.list(),
    staleTime: 30000,
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["inventory-tasks-all"],
    queryFn: () => base44.entities.InventoryCountTask.list("-task_date", 200),
    staleTime: 15000,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["inventory-products-all"],
    queryFn: () => base44.entities.InventoryProduct.list(null, 5000),
    staleTime: 60000,
  });

  const startMutation = useMutation({
    mutationFn: (taskId) =>
      base44.entities.InventoryCountTask.update(taskId, {
        status: "جاري",
        started_at: new Date().toISOString(),
      }),
    onSuccess: (updatedTask, taskId) => {
      qc.invalidateQueries(["inventory-tasks-all"]);
      const task = tasks.find(t => t.id === taskId);
      if (task) setActiveTask({ ...task, status: "جاري" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async ({ taskId, scheduledDate, empName, branchName }) => {
      // حذف المهمة والـ entries إن وُجدت
      if (taskId) {
        qc.setQueryData(["inventory-tasks-all"], (old) => (old || []).filter(t => t.id !== taskId));
        const entries = await base44.entities.InventoryCountEntry.filter({ task_id: taskId }, null, 1000);
        await Promise.all(entries.map(e => base44.entities.InventoryCountEntry.delete(e.id)));
        await base44.entities.InventoryCountTask.delete(taskId);
      }
      // حذف الموعد من الجدول الأسبوعي
      const schedule = allSchedules.find(s => s.branch === branchName);
      if (schedule) {
        const newAssignments = (schedule.assignments || []).filter(
          a => !(a.scheduled_date === scheduledDate && a.employee_name === empName)
        );
        await base44.entities.WeeklySchedule.update(schedule.id, { assignments: newAssignments });
      }
    },
    onSuccess: () => {
      setConfirmDeleteKey(null);
      qc.invalidateQueries({ queryKey: ["weekly-schedule-all"] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["inventory-tasks-all"] });
      qc.invalidateQueries({ queryKey: ["weekly-schedule-all"] });
    },
  });

  const handleStartOrGenerate = async (a, emp, schedule) => {
    const key = `${a.scheduled_date}|${a.branch}|${emp}`;
    const relatedTask = tasks.find(t => t.task_date === a.scheduled_date && t.branch === a.branch && t.assigned_employee === emp);

    if (relatedTask) {
      if (relatedTask.status === "مكتمل") return;
      if (relatedTask.status === "جاري") { setActiveTask(relatedTask); return; }
      startMutation.mutate(relatedTask.id);
      return;
    }

    setGeneratingKey(key);
    const branchProducts = allProducts.filter(p => p.branch === a.branch && p.is_active !== false);
    // استخدام عدد الأصناف الخاص بهذا الصف إن وُجد، وإلا الافتراضي للجدول
    const rowItemsCount = a.items_count ?? schedule?.items_per_day ?? 20;
    const selected = [...branchProducts].sort(() => Math.random() - 0.5).slice(0, rowItemsCount);

    if (selected.length === 0) {
      setGeneratingKey(null);
      alert("لا توجد أصناف مسجلة لهذا الفرع. يرجى رفع الأصناف أولاً من تبويب إدارة الأصناف.");
      return;
    }

    const task = await base44.entities.InventoryCountTask.create({
      task_date: a.scheduled_date,
      branch: a.branch,
      assigned_employee: emp,
      product_ids: selected.map(p => p.id),
      status: "جاري",
      started_at: new Date().toISOString(),
      items_count: selected.length,
      completed_count: 0,
      matched_count: 0,
      diff_count: 0,
    });

    const entries = selected.map(p => ({
      task_id: task.id,
      product_id: p.id,
      product_code: p.product_code || "",
      product_name: p.product_name,
      branch: p.branch,
      count_date: a.scheduled_date,
      expected_quantity: p.stock_quantity || 0,
      actual_quantity: null,
      difference: null,
      status: "لم يُجرد",
    }));

    const BATCH = 20;
    for (let i = 0; i < entries.length; i += BATCH) {
      await base44.entities.InventoryCountEntry.bulkCreate(entries.slice(i, i + BATCH));
      if (i + BATCH < entries.length) await new Promise(r => setTimeout(r, 300));
    }

    qc.invalidateQueries(["inventory-tasks-all"]);
    setGeneratingKey(null);
    setActiveTask(task);
  };

  // تابع حالة المهمة الحالية من القائمة المحدّثة
  const liveActiveTask = activeTask
    ? (tasks.find(t => t.id === activeTask.id) || activeTask)
    : null;

  if (liveActiveTask) {
    return (
      <div dir="rtl">
        <Button variant="ghost" size="sm" className="mb-4 gap-1 text-gray-500" onClick={() => { setActiveTask(null); qc.invalidateQueries(["inventory-tasks-all"]); }}>
          <ArrowRight className="w-4 h-4" /> العودة للمواعيد
        </Button>
        <DailyCountScreen task={liveActiveTask} onFinish={() => { qc.invalidateQueries(["inventory-tasks-all"]); setActiveTask(null); }} />
      </div>
    );
  }

  if (isLoading) return <div className="text-center text-gray-400 py-8">جاري التحميل...</div>;

  return (
    <div dir="rtl" className="space-y-4">
      <h3 className="font-bold text-gray-700 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-teal-600" />
        مواعيد الجرد القادمة
      </h3>

      <Tabs value={activeBranch} onValueChange={setActiveBranch}>
        <TabsList className="mb-4 gap-2 bg-transparent p-0 flex flex-wrap">
          {BRANCHES.map(b => (
            <TabsTrigger key={b} value={b}
              className="rounded-lg px-4 py-2 text-sm font-semibold border data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:border-teal-700 border-gray-300 text-gray-600 bg-white">
              {b}
            </TabsTrigger>
          ))}
        </TabsList>

        {BRANCHES.map(branchName => {
          const branchSchedule = allSchedules.find(s => s.branch === branchName);
          const branchAssignments = (branchSchedule?.assignments || [])
            .filter(a => a.scheduled_date)
            .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

          // Group by employee
          const byEmployee = {};
          branchAssignments.forEach(a => {
            if (!byEmployee[a.employee_name]) byEmployee[a.employee_name] = [];
            byEmployee[a.employee_name].push({ ...a, branch: branchName });
          });
          const employees = Object.keys(byEmployee).sort();

          return (
            <TabsContent key={branchName} value={branchName}>
              {employees.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>لا توجد مواعيد جرد مجدولة لهذا الفرع</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employees.map(emp => (
                    <div key={emp} className="bg-white border rounded-xl overflow-hidden">
                      <div className="bg-teal-50 border-b px-4 py-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-600" />
                        <span className="font-semibold text-teal-800">{emp}</span>
                        <Badge className="mr-auto bg-teal-100 text-teal-700 text-xs">{byEmployee[emp].length} موعد</Badge>
                      </div>
                      <div className="divide-y">
                        {byEmployee[emp].map((a, i) => {
                          const key = `${a.scheduled_date}|${a.branch}|${emp}`;
                          const relatedTask = tasks.find(t => t.task_date === a.scheduled_date && t.branch === a.branch && t.assigned_employee === emp);
                          const isCompleted = relatedTask?.status === "مكتمل";
                          const isRunning = relatedTask?.status === "جاري";
                          const isGenerating = generatingKey === key;
                          const isStarting = startMutation.isPending && startMutation.variables === relatedTask?.id;
                          const isConfirmingDelete = confirmDeleteKey === key;

                          return (
                            <div key={i} className="px-4 py-3 flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">{formatDate(a.scheduled_date)}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Package className="w-3 h-3" />{a.branch}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {isCompleted ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">مكتمل ✓</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className={`text-xs h-7 gap-1 ${isRunning ? "bg-blue-600 hover:bg-blue-700" : "bg-teal-600 hover:bg-teal-700"}`}
                                    onClick={() => handleStartOrGenerate(a, emp, branchSchedule)}
                                    disabled={isGenerating || isStarting}
                                  >
                                    {isGenerating || isStarting ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    )}
                                    {isGenerating ? "جاري التحضير..." : isRunning ? "متابعة الجرد" : "بدء الجرد"}
                                  </Button>
                                )}

                                {/* Delete button — admin only, always visible */}
                                {isAdmin && (
                                  isConfirmingDelete ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700"
                                        onClick={() => deleteTaskMutation.mutate({ taskId: relatedTask?.id, scheduledDate: a.scheduled_date, empName: emp, branchName })}
                                        disabled={deleteTaskMutation.isPending}>
                                        {deleteTaskMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "تأكيد"}
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => setConfirmDeleteKey(null)}>
                                        إلغاء
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="ghost"
                                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => setConfirmDeleteKey(key)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}