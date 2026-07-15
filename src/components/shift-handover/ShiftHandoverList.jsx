import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Download, Printer, CalendarDays, CalendarRange, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EditHandoverDialog from "./EditHandoverDialog";
import ViewHandoverDialog from "./ViewHandoverDialog";
import TodayHandoverSection from "./TodayHandoverSection";
import BranchHandoverTable from "./BranchHandoverTable";
import * as XLSX from "xlsx";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];
const SHIFT_TYPES = ["صباحي", "مسائي", "نايت"];

const pDate = (r) => r.posting_date || r.date;

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
}

export default function ShiftHandoverList() {
  const { isAdmin, isManager, user } = useUserRole();
  const canSeeAll = isAdmin || isManager;
  const canFilter = isAdmin;
  const today = todayStr();
  const dayDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const off = d.getTimezoneOffset();
      dates.push(new Date(d.getTime() - off * 60000).toISOString().split("T")[0]);
    }
    return dates;
  }, []);
  const oldestDayDate = dayDates[dayDates.length - 1];

  const [fBranch, setFBranch] = useState("");
  const [fEmployee, setFEmployee] = useState("");
  const [fShift, setFShift] = useState("");
  const [fDate, setFDate] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [showRange, setShowRange] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftHandover.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-handovers"] });
      toast({ title: "تم حذف التسليم" });
      setDeleteRecord(null);
    },
    onError: () => toast({ title: "خطأ", description: "تعذر حذف التسليم", variant: "destructive" }),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["shift-handovers", user?.id, canSeeAll],
    queryFn: () => base44.entities.ShiftHandover.list("-date", 500),
  });

  const visibleRecords = useMemo(() => {
    let result = records;
    if (isManager && !isAdmin) {
      result = result.filter((r) => pDate(r) >= oldestDayDate && pDate(r) <= today);
    } else if (!canSeeAll) {
      result = result.filter((r) => r.created_by_id === user?.id && pDate(r) === today);
    }
    if (fBranch) result = result.filter((r) => r.branch === fBranch);
    if (fEmployee) result = result.filter((r) => r.employee_name?.includes(fEmployee));
    if (fShift) result = result.filter((r) => r.shift_type === fShift);
    if (canFilter) {
      if (fDate) result = result.filter((r) => pDate(r) === fDate);
      if (fDateFrom) result = result.filter((r) => pDate(r) >= fDateFrom);
      if (fDateTo) result = result.filter((r) => pDate(r) <= fDateTo);
    }
    return result;
  }, [records, canSeeAll, isAdmin, isManager, user, today, oldestDayDate, fBranch, fEmployee, fShift, fDate, fDateFrom, fDateTo, canFilter]);

  const dayCards = useMemo(() => {
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return dayDates.map((dateStr, i) => {
      const d = new Date(dateStr);
      return {
        dateStr,
        records: visibleRecords.filter((r) => pDate(r) === dateStr),
        label: i === 0 ? "تسليمات اليوم" : i === 1 ? "تسليمات الأمس" : `تسليمات ${dayNames[d.getDay()]}`,
        variant: ["today", "yesterday", "day2", "day3"][i],
      };
    });
  }, [visibleRecords, dayDates]);

  const olderRecords = useMemo(() => visibleRecords.filter((r) => pDate(r) < oldestDayDate), [visibleRecords, oldestDayDate]);

  const setCurrentMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    setFDateFrom(`${y}-${m}-01`);
    setFDateTo(today);
    setFDate("");
    setShowRange(true);
  };

  const isCurrentMonthActive = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return fDateFrom === `${y}-${m}-01` && fDateTo === today;
  })();

  const clearDates = () => {
    setFDate("");
    setFDateFrom("");
    setFDateTo("");
  };

  const exportExcel = () => {
    const data = visibleRecords.map((r) => ({
      "تاريخ الإنشاء": r.date,
      "وقت الإنشاء": r.handover_time ? new Date(r.handover_time).toLocaleString("ar-EG") : "",
      "تاريخ الاحتساب": pDate(r),
      "الفرع": r.branch,
      "نوع الشيفت": r.shift_type,
      "الموظف": r.employee_name,
      "إجمالي المبيعات": r.total_sales,
      "إجمالي المصروفات": r.total_expenses,
      "صافي التسليم": r.net_amount,
      "أنشأه": r.created_by_name || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تسليمات الشيفت");
    XLSX.writeFile(wb, `تسليمات_الشيفت_${today}.xlsx`);
  };

  const filterCls = "h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none";

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">التسليمات</h2>
        {canFilter && visibleRecords.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportExcel}><Download className="w-3.5 h-3.5" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /> طباعة</Button>
          </div>
        )}
      </div>

      {canSeeAll && (
        <div className="bg-white rounded-xl border p-3 mb-4 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <select value={fBranch} onChange={(e) => setFBranch(e.target.value)} className={filterCls}>
              <option value="">كل الفروع</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <input value={fEmployee} onChange={(e) => setFEmployee(e.target.value)} placeholder="اسم الموظف" className={filterCls} />
            <select value={fShift} onChange={(e) => setFShift(e.target.value)} className={filterCls}>
              <option value="">كل الأنواع</option>
              {SHIFT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {canFilter && (
              <input type="date" value={fDate} onChange={(e) => { setFDate(e.target.value); setFDateFrom(""); setFDateTo(""); }} className={filterCls} />
            )}
          </div>
          {canFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={setCurrentMonth}
                className={`h-8 rounded-md border px-3 text-xs font-medium flex items-center gap-1.5 transition-colors ${isCurrentMonthActive ? "bg-blue-600 text-white border-blue-600" : "bg-transparent hover:bg-gray-50"}`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> الشهر الحالي
              </button>
              <button
                onClick={() => { setShowRange(!showRange); if (showRange) clearDates(); }}
                className={`h-8 rounded-md border px-3 text-xs font-medium flex items-center gap-1.5 transition-colors ${(showRange && (fDateFrom || fDateTo)) ? "bg-blue-600 text-white border-blue-600" : "bg-transparent hover:bg-gray-50"}`}
              >
                <CalendarRange className="w-3.5 h-3.5" /> مدة محددة
              </button>
              {(fDate || fDateFrom || fDateTo) && (
                <button onClick={clearDates} className="h-8 rounded-md border px-3 text-xs font-medium text-gray-500 hover:bg-gray-50">
                  مسح التاريخ
                </button>
              )}
            </div>
          )}
          {canFilter && showRange && (
            <div className="flex items-center gap-2">
              <input type="date" value={fDateFrom} onChange={(e) => { setFDateFrom(e.target.value); setFDate(""); }} className={filterCls} placeholder="من" />
              <span className="text-xs text-gray-400">إلى</span>
              <input type="date" value={fDateTo} onChange={(e) => { setFDateTo(e.target.value); setFDate(""); }} className={filterCls} placeholder="إلى" />
            </div>
          )}
          {!canFilter && (
            <p className="text-xs text-gray-400 text-center pt-1">عرض تسليمات اليوم الحالي فقط</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : visibleRecords.length === 0 ? (
        <div className="text-center py-12 text-gray-400">لا توجد تسليمات</div>
      ) : (
        <>
          {dayCards.filter((c) => c.records.length > 0).map((card) => (
            <TodayHandoverSection
              key={card.dateStr}
              records={card.records}
              canFilter={canFilter}
              onView={setViewRecord}
              onEdit={setEditRecord}
              onDelete={setDeleteRecord}
              title={card.label}
              variant={card.variant}
              dateLabel={card.dateStr}
            />
          ))}

          {olderRecords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">التسليمات السابقة</h3>
                <span className="text-xs text-gray-400">({olderRecords.length} تسليم)</span>
              </div>
              <div className="space-y-3">
                {(fBranch ? [fBranch] : BRANCHES).map((branch) => {
                  const branchRecords = olderRecords.filter((r) => r.branch === branch);
                  if (branchRecords.length === 0) return null;
                  return (
                    <BranchHandoverTable
                      key={branch}
                      branch={branch}
                      records={branchRecords}
                      canFilter={canFilter}
                      onView={setViewRecord}
                      onEdit={setEditRecord}
                      onDelete={setDeleteRecord}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {viewRecord && (
        <ViewHandoverDialog open={!!viewRecord} onOpenChange={(v) => !v && setViewRecord(null)} record={viewRecord} />
      )}

      {editRecord && (
        <EditHandoverDialog open={!!editRecord} onOpenChange={(v) => !v && setEditRecord(null)} record={editRecord} />
      )}

      <Dialog open={!!deleteRecord} onOpenChange={(v) => !v && setDeleteRecord(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            هل أنت متأكد من حذف تسليم الشيفت بتاريخ {deleteRecord?.date} للموظف {deleteRecord?.employee_name}؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteRecord.id)}>
              {deleteMutation.isPending ? "جاري الحذف..." : "نعم، حذف"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteRecord(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}