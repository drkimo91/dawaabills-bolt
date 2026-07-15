import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];
const SHIFT_TYPES = ["صباحي", "مسائي", "نايت"];

export default function EditHandoverDialog({ open, onOpenChange, record }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [branch, setBranch] = useState(record?.branch || "");
  const [shiftType, setShiftType] = useState(record?.shift_type || "");
  const [date, setDate] = useState(record?.date || "");
  const [postingDate, setPostingDate] = useState(record?.posting_date || record?.date || "");
  const [employeeName, setEmployeeName] = useState(record?.employee_name || "");
  const [totalSales, setTotalSales] = useState(record?.total_sales ?? "");
  const [expenses, setExpenses] = useState(
    record?.expenses?.length
      ? record.expenses.map((e) => ({ template_name: e.template_name || "", amount: e.amount ?? "", notes: e.notes || "" }))
      : [{ template_name: "", amount: "", notes: "" }]
  );

  const { data: expenseTemplates = [] } = useQuery({
    queryKey: ["expense-templates"],
    queryFn: () => base44.entities.ExpenseTemplate.filter({ is_active: true }),
    enabled: open,
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netAmount = (Number(totalSales) || 0) - totalExpenses;
  const isValid = branch && shiftType && employeeName && totalSales !== "";

  const addExpense = () => setExpenses([...expenses, { template_name: "", amount: "", notes: "" }]);
  const removeExpense = (idx) => setExpenses(expenses.filter((_, i) => i !== idx));
  const updateExpense = (idx, field, value) =>
    setExpenses(expenses.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));

  const updateMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.ShiftHandover.update(record.id, {
        branch,
        shift_type: shiftType,
        date,
        posting_date: postingDate,
        employee_name: employeeName,
        total_sales: Number(totalSales) || 0,
        expenses: expenses
          .filter((e) => e.template_name && e.amount)
          .map((e) => ({
            template_name: e.template_name,
            amount: Number(e.amount) || 0,
            notes: e.notes || "",
          })),
        total_expenses: totalExpenses,
        net_amount: netAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-handovers"] });
      toast({ title: "تم تعديل التسليم بنجاح" });
      onOpenChange(false);
    },
    onError: () => toast({ title: "خطأ", description: "تعذر تعديل التسليم", variant: "destructive" }),
  });

  const inputCls = "w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل تسليم الشيفت</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">الفرع</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} className={inputCls}>
                <option value="">اختر الفرع</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">نوع الشيفت</label>
              <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className={inputCls}>
                <option value="">اختر النوع</option>
                {SHIFT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">تاريخ الإنشاء</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">تاريخ الاحتساب</label>
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">الموظف المسؤول</label>
              <input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">إجمالي مبيعات الشيفت (ج.م)</label>
            <input type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="0" className={inputCls} />
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-2">
              <h3 className="text-sm font-bold text-blue-800">مصروفات الشيفت</h3>
              <Button size="sm" variant="outline" onClick={addExpense} className="h-7 text-xs bg-white">
                <Plus className="w-3.5 h-3.5" /> إضافة بند
              </Button>
            </div>
            <div className="space-y-2">
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Select value={exp.template_name} onValueChange={(v) => updateExpense(idx, "template_name", v)} dir="rtl">
                      <SelectTrigger className="flex-[2] bg-white h-11 text-sm font-medium">
                        <SelectValue placeholder="اختر المصروف" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="number" value={exp.amount} onChange={(e) => updateExpense(idx, "amount", e.target.value)}
                      placeholder="القيمة" className={`${inputCls} w-20 bg-white`} />
                    <button onClick={() => removeExpense(idx)} className="w-9 h-9 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {exp.template_name && (
                    <input type="text" value={exp.notes || ""} onChange={(e) => updateExpense(idx, "notes", e.target.value)}
                      placeholder="ملاحظات / تفاصيل المصروف" className={`${inputCls} bg-white text-xs`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-l from-blue-50 to-white rounded-xl border border-blue-100 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">إجمالي المصروفات</span>
              <span className="font-bold text-red-600">{totalExpenses.toLocaleString("ar-EG")} ج.م</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">صافي التسليم</span>
              <span className={`text-xl font-bold ${netAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                {netAmount.toLocaleString("ar-EG")} ج.م
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={!isValid || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}