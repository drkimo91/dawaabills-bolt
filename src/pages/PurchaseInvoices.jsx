import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, CheckSquare, X, ArrowUpDown } from "lucide-react";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";
import InvoiceViewDialog from "@/components/invoices/InvoiceViewDialog";
import ConfirmDialog from "@/components/invoices/ConfirmDialog";
import InvoiceStats from "@/components/invoices/InvoiceStats";
import { logActivity } from "@/lib/activityLogger";
import { useUserRole } from "@/lib/useUserRole";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export default function PurchaseInvoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [filterSupplier, setFilterSupplier] = useState("الكل");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef(null);
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const { canSaveInvoice, canDeleteInvoice } = useUserRole();

  // Real-time: تحديث تلقائي عند أي تغيير
  useEffect(() => {
    const unsub = base44.entities.PurchaseInvoice.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invoices-count"] });
    });
    return unsub;
  }, []);

  // debounce البحث لتجنب اللاج
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["purchase-invoices"],
    queryFn: () => base44.entities.PurchaseInvoice.list("-created_date", 2000),
    staleTime: 60000,
    gcTime: 300000,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const inv = await base44.entities.PurchaseInvoice.create(data);
      await logActivity({ action_type: "create", entity_type: "invoice", entity_id: inv?.id, entity_label: data.system_invoice_number, details: `إنشاء فاتورة ${data.system_invoice_number}` });
      return inv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setDialogOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.PurchaseInvoice.update(id, data);
      await logActivity({ action_type: "update", entity_type: "invoice", entity_id: id, entity_label: data.system_invoice_number, details: `تعديل فاتورة ${data.system_invoice_number}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setDialogOpen(false);
      setEditingInvoice(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const inv = invoices.find((i) => i.id === id);
      await logActivity({ action_type: "delete", entity_type: "invoice", entity_id: id, entity_label: inv?.system_invoice_number || id, details: `حذف فاتورة ${inv?.system_invoice_number || ""}` });
      await base44.entities.PurchaseInvoice.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(["purchase-invoices"], (old = []) => old.filter((inv) => inv.id !== id));
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setSelectedIds((prev) => prev.filter((s) => s !== id));
    },
  });

  const handleSubmit = (formData) => {
    if (editingInvoice) updateMutation.mutate({ id: editingInvoice.id, data: formData });
    else createMutation.mutate(formData);
  };

  // Bulk actions
  const executeBulkDelete = () => {
    selectedIds.forEach((id) => deleteMutation.mutate(id));
    setSelectedIds([]);
  };

  const executeSingleDelete = () => {
    if (singleDeleteId) deleteMutation.mutate(singleDeleteId);
    setSingleDeleteId(null);
  };

  const executeBulkSave = () => {
    selectedIds.forEach((id) => {
      const inv = invoices.find((i) => i.id === id);
      if (inv) updateMutation.mutate({ id, data: { ...inv, status: "يتم الحفظ" } });
    });
    setSelectedIds([]);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const handleToggleAll = (checked, rows) => {
    if (checked) setSelectedIds(rows.map((r) => r.id));
    else setSelectedIds([]);
  };

  const handleView = (inv) => { setViewInvoice(inv); setViewOpen(true); };
  const handleEdit = (inv) => { setEditingInvoice(inv); setDialogOpen(true); };
  const handleSingleDelete = (id) => { setSingleDeleteId(id); setConfirmDelete(true); };

  const uniqueSuppliers = useMemo(
    () => [...new Set(invoices.map((i) => i.supplier_name).filter(Boolean))],
    [invoices]
  );

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim();
    const list = invoices.filter((i) => {
      const branchMatch = filterBranch === "الكل" || i.branch === filterBranch;
      const supplierMatch = filterSupplier === "الكل" || i.supplier_name === filterSupplier;
      if (s) {
        const searchMatch =
          i.system_invoice_number?.includes(s) ||
          i.supplier_name?.includes(s) ||
          i.supplier_invoice_number?.includes(s);
        return branchMatch && supplierMatch && searchMatch;
      }
      const dateKey = i.invoice_date || i.created_date?.split("T")[0];
      const fromMatch = !dateFrom || (dateKey && dateKey >= dateFrom);
      const toMatch = !dateTo || (dateKey && dateKey <= dateTo);
      return branchMatch && supplierMatch && fromMatch && toMatch;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (b.invoice_date || b.created_date || "").localeCompare(a.invoice_date || a.created_date || "");
        case "oldest":
          return (a.invoice_date || a.created_date || "").localeCompare(b.invoice_date || b.created_date || "");
        case "highest":
          return (b.total_value || 0) - (a.total_value || 0);
        case "cash":
          return (["كاش","انستا","فودافون"].includes(b.payment_type) ? 1 : 0) - (["كاش","انستا","فودافون"].includes(a.payment_type) ? 1 : 0);
        case "supplier_num":
          return (a.supplier_invoice_number || "").localeCompare(b.supplier_invoice_number || "", "ar", { numeric: true });
        case "system_num":
          return (a.system_invoice_number || "").localeCompare(b.system_invoice_number || "", "ar", { numeric: true });
        default:
          return 0;
      }
    });
  }, [invoices, debouncedSearch, filterBranch, filterSupplier, dateFrom, dateTo, sortBy]);

  // إعادة ضبط الصفحة عند تغيير أي فلتر أو ترتيب
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filterBranch, filterSupplier, dateFrom, dateTo, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedInvoices = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilters = filterBranch !== "الكل" || filterSupplier !== "الكل" || search || dateFrom || dateTo;

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">فواتير الشراء</h1>
          <p className="text-gray-500 text-sm mt-0.5">
          {filtered.length} من {invoices.length} فاتورة
          {totalPages > 1 && <span className="text-gray-400"> — صفحة {currentPage} من {totalPages}</span>}
        </p>
        </div>
        {canSaveInvoice && (
          <Button onClick={() => { setEditingInvoice(null); setDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Plus className="w-4 h-4" /> إضافة فاتورة
          </Button>
        )}
      </div>

      <InvoiceStats invoices={invoices} />

      {/* Filters Row */}
      <div className="bg-white rounded-lg border p-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث برقم الفاتورة أو المورد..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-9 pl-8 h-9"
            />
            {search && (
              <button
                onClick={() => { handleSearchChange(""); setDebouncedSearch(""); }}
                className="absolute left-2 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="كل الموردين" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="الكل">كل الموردين</SelectItem>
              {uniqueSuppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
            {/* Quick date presets */}
            <button
              onClick={() => {
                const t = new Date();
                setDateFrom(new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split("T")[0]);
                setDateTo(new Date(t.getFullYear(), t.getMonth() + 1, 0).toISOString().split("T")[0]);
              }}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 whitespace-nowrap"
            >
              هذا الشهر
            </button>
            <button
              onClick={() => {
                const t = new Date();
                setDateFrom(new Date(t.getFullYear(), t.getMonth() - 1, 1).toISOString().split("T")[0]);
                setDateTo(new Date(t.getFullYear(), t.getMonth(), 0).toISOString().split("T")[0]);
              }}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              الشهر الماضي
            </button>
            <span>من:</span><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-32 h-9" />
            <span>إلى:</span><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-32 h-9" />
          </div>
          {hasFilters && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); setDebouncedSearch(""); setFilterBranch("الكل"); setFilterSupplier("الكل"); }} className="text-xs text-red-500 hover:underline whitespace-nowrap">
              مسح الكل
            </button>
          )}
        </div>

        {/* Branch Filter */}
        <div className="flex gap-2 flex-wrap">
          {["الكل", ...BRANCHES].map((b) => (
            <button key={b} onClick={() => setFilterBranch(b)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterBranch === b ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
              {b}
            </button>
          ))}
        </div>

        {/* Sort Buttons */}
        <div className="flex gap-2 flex-wrap items-center border-t pt-2">
          <span className="text-xs text-gray-400 flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> ترتيب:</span>
          {[
            { key: "newest",       label: "📅 الأحدث أولاً" },
            { key: "oldest",       label: "📅 الأقدم أولاً" },
            { key: "highest",      label: "💰 الأعلى قيمة" },
            { key: "cash",         label: "💵 الكاش أولاً" },
            { key: "supplier_num", label: "🔢 رقم المورد" },
            { key: "system_num",   label: "🔢 رقم البرنامج" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSortBy(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sortBy === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-semibold text-teal-700">تم تحديد {selectedIds.length} فاتورة</span>
          <div className="flex gap-2 mr-auto">
            {canSaveInvoice && (
              <Button size="sm" variant="outline" className="border-green-400 text-green-700 hover:bg-green-50 gap-1.5" onClick={() => setConfirmSave(true)}>
                <CheckSquare className="w-3.5 h-3.5" /> تحويل إلى "يتم الحفظ"
              </Button>
            )}
            {canDeleteInvoice && (
              <Button size="sm" variant="outline" className="border-red-400 text-red-600 hover:bg-red-50 gap-1.5" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-3.5 h-3.5" /> حذف المحدد
              </Button>
            )}
            <button className="text-xs text-gray-500 hover:underline" onClick={() => setSelectedIds([])}>إلغاء</button>
          </div>
        </div>
      )}

      <InvoiceTable
        invoices={pagedInvoices}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleSingleDelete}
        onView={handleView}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleAll={handleToggleAll}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs rounded border bg-white disabled:opacity-40 hover:bg-gray-50">««</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs rounded border bg-white disabled:opacity-40 hover:bg-gray-50">‹ السابق</button>
          <span className="text-sm text-gray-600 px-2">صفحة <strong>{currentPage}</strong> من <strong>{totalPages}</strong></span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs rounded border bg-white disabled:opacity-40 hover:bg-gray-50">التالي ›</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs rounded border bg-white disabled:opacity-40 hover:bg-gray-50">»»</button>
        </div>
      )}

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingInvoice(null); }}
        onSubmit={handleSubmit}
        invoice={editingInvoice}
        isLoading={createMutation.isPending || updateMutation.isPending}
        allInvoices={invoices}
      />

      <InvoiceViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        invoice={viewInvoice}
        onEdit={canSaveInvoice ? handleEdit : null}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(o) => { setConfirmDelete(o); if (!o) setSingleDeleteId(null); }}
        title="تأكيد الحذف"
        description={singleDeleteId ? "هل أنت متأكد من حذف هذه الفاتورة؟" : `هل أنت متأكد من حذف ${selectedIds.length} فاتورة؟`}
        onConfirm={singleDeleteId ? executeSingleDelete : executeBulkDelete}
        confirmLabel="حذف"
      />

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="تأكيد التحويل"
        description={`هل أنت متأكد من تحويل ${selectedIds.length} فاتورة إلى "يتم الحفظ"؟`}
        onConfirm={executeBulkSave}
        confirmLabel="تحويل"
        confirmClass="bg-green-600 hover:bg-green-700"
      />
    </div>
  );
}