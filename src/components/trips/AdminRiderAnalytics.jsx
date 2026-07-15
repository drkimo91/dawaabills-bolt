import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Package, Car, Route, Clock, MapPin, Users, Calendar, User } from "lucide-react";
import { BRANCHES } from "@/lib/trip-utils";

// الشهر يبدأ من 26 كل شهر إلى 25 من الشهر التالي
function getCurrentMonthRange() {
  const now = new Date();
  const day = now.getDate();
  let start, end;
  if (day >= 26) {
    start = new Date(now.getFullYear(), now.getMonth(), 26);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 25);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 26);
    end = new Date(now.getFullYear(), now.getMonth(), 25);
  }
  return { startStr: toDateStr(start), endStr: toDateStr(end) };
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inDateRange(isoStr, from, to) {
  const d = (isoStr || "").slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export default function AdminRiderAnalytics() {
  const [branch, setBranch] = useState("all");
  const [periodMode, setPeriodMode] = useState("current_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  const { data: riders = [] } = useQuery({ queryKey: ["riders"], queryFn: () => base44.entities.Rider.list() });
  const { data: allTrips = [] } = useQuery({ queryKey: ["all-trips"], queryFn: () => base44.entities.Trip.list("-start_time", 5000) });
  const { data: allAttendance = [] } = useQuery({ queryKey: ["all-attendance"], queryFn: () => base44.entities.AttendanceRecord.list("-check_in_time", 5000) });
  const { data: allStops = [] } = useQuery({ queryKey: ["all-stops-analytics"], queryFn: () => base44.entities.TripStop.list(null, 5000) });

  const { fromDate, toDate } = useMemo(() => {
    if (periodMode === "custom") return { fromDate: customFrom, toDate: customTo };
    return { fromDate: monthRange.startStr, toDate: monthRange.endStr };
  }, [periodMode, customFrom, customTo, monthRange]);

  const filteredTrips = useMemo(() => {
    let r = allTrips.filter((t) => inDateRange(t.start_time, fromDate, toDate));
    if (branch !== "all") r = r.filter((t) => t.branch === branch);
    return r;
  }, [allTrips, fromDate, toDate, branch]);

  const filteredAttendance = useMemo(() => {
    let r = allAttendance.filter((a) => inDateRange(a.check_in_time, fromDate, toDate));
    if (branch !== "all") r = r.filter((a) => a.branch === branch);
    return r;
  }, [allAttendance, fromDate, toDate, branch]);

  const filteredTripIds = useMemo(() => new Set(filteredTrips.map((t) => t.id)), [filteredTrips]);
  const filteredStops = useMemo(() => allStops.filter((s) => filteredTripIds.has(s.trip_id)), [allStops, filteredTripIds]);

  // Overall stats
  const overall = useMemo(() => {
    const orders = filteredStops.filter((s) => s.stop_type === "أوردر").length;
    const trips = filteredStops.filter((s) => s.stop_type === "مشوار").length;
    let totalMs = 0;
    filteredAttendance.forEach((r) => {
      if (r.check_in_time && r.check_out_time) {
        totalMs += new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime();
      }
    });
    return { trips: filteredTrips.length, orders, errands: trips, workHours: Math.round((totalMs / 3600000) * 10) / 10 };
  }, [filteredTrips, filteredStops, filteredAttendance]);

  // Per-rider stats
  const perRider = useMemo(() => {
    const map = {};
    riders.forEach((r) => {
      map[r.id] = { name: r.name, branch: r.branch, orders: 0, errands: 0, trips: 0, workMs: 0, durationMs: 0, completedTrips: 0 };
    });
    filteredTrips.forEach((t) => {
      if (!map[t.rider_id]) {
        map[t.rider_id] = { name: t.rider_name, branch: t.branch, orders: 0, errands: 0, trips: 0, workMs: 0, durationMs: 0, completedTrips: 0 };
      }
      map[t.rider_id].trips++;
      if (t.end_time) {
        map[t.rider_id].completedTrips++;
        map[t.rider_id].durationMs += new Date(t.end_time).getTime() - new Date(t.start_time).getTime();
      }
    });
    filteredStops.forEach((s) => {
      const trip = filteredTrips.find((t) => t.id === s.trip_id);
      if (!trip) return;
      const key = trip.rider_id;
      if (!map[key]) {
        map[key] = { name: trip.rider_name, branch: trip.branch, orders: 0, errands: 0, trips: 0, workMs: 0, durationMs: 0, completedTrips: 0 };
      }
      if (s.stop_type === "أوردر") map[key].orders++;
      else if (s.stop_type === "مشوار") map[key].errands++;
    });
    filteredAttendance.forEach((r) => {
      if (r.check_in_time && r.check_out_time) {
        if (!map[r.rider_id]) {
          map[r.rider_id] = { name: r.rider_name, branch: r.branch, orders: 0, errands: 0, trips: 0, workMs: 0, durationMs: 0, completedTrips: 0 };
        }
        map[r.rider_id].workMs += new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime();
      }
    });
    return Object.values(map).map((r) => ({
      ...r,
      workHours: Math.round((r.workMs / 3600000) * 10) / 10,
      avgDuration: r.completedTrips > 0 ? r.durationMs / r.completedTrips : 0,
    })).sort((a, b) => b.orders - a.orders || b.errands - a.errands);
  }, [riders, filteredTrips, filteredStops, filteredAttendance]);

  // Top destinations
  const topDestinations = useMemo(() => {
    const counts = {};
    filteredStops.forEach((s) => {
      if (!s.destination) return;
      counts[s.destination] = (counts[s.destination] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredStops]);

  // Top customers
  const topCustomers = useMemo(() => {
    const counts = {};
    filteredStops.forEach((s) => {
      if (!s.order_or_customer_info || !s.order_or_customer_info.trim()) return;
      counts[s.order_or_customer_info] = (counts[s.order_or_customer_info] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredStops]);

  const maxDest = topDestinations[0]?.[1] || 1;
  const maxCust = topCustomers[0]?.[1] || 1;

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <h1 className="text-xl font-bold text-gray-800 mb-4">تحليلات المناديب</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الفرع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفروع</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setPeriodMode("current_month")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${periodMode === "current_month" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500"}`}
          >
            الشهر الحالي
          </button>
          <button
            onClick={() => setPeriodMode("custom")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${periodMode === "custom" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500"}`}
          >
            فترة محددة
          </button>
        </div>

        {periodMode === "current_month" && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-teal-50 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>{monthRange.startStr}</span>
            <span className="text-gray-300">←</span>
            <span>{monthRange.endStr}</span>
          </div>
        )}

        {periodMode === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
            <span className="text-gray-400 text-sm">إلى</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
          </div>
        )}
      </div>

      {/* Overall performance */}
      <h2 className="text-sm font-semibold text-gray-500 mb-3">الأداء العام</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <SummaryCard icon={Route} label="إجمالي الحركات" value={overall.trips} color="blue" />
        <SummaryCard icon={Package} label="إجمالي الأوردرات" value={overall.orders} color="teal" />
        <SummaryCard icon={Car} label="إجمالي المشاوير" value={overall.errands} color="amber" />
        <SummaryCard icon={Clock} label="إجمالي ساعات العمل" value={overall.workHours} color="violet" />
      </div>

      {/* Per-rider cards */}
      <h2 className="text-sm font-semibold text-gray-500 mb-3">الأداء حسب المندوب</h2>
      {perRider.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400 mb-8">لا توجد بيانات في هذه الفترة</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {perRider.map((r, i) => (
            <RiderStatCard key={i} rider={r} />
          ))}
        </div>
      )}

      {/* Top destinations & customers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> أكثر الوجهات تكرارًا
          </h2>
          <div className="bg-white rounded-xl border p-4 space-y-2">
            {topDestinations.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد بيانات</p>}
            {topDestinations.map(([dest, count], i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{dest}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(count / maxDest) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> أكثر العملاء تكرارًا
          </h2>
          <div className="bg-white rounded-xl border p-4 space-y-2">
            {topCustomers.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد بيانات</p>}
            {topCustomers.map(([cust, count], i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{cust}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / maxCust) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RiderStatCard({ rider }) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b">
        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-teal-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-800 truncate">{rider.name}</p>
          <p className="text-xs text-gray-400 truncate">{rider.branch}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatItem icon={Package} label="أوردرات" value={rider.orders} color="text-teal-600 bg-teal-50" />
        <StatItem icon={Car} label="مشاوير" value={rider.errands} color="text-amber-600 bg-amber-50" />
        <StatItem icon={Clock} label="متوسط الوقت" value={rider.completedTrips > 0 ? formatDuration(rider.avgDuration) : "—"} color="text-blue-600 bg-blue-50" />
        <StatItem icon={Clock} label="ساعات العمل" value={rider.workHours} color="text-violet-600 bg-violet-50" />
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}س ${minutes}د`;
}

function SummaryCard({ icon: Icon, label, value, color }) {
  const colors = {
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}