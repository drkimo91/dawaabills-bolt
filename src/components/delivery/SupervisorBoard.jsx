/**
 * SupervisorBoard — شاشة المشرف: حالة المناديب الآن + التسجيل النيابي
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CalendarCheck, Route, Clock, Navigation, LayoutList } from "lucide-react";
import SupervisorTripsBoard from "@/components/delivery/SupervisorTripsBoard";
import LiveTimer from "@/components/attendance/LiveTimer";
import CheckInScreen from "@/components/attendance/CheckInScreen";
import TripScreen from "@/components/trips/TripScreen";
import TripDetailDialog from "@/components/trips/TripDetailDialog";
import RiderScheduleTable from "@/components/delivery/RiderScheduleTable";
import { getTodayDateStr } from "@/lib/attendance-utils";
import { getEffectiveSchedule } from "@/components/delivery/RiderScheduleTable";

export default function SupervisorBoard({ actingUser }) {
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const today = getTodayDateStr();

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

  const { data: activeTrips = [] } = useQuery({
    queryKey: ["all-active-trips"],
    queryFn: () => base44.entities.Trip.list("-start_time"),
    select: (data) => data.filter((t) => !t.end_time),
    refetchInterval: 8000,
    staleTime: 4000,
  });

  const { data: activeStops = [] } = useQuery({
    queryKey: ["all-active-stops"],
    queryFn: () => base44.entities.TripStop.list(null, 200),
    select: (data) => data.filter((s) => !s.stop_end_time),
    refetchInterval: 8000,
    staleTime: 4000,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["rider-schedules"],
    queryFn: () => base44.entities.RiderSchedule.list(),
    staleTime: 60000,
  });

  const queryClient = useQueryClient();
  const selectedRider = useMemo(() => riders.find((r) => r.id === selectedRiderId), [riders, selectedRiderId]);

  // تغيير فرع سجل الحضور
  const [changingBranchId, setChangingBranchId] = useState(null); // attendance record id
  const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

  const updateBranchMutation = useMutation({
    mutationFn: ({ recordId, branch }) => base44.entities.AttendanceRecord.update(recordId, { branch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-attendance", today] });
      setChangingBranchId(null);
    },
  });

  // حالة كل مندوب
  const riderStatuses = useMemo(() => {
    return riders.map((rider) => {
      const attendance = todayAttendance.find((a) => a.rider_id === rider.id);
      const activeTrip = activeTrips.find((t) => t.rider_id === rider.id);
      const currentStop = activeTrip ? activeStops.find((s) => s.trip_id === activeTrip.id) : null;

      let status, statusLabel, statusColor, sinceTime;

      if (!attendance) {
        status = "absent";
        statusLabel = "لم يحضر اليوم";
        statusColor = "bg-gray-100 text-gray-500";
      } else if (attendance.check_out_time) {
        status = "checked_out";
        statusLabel = "منصرف";
        statusColor = "bg-orange-100 text-orange-600";
        sinceTime = attendance.check_out_time;
      } else if (attendance.idle_status) {
        status = "idle";
        statusLabel = attendance.idle_status;
        statusColor = attendance.idle_status === "إذن" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700";
        sinceTime = attendance.idle_start_time;
      } else if (activeTrip) {
        status = "on_trip";
        statusLabel = currentStop ? `في حركة — ${currentStop.destination}` : "في حركة جارية";
        statusColor = "bg-teal-100 text-teal-700";
        sinceTime = activeTrip.start_time;
      } else {
        status = "present";
        statusLabel = "حاضر";
        statusColor = "bg-green-100 text-green-700";
        sinceTime = attendance.check_in_time;
      }

      return { rider, attendance, activeTrip, currentStop, status, statusLabel, statusColor, sinceTime };
    });
  }, [riders, todayAttendance, activeTrips, activeStops]);

  const statusCounts = useMemo(() => ({
    on_trip: riderStatuses.filter((r) => r.status === "on_trip").length,
    present: riderStatuses.filter((r) => r.status === "present").length,
    idle: riderStatuses.filter((r) => r.status === "idle").length,
    checked_out: riderStatuses.filter((r) => r.status === "checked_out").length,
    absent: riderStatuses.filter((r) => r.status === "absent").length,
  }), [riderStatuses]);

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <Tabs defaultValue="status">
        <TabsList className="mb-4 flex w-full gap-1 bg-gradient-to-l from-teal-50 via-white to-teal-50 border border-teal-100 shadow-sm rounded-2xl p-1.5 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="status" className="gap-1.5 rounded-xl whitespace-nowrap px-3 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <Users className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">حالة المناديب</span><span className="sm:hidden">الحالة</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 rounded-xl whitespace-nowrap px-3 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <CalendarCheck className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">تسجيل حضور</span><span className="sm:hidden">حضور</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5 rounded-xl whitespace-nowrap px-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <Clock className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">مواعيد الحضور</span><span className="sm:hidden">مواعيد</span>
          </TabsTrigger>
          <TabsTrigger value="trips_board" className="gap-1.5 rounded-xl whitespace-nowrap px-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <LayoutList className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">لوحة الحركات</span><span className="sm:hidden">لوحة</span>
          </TabsTrigger>
          <TabsTrigger value="trips" className="gap-1.5 rounded-xl whitespace-nowrap px-3 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <Route className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">تسجيل حركة</span><span className="sm:hidden">حركة</span>
          </TabsTrigger>
        </TabsList>

        {/* حالة المناديب */}
        <TabsContent value="status">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <StatCard label="في حركة" value={statusCounts.on_trip} color="teal" />
            <StatCard label="حاضر" value={statusCounts.present} color="green" />
            <StatCard label="عطلان/إذن" value={statusCounts.idle} color="amber" />
            <StatCard label="منصرف" value={statusCounts.checked_out} color="orange" />
            <StatCard label="لم يحضر" value={statusCounts.absent} color="gray" />
          </div>

          {/* جدول المناديب المسجلة حضور (المتاحة بالفروع) */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" /> المناديب المسجلة حضور ({riderStatuses.filter((r) => r.attendance).length})
            </h3>
            <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
              <table dir="rtl" className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-right p-3 font-medium align-middle">المندوب</th>
                    <th className="text-right p-3 font-medium align-middle">الفرع</th>
                    <th className="text-right p-3 font-medium align-middle">الحالة</th>
                    <th className="text-right p-3 font-medium align-middle">الوجهة الحالية الآن</th>
                  </tr>
                </thead>
                <tbody>
                  {riderStatuses.filter((r) => r.attendance).map(({ rider, attendance, currentStop, activeTrip, statusColor, statusLabel, status, sinceTime }) => (
                    <tr key={rider.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium align-middle">{rider.name}</td>
                      <td className="p-3 align-middle">
                        {changingBranchId === attendance?.id ? (
                          <div className="flex items-center gap-1">
                            <Select
                              defaultValue={attendance.branch}
                              onValueChange={(b) => updateBranchMutation.mutate({ recordId: attendance.id, branch: b })}
                            >
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <button onClick={() => setChangingBranchId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setChangingBranchId(attendance?.id)}
                            className="text-xs text-gray-600 hover:text-teal-700 hover:underline flex items-center gap-1"
                            title="تغيير الفرع"
                          >
                            {attendance?.branch || rider.branch}
                            <span className="text-gray-300 text-[10px]">✎</span>
                          </button>
                        )}
                      </td>
                      <td className="p-3 align-middle">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                          {(status === "idle" || status === "on_trip") && sinceTime && (
                            <span className="tabular-nums opacity-80">· <LiveTimer startTime={sinceTime} /></span>
                          )}
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        {currentStop ? (
                          <button
                            onClick={() => setSelectedTrip(activeTrip)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium text-sm transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            {currentStop.destination}
                            <LiveTimer startTime={currentStop.stop_start_time} />
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {riderStatuses.filter((r) => r.attendance).length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-400">لا يوجد مناديب مسجلة حضور اليوم</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* جدول المناديب الغائبة */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" /> مناديب لم تحضر ({riderStatuses.filter((r) => !r.attendance).length})
            </h3>
            <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
              <table dir="rtl" className="w-full text-sm min-w-[400px]">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-right p-3 font-medium align-middle">المندوب</th>
                    <th className="text-right p-3 font-medium align-middle">الفرع</th>
                    <th className="text-right p-3 font-medium align-middle">موعد اليوم</th>
                  </tr>
                </thead>
                <tbody>
                  {riderStatuses.filter((r) => !r.attendance).map(({ rider }) => {
                    const sched = schedules.find((s) => s.rider_id === rider.id);
                    const eff = sched ? getEffectiveSchedule(sched) : null;
                    return (
                      <tr key={rider.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium align-middle">{rider.name}</td>
                        <td className="p-3 text-gray-500 text-xs align-middle">{rider.branch}</td>
                        <td className="p-3 align-middle">
                          {eff && eff.is_working_day ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              <Clock className="w-3 h-3" />
                              {eff.start_time} - {eff.end_time}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              {eff ? "إجازة" : "لا يوجد جدول"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {riderStatuses.filter((r) => !r.attendance).length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-gray-400">جميع المناديب حضروا اليوم</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <TripDetailDialog trip={selectedTrip} open={!!selectedTrip} onOpenChange={(v) => !v && setSelectedTrip(null)} />
        </TabsContent>

        {/* مواعيد الحضور */}
        <TabsContent value="schedule">
          <RiderScheduleTable riders={riders} canEdit={true} />
        </TabsContent>

        {/* تسجيل حضور نيابة */}
        <TabsContent value="attendance">
          <RiderSelector riders={riders} selectedRiderId={selectedRiderId} onSelect={setSelectedRiderId} />
          {selectedRider ? (
            <CheckInScreen rider={selectedRider} actingUser={actingUser} isSupervisor={true} />
          ) : (
            <EmptyRiderPrompt />
          )}
        </TabsContent>

        {/* لوحة الحركات */}
        <TabsContent value="trips_board">
          <SupervisorTripsBoard actingUser={actingUser} />
        </TabsContent>

        {/* تسجيل حركة نيابة */}
        <TabsContent value="trips">
          <RiderSelector riders={riders} selectedRiderId={selectedRiderId} onSelect={setSelectedRiderId} />
          {selectedRider ? (
            <TripScreen key={selectedRider.id} rider={selectedRider} actingUser={actingUser} isSupervisor={true} />
          ) : (
            <EmptyRiderPrompt />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiderSelector({ riders, selectedRiderId, onSelect }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-sm font-medium text-gray-600">اختر المندوب:</span>
      <Select value={selectedRiderId || ""} onValueChange={onSelect}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="اختر مندوباً..." />
        </SelectTrigger>
        <SelectContent>
          {riders.map((r) => (
            <SelectItem key={r.id} value={r.id}>{r.name} — {r.branch}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyRiderPrompt() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <p>اختر مندوباً من القائمة أعلاه</p>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    teal: "bg-teal-50 text-teal-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <div className={`rounded-xl p-4 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1">{label}</p>
    </div>
  );
}