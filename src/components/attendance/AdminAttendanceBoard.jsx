import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import { useUserRole } from "@/lib/useUserRole";
import LiveTimer from "./LiveTimer";
import AdminRidersManager from "./AdminRidersManager";
import RiderHistoryDialog from "./RiderHistoryDialog";
import { BRANCHES, branchColor, getTodayDateStr, formatTime, computeStatus, computeTotalHours } from "@/lib/attendance-utils";

const statusBadge = {
  "حاضر الآن": "bg-green-100 text-green-700",
  "منصرف": "bg-gray-100 text-gray-600",
  "لم يحضر اليوم": "bg-red-50 text-red-500",
};

export default function AdminAttendanceBoard() {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState("all");
  const [historyRider, setHistoryRider] = useState(null);
  const today = getTodayDateStr();
  const { isAdmin } = useUserRole();

  const deleteAttendance = async (rec) => {
    if (!window.confirm("حذف سجل الحضور لهذا المندوب اليوم؟")) return;
    await base44.entities.AttendanceRecord.delete(rec.id);
    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
  };

  const { data: riders = [] } = useQuery({ queryKey: ["riders"], queryFn: () => base44.entities.Rider.list() });
  const { data: todayRecords = [] } = useQuery({
    queryKey: ["attendance-today", today],
    queryFn: () => base44.entities.AttendanceRecord.filter({ date: today }),
  });

  useEffect(() => {
    const unsub = base44.entities.AttendanceRecord.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    });
    return () => unsub();
  }, [queryClient]);

  const branchesToShow = branchFilter === "all" ? BRANCHES : [branchFilter];

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <h1 className="text-xl font-bold text-gray-800 mb-4">حضور وانصراف المناديب</h1>
      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">لوحة الحضور اليوم</TabsTrigger>
          <TabsTrigger value="manage">إدارة المناديب</TabsTrigger>
        </TabsList>
        <TabsContent value="board">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">الفرع:</span>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفروع</SelectItem>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-400 mr-auto">
              اليوم: {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="space-y-4">
            {branchesToShow.map((branch) => {
              const branchRiders = riders.filter((r) => r.branch === branch && r.is_active !== false);
              if (branchRiders.length === 0) return null;
              const c = branchColor[branch];
              return (
                <div key={branch}>
                  <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium mb-2 ${c.badge}`}>{branch}</div>
                  <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-right p-3 font-medium">المندوب</th>
                          <th className="text-right p-3 font-medium">الحالة</th>
                          <th className="text-right p-3 font-medium">وقت الحضور</th>
                          <th className="text-right p-3 font-medium">وقت الانصراف</th>
                          <th className="text-right p-3 font-medium">الساعات</th>
                          <th className="text-right p-3 font-medium">السجل</th>
                          {isAdmin && <th className="text-right p-3 font-medium">حذف</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {branchRiders.map((rider) => {
                          const rec = todayRecords.find((r) => r.rider_id === rider.id);
                          const status = computeStatus(rec);
                          return (
                            <tr key={rider.id} className="border-t">
                              <td className="p-3 font-medium">{rider.name}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${statusBadge[status]}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="p-3 text-gray-600">{formatTime(rec?.check_in_time)}</td>
                              <td className="p-3 text-gray-600">{formatTime(rec?.check_out_time)}</td>
                              <td className="p-3">
                                {rec && !rec.check_out_time ? (
                                  <span className="text-teal-600 font-medium tabular-nums">
                                    <LiveTimer startTime={rec.check_in_time} />
                                  </span>
                                ) : rec && rec.check_out_time ? (
                                  <span className="font-medium">{computeTotalHours(rec.check_in_time, rec.check_out_time)}</span>
                                ) : "—"}
                              </td>
                              <td className="p-3">
                                <Button size="icon" variant="ghost" onClick={() => setHistoryRider(rider)}>
                                  <History className="w-4 h-4 text-gray-500" />
                                </Button>
                              </td>
                              {isAdmin && (
                                <td className="p-3">
                                  {rec && (
                                    <Button size="icon" variant="ghost" onClick={() => deleteAttendance(rec)}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="manage">
          <AdminRidersManager />
        </TabsContent>
      </Tabs>
      <RiderHistoryDialog
        rider={historyRider}
        open={!!historyRider}
        onOpenChange={(v) => !v && setHistoryRider(null)}
      />
    </div>
  );
}