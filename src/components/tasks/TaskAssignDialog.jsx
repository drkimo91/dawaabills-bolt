import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];
const PRIORITIES = [{ v: "high", l: "عالية" }, { v: "medium", l: "متوسطة" }, { v: "low", l: "منخفضة" }];
const CATEGORIES = [{ v: "weekly", l: "أسبوعي" }, { v: "monthly", l: "شهري" }, { v: "special", l: "خاص" }];

const EMPTY = {
  title: "", description: "", notes: "", template_key: "",
  branch_name: "", assigned_to_name: "", due_date: "",
  priority: "medium", category: "weekly", status: "pending",
};

export default function TaskAssignDialog({ open, onOpenChange, templates, teamMembers, editTask, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");

  useEffect(() => {
    if (editTask) {
      setForm({ ...EMPTY, ...editTask });
      setSelectedBranch(editTask.branch_name || "");
    } else {
      setForm(EMPTY);
      setSelectedBranch("");
    }
  }, [editTask, open]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleTemplateSelect = (templateId) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      set("title", tpl.title);
      set("description", tpl.description || "");
      set("priority", tpl.default_priority || "medium");
      set("category", tpl.default_category || "weekly");
      set("template_key", tpl.id);
    }
  };

  const { data: riders = [] } = useQuery({
    queryKey: ["riders-for-filter"],
    queryFn: () => base44.entities.Rider.list(),
    staleTime: 60000,
  });
  const riderNames = new Set(riders.map((r) => r.name));

  const filteredMembers = (selectedBranch
    ? teamMembers.filter((m) => !m.branches || m.branches.includes(selectedBranch))
    : teamMembers
  ).filter((m) => !riderNames.has(m.name));

  const handleSave = async () => {
    if (!form.title || !form.branch_name) return;
    setSaving(true);
    const data = { ...form };
    if (editTask) {
      await base44.entities.Task.update(editTask.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    setSaving(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-indigo-700">{editTask ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          {!editTask && templates.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">اختر من القوالب (اختياري)</label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="اختر قالباً لملء البيانات تلقائياً" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">عنوان المهمة *</label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="عنوان المهمة" className="h-9 text-sm" />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="تفاصيل إضافية..."
              className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Branch */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">الفرع *</label>
              <Select value={form.branch_name} onValueChange={(v) => { set("branch_name", v); setSelectedBranch(v); set("assigned_to_name", ""); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Assigned to */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">الموظف</label>
              <Select value={form.assigned_to_name} onValueChange={(v) => set("assigned_to_name", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                <SelectContent>
                  {filteredMembers.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">الأولوية</label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">التصنيف</label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-gray-600">تاريخ الاستحقاق</label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Completion notes (edit mode) */}
          {editTask && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">ملاحظات الإنجاز</label>
              <textarea
                value={form.completion_notes}
                onChange={(e) => set("completion_notes", e.target.value)}
                rows={2}
                placeholder="ملاحظات عند إتمام المهمة..."
                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.branch_name}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editTask ? "حفظ التعديلات" : "إنشاء المهمة")}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}