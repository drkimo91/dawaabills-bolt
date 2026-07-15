/**
 * TripScreen — مكوّن قابل لإعادة الاستخدام لإدارة الحركات
 * Props:
 *   rider          — كائن المندوب (name, id, branch, user_id)
 *   actingUser     — المستخدم الحالي
 *   isSupervisor   — هل يتصرف نيابة عن مندوب؟
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, Plus, Square, CheckCircle, Navigation, CalendarCheck } from "lucide-react";
import LiveTimer from "@/components/attendance/LiveTimer";
import StopSelectionDialog from "./StopSelectionDialog";
import { formatTime, computeTripDuration, computeStopDuration, stopTypeColor } from "@/lib/trip-utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export default function TripScreen({ rider, actingUser, isSupervisor }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [tripSummary, setTripSummary] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(rider?.branch || BRANCHES[0]);

  useEffect(() => {
    if (rider?.branch) setSelectedBranch(rider.branch);
  }, [rider?.branch]);

  const supervisorName = isSupervisor ? actingUser?.full_name : null;

  // جلب الفرع الحالي من سجل الحضور اليوم
  const today = new Date().toISOString().split("T")[0];
  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance-today", rider?.id],
    queryFn: () => base44.entities.AttendanceRecord.filter({ rider_id: rider.id, date: today }),
    enabled: !!rider?.id,
  });

  const { data: activeTrip } = useQuery({
    queryKey: ["active-trip", rider?.id],
    queryFn: () => base44.entities.Trip.filter({ rider_id: rider.id }),
    enabled: !!rider?.id,
    select: (data) => data.find((t) => !t.end_time),
  });

  const { data: stops = [] } = useQuery({
    queryKey: ["trip-stops", activeTrip?.id],
    queryFn: () => base44.entities.TripStop.filter({ trip_id: activeTrip.id }),
    enabled: !!activeTrip?.id,
  });

  const { data: savedLocations = [] } = useQuery({
    queryKey: ["saved-locations-all-active"],
    queryFn: () => base44.entities.SavedLocation.filter({ is_active: true }),
    select: (data) => data.filter(
      (loc, idx, self) => idx === self.findIndex((l) => l.location_name === loc.location_name)
    ),
  });

  useEffect(() => {
    if (activeTrip?.id) {
      const unsub = base44.entities.TripStop.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ["trip-stops", activeTrip.id] });
      });
      return () => unsub();
    }
  }, [activeTrip?.id, queryClient]);

  const sortedStops = [...stops].sort((a, b) => new Date(a.stop_start_time) - new Date(b.stop_start_time));
  const currentStop = sortedStops.find((s) => !s.stop_end_time);
  const completedStops = sortedStops.filter((s) => s.stop_end_time);

  const startTripMutation = useMutation({
    mutationFn: async (stopData) => {
      const now = new Date().toISOString();
      const trip = await base44.entities.Trip.create({
        rider_id: rider.id,
        rider_name: rider.name,
        rider_user_id: rider.user_id,
        branch: selectedBranch,
        start_time: now,
        ...(supervisorName ? { created_by_supervisor: supervisorName } : {}),
      });
      await base44.entities.TripStop.create({
        trip_id: trip.id,
        rider_user_id: rider.user_id,
        stop_type: stopData.stop_type,
        destination: stopData.destination,
        order_or_customer_info: stopData.order_or_customer_info,
        stop_start_time: now,
        ...(supervisorName ? { created_by_supervisor: supervisorName } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-trip", rider.id] });
      queryClient.invalidateQueries({ queryKey: ["all-trips"] });
      setStopDialogOpen(false);
      // no toast
    },
    onError: () => toast({ title: "خطأ", description: "تعذر بدء الحركة", variant: "destructive" }),
  });

  const addStopMutation = useMutation({
    mutationFn: async (stopData) => {
      const now = new Date().toISOString();
      if (currentStop) {
        await base44.entities.TripStop.update(currentStop.id, { stop_end_time: now });
      }
      await base44.entities.TripStop.create({
        trip_id: activeTrip.id,
        rider_user_id: rider.user_id,
        stop_type: stopData.stop_type,
        destination: stopData.destination,
        order_or_customer_info: stopData.order_or_customer_info,
        stop_start_time: now,
        ...(supervisorName ? { created_by_supervisor: supervisorName } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-stops", activeTrip.id] });
      setStopDialogOpen(false);
      // no toast
    },
    onError: () => toast({ title: "خطأ", description: "تعذر إضافة الوجهة", variant: "destructive" }),
  });

  const endTripMutation = useMutation({
    mutationFn: async ({ tripId, stopId, startTime, stopsCount }) => {
      const now = new Date().toISOString();
      if (stopId) {
        try {
          await base44.entities.TripStop.update(stopId, { stop_end_time: now });
        } catch (e) {
          // تجاهل — المهم إنهاء الرحلة
        }
      }
      if (!tripId) throw new Error("no active trip");
      await base44.entities.Trip.update(tripId, { end_time: now });
      return { startTime, endTime: now, stopsCount };
    },
    onSuccess: (data) => {
      setTripSummary(data);
      queryClient.invalidateQueries({ queryKey: ["active-trip", rider.id] });
      queryClient.invalidateQueries({ queryKey: ["all-trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip-stops"] });
      setEndConfirmOpen(false);
    },
    onError: () => toast({ title: "خطأ", description: "تعذر إنهاء الرحلة", variant: "destructive" }),
  });

  if (tripSummary) {
    return (
      <div className="flex items-center justify-center py-12 p-6">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">تم إنهاء الرحلة</h2>
          <p className="text-gray-500 mb-4">إجمالي مدة الحركة</p>
          <p className="text-3xl font-bold text-teal-600 mb-2">
            {computeTripDuration({ start_time: tripSummary.startTime, end_time: tripSummary.endTime })}
          </p>
          <p className="text-sm text-gray-400">عدد الوجهات: {tripSummary.stopsCount}</p>
          <button onClick={() => setTripSummary(null)} className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium">
            تم
          </button>
        </div>
      </div>
    );
  }

  // يُسمح ببدء حركة إذا سُجِّل حضور اليوم ولا يزال مفتوحاً (بدون انصراف)
  const hasCheckedIn = Array.isArray(todayAttendance)
    ? todayAttendance.some((r) => !r.check_out_time)
    : todayAttendance && !todayAttendance?.check_out_time;

  if (!activeTrip) {
    return (
      <>
        <div className="flex items-center justify-center py-6 p-6">
          <div className="text-center max-w-sm w-full">
            {isSupervisor && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                تسجيل نيابة عن: <span className="font-bold">{rider.name}</span>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4">
              <h2 className="font-bold text-lg mb-1">{rider.name}</h2>
              <p className="text-xs text-gray-400 mt-1">
                {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}
              </p>
            </div>

            {!hasCheckedIn && (
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 text-center">
                <CalendarCheck className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-700">يجب تسجيل الحضور أولاً</p>
                <p className="text-xs text-amber-600 mt-1">لا يمكن بدء حركة قبل تسجيل حضور اليوم{isSupervisor ? " نيابة عن المندوب" : ""}.</p>
              </div>
            )}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">مكان التحرك (الفرع):</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {BRANCHES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBranch(b)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${selectedBranch === b ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setStopDialogOpen(true)}
              disabled={!hasCheckedIn}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${hasCheckedIn ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
              <Navigation className="w-5 h-5" /> بدء حركة من {selectedBranch}
            </button>
          </div>
        </div>
        <StopSelectionDialog
          open={stopDialogOpen}
          onOpenChange={setStopDialogOpen}
          onConfirm={startTripMutation.mutate}
          savedLocations={savedLocations}
          isLoading={startTripMutation.isPending}
          title="بدء حركة جديدة"
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-[60vh] p-4" dir="rtl">
        <div className="max-w-md mx-auto space-y-4">
          {isSupervisor && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 text-center">
              تسجيل نيابة عن: <span className="font-bold">{rider.name}</span>
            </div>
          )}
          <div className="bg-teal-600 text-white rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">مدة الحركة</span>
            </div>
            <p className="text-3xl font-bold tabular-nums">
              <LiveTimer startTime={activeTrip.start_time} />
            </p>
            <p className="text-teal-100 text-xs mt-2">
              بدأت في {formatTime(activeTrip.start_time)} · {sortedStops.length} وجهة
            </p>
          </div>

          {currentStop && (
            <div className="bg-white rounded-2xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">الوجهة الحالية</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stopTypeColor[currentStop.stop_type]}`}>
                  {currentStop.stop_type}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <p className="text-xs text-gray-400">الوجهة</p>
                <p className="font-bold">{currentStop.destination || "—"}</p>
              </div>
              {currentStop.order_or_customer_info && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-gray-400">معلومات الأوردر / العميل</p>
                  <p className="font-medium text-sm">{currentStop.order_or_customer_info}</p>
                </div>
              )}
              <div className="bg-teal-50 rounded-xl p-3 flex items-center gap-2 text-sm text-teal-700">
                <Clock className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs text-teal-500">الوقت المنقضي</p>
                  <p className="font-bold tabular-nums"><LiveTimer startTime={currentStop.stop_start_time} /></p>
                </div>
                <span className="text-teal-400 text-xs me-auto">من {formatTime(currentStop.stop_start_time)}</span>
              </div>
            </div>
          )}

          {completedStops.length > 0 && (
            <div className="bg-white rounded-2xl border p-4">
              <p className="text-sm text-gray-400 mb-3">الوجهات السابقة ({completedStops.length})</p>
              <div className="space-y-2">
                {completedStops.slice().reverse().map((stop) => (
                  <div key={stop.id} className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`w-2 h-2 rounded-full ${stop.stop_type === "أوردر" ? "bg-teal-500" : "bg-amber-500"}`} />
                      <span className="text-xs font-medium text-gray-500">{stop.stop_type}</span>
                      <span className="text-gray-400 text-xs me-auto mr-2">{computeStopDuration(stop)}</span>
                    </div>
                    <p className="font-medium text-sm">{stop.destination || "—"}</p>
                    {stop.order_or_customer_info && (
                      <p className="text-xs text-gray-500">{stop.order_or_customer_info}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStopDialogOpen(true)}
              className="flex-1 py-3 bg-white border-2 border-teal-600 text-teal-600 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> إضافة وجهة
            </button>
            <button
              onClick={() => setEndConfirmOpen(true)}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" /> إنهاء الرحلة
            </button>
          </div>
        </div>
      </div>

      <StopSelectionDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        onConfirm={addStopMutation.mutate}
        savedLocations={savedLocations}
        isLoading={addStopMutation.isPending}
        title="إضافة وجهة جديدة"
      />

      <Dialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد إنهاء الرحلة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">هل أنت متأكد من إنهاء هذه الحركة؟ سيتم إغلاق الوجهة الحالية وتسجيل وقت الانتهاء.</p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              className="bg-red-500 hover:bg-red-600"
              disabled={endTripMutation.isPending}
              onClick={() => endTripMutation.mutate({
                tripId: activeTrip?.id,
                stopId: currentStop?.id,
                startTime: activeTrip?.start_time,
                stopsCount: sortedStops.length,
              })}
            >
              {endTripMutation.isPending ? "جاري الإنهاء..." : "نعم، إنهاء"}
            </Button>
            <Button variant="outline" onClick={() => setEndConfirmOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}