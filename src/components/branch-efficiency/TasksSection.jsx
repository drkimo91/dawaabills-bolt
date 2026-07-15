import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckSquare, User, Calendar, ChevronDown } from "lucide-react";

function TaskItem({ task }) {
  return (
    <div className="p-2 rounded-lg border border-amber-200 bg-amber-50">
      <p className="text-sm font-medium text-gray-800 line-clamp-1">{task.title}</p>
      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
        {task.assigned_to_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_to_name}</span>}
        {task.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{task.due_date}</span>}
      </div>
      <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{task.status}</span>
    </div>
  );
}

export default function TasksSection({ branch, tasks }) {
  const bTasks = tasks.filter(t => t.branch_name === branch);
  const done = bTasks.filter(t => t.status === "done");
  const notDone = bTasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const total = bTasks.length;
  const donePct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4 border-2 border-indigo-200 bg-indigo-50/30">
      <div className="flex items-center gap-2 mb-3">
        <CheckSquare className="w-5 h-5 text-indigo-600" />
        <h2 className="font-bold text-gray-800">المهام</h2>
        <span className="text-xs text-gray-400 mr-auto">إجمالي {total} مهمة</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <span className="text-sm text-green-700 font-medium">مهام منفذة</span>
          <span className="text-sm font-bold text-green-700">{done.length} / {total} ({donePct}%)</span>
        </div>
        <div>
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-amber-700"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <CheckSquare className="w-4 h-4" /> مهام غير منفذة ({notDone.length})
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="space-y-1.5 mt-2 max-h-80 overflow-y-auto">
              {notDone.length === 0
                ? <p className="text-xs text-gray-400 text-center py-3">لا توجد مهام غير منفذة</p>
                : notDone.map(t => <TaskItem key={t.id} task={t} />)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}