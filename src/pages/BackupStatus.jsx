import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/lib/useUserRole";
import { RefreshCw, ShieldCheck, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import BackupStatusCards from "@/components/backup/BackupStatusCards";
import BackupHistoryTable from "@/components/backup/BackupHistoryTable";

export default function BackupStatus() {
  const { isAdmin, user } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [setupRunning, setSetupRunning] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["backup-logs"],
    queryFn: () => base44.entities.BackupLog.list("-started_at", 50),
    enabled: !!user && isAdmin,
  });

  const runBackup = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("syncToSupabase", {});
      const data = res.data || res;
      toast({
        title: data.status === "success" ? "تم النسخ الاحتياطي بنجاح" : data.status === "partial" ? "نسخة احتياطية جزئية" : "فشل النسخ الاحتياطي",
        description: `متزامن: ${data.total_synced || 0} سجل — جداول: ${data.entities_synced || 0}/${(data.entities_synced || 0) + (data.entities_failed || 0)}`,
        variant: data.status === "success" ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["backup-logs"] });
    } catch (err) {
      toast({ title: "فشل النسخ الاحتياطي", description: err.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const handleSetup = async () => {
    setSetupRunning(true);
    try {
      const setupRes = await base44.functions.invoke("setupSupabaseSchema", {});
      const setupData = setupRes.data || setupRes;
      toast({
        title: setupData.tables_failed > 0 ? "تم الإعداد جزئياً" : "تم إعداد الجداول",
        description: `تم إنشاء ${setupData.tables_created || 0} جدول${setupData.tables_failed > 0 ? `، فشل ${setupData.tables_failed}` : ""}. جاري النسخ الاحتياطي...`,
        variant: setupData.tables_failed > 0 ? "destructive" : "default",
      });
      // Run full backup after schema setup
      const syncRes = await base44.functions.invoke("syncToSupabase", {});
      const syncData = syncRes.data || syncRes;
      toast({
        title: syncData.status === "success" ? "تم النسخ الاحتياطي بنجاح" : syncData.status === "partial" ? "نسخة احتياطية جزئية" : "فشل النسخ الاحتياطي",
        description: `متزامن: ${syncData.total_synced || 0} سجل — جداول: ${syncData.entities_synced || 0}/${(syncData.entities_synced || 0) + (syncData.entities_failed || 0)}`,
        variant: syncData.status === "success" ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["backup-logs"] });
    } catch (err) {
      toast({ title: "فشل الإعداد", description: err.message, variant: "destructive" });
    }
    setSetupRunning(false);
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-500">هذه الصفحة متاحة للمشرفين فقط</div>;
  }

  const lastSuccess = logs.find((l) => l.status === "success" || l.status === "partial");
  const totalSynced = logs.reduce((s, l) => s + (l.total_records_synced || 0), 0);
  const totalFailed = logs.reduce((s, l) => s + (l.total_records_failed || 0), 0);

  // Next scheduled backup: next 02:00 UTC
  const nextBackup = new Date();
  nextBackup.setUTCHours(2, 0, 0, 0);
  if (nextBackup <= new Date()) {
    nextBackup.setUTCDate(nextBackup.getUTCDate() + 1);
  }

  return (
    <div className="p-3 md:p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">النسخ الاحتياطي إلى Supabase</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSetup} disabled={setupRunning || running} variant="outline" size="sm">
            <Database className={`w-4 h-4 ${setupRunning ? "animate-spin" : ""}`} />
            {setupRunning ? "جاري الإعداد..." : "إعداد الجداول والنسخ"}
          </Button>
          <Button onClick={runBackup} disabled={running || setupRunning} size="sm">
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "جاري النسخ..." : "نسخة احتياطية الآن"}
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-700">
        Base44 هو قاعدة البيانات الأساسية. Supabase يُستخدم كنسخة احتياطية فقط — لا يتم حذف أي بيانات من Base44.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <BackupStatusCards
            lastSuccess={lastSuccess}
            nextBackup={nextBackup}
            totalSynced={totalSynced}
            totalFailed={totalFailed}
          />
          <BackupHistoryTable logs={logs} />
        </>
      )}
    </div>
  );
}