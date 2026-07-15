/**
 * CheckInScreen — تسجيل الحضور/الانصراف مع دعم التسجيل المتعدد في نفس اليوم
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, LogIn, LogOut, CheckCircle } from "lucide-react";
import LiveTimer from "./LiveTimer";
import { getTodayDateStr, formatTime, computeTotalHours } from "@/lib/attendance-utils";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export default function CheckInScreen({ rider, actingUser, isSupervisor }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState(rider?.branch || BRANCHES[0]);
  const [changingBranch, setChangingBranch] = useState(false);

  useEffect(() => {
    if (rider?.branch) setSelectedBranch(rider.branch);
  }, [rider?.branch]);

  const updateBranchMutation = useMutation({
    mutationFn: ({ recordId, branch }) => base44.entities.AttendanceRecord.update(recordId, { branch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today", rider.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-attendance"] });
      setChangingBranch(false);
    },
    onError: () => toast({ title: "خطأ", description: "تعذر تغيير الفرع", variant: "destructive" }),
  });
  const today = getTodayDateStr();

  // جلب كل سجلات اليوم
  const { data: todayRecords = [], isLoading } = useQuery({
    queryKey: ["attendance-today", rider?.id],
    queryFn: () => base44.entities.AttendanceRecord.filter({ rider_id: rider.id, date: today }),
    enabled: !!rider?.id,
  });

  // السجل الحالي المفتوح (بدون انصراف)
  const activeRecord = todayRecords.find((r) => !r.check_out_time);
  // السجلات المكتملة
  const completedRecords = todayRecords.filter((r) => r.check_out_time);

  const checkInMutation = useMutation({
    mutationFn: () =>
      base44.entities.AttendanceRecord.create({
        rider_id: rider.id,
        rider_name: rider.name,
        rider_user_id: rider.user_id,
        branch: selectedBranch,
        date: today,
        check_in_time: new Date().toISOString(),
        ...(isSupervisor ? { created_by_supervisor: actingUser?.full_name } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today", rider.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-attendance"] });
    },
    onError: () => toast({ title: "خطأ", description: "تعذر تسجيل الحضور", variant: "destructive" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => {
      const now = new Date().toISOString();
      return base44.entities.AttendanceRecord.update(activeRecord.id, { check_out_time: now });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today", rider.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-attendance"] });
    },
    onError: () => toast({ title: "خطأ", description: "تعذر تسجيل الانصراف", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-sm mx-auto space-y-4" dir="rtl">
      {isSupervisor && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 text-center">
          تسجيل نيابة عن: <span className="font-bold">{rider.name}</span>
        </div>
      )}

      {/* اسم المندوب والتاريخ */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 text-center">
        <h2 className="font-bold text-lg">{rider.name}</h2>
        <p className="text-xs text-gray-400 mt-1">
          {new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* السجل النشط */}
      {activeRecord ? (
        <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">حاضر الآن</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="bg-white rounded-xl p-2 text-center">
              <p className="text-xs text-gray-400">وقت الحضور</p>
              <p className="font-bold">{formatTime(activeRecord.check_in_time)}</p>
            </div>
            <div className="bg-white rounded-xl p-2 text-center">
              <p className="text-xs text-gray-400">الوقت المنقضي</p>
              <p className="font-bold text-teal-600 tabular-nums">
                <LiveTimer startTime={activeRecord.check_in_time} />
              </p>
            </div>
          </div>
          {activeRecord.created_by_supervisor && (
            <p className="text-xs text-gray-400 mb-2 text-center">سُجِّل بواسطة: {activeRecord.created_by_supervisor}</p>
          )}

          {/* تغيير الفرع */}
          <div className="mb-3">
            {changingBranch ? (
              <div className="flex items-center gap-2">
                <Select
                  defaultValue={activeRecord.branch}
                  onValueChange={(b) => updateBranchMutation.mutate({ recordId: activeRecord.id, branch: b })}
                >
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button onClick={() => setChangingBranch(false)} className="text-xs text-gray-400 px-2">إلغاء</button>
              </div>
            ) : (
              <button
                onClick={() => setChangingBranch(true)}
                className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
              >
                الفرع الحالي: <span className="font-bold">{activeRecord.branch}</span> · تغيير
              </button>
            )}
          </div>

          <button
            onClick={() => checkOutMutation.mutate()}
            disabled={checkOutMutation.isPending}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" /> تسجيل انصراف
          </button>
        </div>
      ) : (
        <>
          {/* اختيار الفرع */}
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-sm font-medium text-gray-600 mb-2">الفرع المتواجد به الآن:</p>
            <div className="flex gap-2 flex-wrap">
              {BRANCHES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBranch(b)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedBranch === b
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending}
            className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            {completedRecords.length > 0 ? "تسجيل حضور مرة أخرى" : `تسجيل حضور من ${selectedBranch}`}
          </button>
        </>
      )}

      {/* السجلات المكتملة اليوم */}
      {completedRecords.length > 0 && (
        <div className="bg-white rounded-2xl border p-4">
          <p className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            سجلات اليوم ({completedRecords.length})
          </p>
          <div className="space-y-2">
            {completedRecords.map((rec, i) => (
              <div key={rec.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <div>
                    <p className="font-medium">{formatTime(rec.check_in_time)} — {formatTime(rec.check_out_time)}</p>
                    <p className="text-xs text-gray-400">{rec.branch}</p>
                  </div>
                </div>
                <span className="text-teal-600 font-bold text-xs">{computeTotalHours(rec.check_in_time, rec.check_out_time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}