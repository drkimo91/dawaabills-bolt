import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { BRANCHES, LOCATION_REGIONS } from "@/lib/trip-utils";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_BRANCH = BRANCHES[0];

export default function SavedLocationsManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ branch: "", location_name: "", region: "", is_active: true });

  const { data: locations = [] } = useQuery({
  queryKey: ["saved-locations-all"],
  queryFn: () => base44.entities.SavedLocation.list(),
  });

  // إزالة المكررات حسب اسم الوجهة (الفروع متشابهة)
  const uniqueLocations = locations.filter(
  (loc, idx, self) => idx === self.findIndex((l) => l.location_name === loc.location_name)
  );

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.SavedLocation.update(editing.id, data);
      return base44.entities.SavedLocation.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations-all"] });
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      setDialogOpen(false);
      toast({ title: "تم الحفظ" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedLocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations-all"] });
      toast({ title: "تم الحذف" });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ branch: DEFAULT_BRANCH, location_name: "", region: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setForm({ branch: loc.branch, location_name: loc.location_name, region: loc.region || "", is_active: loc.is_active !== false });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-700">الوجهات المحفوظة</h2>
        <Button className="bg-teal-600 hover:bg-teal-700 gap-1" onClick={openAdd}>
          <Plus className="w-4 h-4" /> إضافة وجهة
        </Button>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        {uniqueLocations.map((loc, idx) => (
          <div key={loc.id} className={`flex items-center justify-between p-3 ${idx > 0 ? "border-t" : ""}`}>
            <div>
              <span className="font-medium text-sm">{loc.location_name}</span>
              {loc.region && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <MapPin className="w-3 h-3" /> {loc.region}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={loc.is_active !== false ? "default" : "secondary"}>
                {loc.is_active !== false ? "نشط" : "غير نشط"}
              </Badge>
              <Button size="icon" variant="ghost" onClick={() => openEdit(loc)}>
                <Pencil className="w-4 h-4 text-gray-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm(`حذف "${loc.location_name}"؟`)) deleteMutation.mutate(loc.id); }}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
        {uniqueLocations.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد وجهات محفوظة بعد</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{editing ? "تعديل وجهة" : "إضافة وجهة محفوظة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>اسم الوجهة</Label>
              <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="مثال: مخزن أدوية المدينة" />
            </div>
            <div className="space-y-1">
              <Label>المنطقة</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                <SelectContent>{LOCATION_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              نشط
            </label>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={saveMutation.isPending || !form.location_name} onClick={() => saveMutation.mutate(form)}>
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}