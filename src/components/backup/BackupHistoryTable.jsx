import { useState } from "react";
import { CheckCircle, AlertCircle, XCircle, Loader, ChevronDown, ChevronLeft } from "lucide-react";

const STATUS_MAP = {
  success: { label: "ناجح", icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  partial: { label: "جزئي", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-100" },
  failed: { label: "فشل", icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  in_progress: { label: "جاري", icon: Loader, color: "text-blue-600", bg: "bg-blue-100" },
};

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-EG", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

export default function BackupHistoryTable({ logs }) {
  const [expanded, setExpanded] = useState(null);

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        لا يوجد سجل نسخ احتياطي بعد
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-800 mb-3">سجل النسخ الاحتياطي</h3>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500">
                <th className="px-3 py-2 text-right">التاريخ والوقت</th>
                <th className="px-3 py-2 text-right">النوع</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-center">الجداول</th>
                <th className="px-3 py-2 text-center">السجلات</th>
                <th className="px-3 py-2 text-right">المدة</th>
                <th className="px-3 py-2 text-right">بواسطة</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => {
                const st = STATUS_MAP[log.status] || STATUS_MAP.failed;
                const Icon = st.icon;
                const duration = log.started_at && log.completed_at
                  ? Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 1000)
                  : null;
                const totalEntities = (log.entities_synced || 0) + (log.entities_failed || 0);
                const isExpanded = expanded === log.id;
                const hasDetails = log.entity_details && log.entity_details.length > 0;
                return (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-600">{formatDateTime(log.started_at)}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="text-gray-500">{log.backup_type === "full" ? "كامل" : "تزايدي"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${st.bg} ${st.color}`}>
                          <Icon className={`w-3 h-3 ${log.status === "in_progress" ? "animate-spin" : ""}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">
                        <span className="text-green-600">{log.entities_synced || 0}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-400">{totalEntities}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <span className="text-green-600 font-medium">{log.total_records_synced || 0}</span>
                        {(log.total_records_failed || 0) > 0 && (
                          <span className="text-red-600"> / {log.total_records_failed}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{duration !== null ? `${duration}ث` : "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{log.triggered_by === "manual" ? "يدوي" : "تلقائي"}</td>
                      <td className="px-3 py-2">
                        {hasDetails && (
                          <button onClick={() => setExpanded(isExpanded ? null : log.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100">
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && hasDetails && (
                      <tr key={log.id + "-detail"} className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-1">
                            {log.error_message && (
                              <div className="text-xs text-red-600 bg-red-50 rounded p-2 mb-2">{log.error_message}</div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {log.entity_details.map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] bg-white rounded px-2 py-1 border">
                                  <span className="text-gray-600">{d.entity_name}</span>
                                  <span className="flex items-center gap-1">
                                    {d.status === "success" ? (
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <XCircle className="w-3 h-3 text-red-500" />
                                    )}
                                    <span className={d.status === "success" ? "text-green-600" : "text-red-600"}>
                                      {d.records_synced}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}