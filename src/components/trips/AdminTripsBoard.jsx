import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import { useUserRole } from "@/lib/useUserRole";
import LiveTimer from "@/components/attendance/LiveTimer";
import SavedLocationsManager from "./SavedLocationsManager";
import TripDetailDialog from "./TripDetailDialog";
import { BRANCHES, formatTime, computeTripDuration, stopTypeColor } from "@/lib/trip-utils";

export default function AdminTripsBoard() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [branchFilter, setBranchFilter] = useState("all");
  const [historyBranch, setHistoryBranch] = useState("all");
  const [historyRider, setHistoryRider] = useState("all");
  const [dateMode, setDateMode] = useState("month");
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [date, setDate] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  const [detailTrip, setDetailTrip] = useState(null);

  const { isAdmin } = useUserRole();
  const { data: riders = [] } = useQuery({ queryKey: ["riders"], queryFn: () => base44.entities.Rider.list() });
  const { data: allTrips = [] } = useQuery({ queryKey: ["all-trips"], queryFn: () => base44.entities.Trip.list("-start_time") });

  const deleteTrip = async (trip) => {
    if (!window.confirm(`حذف حركة "${trip.rider_name}"؟ سيتم حذف جميع الوجهات المرتبطة بها.`)) return;
    const stops = await base44.entities.TripStop.filter({ trip_id: trip.id });
    await Promise.all(stops.map((s) => base44.entities.TripStop.delete(s.id)));
    await base44.entities.Trip.delete(trip.id);
    queryClient.invalidateQueries({ queryKey: ["all-trips"] });
    queryClient.invalidateQueries({ queryKey: ["active-trip-stops"] });
  };

  const activeTrips = useMemo(() => allTrips.filter((t) => !t.end_time), [allTrips]);

  const { data: activeStops = [] } = useQuery({
    queryKey: ["active-trip-stops", activeTrips.map((t) => t.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(activeTrips.map((t) => base44.entities.TripStop.filter({ trip_id: t.id })));
      return results.flat();
    },
    enabled: activeTrips.length > 0,
  });

  useEffect(() => {
    const unsub = base44.entities.Trip.subscribe(() => queryClient.invalidateQueries({ queryKey: ["all-trips"] }));
    const unsub2 = base44.entities.TripStop.subscribe(() => queryClient.invalidateQueries({ queryKey: ["active-trip-stops"] }));
    return () => { unsub(); unsub2(); };
  }, [queryClient]);

  const filteredActiveTrips = branchFilter === "all" ? activeTrips : activeTrips.filter((t) => t.branch === branchFilter);

  const historyTrips = useMemo(() => {
    let result = allTrips.filter((t) => t.end_time);
    if (historyBranch !== "all") result = result.filter((t) => t.branch === historyBranch);
    if (historyRider !== "all") result = result.filter((t) => t.rider_id === historyRider);
    if (dateMode === "month") {
      result = result.filter((t) => t.start_time && t.start_time.startsWith(month));
    } else {
      result = result.filter((t) => t.start_time && t.start_time.startsWith(date));
    }
    return result;
  }, [allTrips, historyBranch, historyRider, dateMode, month, date]);

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <h1 className="text-xl font-bold text-gray-800 mb-4">حركات المناديب</h1>
      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">الحركات الجارية</TabsTrigger>
          <TabsTrigger value="history">سجل الحركات</TabsTrigger>
          <TabsTrigger value="locations">الوجهات المحفوظة</TabsTrigger>
        </TabsList>

        {/* Live trips */}
        <TabsContent value="live">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">الفرع:</span>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفروع</SelectItem>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="mr-2">{filteredActiveTrips.length} مندوب نشط</Badge>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-right p-3 font-medium">المندوب</th>
                  <th className="text-right p-3 font-medium">الفرع</th>
                  <th className="text-right p-3 font-medium">الوجهة الحالية</th>
                  <th className="text-right p-3 font-medium">نوعها</th>
                  <th className="text-right p-3 font-medium">مدة الحركة</th>
                  <th className="text-right p-3 font-medium">عدد الوجهات</th>
                  <th className="text-right p-3 font-medium">البداية</th>
                  {isAdmin && <th className="text-right p-3 font-medium">حذف</th>}
                </tr>
              </thead>
              <tbody>
                {filteredActiveTrips.map((trip) => {
                  const tripStops = activeStops.filter((s) => s.trip_id === trip.id);
                  const sortedTripStops = tripStops.sort((a, b) => new Date(a.stop_start_time) - new Date(b.stop_start_time));
                  const currentStop = sortedTripStops.find((s) => !s.stop_end_time);
                  return (
                    <tr key={trip.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{trip.rider_name}</td>
                      <td className="p-3 text-gray-500">{trip.branch}</td>
                      <td className="p-3">{currentStop?.destination || "—"}</td>
                      <td className="p-3">
                        {currentStop && (
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stopTypeColor[currentStop.stop_type]}`}>
                            {currentStop.stop_type}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-teal-600 font-medium tabular-nums">
                        <LiveTimer startTime={trip.start_time} />
                      </td>
                      <td className="p-3 text-center">{sortedTripStops.length}</td>
                      <td className="p-3 text-gray-500">{formatTime(trip.start_time)}</td>
                      {isAdmin && (
                        <td className="p-3">
                          <Button size="icon" variant="ghost" onClick={() => deleteTrip(trip)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredActiveTrips.length === 0 && (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="p-6 text-center text-gray-400">لا توجد حركات جارية حاليًا</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-1">
              <button onClick={() => setDateMode("month")} className={`px-3 py-1.5 rounded-lg text-sm ${dateMode === "month" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>شهر</button>
              <button onClick={() => setDateMode("date")} className={`px-3 py-1.5 rounded-lg text-sm ${dateMode === "date" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"}`}>يوم</button>
            </div>
            {dateMode === "month" ? (
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-36" />
            ) : (
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36" />
            )}
            <Select value={historyBranch} onValueChange={setHistoryBranch}>
              <SelectTrigger className="w-40"><SelectValue placeholder="الفرع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفروع</SelectItem>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={historyRider} onValueChange={setHistoryRider}>
              <SelectTrigger className="w-40"><SelectValue placeholder="المندوب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المناديب</SelectItem>
                {riders.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-right p-3 font-medium">المندوب</th>
                  <th className="text-right p-3 font-medium">الفرع</th>
                  <th className="text-right p-3 font-medium">التاريخ</th>
                  <th className="text-right p-3 font-medium">البداية</th>
                  <th className="text-right p-3 font-medium">النهاية</th>
                  <th className="text-right p-3 font-medium">المدة</th>
                  <th className="text-right p-3 font-medium">التفاصيل</th>
                  {isAdmin && <th className="text-right p-3 font-medium">حذف</th>}
                </tr>
              </thead>
              <tbody>
                {historyTrips.map((trip) => (
                  <tr key={trip.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{trip.rider_name}</td>
                    <td className="p-3 text-gray-500">{trip.branch}</td>
                    <td className="p-3 text-gray-500">{trip.start_time?.split("T")[0]}</td>
                    <td className="p-3 text-gray-500">{formatTime(trip.start_time)}</td>
                    <td className="p-3 text-gray-500">{formatTime(trip.end_time)}</td>
                    <td className="p-3 font-medium text-teal-600">{computeTripDuration(trip)}</td>
                    <td className="p-3">
                      <Button size="icon" variant="ghost" onClick={() => setDetailTrip(trip)}>
                        <Eye className="w-4 h-4 text-gray-500" />
                      </Button>
                    </td>
                    {isAdmin && (
                      <td className="p-3">
                        <Button size="icon" variant="ghost" onClick={() => deleteTrip(trip)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {historyTrips.length === 0 && (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="p-6 text-center text-gray-400">لا توجد حركات في هذه الفترة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <SavedLocationsManager />
        </TabsContent>
      </Tabs>

      <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={(v) => !v && setDetailTrip(null)} />
    </div>
  );
}