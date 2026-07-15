export const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export const branchColor = {
  "فرع زكريا": { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  "فرع بسيسة": { badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  "فرع المنشية": { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
};

export function getTodayDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function computeStatus(record) {
  if (!record) return "لم يحضر اليوم";
  if (record.check_out_time) return "منصرف";
  return "حاضر الآن";
}

export function computeTotalHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}س ${minutes}د`;
}