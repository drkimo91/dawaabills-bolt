import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PackageSearch, User, ChevronDown } from "lucide-react";

function CountItem({ task }) {
  return (
    <div className="p-2 rounded-lg border border-cyan-200 bg-cyan-50">
      <p className="text-sm font-medium text-gray-800">{task.task_date}</p>
      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
        {task.assigned_employee && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_employee}</span>}
        <span className="flex items-center gap-1"><PackageSearch className="w-3 h-3" />{task.items_count || 0} صنف</span>
      </div>
      {task.completed_count > 0 && (
        <p className="text-xs text-cyan-600 mt-0.5">تم جرد {task.completed_count} من {task.items_count}</p>
      )}
    </div>
  );
}

export default function CountsSection({ branch, countTasks }) {
  const bCounts = countTasks.filter(c => c.branch === branch);
  const done = bCounts.filter(c => c.status === "مكتمل");
  const remaining = bCounts.filter(c => c.status !== "مكتمل");
  const total = bCounts.length;
  const donePct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4 border-2 border-cyan-200 bg-cyan-50/30">
      <div className="flex items-center gap-2 mb-3">
        <PackageSearch className="w-5 h-5 text-cyan-600" />
        <h2 className="font-bold text-gray-800">الجرد الدوري</h2>
        <span className="text-xs text-gray-400 mr-auto">إجمالي {total} مهمة</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <span className="text-sm text-green-700 font-medium">جرد مكتمل</span>
          <span className="text-sm font-bold text-green-700">{done.length} / {total} ({donePct}%)</span>
        </div>
        <div>
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 transition-colors text-cyan-700"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <PackageSearch className="w-4 h-4" /> جرد غير مكتمل ({remaining.length})
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="space-y-1.5 mt-2 max-h-80 overflow-y-auto">
              {remaining.length === 0
                ? <p className="text-xs text-gray-400 text-center py-3">لا يوجد جرد غير مكتمل</p>
                : remaining.map(t => <CountItem key={t.id} task={t} />)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}