import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Loader2, Package } from "lucide-react";
import ConfirmDialog from "@/components/invoices/ConfirmDialog";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

// المجموعات المرتبطة بمهام الجرد
const GROUPS = [
  { key: "جرد الألبان", label: "جرد الألبان" },
  { key: "جرد الأصناف التي تقص", label: "جرد الأصناف التي تقص" },
  { key: "جرد الأدوية الخاصة بالرجال", label: "جرد الأدوية الخاصة بالرجال" },
];

const EMPTY_FORM = { product_code: "", product_name: "", category: "", branch: "فرع زكريا" };

export default function InventoryItemsManager() {
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(GROUPS[0].key);
  const [selectedBranch, setSelectedBranch] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["inventory-products-for-tasks"],
    queryFn: () => base44.entities.InventoryProduct.list(),
    staleTime: 30000,
  });

  // فلترة الأصناف بحسب المجموعة (category = اسم مجموعة الجرد) والفرع
  const filtered = allProducts.filter(p => {
    const groupMatch = p.category === selectedGroup;
    const branchMatch = selectedBranch === "الكل" || p.branch === selectedBranch;
    return groupMatch && branchMatch;
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, category: selectedGroup, branch: selectedBranch === "الكل" ? "فرع زكريا" : selectedBranch });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ product_code: item.product_code || "", product_name: item.product_name, category: item.category, branch: item.branch });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_name || !form.branch) return;
    setSaving(true);
    const data = {
      product_code: form.product_code,
      product_name: form.product_name,
      category: form.category || selectedGroup,
      branch: form.branch,
      is_active: true,
    };
    if (editItem) {
      await base44.entities.InventoryProduct.update(editItem.id, data);
    } else {
      await base44.entities.InventoryProduct.create(data);
    }
    qc.invalidateQueries({ queryKey: ["inventory-products-for-tasks"] });
    setSaving(false);
    setDialogOpen(false);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryProduct.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-products-for-tasks"] }),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-semibold">أصناف الجرد</span>
          <span className="text-gray-400 text-sm">({filtered.length} صنف)</span>
        </div>
        <Button onClick={openAdd} className="bg-cyan-700 hover:bg-cyan-800 gap-2 h-8 text-sm">
          <Plus className="w-4 h-4" /> إضافة صنف
        </Button>
      </div>

      <p className="text-gray-400 text-xs">
        الأصناف المضافة هنا ستظهر في زر "عرض جدول الأصناف" داخل مهام الجرد في الفروع.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Group tabs */}
        <div className="flex gap-1 flex-wrap">
          {GROUPS.map(g => (
            <button
              key={g.key}
              onClick={() => setSelectedGroup(g.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                selectedGroup === g.key
                  ? "bg-cyan-600 border-cyan-500 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {/* Branch filter */}
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="h-8 text-xs w-36 bg-gray-800 border-gray-600 text-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="الكل">كل الفروع</SelectItem>
            {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-800/40 rounded-xl">
          <div className="text-4xl mb-2">📦</div>
          <p>لا توجد أصناف في هذه المجموعة</p>
          <p className="text-xs mt-1 text-gray-600">اضغط "إضافة صنف" لإدراج أصناف الجرد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-700/60 text-gray-300">
              <tr>
                <th className="px-3 py-2 text-right font-medium">#</th>
                <th className="px-3 py-2 text-right font-medium">الكود</th>
                <th className="px-3 py-2 text-right font-medium">اسم الصنف</th>
                <th className="px-3 py-2 text-right font-medium">الفرع</th>
                <th className="px-3 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs text-cyan-300">{item.product_code || "—"}</td>
                  <td className="px-3 py-2 text-white font-medium">{item.product_name}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{item.branch}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-yellow-400 transition-colors p-1">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmId(item.id)} className="text-gray-400 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل الصنف" : "إضافة صنف جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">المجموعة</label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{GROUPS.map(g => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">الفرع</label>
              <Select value={form.branch} onValueChange={v => set("branch", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">كود الصنف</label>
              <Input value={form.product_code} onChange={e => set("product_code", e.target.value)} placeholder="مثل: 1001" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">اسم الصنف *</label>
              <Input value={form.product_name} onChange={e => set("product_name", e.target.value)} placeholder="اسم الصنف" className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button disabled={saving || !form.product_name} onClick={handleSave} className="bg-cyan-700 hover:bg-cyan-800">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editItem ? "حفظ التعديلات" : "إضافة")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={v => !v && setConfirmId(null)}
        title="حذف الصنف"
        description="هل أنت متأكد من حذف هذا الصنف من قائمة الجرد؟"
        onConfirm={() => { deleteMutation.mutate(confirmId); setConfirmId(null); }}
        confirmLabel="حذف"
      />
    </div>
  );
}