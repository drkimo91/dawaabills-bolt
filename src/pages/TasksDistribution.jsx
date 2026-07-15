import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/lib/useUserRole";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TemplatesManager from "@/components/tasks/TemplatesManager";
import InventoryItemsManager from "@/components/tasks/InventoryItemsManager";
import TaskAssignDialog from "@/components/tasks/TaskAssignDialog";
import TasksDashboard from "@/components/tasks/TasksDashboard";
import BranchTasksView from "@/components/tasks/BranchTasksView";
import { Button } from "@/components/ui/button";
import { Plus, CheckSquare, LayoutDashboard, Building2 } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export default function TasksDistribution() {
  const [assignOpen, setAssignOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [mainTab, setMainTab] = useState("dashboard");
  const [branchTab, setBranchTab] = useState("فرع زكريا");
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 200),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["task-templates"],
    queryFn: () => base44.entities.TaskTemplate.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleEdit = (task) => {
    setEditTask(task);
    setAssignOpen(true);
  };

  const handleDialogClose = () => {
    setAssignOpen(false);
    setEditTask(null);
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done" || t.status === "cancelled");

  return (
    <div dir="rtl" className="min-h-screen bg-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">توزيع المهام</h1>
              <p className="text-xs text-gray-400">إنشاء وتوزيع المهام على الموظفين</p>
            </div>
          </div>
          <Button onClick={() => setAssignOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            مهمة جديدة
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="bg-gray-800 border border-gray-700 mb-5 p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-300 gap-2">
              <LayoutDashboard className="w-4 h-4" />
              لوحة المتابعة
            </TabsTrigger>
            {BRANCHES.map((branch) => (
              <TabsTrigger key={branch} value={branch} className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-300 gap-1 text-xs">
                <Building2 className="w-3.5 h-3.5" />
                {branch}
              </TabsTrigger>
            ))}
            <TabsTrigger value="templates" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white text-gray-300 gap-1 text-xs">
              القوالب
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <TasksDashboard tasks={tasks} />
          </TabsContent>

          {/* Branch Tabs */}
          {BRANCHES.map((branch) => {
            const branchTasks = tasks.filter((t) => t.branch_name === branch);
            const visibleTasks = branchTasks.filter((t) => t.status === "pending" || t.status === "in_progress");

            return (
              <TabsContent key={branch} value={branch}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-white font-bold text-lg">{branch} — المهام الجارية</h2>
                  <span className="text-gray-400 text-sm">{visibleTasks.filter(t => t.status !== "done" && t.status !== "cancelled").length} مهمة نشطة</span>
                </div>
                <BranchTasksView
                  tasks={visibleTasks}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onStatusChange={(task, status) => updateMutation.mutate({ id: task.id, data: { status } })}
                  isAdmin={isAdmin}
                />
              </TabsContent>
            );
          })}

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="bg-gray-900 rounded-2xl p-4 space-y-6">
              <TemplatesManager />
              <hr className="border-gray-700" />
              <InventoryItemsManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <TaskAssignDialog
        open={assignOpen}
        onOpenChange={handleDialogClose}
        templates={templates}
        teamMembers={teamMembers}
        editTask={editTask}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          handleDialogClose();
        }}
      />
    </div>
  );
}