import { useMemo } from "react";
import { Trophy, Star, CheckCircle2, Clock, AlertTriangle, ListChecks } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

const BRANCH_AVATARS = {
  "فرع زكريا": { bg: "bg-teal-500", letter: "ز" },
  "فرع بسيسة": { bg: "bg-orange-500", letter: "ب" },
  "فرع المنشية": { bg: "bg-gray-500", letter: "م" },
};

export default function TasksDashboard({ tasks }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const overdue = tasks.filter((t) => {
      if (!t.due_date || t.status === "done" || t.status === "cancelled") return false;
      return new Date(t.due_date) < new Date();
    }).length;

    const branchStats = BRANCHES.map((branch) => {
      const bTasks = tasks.filter((t) => t.branch_name === branch);
      const bDone = bTasks.filter((t) => t.status === "done").length;
      const bInProgress = bTasks.filter((t) => t.status === "in_progress").length;
      const bPending = bTasks.filter((t) => t.status === "pending").length;
      const rate = bTasks.length > 0 ? Math.round((bDone / bTasks.length) * 100) : 0;
      const points = bTasks.reduce((s, t) => s + (t.bonus_points || 0) - (t.deduction_points || 0), 0);
      return { branch, total: bTasks.length, done: bDone, inProgress: bInProgress, pending: bPending, rate, points };
    }).sort((a, b) => b.points - a.points || b.rate - a.rate);

    const topBranch = branchStats[0];
    const overallRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const totalPoints = tasks.reduce((s, t) => s + (t.bonus_points || 0) - (t.deduction_points || 0), 0);

    return { total, done, inProgress, overdue, branchStats, topBranch, overallRate, totalPoints };
  }, [tasks]);

  return (
    <div className="bg-gray-900 rounded-2xl p-5 space-y-5" dir="rtl">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ListChecks className="w-6 h-6 text-gray-300" />} label="إجمالي المهام" value={stats.total} color="text-white" />
        <StatCard icon={<CheckCircle2 className="w-6 h-6 text-green-400" />} label="مكتملة" value={stats.done} color="text-green-400" />
        <StatCard icon={<Clock className="w-6 h-6 text-blue-400" />} label="جارية" value={stats.inProgress} color="text-blue-400" />
        <StatCard icon={<AlertTriangle className="w-6 h-6 text-red-400" />} label="متأخرة" value={stats.overdue} color="text-red-400" />
      </div>

      {/* Top Branch Banner */}
      {stats.topBranch && stats.topBranch.points > 0 && (
        <div className="bg-gradient-to-l from-yellow-900/40 to-amber-800/20 border border-yellow-600/60 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="bg-yellow-500 rounded-full p-3">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -top-2 -right-2 text-xl">🏅</span>
            </div>
            <div>
              <p className="text-yellow-400 text-xs font-medium">🏆 الفرع الأفضل بالنقاط</p>
              <p className="text-white font-bold text-2xl">{stats.topBranch.branch}</p>
              <p className="text-yellow-300/70 text-xs">
                {stats.topBranch.done} مهمة مكتملة — نسبة إنجاز {stats.topBranch.rate}%
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-4xl">{stats.topBranch.points}</div>
            <div className="text-gray-400 text-xs">نقطة</div>
          </div>
        </div>
      )}

      {/* Branch Rankings */}
      <div className="bg-gray-800/60 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-yellow-400">☆</span>
          <span className="text-white font-semibold">ترتيب الفروع حسب النقاط</span>
        </div>
        <div className="space-y-3">
          {stats.branchStats.map((b, i) => (
            <div key={b.branch} className="flex items-center gap-3">
              {/* Rank */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${BRANCH_AVATARS[b.branch]?.bg || "bg-gray-600"}`}>
                {i === 0 && b.points > 0 ? "🥇" : i === 1 && b.points > 0 ? "🥈" : i === 2 && b.points > 0 ? "🥉" : i + 1}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{b.branch}</span>
                    {i === 0 && b.points > 0 && <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-bold">وسام التميز 🏅</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 text-xs font-bold">{b.points}</span>
                    <span className="text-gray-400 text-xs">نقاط</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-400">✅ مكتملة {b.done}</span>
                    <span className="text-blue-400">✖ جارية {b.inProgress}</span>
                    <span className="text-orange-400">🔲 معلقة {b.pending}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${b.rate}%` }}
                    />
                  </div>
                  <span className="text-gray-300 text-xs w-10 text-left">{b.rate}%</span>
                  <span className="text-gray-500 text-xs">نسبة الإنجاز</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
      <div>
        <div className={`font-bold text-3xl ${color}`}>{value}</div>
        <div className="text-gray-400 text-xs mt-1">{label}</div>
      </div>
      <div className="opacity-80">{icon}</div>
    </div>
  );
}