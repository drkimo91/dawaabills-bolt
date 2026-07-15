/**
 * SupervisorTripsBoard — لوحة الحركات للمشرف
 * - جدول منفصل لكل مندوب حاضر
 * - يعرض الأوردرات/المشاوير والزمن لكل وجهة
 * - إلغاء مشوار أو أوردر
 * - تسجيل عاطل أو إذن
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getTodayDateStr, formatTime } from "@/lib/attendance-utils";
import { computeStopDuration, computeTripDuration, stopTypeColor } from "@/lib/trip-utils";
import LiveTimer from "@/components/attendance/LiveTimer";
import { Route, Clock, X, PauseCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const IDLE_REASONS = ["عطلان", "إذن", "استراحة", "انتظار أوردر"];

export default function SupervisorTripsBoard({ actingUser }) {
  const today = getTodayDateStr();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ========== جلب البيانات ==========
  const { data: riders = [] } = useQuery({
    queryKey: ["riders"],
    queryFn: () => base44.entities.Rider.list(),
    staleTime: 60000,
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["admin-attendance", today],
    queryFn: () => base44.entities.AttendanceRecord.filter({ date: today }),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const { data: allTrips = [] } = useQuery({
    queryKey: ["supervisor-all-trips"],
    queryFn: () => base44.entities.Trip.list("-start_time", 200),
    refetchInterval: 8000,
    staleTime: 4000,
  });

  const { data: allStops = [] } = useQuery({
    queryKey: ["supervisor-all-stops"],
    queryFn: () => base44.entities.TripStop.list(null, 500),
    refetchInterval: 8000,
    staleTime: 4000,
  });

  // ========== المناديب الحاضرون اليوم (لم ينصرفوا) ==========
  const presentRiderIds = useMemo(() => {
    return new Set(
      todayAttendance.filter((a) => !a.check_out_time).map((a) => a.rider_id)
    );
  }, [todayAttendance]);

  // تجميع الحركات والوجهات لكل مندوب حاضر
  const riderData = useMemo(() => {
    return riders
      .filter((r) => presentRiderIds.has(r.id))
      .map((rider) => {
        const todayTrips = allTrips
          .filter((t) => t.rider_id === rider.id && t.start_time >= today)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        const activeTrip = todayTrips.find((t) => !t.end_time) || null;
        // كل الوجهات لكل حركات اليوم مرتبة زمنياً
        const allTodayStops = allStops
          .filter((s) => todayTrips.some((t) => t.id === s.trip_id))
          .sort((a, b) => new Date(a.stop_start_time) - new Date(b.stop_start_time));
        const activeTripStops = activeTrip
          ? allStops
              .filter((s) => s.trip_id === activeTrip.id)
              .sort((a, b) => new Date(a.stop_start_time) - new Date(b.stop_start_time))
          : [];
        const currentStop = activeTripStops.find((s) => !s.stop_end_time) || null;
        return { rider, todayTrips, activeTrip, activeTripStops, allTodayStops, currentStop };
      });
  }, [riders, presentRiderIds, allTrips, allStops, today]);

  // ========== حالة الـ dialogs ==========
  const [cancelTripTarget, setCancelTripTarget] = useState(null);
  const [cancelStopTarget, setCancelStopTarget] = useState(null);
  const [deleteStopTarget, setDeleteStopTarget] = useState(null); // حذف كامل (ماضية)
  const [deleteTripTarget, setDeleteTripTarget] = useState(null); // حذف حركة منتهية
  const [idleTarget, setIdleTarget] = useState(null);
  const [idleReason, setIdleReason] = useState(IDLE_REASONS[0]);
  const [expandedRiders, setExpandedRiders] = useState({});

  const toggleExpand = (riderId) =>
    setExpandedRiders((prev) => ({ ...prev, [riderId]: !prev[riderId] }));

  // ========== إلغاء مشوار ==========
  const cancelTripMutation = useMutation({
    mutationFn: async ({ trip }) => {
      const now = new Date().toISOString();
      // أغلق الوجهة المفتوحة إن وجدت
      const openStop = allStops.find((s) => s.trip_id === trip.id && !s.stop_end_time);
      if (openStop) await base44.entities.TripStop.update(openStop.id, { stop_end_time: now });
      await base44.entities.Trip.update(trip.id, { end_time: now });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-trips"] });
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-stops"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-trips"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-stops"] });
      setCancelTripTarget(null);
      toast({ title: "تم إلغاء المشوار" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  // ========== إلغاء وجهة (أوردر) ==========
  const cancelStopMutation = useMutation({
    mutationFn: async ({ stop }) => {
      await base44.entities.TripStop.update(stop.id, {
        stop_end_time: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-stops"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-stops"] });
      setCancelStopTarget(null);
      toast({ title: "تم إغلاق الوجهة" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  // ========== تسجيل عاطل/إذن (بدون انصراف — فقط تحديث idle_status) ==========
  const idleMutation = useMutation({
    mutationFn: async ({ rider }) => {
      const now = new Date().toISOString();
      // أغلق الحركة المفتوحة إن وجدت
      const activeTrip = allTrips.find((t) => t.rider_id === rider.id && !t.end_time);
      if (activeTrip) {
        const openStop = allStops.find((s) => s.trip_id === activeTrip.id && !s.stop_end_time);
        if (openStop) await base44.entities.TripStop.update(openStop.id, { stop_end_time: now });
        await base44.entities.Trip.update(activeTrip.id, { end_time: now });
      }
      // سجّل حالة العطالة في الحضور (بدون انصراف)
      const att = todayAttendance.find((a) => a.rider_id === rider.id && !a.check_out_time);
      if (att) {
        await base44.entities.AttendanceRecord.update(att.id, {
          idle_status: idleReason,
          idle_start_time: now,
          created_by_supervisor: actingUser?.full_name || "مشرف",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-attendance", today] });
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-trips"] });
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-stops"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-trips"] });
      setIdleTarget(null);
      toast({ title: `تم تسجيل: ${idleReason}` });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  // ========== حذف وجهة (stop) نهائياً ==========
  const deleteStopMutation = useMutation({
    mutationFn: ({ stop }) => base44.entities.TripStop.delete(stop.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-stops"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-stops"] });
      setDeleteStopTarget(null);
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  // ========== حذف حركة (trip) كاملة مع وجهاتها ==========
  const deleteTripMutation = useMutation({
    mutationFn: async ({ trip }) => {
      const tripStops = allStops.filter((s) => s.trip_id === trip.id);
      await Promise.all(tripStops.map((s) => base44.entities.TripStop.delete(s.id)));
      await base44.entities.Trip.delete(trip.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-trips"] });
      queryClient.invalidateQueries({ queryKey: ["supervisor-all-stops"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-trips"] });
      queryClient.invalidateQueries({ queryKey: ["all-active-stops"] });
      setDeleteTripTarget(null);
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  // ========== إلغاء حالة العطالة (رجع للحضور) ==========
  const clearIdleMutation = useMutation({
    mutationFn: async (riderId) => {
      const att = todayAttendance.find((a) => a.rider_id === riderId && !a.check_out_time);
      if (att) {
        await base44.entities.AttendanceRecord.update(att.id, {
          idle_status: null,
          idle_start_time: null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-attendance", today] });
      toast({ title: "تم إلغاء حالة العطالة" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex items-center gap-2 mb-5">
        <Route className="w-5 h-5 text-teal-600" />
        <h2 className="text-base font-bold text-gray-800">لوحة متابعة الحركات</h2>
        <span className="text-xs text-gray-400">({riderData.length} مندوب حاضر)</span>
      </div>

      {riderData.length === 0 && (
        <div className="text-center py-16 text-gray-400">لا يوجد مناديب حاضرون الآن</div>
      )}

      <div className="space-y-4">
        {riderData.map(({ rider, todayTrips, activeTrip, activeTripStops, currentStop }) => {
          const isExpanded = expandedRiders[rider.id] !== false; // مفتوح افتراضياً
          const completedStops = activeTripStops.filter((s) => s.stop_end_time);
          const allTodayStops = allStops.filter((s) =>
            todayTrips.some((t) => t.id === s.trip_id)
          );
          const totalOrdersToday = allTodayStops.filter((s) => s.stop_type === "أوردر").length;
          const totalTripsToday = todayTrips.length;
          const att = todayAttendance.find((a) => a.rider_id === rider.id && !a.check_out_time);
          const idleStatus = att?.idle_status;
          const idleStartTime = att?.idle_start_time;

          return (
            <div key={rider.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {/* رأس بطاقة المندوب */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-gray-50 border-b"
                onClick={() => toggleExpand(rider.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {rider.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{rider.name}</p>
                    <p className="text-xs text-gray-400">{att?.branch || rider.branch}</p>
                  </div>
                  {idleStatus ? (
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-xs gap-1">
                      {idleStatus} · <LiveTimer startTime={idleStartTime} />
                    </Badge>
                  ) : activeTrip ? (
                    <Badge className="bg-teal-100 text-teal-700 border-0 text-xs">
                      في حركة · <LiveTimer startTime={activeTrip.start_time} />
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">حاضر</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                    <span>{totalTripsToday} حركة اليوم</span>
                    <span>{totalOrdersToday} أوردر</span>
                  </div>
                  {idleStatus ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); clearIdleMutation.mutate(rider.id); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-xs font-medium border border-green-200 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> عودة
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIdleTarget({ rider }); setIdleReason(IDLE_REASONS[0]); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-medium border border-orange-200 transition-colors"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> عطلان/إذن
                    </button>
                  )}
                  {activeTrip && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCancelTripTarget({ trip: activeTrip, riderName: rider.name }); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium border border-red-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> إلغاء المشوار
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* جدول كل حركات اليوم */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  {todayTrips.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">لم تبدأ أي حركة اليوم</div>
                  ) : (
                    <div>
                      {todayTrips.map((trip, tripIdx) => {
                        const tripStops = allStops
                          .filter((s) => s.trip_id === trip.id)
                          .sort((a, b) => new Date(a.stop_start_time) - new Date(b.stop_start_time));
                        const isActiveTrip = !trip.end_time;
                        return (
                          <div key={trip.id} className={tripIdx > 0 ? "border-t-2 border-gray-100" : ""}>
                            {/* رأس الحركة */}
                            <div className={`flex items-center justify-between px-4 py-2 ${isActiveTrip ? "bg-teal-50/60" : "bg-gray-50/80"}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">حركة {tripIdx + 1}</span>
                                {isActiveTrip ? (
                                  <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                    جارية · <LiveTimer startTime={trip.start_time} />
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    {formatTime(trip.start_time)} ← {formatTime(trip.end_time)} · {computeTripDuration(trip)}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">({tripStops.length} وجهة)</span>
                              </div>
                              <button
                                onClick={() => setDeleteTripTarget({ trip, riderName: rider.name })}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="حذف الحركة كاملة"
                              >
                                <X className="w-3.5 h-3.5" /> حذف الحركة
                              </button>
                            </div>

                            {tripStops.length === 0 ? (
                              <div className="px-4 py-3 text-xs text-gray-400 text-center">لا توجد وجهات مسجّلة</div>
                            ) : (
                              <table className="w-full text-sm min-w-[540px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs border-b">
                                  <tr>
                                    <th className="text-right p-2 px-3 font-medium">#</th>
                                    <th className="text-right p-2 font-medium">النوع</th>
                                    <th className="text-right p-2 font-medium">الوجهة</th>
                                    <th className="text-right p-2 font-medium">الأوردر/العميل</th>
                                    <th className="text-right p-2 font-medium">بدأ</th>
                                    <th className="text-right p-2 font-medium">المدة</th>
                                    <th className="text-right p-2 font-medium">الحالة</th>
                                    <th className="p-2"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tripStops.map((stop, idx) => {
                                    const isActive = !stop.stop_end_time;
                                    return (
                                      <tr key={stop.id} className={`border-t ${isActive ? "bg-teal-50/30" : "hover:bg-gray-50"}`}>
                                        <td className="p-2 px-3 text-gray-400 text-xs">{idx + 1}</td>
                                        <td className="p-2">
                                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stopTypeColor[stop.stop_type] || "bg-gray-100 text-gray-600"}`}>
                                            {stop.stop_type}
                                          </span>
                                        </td>
                                        <td className="p-2 font-medium text-gray-800">{stop.destination || "—"}</td>
                                        <td className="p-2 text-gray-500 text-xs">{stop.order_or_customer_info || "—"}</td>
                                        <td className="p-2 text-gray-400 text-xs tabular-nums">{formatTime(stop.stop_start_time)}</td>
                                        <td className="p-2 text-gray-700 font-medium tabular-nums">
                                          {isActive
                                            ? <LiveTimer startTime={stop.stop_start_time} />
                                            : computeStopDuration(stop)
                                          }
                                        </td>
                                        <td className="p-2">
                                          {isActive ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-medium">
                                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> جارٍ
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> مكتمل
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {isActive ? (
                                            <button
                                              onClick={() => setCancelStopTarget({ stop, riderName: rider.name })}
                                              className="text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded transition-colors"
                                              title="إغلاق الوجهة"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => setDeleteStopTarget({ stop, riderName: rider.name })}
                                              className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                              title="حذف الوجهة"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog: إلغاء المشوار */}
      <Dialog open={!!cancelTripTarget} onOpenChange={(v) => !v && setCancelTripTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> إلغاء المشوار
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            هل تريد إلغاء وإنهاء المشوار الجاري للمندوب <span className="font-bold">{cancelTripTarget?.riderName}</span>؟
            سيتم إغلاق الوجهة الحالية وتسجيل وقت الانتهاء الآن.
          </p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="bg-red-500 hover:bg-red-600"
              disabled={cancelTripMutation.isPending}
              onClick={() => cancelTripMutation.mutate(cancelTripTarget)}
            >
              {cancelTripMutation.isPending ? "جاري الإلغاء..." : "نعم، إلغاء المشوار"}
            </Button>
            <Button variant="outline" onClick={() => setCancelTripTarget(null)}>تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: حذف وجهة مكتملة */}
      <Dialog open={!!deleteStopTarget} onOpenChange={(v) => !v && setDeleteStopTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> حذف الوجهة
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            حذف وجهة <span className="font-bold">{deleteStopTarget?.stop?.destination}</span> نهائياً؟ لا يمكن التراجع.
          </p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteStopMutation.isPending}
              onClick={() => deleteStopMutation.mutate(deleteStopTarget)}
            >
              {deleteStopMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteStopTarget(null)}>تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: حذف حركة كاملة */}
      <Dialog open={!!deleteTripTarget} onOpenChange={(v) => !v && setDeleteTripTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> حذف الحركة
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            حذف هذه الحركة بكل وجهاتها للمندوب <span className="font-bold">{deleteTripTarget?.riderName}</span>؟ لا يمكن التراجع.
          </p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteTripMutation.isPending}
              onClick={() => deleteTripMutation.mutate(deleteTripTarget)}
            >
              {deleteTripMutation.isPending ? "جاري الحذف..." : "حذف الحركة"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteTripTarget(null)}>تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: إلغاء وجهة */}
      <Dialog open={!!cancelStopTarget} onOpenChange={(v) => !v && setCancelStopTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" /> إغلاق الوجهة
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            إغلاق وجهة <span className="font-bold">{cancelStopTarget?.stop?.destination}</span> للمندوب{" "}
            <span className="font-bold">{cancelStopTarget?.riderName}</span>؟ سيتم تسجيل وقت الانتهاء الآن.
          </p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="bg-red-500 hover:bg-red-600"
              disabled={cancelStopMutation.isPending}
              onClick={() => cancelStopMutation.mutate(cancelStopTarget)}
            >
              {cancelStopMutation.isPending ? "جاري الإغلاق..." : "نعم، أغلق الوجهة"}
            </Button>
            <Button variant="outline" onClick={() => setCancelStopTarget(null)}>تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: عاطل / إذن */}
      <Dialog open={!!idleTarget} onOpenChange={(v) => !v && setIdleTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-orange-500" /> تسجيل عاطل / إذن
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-3">
            المندوب: <span className="font-bold">{idleTarget?.rider?.name}</span>
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">السبب:</p>
            <Select value={idleReason} onValueChange={setIdleReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDLE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 mt-2">
            سيتم إنهاء الحركة الجارية إن وجدت وتسجيل الانصراف بسبب: <strong>{idleReason}</strong>
          </p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              disabled={idleMutation.isPending}
              onClick={() => idleMutation.mutate(idleTarget)}
            >
              {idleMutation.isPending ? "جاري التسجيل..." : `تسجيل ${idleReason}`}
            </Button>
            <Button variant="outline" onClick={() => setIdleTarget(null)}>تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}