import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, BookTemplate, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/invoices/ConfirmDialog";

const PRIORITIES = [{ v: "high", l: "عالية" }, { v: "medium", l: "متوسطة" }, { v: "low", l: "منخفضة" }];
const CATEGORIES = [{ v: "weekly", l: "أسبوعي" }, { v: "monthly", l: "شهري" }, { v: "special", l: "خاص" }];

const EMPTY = { title: "", description: "", default_priority: "medium", default_category: "weekly" };

export default function TemplatesManager() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTpl, setEditTpl] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["task-templates"],
    queryFn: () => base44.entities.TaskTemplate.list(),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => {
    setEditTpl(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (tpl) => {
    setEditTpl(tpl);
    setForm({ title: tpl.title, description: tpl.description || "", default_priority: tpl.default_priority || "medium", default_category: tpl.default_category || "weekly" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    if (editTpl) {
      await base44.entities.TaskTemplate.update(editTpl.id, form);
    } else {
      await base44.entities.TaskTemplate.create(form);
    }
    qc.invalidateQueries({ queryKey: ["task-templates"] });
    setSaving(false);
    setDialogOpen(false);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskTemplate.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-templates"] }),
  });

  const PRIORITY_LABEL = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
  const CATEGORY_LABEL = { weekly: "أسبوعي", monthly: "شهري", special: "خاص" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookTemplate className="w-5 h-5 text-indigo-400" />
          <span className="text-white font-semibold">قوالب المهام</span>
          <span className="text-gray-400 text-sm">({templates.length})</span>
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-8 text-sm">
          <Plus className="w-4 h-4" /> قالب جديد
        </Button>
      </div>

      <p className="text-gray-400 text-xs">
        أي تعديل في اسم أو وصف القالب سينعكس تلقائياً عند إنشاء مهام جديدة منه.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-gray-800/40 rounded-xl">
          <div className="text-4xl mb-2">📋</div>
          <p>لا توجد قوالب بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-white font-semibold text-sm leading-tight">{tpl.title}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(tpl)} className="text-gray-400 hover:text-yellow-400 transition-colors p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmId(tpl.id)} className="text-gray-400 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {tpl.description && <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{tpl.description}</p>}
              <div className="flex gap-2 mt-auto pt-1 flex-wrap">
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                  {CATEGORY_LABEL[tpl.default_category] || tpl.default_category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded border ${
                  tpl.default_priority === "high" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                  tpl.default_priority === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                  "bg-gray-500/20 text-gray-400 border-gray-500/30"
                }`}>
                  {PRIORITY_LABEL[tpl.default_priority] || tpl.default_priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-indigo-700">{editTpl ? "تعديل القالب" : "قالب جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">اسم المهمة *</label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="مثل: تنظيف المخزن" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">الوصف</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={3}
                placeholder="تفاصيل وتعليمات المهمة..."
                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">التصنيف</label>
                <Select value={form.default_category} onValueChange={v => set("default_category", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">الأولوية</label>
                <Select value={form.default_priority} onValueChange={v => set("default_priority", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button disabled={saving || !form.title} onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editTpl ? "حفظ التعديلات" : "إضافة القالب")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={v => !v && setConfirmId(null)}
        title="حذف القالب"
        description="هل أنت متأكد من حذف هذا القالب؟ لن تُحذف المهام المنشأة منه."
        onConfirm={() => { deleteMutation.mutate(confirmId); setConfirmId(null); }}
        confirmLabel="حذف"
      />
    </div>
  );
}