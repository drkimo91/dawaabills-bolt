import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Save, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];
const SHIFT_TYPES = ["صباحي", "مسائي", "نايت"];

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

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
}

export default function ShiftHandoverForm({ user, isAdmin, onSaved }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [branch, setBranch] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [date, setDate] = useState(todayStr());
  const [employeeName, setEmployeeName] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [expenses, setExpenses] = useState([{ template_name: "", amount: "", notes: "" }]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list(),
  });
  const { data: expenseTemplates = [] } = useQuery({
    queryKey: ["expense-templates"],
    queryFn: () => base44.entities.ExpenseTemplate.filter({ is_active: true }),
  });
  const { data: riders = [] } = useQuery({
    queryKey: ["riders"],
    queryFn: () => base44.entities.Rider.list(),
  });

  const riderNames = new Set(riders.map((r) => r.name));
  const branchEmployees = teamMembers.filter(
    (tm) => (!branch || (tm.branches && tm.branches.includes(branch))) && !riderNames.has(tm.name)
  );
  const employeeOptions = [
    ...new Set([
      ...branchEmployees.map((tm) => tm.name),
      ...(user?.full_name && !riderNames.has(user.full_name) ? [user.full_name] : []),
    ]),
  ];

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  const netAmount = (Number(totalSales) || 0) - totalExpenses;

  const isValid = branch && shiftType && employeeName && totalSales !== "";

  const addExpense = () =>
    setExpenses([...expenses, { template_name: "", amount: "", notes: "" }]);
  const removeExpense = (idx) =>
    setExpenses(expenses.filter((_, i) => i !== idx));
  const updateExpense = (idx, field, value) =>
    setExpenses(
      expenses.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      return base44.entities.ShiftHandover.create({
        branch,
        shift_type: shiftType,
        date,
        posting_date: date,
        handover_time: now,
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
        created_by_name: user?.full_name || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-handovers"] });
      toast({ title: "تم حفظ التسليم بنجاح" });
      setConfirmOpen(false);
      setBranch("");
      setShiftType("");
      setEmployeeName("");
      setTotalSales("");
      setExpenses([{ template_name: "", amount: "", notes: "" }]);
      setDate(todayStr());
      if (onSaved) onSaved();
    },
    onError: () =>
      toast({ title: "خطأ", description: "تعذر حفظ التسليم", variant: "destructive" }),
  });

  const inputCls = "w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">تسليم شيفت جديد</h2>
          <p className="text-xs text-gray-500">أدخل بيانات الشيفت والمصروفات</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-700 border-b pb-2">بيانات الشيفت</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">الفرع <span className="text-red-500">*</span></label>
            <select required value={branch} onChange={(e) => { setBranch(e.target.value); setEmployeeName(""); }} className={inputCls}>
              <option value="">اختر الفرع</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">نوع الشيفت <span className="text-red-500">*</span></label>
            <select required value={shiftType} onChange={(e) => setShiftType(e.target.value)} className={inputCls}>
              <option value="">اختر النوع</option>
              {SHIFT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">تاريخ الإنشاء <span className="text-red-500">*</span></label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled
              className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`} />
            <p className="text-[10px] text-gray-400 mt-0.5">يتم تسجيله تلقائياً بتاريخ اليوم</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">الموظف المسؤول <span className="text-red-500">*</span></label>
            <select required value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className={inputCls}>
              <option value="">اختر الموظف</option>
              {employeeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">إجمالي مبيعات الشيفت (ج.م) <span className="text-red-500">*</span></label>
          <input required type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="0" className={inputCls} />
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4">
        <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
          <h3 className="text-sm font-bold text-blue-800">مصروفات الشيفت</h3>
          <Button size="sm" variant="outline" onClick={addExpense} className="h-7 text-xs bg-white">
            <Plus className="w-3.5 h-3.5" /> إضافة بند
          </Button>
        </div>
        <div className="space-y-2">
          {expenses.map((exp, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Select value={exp.template_name} onValueChange={(v) => updateExpense(idx, "template_name", v)}
                  dir="rtl">
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
          {expenses.length === 0 && (
            <p className="text-xs text-blue-400 text-center py-4">لا توجد مصروفات مضافة</p>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-l from-blue-50 to-white rounded-xl border border-blue-100 p-4 mb-4 space-y-2">
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

      <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={!isValid || saveMutation.isPending} onClick={() => setConfirmOpen(true)}>
        <Save className="w-4 h-4" />
        {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التسليم"}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد تسليم الشيفت</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-gray-600">هل أنت متأكد من تسليم الشيفت؟</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 border-b pb-2">
                {branch && <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${BRANCH_COLORS[branch]}`}>{branch}</span>}
                {shiftType && <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${SHIFT_COLORS[shiftType]}`}>{shiftType}</span>}
                {employeeName && <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-blue-100 text-blue-700 border-blue-200">{employeeName}</span>}
                {date && <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-gray-200 text-gray-700 border-gray-300">{date}</span>}
              </div>
              <div className="flex justify-between"><span className="text-gray-500">إجمالي المبيعات</span><span className="font-bold">{(Number(totalSales) || 0).toLocaleString("ar-EG")} ج.م</span></div>
              {expenses.filter((e) => e.template_name && e.amount).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">تفاصيل المصروفات:</p>
                  {expenses.filter((e) => e.template_name && e.amount).map((e, i) => (
                    <div key={i} className="pr-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {e.template_name}
                        </span>
                        <span className="text-xs font-medium text-red-600">{(Number(e.amount) || 0).toLocaleString("ar-EG")} ج.م</span>
                      </div>
                      {e.notes && <p className="text-[10px] text-gray-400 pr-3 mt-0.5">{e.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5"><span className="text-gray-500">إجمالي المصروفات</span><span className="font-bold text-red-600">{totalExpenses.toLocaleString("ar-EG")} ج.م</span></div>
              <div className="flex justify-between border-t pt-1.5"><span className="font-bold">صافي التسليم</span><span className="font-bold text-green-600">{netAmount.toLocaleString("ar-EG")} ج.م</span></div>
            </div>
            <p className="text-[11px] text-orange-600">⚠ لا يمكن تعديل أو حذف السجل بعد الحفظ</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "جاري الحفظ..." : "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}