export const STOP_TYPES = ["أوردر", "مشوار"];

export const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export const LOCATION_REGIONS = [
  "المنشية الجديدة",
  "الجمهورية/الشعبية",
  "المشحمة/ابوشاهين",
  "شكري القواتلي",
  "ميدان بسيسة",
];

export const stopTypeColor = {
  "أوردر": "bg-teal-100 text-teal-700",
  "مشوار": "bg-amber-100 text-amber-700",
};

export function formatTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function computeTripStatus(trip) {
  if (!trip) return null;
  return trip.end_time ? "منتهية" : "جارية";
}

export function computeTripDuration(trip) {
  if (!trip?.start_time) return null;
  const end = trip.end_time ? new Date(trip.end_time) : new Date();
  const diffMs = end.getTime() - new Date(trip.start_time).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}س ${minutes}د`;
}

export function computeStopDuration(stop) {
  if (!stop?.stop_start_time || !stop?.stop_end_time) return null;
  const diffMs = new Date(stop.stop_end_time).getTime() - new Date(stop.stop_start_time).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}س ${minutes}د`;
  return `${minutes}د`;
}