import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatTime, computeTotalHours } from "@/lib/attendance-utils";

export default function RiderHistoryDialog({ rider, open, onOpenChange }) {
  const today = new Date();
  const [mode, setMode] = useState("month");
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [date, setDate] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);

  const { data: records = [] } = useQuery({
    queryKey: ["rider-history", rider?.id, mode, month, date],
    queryFn: () => base44.entities.AttendanceRecord.filter({ rider_id: rider.id }, "-date"),
    enabled: !!rider?.id && open,
    select: (data) => {
      if (mode === "month") return data.filter((r) => r.date && r.date.startsWith(month));
      return data.filter((r) => r.date === date);
    },
  });

  const totalHours = records.reduce((sum, r) => {
    if (!r.check_in_time || !r.check_out_time) return sum;
    return sum + (new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime()) / 3600000;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">سجل الحضور — {rider?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setMode("month")}
            className={`px-3 py-1.5 rounded-lg text-sm ${mode === "month" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            شهر كامل
          </button>
          <button
            onClick={() => setMode("date")}
            className={`px-3 py-1.5 rounded-lg text-sm ${mode === "date" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            تاريخ محدد
          </button>
          {mode === "month" ? (
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          ) : (
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          )}
          <div className="mr-auto text-sm text-gray-500 self-center">
            إجمالي الساعات: <span className="font-bold text-teal-600">{totalHours.toFixed(1)}س</span>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                <th className="text-right p-2 font-medium">التاريخ</th>
                <th className="text-right p-2 font-medium">الحضور</th>
                <th className="text-right p-2 font-medium">الانصراف</th>
                <th className="text-right p-2 font-medium">المدة</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.date}</td>
                  <td className="p-2">{formatTime(r.check_in_time)}</td>
                  <td className="p-2">{formatTime(r.check_out_time)}</td>
                  <td className="p-2 font-medium">{computeTotalHours(r.check_in_time, r.check_out_time) || "—"}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400">لا توجد سجلات في هذه الفترة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}