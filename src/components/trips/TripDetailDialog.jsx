import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatTime, computeTripDuration, computeStopDuration, stopTypeColor } from "@/lib/trip-utils";

export default function TripDetailDialog({ trip, open, onOpenChange }) {
  const { data: stops = [] } = useQuery({
    queryKey: ["trip-stops", trip?.id],
    queryFn: () => base44.entities.TripStop.filter({ trip_id: trip.id }),
    enabled: !!trip?.id && open,
    select: (data) => [...data].sort((a, b) => new Date(a.stop_start_time) - new Date(b.stop_start_time)),
  });

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">تفاصيل الحركة — {trip.rider_name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">الفرع</p>
            <p className="font-medium">{trip.branch}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">المدة الإجمالية</p>
            <p className="font-bold text-teal-600">{computeTripDuration(trip)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">عدد الوجهات</p>
            <p className="font-medium">{stops.length}</p>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                <th className="text-right p-2 font-medium">#</th>
                <th className="text-right p-2 font-medium">النوع</th>
                <th className="text-right p-2 font-medium">الوجهة</th>
                <th className="text-right p-2 font-medium">البداية</th>
                <th className="text-right p-2 font-medium">النهاية</th>
                <th className="text-right p-2 font-medium">المدة</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop, idx) => (
                <tr key={stop.id} className="border-t">
                  <td className="p-2 text-gray-400">{idx + 1}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${stopTypeColor[stop.stop_type]}`}>
                      {stop.stop_type}
                    </span>
                  </td>
                  <td className="p-2">
                    <p className="font-medium">{stop.destination}</p>
                    {stop.order_or_customer_info && <p className="text-xs text-gray-400">{stop.order_or_customer_info}</p>}
                  </td>
                  <td className="p-2 text-gray-500">{formatTime(stop.stop_start_time)}</td>
                  <td className="p-2 text-gray-500">{formatTime(stop.stop_end_time)}</td>
                  <td className="p-2 font-medium">{computeStopDuration(stop) || "—"}</td>
                </tr>
              ))}
              {stops.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-gray-400">لا توجد وجهات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}