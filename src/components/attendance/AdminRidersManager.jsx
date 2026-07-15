import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import RiderFormDialog from "./RiderFormDialog";
import CreateRiderAccountDialog from "@/components/delivery/CreateRiderAccountDialog";
import { BRANCHES, branchColor } from "@/lib/attendance-utils";
import { useToast } from "@/components/ui/use-toast";

export default function AdminRidersManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [accountDialogRider, setAccountDialogRider] = useState(null);

  const { data: riders = [] } = useQuery({
    queryKey: ["riders"],
    queryFn: () => base44.entities.Rider.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.Rider.update(editing.id, data);
      return base44.entities.Rider.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "تم الحفظ بنجاح" });
    },
    onError: () => toast({ title: "خطأ", description: "تعذر الحفظ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Rider.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      toast({ title: "تم حذف المندوب" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-700">إدارة المناديب</h2>
        <Button className="bg-teal-600 hover:bg-teal-700 gap-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> إضافة مندوب
        </Button>
      </div>
      <div className="space-y-4">
        {BRANCHES.map((branch) => {
          const branchRiders = riders.filter((r) => r.branch === branch);
          if (branchRiders.length === 0) return null;
          const c = branchColor[branch];
          return (
            <div key={branch}>
              <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mb-2 ${c.badge}`}>{branch}</div>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-right p-3 font-medium">الاسم</th>
                      <th className="text-right p-3 font-medium">اسم المستخدم</th>
                      <th className="text-right p-3 font-medium">الحالة</th>
                      <th className="text-right p-3 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchRiders.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3">
                          {r.username
                            ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.username}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          <Badge variant={r.is_active !== false ? "default" : "secondary"}>
                            {r.is_active !== false ? "نشط" : "غير نشط"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title="تعديل" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                              <Pencil className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button size="icon" variant="ghost" title="إنشاء حساب" onClick={() => setAccountDialogRider(r)}>
                              <UserPlus className="w-4 h-4 text-teal-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => { if (confirm(`حذف المندوب ${r.name}؟`)) deleteMutation.mutate(r.id); }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {riders.length === 0 && <p className="text-center text-gray-400 py-8">لا يوجد مناديب مسجلين بعد</p>}
      </div>
      <RiderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rider={editing}
        onSave={saveMutation.mutate}
        isLoading={saveMutation.isPending}
      />
      <CreateRiderAccountDialog
        open={!!accountDialogRider}
        onOpenChange={(v) => { if (!v) setAccountDialogRider(null); }}
        rider={accountDialogRider}
        onAccountCreated={() => queryClient.invalidateQueries({ queryKey: ["riders"] })}
      />
    </div>
  );
}