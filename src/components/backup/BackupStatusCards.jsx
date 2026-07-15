import { CheckCircle, Clock, Database, AlertCircle } from "lucide-react";

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function BackupStatusCards({ lastSuccess, nextBackup, totalSynced, totalFailed }) {
  const cards = [
    {
      label: "آخر نسخة ناجحة",
      value: lastSuccess ? formatDateTime(lastSuccess.completed_at) : "—",
      sub: lastSuccess ? `${lastSuccess.total_records_synced || 0} سجل` : "",
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      label: "النسخة القادمة",
      value: formatDateTime(nextBackup.toISOString()),
      sub: "تلقائي يومي",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "إجمالي السجلات المتزامنة",
      value: totalSynced.toLocaleString("ar-EG"),
      sub: "كل النسخ",
      icon: Database,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
    },
    {
      label: "السجلات الفاشلة",
      value: totalFailed.toLocaleString("ar-EG"),
      sub: totalFailed > 0 ? "تحتاج مراجعة" : "لا يوجد",
      icon: AlertCircle,
      color: totalFailed > 0 ? "text-red-600" : "text-gray-400",
      bg: totalFailed > 0 ? "bg-red-50" : "bg-gray-50",
      border: totalFailed > 0 ? "border-red-100" : "border-gray-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${c.color}`} />
              <span className="text-xs text-gray-500">{c.label}</span>
            </div>
            <p className="text-sm font-bold text-gray-800">{c.value}</p>
            {c.sub && <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}