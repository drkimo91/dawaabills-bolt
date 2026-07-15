/**
 * RiderScheduleTable — جدول مواعيد حضور المناديب حسب يوم الأسبوع
 * مع إمكانية تعديل موعد اليوم (override) والجدول الأسبوعي
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Clock, Pencil, Settings2, AlertCircle } from "lucide-react";
import { getTodayDateStr } from "@/lib/attendance-utils";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function getDefaultWeekly() {
  return DAY_NAMES.map((_, i) => ({
    day: i,
    start_time: "09:00",
    end_time: "17:00",
    is_working_day: i !== 5,
  }));
}

export function getEffectiveSchedule(schedule, todayStr) {
  if (!schedule) return null;
  if (schedule.override_date === todayStr && schedule.override_start_time) {
    return {
      start_time: schedule.override_start_time,
      end_time: schedule.override_end_time,
      is_working_day: true,
      is_override: true,
      reason: schedule.override_reason,
    };
  }
  const today = new Date().getDay();
  const entry = schedule.weekly_schedule?.find((d) => d.day === today);
  if (entry) return { ...entry, is_override: false };
  return null;
}

export default function RiderScheduleTable({ riders, canEdit = false, singleRider = null }) {
  const qc = useQueryClient();
  const today = getTodayDateStr();
  const todayDay = new Date().getDay();

  const [editToday, setEditToday] = useState(null);
  const [editWeekly, setEditWeekly] = useState(null);
  const [todayForm, setTodayForm] = useState({ start_time: "09:00", end_time: "17:00", reason: "" });
  const [weeklyForm, setWeeklyForm] = useState(getDefaultWeekly());

  const { data: schedules = [] } = useQuery({
    queryKey: ["rider-schedules"],
    queryFn: () => base44.entities.RiderSchedule.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ rider, data }) => {
      const existing = schedules.find((s) => s.rider_id === rider.id);
      if (existing) {
        return base44.entities.RiderSchedule.update(existing.id, data);
      }
      return base44.entities.RiderSchedule.create({
        rider_id: rider.id,
        rider_name: rider.name,
        rider_user_id: rider.user_id || "",
        weekly_schedule: getDefaultWeekly(),
        ...data,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rider-schedules"] }),
  });

  const openEditToday = (rider) => {
    const sched = schedules.find((s) => s.rider_id === rider.id);
    const eff = getEffectiveSchedule(sched, today);
    const hasOverride = sched?.override_date === today;
    setTodayForm({
      start_time: eff?.start_time || "09:00",
      end_time: eff?.end_time || "17:00",
      reason: hasOverride ? (sched.override_reason || "") : "",
    });
    setEditToday(rider);
  };

  const openEditWeekly = (rider) => {
    const sched = schedules.find((s) => s.rider_id === rider.id);
    setWeeklyForm(sched?.weekly_schedule?.length === 7 ? [...sched.weekly_schedule] : getDefaultWeekly());
    setEditWeekly(rider);
  };

  const saveToday = () => {
    saveMutation.mutate({
      rider: editToday,
      data: {
        override_date: today,
        override_start_time: todayForm.start_time,
        override_end_time: todayForm.end_time,
        override_reason: todayForm.reason,
      },
    });
    setEditToday(null);
  };

  const clearOverride = () => {
    saveMutation.mutate({
      rider: editToday,
      data: {
        override_date: null,
        override_start_time: null,
        override_end_time: null,
        override_reason: null,
      },
    });
    setEditToday(null);
  };

  const saveWeekly = () => {
    saveMutation.mutate({
      rider: editWeekly,
      data: { weekly_schedule: weeklyForm },
    });
    setEditWeekly(null);
  };

  const displayRiders = singleRider ? [singleRider] : riders;
  const hasOverrideToday = (riderId) => {
    const s = schedules.find((sc) => sc.rider_id === riderId);
    return s?.override_date === today && !!s?.override_start_time;
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-gray-700">مواعيد الحضور — {DAY_NAMES[todayDay]} ({today})</h3>
        </div>

        {/* عرض الجدول — الديسكتوب فقط */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-right p-3 font-medium">المندوب</th>
                <th className="text-right p-3 font-medium">الفرع</th>
                <th className="text-right p-3 font-medium">موعد الحضور</th>
                <th className="text-right p-3 font-medium">موعد الانصراف</th>
                <th className="text-right p-3 font-medium">ملاحظة</th>
                {canEdit && <th className="text-right p-3 font-medium">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {displayRiders.map((rider) => {
                const sched = schedules.find((s) => s.rider_id === rider.id);
                const eff = getEffectiveSchedule(sched, today);
                return (
                  <tr key={rider.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{rider.name}</td>
                    <td className="p-3 text-gray-500 text-xs">{rider.branch}</td>
                    <td className="p-3 text-xs tabular-nums">
                      {eff?.is_working_day === false ? (
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">إجازة</span>
                      ) : eff?.start_time ? (
                        <span className={eff.is_override ? "text-orange-600 font-medium" : "text-gray-700"}>{eff.start_time}</span>
                      ) : (
                        <span className="text-gray-300">لم يُحدد</span>
                      )}
                    </td>
                    <td className="p-3 text-xs tabular-nums">
                      {eff?.is_working_day === false ? "—" : eff?.end_time ? (
                        <span className={eff.is_override ? "text-orange-600 font-medium" : "text-gray-700"}>{eff.end_time}</span>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {eff?.is_override && (
                        <span className="inline-flex items-center gap-1 text-orange-600">
                          <AlertCircle className="w-3 h-3" /> {eff.reason || "معدل لظرف"}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-blue-600 hover:bg-blue-50 gap-1" onClick={() => openEditToday(rider)}>
                            <Pencil className="w-3.5 h-3.5" /> موعد اليوم
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-gray-600 hover:bg-gray-100" onClick={() => openEditWeekly(rider)}>
                            <Settings2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {displayRiders.length === 0 && (
                <tr><td colSpan={canEdit ? 6 : 5} className="p-6 text-center text-gray-400">لا يوجد مناديب</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* عرض بطاقات رأسية — الهاتف فقط */}
        <div className="md:hidden divide-y">
          {displayRiders.map((rider) => {
            const sched = schedules.find((s) => s.rider_id === rider.id);
            const eff = getEffectiveSchedule(sched, today);
            return (
              <div key={rider.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{rider.name}</p>
                    <p className="text-xs text-gray-400">{rider.branch}</p>
                  </div>
                  {eff?.is_working_day === false ? (
                    <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full text-xs font-medium">إجازة</span>
                  ) : eff?.is_override ? (
                    <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-xs font-medium">معدّل</span>
                  ) : (
                    <span className="bg-teal-50 text-teal-600 px-2.5 py-1 rounded-full text-xs font-medium">عادي</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-400 mb-1">الحضور</p>
                    {eff?.is_working_day === false ? (
                      <p className="text-gray-300 text-sm">—</p>
                    ) : eff?.start_time ? (
                      <p className={`text-sm font-bold tabular-nums ${eff.is_override ? "text-orange-600" : "text-gray-700"}`}>{eff.start_time}</p>
                    ) : (
                      <p className="text-gray-300 text-sm">لم يُحدد</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-gray-400 mb-1">الانصراف</p>
                    {eff?.is_working_day === false ? (
                      <p className="text-gray-300 text-sm">—</p>
                    ) : eff?.end_time ? (
                      <p className={`text-sm font-bold tabular-nums ${eff.is_override ? "text-orange-600" : "text-gray-700"}`}>{eff.end_time}</p>
                    ) : (
                      <p className="text-gray-300 text-sm">—</p>
                    )}
                  </div>
                </div>
                {eff?.is_override && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 mb-3">
                    <AlertCircle className="w-3.5 h-3.5" /> {eff.reason || "معدل لظرف"}
                  </div>
                )}
                {canEdit && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 gap-1 flex-1" onClick={() => openEditToday(rider)}>
                      <Pencil className="w-3.5 h-3.5" /> موعد اليوم
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-gray-600 hover:bg-gray-100 px-3" onClick={() => openEditWeekly(rider)}>
                      <Settings2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {displayRiders.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">لا يوجد مناديب</div>
          )}
        </div>
      </div>

      {/* تعديل موعد اليوم */}
      <Dialog open={!!editToday} onOpenChange={(o) => !o && setEditToday(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل موعد الحضور — {editToday?.name}</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-orange-600 bg-orange-50 rounded-lg p-2">
            هذا التعديل ليوم {DAY_NAMES[todayDay]} ({today}) فقط — لن يؤثر على الجدول الأسبوعي.
          </div>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>موعد الحضور</Label>
                <Input type="time" value={todayForm.start_time} onChange={(e) => setTodayForm((p) => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>موعد الانصراف</Label>
                <Input type="time" value={todayForm.end_time} onChange={(e) => setTodayForm((p) => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>السبب (ظرف شخصي)</Label>
              <Input value={todayForm.reason} onChange={(e) => setTodayForm((p) => ({ ...p, reason: e.target.value }))} placeholder="مثال: موعد طبيب..." />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button onClick={saveToday} className="bg-teal-600 hover:bg-teal-700" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التعديل"}
            </Button>
            {hasOverrideToday(editToday?.id) && (
              <Button variant="outline" onClick={clearOverride} disabled={saveMutation.isPending}>
                إلغاء التعديل
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditToday(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* الجدول الأسبوعي */}
      <Dialog open={!!editWeekly} onOpenChange={(o) => !o && setEditWeekly(null)}>
        <DialogContent dir="rtl" className="max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>الجدول الأسبوعي — {editWeekly?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {weeklyForm.map((entry, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border">
                {/* صف علوي: اليوم + الإجازة */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{DAY_NAMES[entry.day]}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{entry.is_working_day ? "عمل" : "إجازة"}</span>
                    <Switch checked={entry.is_working_day} onCheckedChange={(v) => setWeeklyForm((p) => p.map((d, i) => i === idx ? { ...d, is_working_day: v } : d))} />
                  </div>
                </div>
                {/* صف سفلي: المواعيد */}
                {entry.is_working_day ? (
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Label className="text-xs text-gray-400 mb-1 block">الحضور</Label>
                      <Input type="time" value={entry.start_time || "09:00"} onChange={(e) => setWeeklyForm((p) => p.map((d, i) => i === idx ? { ...d, start_time: e.target.value } : d))} className="h-9 text-sm" />
                    </div>
                    <span className="text-gray-400 mt-5">→</span>
                    <div className="flex-1">
                      <Label className="text-xs text-gray-400 mb-1 block">الانصراف</Label>
                      <Input type="time" value={entry.end_time || "17:00"} onChange={(e) => setWeeklyForm((p) => p.map((d, i) => i === idx ? { ...d, end_time: e.target.value } : d))} className="h-9 text-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg py-2 text-center text-xs text-gray-400">إجازة أسبوعية</div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button onClick={saveWeekly} className="bg-teal-600 hover:bg-teal-700" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الجدول"}
            </Button>
            <Button variant="ghost" onClick={() => setEditWeekly(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}