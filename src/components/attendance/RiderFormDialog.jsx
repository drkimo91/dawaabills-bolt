import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BRANCHES } from "@/lib/attendance-utils";

export default function RiderFormDialog({ open, onOpenChange, rider, onSave, isLoading }) {
  const [form, setForm] = useState({ name: "", branch: "", phone: "", is_active: true, user_id: "", username: "" });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  useEffect(() => {
    if (rider) {
      setForm({
        name: rider.name || "",
        branch: rider.branch || "",
        phone: rider.phone || "",
        is_active: rider.is_active !== false,
        user_id: rider.user_id || "",
        username: rider.username || "",
      });
    } else {
      setForm({ name: "", branch: "", phone: "", is_active: true, user_id: "", username: "" });
    }
  }, [rider, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{rider ? "تعديل مندوب" : "إضافة مندوب جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>اسم المندوب</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="أدخل اسم المندوب" />
          </div>
          <div className="space-y-1">
            <Label>الفرع</Label>
            <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
              <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>رقم الهاتف</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="أدخل رقم الهاتف" />
          </div>
          <div className="space-y-1">
            <Label>اسم المستخدم (للدخول)</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="مثال: ahmed_zakaria" dir="ltr" />
            {form.username && <p className="text-xs text-gray-400">البريد الداخلي: <span className="font-mono text-teal-600">{form.username}@dawaa-internal.app</span></p>}
          </div>
          <div className="space-y-1">
            <Label>الحساب المرتبط</Label>
            <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
              <SelectTrigger><SelectValue placeholder="اختر حساب المستخدم" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>مندوب نشط</Label>
          </div>
        </div>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            disabled={isLoading || !form.name || !form.branch || !form.user_id}
            onClick={() => onSave(form)}
          >
            {isLoading ? "جاري الحفظ..." : "حفظ"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}