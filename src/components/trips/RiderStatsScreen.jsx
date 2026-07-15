import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, Car, Route, Clock, BarChart3, Calendar } from "lucide-react";
import { getTodayDateStr } from "@/lib/attendance-utils";

export default function RiderStatsScreen() {
  const [period, setPeriod] = useState("today");

  const todayStr = getTodayDateStr();
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const currentUserId = user?.id;

  const { data: myTrips = [] } = useQuery({
    queryKey: ["my-trips-stats", currentUserId],
    queryFn: () => base44.entities.Trip.filter({ rider_user_id: currentUserId }),
    enabled: !!currentUserId,
  });

  const { data: myAttendance = [] } = useQuery({
    queryKey: ["my-attendance-stats", currentUserId],
    queryFn: () => base44.entities.AttendanceRecord.filter({ rider_user_id: currentUserId }),
    enabled: !!currentUserId,
  });

  const { data: myStops = [] } = useQuery({
    queryKey: ["my-stops-stats", currentUserId],
    queryFn: () => base44.entities.TripStop.filter({ rider_user_id: currentUserId }),
    enabled: !!currentUserId,
  });

  const stats = useMemo(() => {
    const filterFn = (item, dateField) => {
      if (!item[dateField]) return false;
      const val = item[dateField];
      if (period === "today") return val.startsWith(todayStr);
      return val.startsWith(monthStr);
    };

    const filteredTrips = myTrips.filter((t) => filterFn(t, "start_time"));
    const filteredTripIds = new Set(filteredTrips.map((t) => t.id));
    const filteredStops = myStops.filter((s) => filteredTripIds.has(s.trip_id));
    const filteredAttendance = myAttendance.filter((r) => filterFn(r, "check_in_time"));

    const orderCount = filteredStops.filter((s) => s.stop_type === "أوردر").length;
    const tripCount = filteredStops.filter((s) => s.stop_type === "مشوار").length;
    const tripsTotal = filteredTrips.length;

    // Work hours from attendance
    let totalMs = 0;
    filteredAttendance.forEach((r) => {
      if (r.check_in_time && r.check_out_time) {
        totalMs += new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime();
      }
    });
    const workHours = totalMs > 0 ? Math.round((totalMs / 3600000) * 10) / 10 : 0;

    // Avg trip duration
    const completedTrips = filteredTrips.filter((t) => t.end_time);
    let totalDurationMs = 0;
    completedTrips.forEach((t) => {
      totalDurationMs += new Date(t.end_time).getTime() - new Date(t.start_time).getTime();
    });
    const avgDuration = completedTrips.length > 0 ? totalDurationMs / completedTrips.length : 0;
    const avgHours = Math.floor(avgDuration / 3600000);
    const avgMinutes = Math.floor((avgDuration % 3600000) / 60000);

    return {
      orderCount,
      tripCount,
      tripsTotal,
      workHours,
      avgDuration: completedTrips.length > 0 ? `${avgHours}س ${avgMinutes}د` : "—",
    };
  }, [myTrips, myStops, myAttendance, period, todayStr, monthStr]);

  return (
    <div className="p-4 pb-8" dir="rtl">
      <div className="max-w-md mx-auto">
        {/* Period toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setPeriod("today")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === "today" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === "month" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500"
            }`}
          >
            الشهر الحالي
          </button>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
          <Calendar className="w-4 h-4" />
          {period === "today"
            ? new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })
            : now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Package} label="أوردرات" value={stats.orderCount} color="teal" />
          <StatCard icon={Car} label="مشاوير" value={stats.tripCount} color="amber" />
          <StatCard icon={Route} label="حركات" value={stats.tripsTotal} color="blue" />
          <StatCard icon={Clock} label="ساعات العمل" value={stats.workHours} color="violet" />
        </div>

        {/* Avg duration — full width */}
        <div className="mt-3 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-white/20 rounded-xl p-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-teal-100 text-sm">متوسط مدة الحركة</p>
            <p className="text-2xl font-bold">{stats.avgDuration}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}