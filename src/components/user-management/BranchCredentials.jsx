import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

const emptyForm = () => ({ branch: "", username: "", password: "", notes: "" });

export default function BranchCredentials() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [showPass, setShowPass] = useState({});
  const [deleteId, setDeleteId] = useState(null);

  const { data: creds = [], isLoading } = useQuery({
    queryKey: ["branch-credentials"],
    queryFn: () => base44.entities.BranchCredential.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.BranchCredential.update(editing.id, data)
      : base44.entities.BranchCredential.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-credentials"] });
      toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
      setDialog(false);
      setEditing(null);
      setForm(emptyForm());
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BranchCredential.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-credentials"] });
      toast({ title: "تم الحذف" });
      setDeleteId(null);
    }
  });

  const openEdit = (c) => {
    setEditing(c);
    setForm({ branch: c.branch, username: c.username, password: c.password, notes: c.notes || "" });
    setDialog(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialog(true);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const branchColors = {
    "فرع زكريا": "bg-blue-100 text-blue-700",
    "فرع بسيسة": "bg-purple-100 text-purple-700",
    "فرع المنشية": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-gray-800">حسابات الفروع</h2>
          <span className="text-xs text-gray-400">(اسم مستخدم وكلمة سر لكل فرع)</span>
        </div>
        <Button onClick={openAdd} size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5">
          <Plus className="w-4 h-4" /> إضافة حساب فرع
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
      ) : creds.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>لا توجد حسابات فروع مسجلة</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {creds.map((c) => (
            <Card key={c.id} className="p-4 border-r-4 border-r-teal-400">
              <div className="flex items-center justify-between mb-3">
                <Badge className={`${branchColors[c.branch] || "bg-gray-100 text-gray-700"} border-0 text-xs font-semibold`}>
                  <Building2 className="w-3 h-3 mr-1" />{c.branch}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-50" onClick={() => openEdit(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500">اسم المستخدم</span>
                  <span className="text-sm font-mono font-bold text-gray-800">{c.username}</span>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500">كلمة السر</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-gray-800">
                      {showPass[c.id] ? c.password : "••••••••"}
                    </span>
                    <button onClick={() => setShowPass(p => ({ ...p, [c.id]: !p[c.id] }))} className="text-gray-400 hover:text-teal-600">
                      {showPass[c.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {c.notes && <p className="text-xs text-gray-400 px-1">{c.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل حساب الفرع" : "إضافة حساب فرع جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">الفرع *</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.branch}
                onChange={e => set("branch", e.target.value)}
              >
                <option value="">اختر الفرع</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">اسم المستخدم *</label>
              <Input value={form.username} onChange={e => set("username", e.target.value)} placeholder="مثال: zakaria_branch" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">كلمة السر *</label>
              <Input value={form.password} onChange={e => set("password", e.target.value)} placeholder="كلمة السر" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">ملاحظات</label>
              <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="اختياري..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button
              disabled={!form.branch || !form.username || !form.password || saveMutation.isPending}
              onClick={() => saveMutation.mutate(form)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saveMutation.isPending ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">هل أنت متأكد من حذف هذا الحساب؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteId)}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}