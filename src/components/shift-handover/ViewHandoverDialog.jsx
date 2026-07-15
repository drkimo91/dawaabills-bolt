import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Clock, User, Calendar, Wallet, TrendingDown, TrendingUp, FileText, CalendarClock } from "lucide-react";

const BRANCH_COLORS = {
  "فرع زكريا": "bg-purple-100 text-purple-700 border-purple-200",
  "فرع بسيسة": "bg-teal-100 text-teal-700 border-teal-200",
  "فرع المنشية": "bg-amber-100 text-amber-700 border-amber-200",
};

const SHIFT_COLORS = {
  "صباحي": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "مسائي": "bg-orange-100 text-orange-700 border-orange-200",
  "نايت": "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function ViewHandoverDialog({ open, onOpenChange, record }) {
  const { isAdmin, isManager } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingPosting, setEditingPosting] = useState(false);
  const [tempPostingDate, setTempPostingDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updatePostingMutation = useMutation({
    mutationFn: ({ id, posting_date }) => base44.entities.ShiftHandover.update(id, { posting_date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-handovers"] });
      toast({ title: "تم تحديث تاريخ الاحتساب" });
      setConfirmOpen(false);
      setEditingPosting(false);
    },
    onError: () => toast({ title: "خطأ", description: "تعذر تحديث تاريخ الاحتساب", variant: "destructive" }),
  });

  if (!record) return null;

  const expenses = record.expenses || [];
  const postingDate = record.posting_date || record.date;
  const canSeePostingDate = isAdmin || isManager;

  const startEditPosting = () => {
    setTempPostingDate(postingDate || "");
    setEditingPosting(true);
  };

  const requestConfirm = () => {
    if (tempPostingDate === postingDate) {
      setEditingPosting(false);
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              تفاصيل تسليم الشيفت
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {record.branch && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${BRANCH_COLORS[record.branch] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                  <MapPin className="w-3 h-3 inline ml-1" />{record.branch}
                </span>
              )}
              {record.shift_type && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${SHIFT_COLORS[record.shift_type] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                  <Clock className="w-3 h-3 inline ml-1" />{record.shift_type}
                </span>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" /> الموظف</p>
                <p className="text-sm font-bold text-gray-800">{record.employee_name || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> تاريخ الإنشاء</p>
                <p className="text-sm font-bold text-gray-800">{record.date || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> وقت الإنشاء</p>
                <p className="text-sm font-bold text-gray-800">
                  {record.handover_time ? new Date(record.handover_time).toLocaleString("ar-EG", { date: false, hour: "2-digit", minute: "2-digit" }) : "-"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1"><User className="w-3 h-3" /> أنشأه</p>
                <p className="text-sm font-bold text-gray-800">{record.created_by_name || "-"}</p>
              </div>
            </div>

            {/* Posting Date — visible to manager+, editable by admin only */}
            {canSeePostingDate && (
              <div className={`rounded-lg p-3 border ${editingPosting ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-gray-500 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> تاريخ الاحتساب</p>
                  {isAdmin && !editingPosting && (
                    <button onClick={startEditPosting} className="text-[10px] text-blue-600 hover:underline">تعديل</button>
                  )}
                </div>
                {editingPosting ? (
                  <div className="flex items-center gap-2">
                    <input type="date" value={tempPostingDate} onChange={(e) => setTempPostingDate(e.target.value)}
                      className="h-8 rounded-md border border-input bg-white px-2 text-sm focus:outline-none" />
                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs" onClick={requestConfirm}>حفظ</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingPosting(false)}>إلغاء</Button>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-gray-800">{postingDate || "-"}</p>
                )}
              </div>
            )}

            {/* Sales + Net */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                <Wallet className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-[10px] text-gray-500">المبيعات</p>
                <p className="text-sm font-bold text-blue-700">{(record.total_sales || 0).toLocaleString("ar-EG")}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <p className="text-[10px] text-gray-500">المصروفات</p>
                <p className="text-sm font-bold text-red-600">{(record.total_expenses || 0).toLocaleString("ar-EG")}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <p className="text-[10px] text-gray-500">الصافي</p>
                <p className="text-sm font-bold text-green-600">{(record.net_amount || 0).toLocaleString("ar-EG")}</p>
              </div>
            </div>

            {/* Expenses detail */}
            {expenses.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b">
                  <p className="text-xs font-bold text-gray-700">تفاصيل المصروفات ({expenses.length})</p>
                </div>
                <div className="divide-y max-h-48 overflow-y-auto">
                  {expenses.map((e, i) => (
                    <div key={i} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {e.template_name}
                        </span>
                        <span className="text-sm font-bold text-red-600">{(e.amount || 0).toLocaleString("ar-EG")} ج.م</span>
                      </div>
                      {e.notes && <p className="text-[11px] text-gray-400 pr-3 mt-0.5">{e.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for posting date change */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد تغيير تاريخ الاحتساب</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            هل تريد تغيير تاريخ احتساب هذا الشيفت؟
            <br />
            سيؤثر ذلك على جميع التقارير والإحصائيات الخاصة بالأيام والشهور.
          </p>
          <div className="bg-gray-50 rounded-lg p-2 text-xs text-center">
            <span className="text-gray-500">من: </span>
            <span className="font-bold">{postingDate}</span>
            <span className="text-gray-500 mx-2">←</span>
            <span className="text-gray-500">إلى: </span>
            <span className="font-bold text-blue-600">{tempPostingDate}</span>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={updatePostingMutation.isPending}
              onClick={() => updatePostingMutation.mutate({ id: record.id, posting_date: tempPostingDate })}>
              {updatePostingMutation.isPending ? "جاري الحفظ..." : "تأكيد"}
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}