import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/lib/useUserRole";
import { ShieldCheck, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import BackupHistoryTable from "@/components/backup/BackupHistoryTable";

export default function BackupStatus() {
  const { isAdmin, user } = useUserRole();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["backup-logs"],
    queryFn: () => base44.entities.BackupLog.list("-started_at", 50),
    enabled: !!user && isAdmin,
  });

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-500">هذه الصفحة متاحة للمشرفين فقط</div>;
  }

  const lastSuccess = logs.find((l) => l.status === "success" || l.status === "partial");
  const totalSynced = logs.reduce((s, l) => s + (l.total_records_synced || 0), 0);
  const totalFailed = logs.reduce((s, l) => s + (l.total_records_failed || 0), 0);

  return (
    <div className="p-3 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">حالة قاعدة البيانات</h2>
      </div>

      <Card className="p-4 bg-teal-50/50 border-teal-200">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-teal-800 text-sm">قاعدة البيانات تعمل على Supabase</p>
            <p className="text-xs text-teal-600">
              جميع البيانات مخزّنة مباشرة في Supabase مع حماية RLS. لا حاجة لنسخ احتياطي يدوي.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">آخر نسخة ناجحة</p>
          <p className="text-lg font-bold text-gray-800 mt-1">
            {lastSuccess ? new Date(lastSuccess.started_at).toLocaleDateString("ar-EG") : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">إجمالي السجلات المتزامنة</p>
          <p className="text-lg font-bold text-teal-600 mt-1">{totalSynced.toLocaleString("ar-EG")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">سجلات فاشلة</p>
          <p className="text-lg font-bold text-red-500 mt-1">{totalFailed.toLocaleString("ar-EG")}</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : (
        logs.length > 0 && <BackupHistoryTable logs={logs} />
      )}
    </div>
  );
}
