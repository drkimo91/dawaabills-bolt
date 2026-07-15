import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Tag, Settings2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function ExpenseTemplatesManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["expense-templates"],
    queryFn: () => base44.entities.ExpenseTemplate.list(),
  });

  const addMutation = useMutation({
    mutationFn: (name) => base44.entities.ExpenseTemplate.create({ name, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
      setNewName("");
      toast({ title: "تم إضافة البند" });
    },
    onError: () => toast({ title: "خطأ", description: "تعذر إضافة البند", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.ExpenseTemplate.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expense-templates"] }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.ExpenseTemplate.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
      setEditId(null);
      toast({ title: "تم تعديل البند" });
    },
    onError: () => toast({ title: "خطأ", description: "تعذر تعديل البند", variant: "destructive" }),
  });

  const startEdit = (t) => {
    setEditId(t.id);
    setEditName(t.name);
  };

  const confirmEdit = () => {
    const name = editName.trim();
    if (!name) return;
    if (templates.some((t) => t.id !== editId && t.name === name)) {
      toast({ title: "الاسم موجود بالفعل", variant: "destructive" });
      return;
    }
    renameMutation.mutate({ id: editId, name });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExpenseTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
      toast({ title: "تم حذف البند" });
    },
  });

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (templates.some((t) => t.name === name)) {
      toast({ title: "البند موجود بالفعل", variant: "destructive" });
      return;
    }
    addMutation.mutate(name);
  };

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">بنود المصروفات</h2>
          <p className="text-xs text-gray-500">إدارة قوالب بنود المصروفات المستخدمة في تسليم الشيفت</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="اسم البند الجديد (مثال: سلفة، صيانة...)"
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || addMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" /> إضافة
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-gray-400">لا توجد بنود مضافة</div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-violet-600" />
              </div>
              {editId === t.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmEdit()}
                  className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              ) : (
                <span className={`flex-1 text-sm font-medium ${t.is_active ? "text-gray-700" : "text-gray-400 line-through"}`}>{t.name}</span>
              )}
              {editId === t.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={confirmEdit} disabled={renameMutation.isPending} className="w-8 h-8 flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 shrink-0">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditId(null)} className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(t)} className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => toggleMutation.mutate({ id: t.id, is_active: !t.is_active })}
                className={`px-2 py-1 rounded-md text-xs font-medium ${t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
              >
                {t.is_active ? "نشط" : "موقوف"}
              </button>
              <button
                onClick={() => { if (window.confirm(`حذف البند "${t.name}"؟`)) deleteMutation.mutate(t.id); }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}