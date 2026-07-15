import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, ChevronDown, ChevronUp, Wallet, PlusCircle, Edit2, Loader2, History, LayoutList, FileText, Search, CalendarPlus } from "lucide-react";
import { useUserRole } from "@/lib/useUserRole";

export default function SupplierBalances() {
  const qc = useQueryClient();
  const { isManager } = useUserRole();
  const [expanded, setExpanded] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [payDialog, setPayDialog] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
  const [debtDialog, setDebtDialog] = useState(null); // { supplier_name, existing? }
  const [debtForm, setDebtForm] = useState({ initial_debt: "", notes: "" });
  const [savingDebt, setSavingDebt] = useState(false);
  const [generalPayDialog, setGeneralPayDialog] = useState(false);
  const [generalPayForm, setGeneralPayForm] = useState({ supplier_name: "", amount: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
  // كشف حساب
  // تحديد شهر جديد
  const [editMonthStart, setEditMonthStart] = useState(null); // supplier name
  const [tempDate, setTempDate] = useState("");
  const [savingMonthStart, setSavingMonthStart] = useState(false);
  // المورد الذي يُظهر الكروت التفصيلية
  const [expandedCards, setExpandedCards] = useState({});

  const [stmtSupplier, setStmtSupplier] = useState("");
  const [stmtFrom, setStmtFrom] = useState("");
  const [stmtTo, setStmtTo] = useState("");

  const { data: invoices = [] } = useQuery({ queryKey: ["purchase-invoices"], queryFn: () => base44.entities.PurchaseInvoice.list("-created_date", 5000) });
  const { data: payments = [] } = useQuery({ queryKey: ["supplier-payments"], queryFn: () => base44.entities.SupplierPayment.list("-payment_date") });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => base44.entities.Supplier.list() });
  const { data: debts = [] } = useQuery({ queryKey: ["supplier-debts"], queryFn: () => base44.entities.SupplierDebt.list() });
  const { data: monthStarts = [] } = useQuery({ queryKey: ["supplier-month-starts"], queryFn: () => base44.entities.SupplierMonthStart.list() });

  const addPayment = useMutation({
    mutationFn: async ({ invoice, amount, payment_date, notes }) => {
      const newPaid = (invoice.paid_value || 0) + parseFloat(amount);
      await base44.entities.SupplierPayment.create({
        supplier_name: invoice.supplier_name,
        invoice_id: invoice.id,
        invoice_number: invoice.system_invoice_number,
        amount: parseFloat(amount),
        payment_date,
        notes,
      });
      await base44.entities.PurchaseInvoice.update(invoice.id, { paid_value: newPaid });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["supplier-payments"] });
      setPayDialog(null);
      setPayForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
    },
  });

  const saveDebt = async () => {
    setSavingDebt(true);
    const data = { supplier_name: debtDialog.supplier_name, initial_debt: parseFloat(debtForm.initial_debt) || 0, notes: debtForm.notes };
    if (debtDialog.existing) {
      await base44.entities.SupplierDebt.update(debtDialog.existing.id, data);
    } else {
      await base44.entities.SupplierDebt.create(data);
    }
    await qc.invalidateQueries({ queryKey: ["supplier-debts"] });
    setSavingDebt(false);
    setDebtDialog(null);
  };

  const openDebtDialog = (supplierName) => {
    const existing = debts.find(d => d.supplier_name === supplierName);
    setDebtForm({ initial_debt: existing?.initial_debt?.toString() || "", notes: existing?.notes || "" });
    setDebtDialog({ supplier_name: supplierName, existing });
  };

  // All unique supplier names from invoices + debts
  const allSupplierNames = useMemo(() => {
    const names = new Set([
      ...invoices.filter(i => i.payment_type === "آجل").map(i => i.supplier_name),
      ...debts.map(d => d.supplier_name),
      ...payments.map(p => p.supplier_name),
    ]);
    return [...names].filter(Boolean);
  }, [invoices, debts, payments]);

  // Group by supplier: الصافي = مجموع فواتير آجل - كل الدفعات المسجلة
  const supplierGroups = useMemo(() => {
    const map = {};

    allSupplierNames.forEach(name => {
      const creditInvoices = invoices.filter(inv => inv.payment_type === "آجل" && inv.supplier_name === name);
      const totalInvoices = creditInvoices.reduce((s, inv) => s + (inv.total_value || 0) - (inv.returned_value || 0), 0);

      const debtRecord = debts.find(d => d.supplier_name === name);
      const initialDebt = debtRecord?.initial_debt || 0;

      // كل الدفعات المسجلة لهذا المورد
      const totalPaidBySupplier = payments.filter(p => p.supplier_name === name).reduce((s, p) => s + (p.amount || 0), 0);

      const totalNet = totalInvoices + initialDebt - totalPaidBySupplier;
      if (creditInvoices.length === 0 && initialDebt === 0 && totalPaidBySupplier === 0) return;

      map[name] = {
        name,
        invoiceCount: creditInvoices.length,
        totalInvoices,
        initialDebt,
        totalPaidBySupplier,
        totalNet,
        debtRecord,
      };
    });

    return Object.values(map).sort((a, b) => b.totalNet - a.totalNet);
  }, [invoices, payments, debts, allSupplierNames]);

  const totalNet = supplierGroups.reduce((s, g) => s + g.totalNet, 0);
  const fmt = (n) => Number(n || 0).toLocaleString("ar-EG");

  const overdueInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.payment_type !== "آجل") return false;
      const remaining = (inv.total_value || 0) - (inv.returned_value || 0) - (inv.paid_value || 0);
      if (remaining <= 0) return false;
      const supplier = suppliers.find((s) => s.name === inv.supplier_name);
      const terms = supplier?.payment_terms_days || 30;
      const dateStr = inv.invoice_date || inv.created_date;
      if (!dateStr) return false;
      const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
      return days >= terms;
    });
  }, [invoices, suppliers]);

  const openPayDialog = (invoice) => {
    setPayForm({ amount: invoice.remaining?.toString() || "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
    setPayDialog({ invoice });
  };

  const openDebtPayDialog = (supplierName, remaining) => {
    setPayForm({ amount: remaining?.toString() || "", payment_date: new Date().toISOString().split("T")[0], notes: "سداد مديونية قديمة" });
    setPayDialog({ debtPayment: true, supplier_name: supplierName, remaining });
  };

  const addDebtPayment = useMutation({
    mutationFn: async ({ supplier_name, amount, payment_date, notes }) => {
      await base44.entities.SupplierPayment.create({
        supplier_name,
        amount: parseFloat(amount),
        payment_date,
        notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-payments"] });
      setPayDialog(null);
      setPayForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
    },
  });

  const addGeneralPayment = useMutation({
    mutationFn: async ({ supplier_name, amount, payment_date, notes }) => {
      await base44.entities.SupplierPayment.create({
        supplier_name,
        amount: parseFloat(amount),
        payment_date,
        notes: notes || "دفعة عامة",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-payments"] });
      setGeneralPayDialog(false);
      setGeneralPayForm({ supplier_name: "", amount: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
    },
  });

  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">أرصدة الموردين</h1>
          <p className="text-gray-500 text-sm mt-0.5">تتبع الحسابات الدائنة والمدفوعات</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={() => setGeneralPayDialog(true)} className="bg-green-600 hover:bg-green-700 gap-2">
            <PlusCircle className="w-4 h-4" /> تسديد دفعة
          </Button>
          <div className={`flex items-center gap-2 border rounded-xl px-4 py-2 ${totalNet < 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <Wallet className={`w-5 h-5 ${totalNet < 0 ? "text-green-500" : "text-red-500"}`} />
            <div>
              <p className="text-xs text-gray-500">{totalNet < 0 ? "صافي رصيد دائن" : "إجمالي المتبقي"}</p>
              <p className={`text-lg font-bold ${totalNet < 0 ? "text-green-600" : "text-red-600"}`}>{fmt(totalNet)} ج</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <CreditCard className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">إجمالي المسدد</p>
              <p className="text-lg font-bold text-green-600">{fmt(totalPayments)} ج</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="balances" dir="rtl">
        <TabsList className="mb-2">
          <TabsTrigger value="balances" className="gap-2"><LayoutList className="w-4 h-4" /> الأرصدة</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><History className="w-4 h-4" /> سجل المدفوعات</TabsTrigger>
          <TabsTrigger value="statement" className="gap-2"><FileText className="w-4 h-4" /> كشف حساب</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-4">



      {/* Supplier Cards */}
      {supplierGroups.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-400 text-lg">لا توجد فواتير غير مسددة ✅</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {supplierGroups.map((group) => {
            const isExpanded = expanded === group.name;
            const supplierPayments = payments.filter(p => p.supplier_name === group.name);
            const monthStartRecord = monthStarts.find(m => m.supplier_name === group.name);
            const monthStart = monthStartRecord?.month_start_date || null;
            const cardsOpen = expandedCards[group.name] || false;

            // حساب الكروت الثلاثة
            const creditInvoices = invoices.filter(inv => inv.payment_type === "آجل" && inv.supplier_name === group.name);
            let oldMonthCard = null, newMonthCard = null, totalCard = null;

            if (monthStart) {
              const oldInvoices = creditInvoices.filter(inv => (inv.invoice_date || "") < monthStart);
              const oldInvoicesTotal = oldInvoices.reduce((s, inv) => s + (inv.total_value || 0) - (inv.returned_value || 0), 0);
              const oldDebt = (group.initialDebt || 0) + oldInvoicesTotal;

              const newInvoices = creditInvoices.filter(inv => (inv.invoice_date || "") >= monthStart);
              const newInvoicesTotal = newInvoices.reduce((s, inv) => s + (inv.total_value || 0) - (inv.returned_value || 0), 0);

              // كل الدفعات تخصم من المديونية القديمة أولاً
              const totalAllPayments = group.totalPaidBySupplier;
              const paidFromOld = Math.min(oldDebt, totalAllPayments);
              const paidFromNew = Math.max(0, totalAllPayments - paidFromOld);

              const oldNet = oldDebt - paidFromOld;
              const newNet = newInvoicesTotal - paidFromNew;
              const cardTotal = oldNet + newNet;
              const reconciliationDiff = Math.round(cardTotal - group.totalNet);

              // حساب تاريخ نهاية الشهر القديم (يوم قبل بداية الجديد)
              const dayBeforeNew = new Date(monthStart);
              dayBeforeNew.setDate(dayBeforeNew.getDate() - 1);
              const oldEndDate = dayBeforeNew.toISOString().split("T")[0];

              oldMonthCard = { oldDebt, paidFromOld, oldNet, invoiceCount: oldInvoices.length, endDate: oldEndDate, initialDebt: group.initialDebt || 0, oldInvoicesTotal };
              newMonthCard = { newInvoicesTotal, paidFromNew, newNet, invoiceCount: newInvoices.length };
              totalCard = { total: cardTotal, reconciliationDiff };
            }

            return (
              <Card key={group.name} className="overflow-hidden">
                {/* رأس كارت المورد */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : group.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                      {group.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{group.name}</p>
                      <p className="text-xs text-gray-500">
                        {group.invoiceCount} فاتورة آجل
                        {group.initialDebt > 0 && ` + مديونية قديمة ${fmt(group.initialDebt)} ج`}
                      </p>
                      {monthStart && (
                        <p className="text-xs text-blue-500 mt-0.5">شهر جديد من: {monthStart}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-left">
                      <p className="text-xs text-gray-500">{group.totalNet < 0 ? "رصيد دائن" : "الصافي المتبقي"}</p>
                      <p className={`font-bold text-lg ${group.totalNet < 0 ? "text-green-600" : "text-red-600"}`}>{fmt(group.totalNet)} ج</p>
                    </div>
                    {/* زر عرض الكروت التفصيلية */}
                    {monthStart && (
                      <Button
                        size="sm" variant="outline"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 h-7 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); setExpandedCards(c => ({ ...c, [group.name]: !c[group.name] })); }}
                      >
                        {cardsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} تفاصيل الشهر
                      </Button>
                    )}
                    {/* زر بداية شهر جديد — للمدير فقط أو إذا لم يكن محدداً */}
                    {(isManager || !monthStart) && (
                      <Button
                        size="sm" variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50 h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempDate(new Date().toISOString().split("T")[0]);
                          setEditMonthStart(group.name);
                        }}
                      >
                        <CalendarPlus className="w-3 h-3" /> {monthStart ? "شهر جديد" : "تحديد بداية شهر"}
                      </Button>
                    )}
                    {isManager && (
                      <Button
                        size="sm" variant="outline"
                        className="text-purple-600 border-purple-300 hover:bg-purple-50 h-7 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); openDebtDialog(group.name); }}
                      >
                        <Edit2 className="w-3 h-3" /> مديونية قديمة
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* الكروت الثلاثة — تظهر عند الضغط على "تفاصيل الشهر" */}
                {monthStart && cardsOpen && (
                  <div className="border-t grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse">
                    {/* كارت 1: المديونية القديمة */}
                    <div className="p-4 bg-orange-50">
                      <p className="text-xs font-bold text-orange-700 mb-1">📋 المديونية القديمة</p>
                      <p className="text-xs text-gray-400 mb-2">حتى {oldMonthCard?.endDate}</p>
                      <div className="space-y-1 text-sm">
                        {oldMonthCard?.initialDebt > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">مديونية افتتاحية</span>
                            <span className="font-semibold text-purple-600">{fmt(oldMonthCard?.initialDebt)} ج</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">فواتير قديمة ({oldMonthCard?.invoiceCount || 0})</span>
                          <span className="font-semibold text-gray-800">{fmt(oldMonthCard?.oldInvoicesTotal)} ج</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-bold text-orange-800">إجمالي الديون القديمة</span>
                          <span className="font-bold text-orange-700">{fmt(oldMonthCard?.oldDebt)} ج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">المدفوع منها</span>
                          <span className="font-semibold text-green-600">- {fmt(oldMonthCard?.paidFromOld)} ج</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-bold text-orange-800">{oldMonthCard?.oldNet < 0 ? "رصيد زائد" : "المتبقي"}</span>
                          <span className={`font-bold text-base ${oldMonthCard?.oldNet < 0 ? "text-green-700" : "text-orange-700"}`}>{fmt(oldMonthCard?.oldNet)} ج</span>
                        </div>
                      </div>
                    </div>

                    {/* كارت 2: الشهر الجديد */}
                    <div className="p-4 bg-blue-50">
                      <p className="text-xs font-bold text-blue-700 mb-1">🆕 الشهر الجديد</p>
                      <p className="text-xs text-gray-400 mb-2">من {monthStart} حتى الآن</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">فواتير الشهر ({newMonthCard?.invoiceCount || 0})</span>
                          <span className="font-semibold text-gray-800">{fmt(newMonthCard?.newInvoicesTotal)} ج</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">المدفوع</span>
                          <span className="font-semibold text-green-600">- {fmt(newMonthCard?.paidFromNew)} ج</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-bold text-blue-800">{newMonthCard?.newNet < 0 ? "رصيد زائد" : "المتبقي"}</span>
                          <span className={`font-bold text-base ${newMonthCard?.newNet < 0 ? "text-green-700" : "text-blue-700"}`}>{fmt(newMonthCard?.newNet)} ج</span>
                        </div>
                      </div>
                    </div>

                    {/* كارت 3: الإجمالي */}
                    <div className={`p-4 flex flex-col justify-center items-center text-center ${totalCard?.total < 0 ? "bg-green-50" : "bg-red-50"}`}>
                      <p className={`text-xs font-bold mb-1 ${totalCard?.total < 0 ? "text-green-700" : "text-red-700"}`}>{totalCard?.total < 0 ? "✅ رصيد دائن" : "📊 إجمالي المديونية"}</p>
                      <p className="text-xs text-gray-400 mb-2">قديم + جديد</p>
                      <p className={`text-3xl font-bold ${totalCard?.total < 0 ? "text-green-600" : "text-red-600"}`}>{fmt(totalCard?.total)} ج</p>
                    </div>
                    {/* شريط التحقق والمطابقة */}
                    <div className="md:col-span-3 p-3 bg-gray-50 border-t text-xs space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-gray-500 font-semibold">معادلة التحقق</span>
                        <span className="text-gray-600 font-mono" dir="ltr">
                          {fmt(oldMonthCard?.oldDebt)} + {fmt(newMonthCard?.newInvoicesTotal)} - {fmt(group.totalPaidBySupplier)} = {fmt(totalCard?.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-gray-400">المديونية القديمة + فواتير الشهر - إجمالي المدفوع</span>
                        {totalCard?.reconciliationDiff === 0 ? (
                          <span className="text-green-600 font-semibold">مطابق للرصيد المعروض</span>
                        ) : (
                          <span className="text-red-600 font-semibold">اختلاف قدره {fmt(totalCard?.reconciliationDiff)} ج</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Details */}
                {isExpanded && (
                  <div className="border-t divide-y">
                    <div className="p-4 bg-gray-50 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">إجمالي الفواتير الآجل</p>
                        <p className="font-bold text-gray-800">{fmt(group.totalInvoices)} ج</p>
                        {group.initialDebt > 0 && <p className="text-xs text-purple-600">+ مديونية {fmt(group.initialDebt)} ج</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">إجمالي المسدد</p>
                        <p className="font-bold text-green-600">{fmt(group.totalPaidBySupplier)} ج</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">الصافي المتبقي</p>
                        <p className="font-bold text-red-600">{fmt(group.totalNet)} ج</p>
                      </div>
                    </div>
                    {supplierPayments.length > 0 && (
                      <div className="p-4 bg-green-50">
                        <p className="text-xs font-semibold text-green-700 mb-2">سجل الدفعات ({supplierPayments.length})</p>
                        <div className="space-y-1">
                          {supplierPayments.sort((a,b) => (b.payment_date||"").localeCompare(a.payment_date||"")).map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-xs text-gray-600 bg-white rounded px-3 py-1.5 border border-green-100">
                              <span>{p.payment_date || "—"} — {p.notes || "دفعة"}</span>
                              <span className="font-semibold text-green-700">{fmt(p.amount)} ج</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

        </TabsContent>

        {/* Payments History Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="bg-white rounded-xl border p-3 flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-[160px]">
              <label className="text-xs text-gray-500">تصفية بالمورد</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filterSupplier}
                onChange={e => setFilterSupplier(e.target.value)}
              >
                <option value="">-- كل الموردين --</option>
                {allSupplierNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">من تاريخ</label>
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">إلى تاريخ</label>
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 text-sm w-36" />
            </div>
            {(filterSupplier || filterDateFrom || filterDateTo) && (
              <Button variant="ghost" size="sm" className="text-gray-400 h-9" onClick={() => { setFilterSupplier(""); setFilterDateFrom(""); setFilterDateTo(""); }}>
                مسح
              </Button>
            )}
          </div>

          {(() => {
            const filteredPays = payments.filter(p =>
              (!filterSupplier || p.supplier_name === filterSupplier) &&
              (!filterDateFrom || p.payment_date >= filterDateFrom) &&
              (!filterDateTo || p.payment_date <= filterDateTo)
            ).sort((a, b) => (b.payment_date || "").localeCompare(a.payment_date || ""));
            const totalFiltered = filteredPays.reduce((s, p) => s + (p.amount || 0), 0);

            return filteredPays.length === 0 ? (
              <Card className="p-12 text-center text-gray-400">لا توجد مدفوعات مسجلة</Card>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-right text-xs">التاريخ</TableHead>
                        <TableHead className="text-right text-xs">المورد</TableHead>
                        <TableHead className="text-right text-xs">رقم الفاتورة</TableHead>
                        <TableHead className="text-right text-xs">ملاحظات</TableHead>
                        <TableHead className="text-right text-xs">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPays.map(p => (
                        <TableRow key={p.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm text-gray-600">{p.payment_date || "—"}</TableCell>
                          <TableCell className="font-semibold text-sm text-gray-800">{p.supplier_name}</TableCell>
                          <TableCell className="font-mono text-teal-700 text-sm">{p.invoice_number || "—"}</TableCell>
                          <TableCell className="text-xs text-gray-500">{p.notes || "—"}</TableCell>
                          <TableCell className="font-bold text-green-600 text-sm">{fmt(p.amount)} ج</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-green-50 border-t-2 border-green-200">
                        <TableCell colSpan={4} className="text-sm font-bold text-green-800">
                          الإجمالي ({filteredPays.length} دفعة)
                        </TableCell>
                        <TableCell className="font-bold text-green-700 text-sm">{fmt(totalFiltered)} ج</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </TabsContent>
        {/* كشف حساب Tab */}
        <TabsContent value="statement" className="space-y-4">
          {/* فلاتر كشف الحساب */}
          <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">اسم المورد *</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={stmtSupplier}
                onChange={e => setStmtSupplier(e.target.value)}
              >
                <option value="">-- اختر مورد --</option>
                {[...new Set(invoices.map(i => i.supplier_name).filter(Boolean))].sort().map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">من تاريخ</label>
              <Input type="date" value={stmtFrom} onChange={e => setStmtFrom(e.target.value)} className="h-9 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">إلى تاريخ</label>
              <Input type="date" value={stmtTo} onChange={e => setStmtTo(e.target.value)} className="h-9 text-sm w-36" />
            </div>
            {(stmtSupplier || stmtFrom || stmtTo) && (
              <Button variant="ghost" size="sm" className="text-gray-400 h-9" onClick={() => { setStmtSupplier(""); setStmtFrom(""); setStmtTo(""); }}>
                مسح
              </Button>
            )}
          </div>

          {!stmtSupplier ? (
            <Card className="p-12 text-center text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>اختر مورداً لعرض كشف الحساب</p>
            </Card>
          ) : (() => {
            const stmtInvoices = invoices
              .filter(inv =>
                inv.supplier_name === stmtSupplier &&
                (!stmtFrom || inv.invoice_date >= stmtFrom) &&
                (!stmtTo || inv.invoice_date <= stmtTo)
              )
              .sort((a, b) => (a.invoice_date || "").localeCompare(b.invoice_date || ""));

            // الرصيد الافتتاحي (ما قبل الفترة): المديونية القديمة + فواتير قبل تاريخ البداية - دفعات قبل تاريخ البداية
            const debtRecord = debts.find(d => d.supplier_name === stmtSupplier);
            const initialDebt = debtRecord?.initial_debt || 0;

            const supplierAllPayments = payments.filter(p => p.supplier_name === stmtSupplier);
            const beforeInvoices = stmtFrom
              ? invoices.filter(inv => inv.supplier_name === stmtSupplier && (inv.invoice_date || "") < stmtFrom)
              : [];
            const beforeInvoicesNet = beforeInvoices.reduce((s, inv) => s + (inv.total_value || 0) - (inv.returned_value || 0), 0);
            const beforePayments = stmtFrom
              ? supplierAllPayments.filter(p => (p.payment_date || "") < stmtFrom)
              : [];
            const beforePaymentsTotal = beforePayments.reduce((s, p) => s + (p.amount || 0), 0);
            const openingBalance = initialDebt + beforeInvoicesNet - beforePaymentsTotal;

            // إحصائيات الفترة
            const totalPurchases = stmtInvoices.reduce((s, inv) => s + (inv.total_value || 0), 0);
            const totalReturned = stmtInvoices.reduce((s, inv) => s + (inv.returned_value || 0), 0);
            const periodPayments = supplierAllPayments.filter(p =>
              (!stmtFrom || (p.payment_date || "") >= stmtFrom) &&
              (!stmtTo || (p.payment_date || "") <= stmtTo)
            );
            const totalPaid = periodPayments.reduce((s, p) => s + (p.amount || 0), 0);
            const totalDue = openingBalance + totalPurchases - totalReturned - totalPaid;

            return (
              <div className="space-y-4">
                {/* Header info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold">{stmtSupplier.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-blue-900">{stmtSupplier}</p>
                        <p className="text-xs text-blue-600">
                          {stmtFrom || stmtTo
                            ? `الفترة: ${stmtFrom || "—"} إلى ${stmtTo || "—"}`
                            : "كل الفترات"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-blue-600">{stmtInvoices.length} فاتورة</span>
                  </div>
                </div>

                {/* ملخص أرقام */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {openingBalance !== 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">رصيد سابق (افتتاحي)</p>
                      <p className="text-lg font-bold text-purple-600">{fmt(openingBalance)} ج</p>
                    </div>
                  )}
                  <div className="bg-white border rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">إجمالي المشتريات</p>
                    <p className="text-lg font-bold text-gray-800">{fmt(totalPurchases)} ج</p>
                  </div>
                  <div className="bg-white border rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">إجمالي المرتجع</p>
                    <p className="text-lg font-bold text-orange-600">{fmt(totalReturned)} ج</p>
                  </div>
                  <div className="bg-white border rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">إجمالي المدفوع</p>
                    <p className="text-lg font-bold text-green-600">{fmt(totalPaid)} ج</p>
                  </div>
                  <div className={`border rounded-xl p-3 text-center ${totalDue < 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <p className="text-xs text-gray-500 mb-1">{totalDue < 0 ? "رصيد دائن" : "إجمالي المستحق"}</p>
                    <p className={`text-lg font-bold ${totalDue < 0 ? "text-green-600" : "text-red-600"}`}>{fmt(totalDue)} ج</p>
                  </div>
                </div>

                {/* جدول الفواتير */}
                {stmtInvoices.length === 0 ? (
                  <Card className="p-8 text-center text-gray-400">لا توجد فواتير في هذه الفترة</Card>
                ) : (
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-right text-xs">#</TableHead>
                            <TableHead className="text-right text-xs">رقم الفاتورة (e-Stock)</TableHead>
                            <TableHead className="text-right text-xs">رقم فاتورة المورد</TableHead>
                            <TableHead className="text-right text-xs">التاريخ</TableHead>
                            <TableHead className="text-right text-xs">الفرع</TableHead>
                            <TableHead className="text-right text-xs">نوع الدفع</TableHead>
                            <TableHead className="text-right text-xs">الإجمالي</TableHead>
                            <TableHead className="text-right text-xs">مرتجع</TableHead>
                            <TableHead className="text-right text-xs">مدفوع</TableHead>
                            <TableHead className="text-right text-xs">المستحق</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stmtInvoices.map((inv, idx) => {
                            const due = Math.max(0, (inv.total_value || 0) - (inv.returned_value || 0) - (inv.paid_value || 0));
                            return (
                              <TableRow key={inv.id} className="hover:bg-gray-50">
                                <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                                <TableCell className="font-mono text-teal-700 text-sm font-semibold">{inv.system_invoice_number}</TableCell>
                                <TableCell className="text-sm text-gray-600">{inv.supplier_invoice_number || "—"}</TableCell>
                                <TableCell className="text-xs text-gray-500">{inv.invoice_date || "—"}</TableCell>
                                <TableCell className="text-xs text-gray-600">{inv.branch || "—"}</TableCell>
                                <TableCell>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.payment_type === "آجل" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                                    {inv.payment_type}
                                  </span>
                                </TableCell>
                                <TableCell className="font-semibold text-sm">{fmt(inv.total_value)} ج</TableCell>
                                <TableCell className="text-orange-600 text-sm">{fmt(inv.returned_value)} ج</TableCell>
                                <TableCell className="text-green-600 text-sm">{fmt(inv.paid_value)} ج</TableCell>
                                <TableCell className={`font-bold text-sm ${due > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(due)} ج</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* سطر الرصيد السابق */}
                          {openingBalance !== 0 && (
                            <TableRow className="bg-purple-50 font-bold border-t-2 border-purple-200">
                              <TableCell colSpan={9} className="text-sm text-purple-800 font-bold">
                                رصيد سابق (افتتاحي): {fmt(initialDebt)} مديونية قديمة
                                {beforeInvoicesNet !== 0 && ` + ${fmt(beforeInvoicesNet)} فواتير سابقة`}
                                {beforePaymentsTotal !== 0 && ` − ${fmt(beforePaymentsTotal)} دفعات سابقة`}
                              </TableCell>
                              <TableCell className="text-sm text-purple-700 font-bold">{fmt(openingBalance)} ج</TableCell>
                            </TableRow>
                          )}
                          {/* سطر الإجمالي */}
                          <TableRow className="bg-slate-800 text-white font-bold">
                            <TableCell colSpan={6} className="text-sm text-white font-bold">
                              إجمالي الفترة ({stmtInvoices.length} فاتورة)
                            </TableCell>
                            <TableCell className="text-sm text-white font-bold">{fmt(totalPurchases)} ج</TableCell>
                            <TableCell className="text-sm text-orange-300 font-bold">{fmt(totalReturned)} ج</TableCell>
                            <TableCell className="text-sm text-green-300 font-bold">{fmt(totalPaid)} ج</TableCell>
                            <TableCell className="text-sm text-red-300 font-bold">{fmt(totalPurchases - totalReturned - totalPaid)} ج</TableCell>
                          </TableRow>
                          {/* سطر الإجمالي النهائي شامل الرصيد السابق */}
                          {openingBalance !== 0 && (
                            <TableRow className="bg-red-900 text-white font-bold">
                              <TableCell colSpan={9} className="text-sm text-white font-bold">
                                الإجمالي النهائي المستحق (شامل الرصيد السابق)
                              </TableCell>
                              <TableCell className={`text-sm font-bold ${totalDue < 0 ? "text-green-300" : "text-red-300"}`}>{fmt(totalDue)} ج</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Pay Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                {payDialog.debtPayment ? (
                  <>
                    <p className="text-gray-500">المورد: <span className="font-semibold text-gray-800">{payDialog.supplier_name}</span></p>
                    <p className="text-gray-500">النوع: <span className="font-semibold text-purple-700">سداد مديونية قديمة</span></p>
                    <p className="text-gray-500">المتبقي: <span className="font-bold text-red-600">{fmt(payDialog.remaining)} ج</span></p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500">المورد: <span className="font-semibold text-gray-800">{payDialog.invoice.supplier_name}</span></p>
                    <p className="text-gray-500">الفاتورة: <span className="font-mono font-semibold text-teal-700">{payDialog.invoice.system_invoice_number}</span></p>
                    <p className="text-gray-500">المتبقي: <span className="font-bold text-red-600">{fmt(payDialog.invoice.remaining)} ج</span></p>
                  </>
                )}
              </div>
              <div className="space-y-1">
                <Label>مبلغ الدفعة</Label>
                <Input type="number" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>تاريخ السداد</Label>
                <Input type="date" value={payForm.payment_date} onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="مثل: تحويل بنكي، شيك..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayDialog(null)}>إلغاء</Button>
            <Button
              disabled={!payForm.amount || addPayment.isPending || addDebtPayment.isPending}
              onClick={() => {
                if (payDialog?.debtPayment) {
                  addDebtPayment.mutate({ supplier_name: payDialog.supplier_name, ...payForm });
                } else {
                  addPayment.mutate({ invoice: payDialog.invoice, ...payForm });
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {(addPayment.isPending || addDebtPayment.isPending) ? "جاري الحفظ..." : "تأكيد الدفعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Payment Dialog */}
      <Dialog open={generalPayDialog} onOpenChange={setGeneralPayDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسديد دفعة عامة لمورد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>اسم المورد</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={generalPayForm.supplier_name}
                onChange={e => setGeneralPayForm(f => ({ ...f, supplier_name: e.target.value }))}
              >
                <option value="">-- اختر مورد --</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>المبلغ المسدد (جنيه)</Label>
              <Input type="number" value={generalPayForm.amount} onChange={e => setGeneralPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>تاريخ السداد</Label>
              <Input type="date" value={generalPayForm.payment_date} onChange={e => setGeneralPayForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea value={generalPayForm.notes} onChange={e => setGeneralPayForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="مثل: تحويل بنكي، شيك..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGeneralPayDialog(false)}>إلغاء</Button>
            <Button
              disabled={!generalPayForm.supplier_name || !generalPayForm.amount || addGeneralPayment.isPending}
              onClick={() => addGeneralPayment.mutate(generalPayForm)}
              className="bg-green-600 hover:bg-green-700"
            >
              {addGeneralPayment.isPending ? "جاري الحفظ..." : "تأكيد الدفعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Month Start Dialog */}
      <Dialog open={!!editMonthStart} onOpenChange={(o) => !o && setEditMonthStart(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>📅 بداية شهر جديد — {editMonthStart}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              حدد تاريخ بداية الشهر الجديد. سيُحفظ هذا التاريخ ويبقى ثابتاً حتى تحدد شهراً جديداً.
            </p>
            <div className="space-y-1">
              <Label>تاريخ بداية الشهر الجديد</Label>
              <Input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditMonthStart(null)}>إلغاء</Button>
            <Button
              disabled={!tempDate || savingMonthStart}
              onClick={async () => {
                setSavingMonthStart(true);
                const existing = monthStarts.find(m => m.supplier_name === editMonthStart);
                if (existing) {
                  await base44.entities.SupplierMonthStart.update(existing.id, { month_start_date: tempDate });
                } else {
                  await base44.entities.SupplierMonthStart.create({ supplier_name: editMonthStart, month_start_date: tempDate });
                }
                await qc.invalidateQueries({ queryKey: ["supplier-month-starts"] });
                setSavingMonthStart(false);
                setEditMonthStart(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {savingMonthStart ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debt Dialog */}
      {isManager && (
        <Dialog open={!!debtDialog} onOpenChange={(o) => !o && setDebtDialog(null)}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader>
              <DialogTitle>المديونية القديمة — {debtDialog?.supplier_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">سجّل المديونية التي كانت موجودة للمورد قبل استخدام التطبيق.</p>
              <div className="space-y-1">
                <Label>المديونية القديمة (جنيه)</Label>
                <Input type="number" value={debtForm.initial_debt} onChange={e => setDebtForm(f => ({ ...f, initial_debt: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>ملاحظات</Label>
                <Textarea value={debtForm.notes} onChange={e => setDebtForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="اختياري..." />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDebtDialog(null)}>إلغاء</Button>
              <Button disabled={savingDebt} onClick={saveDebt} className="bg-purple-600 hover:bg-purple-700">
                {savingDebt ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}