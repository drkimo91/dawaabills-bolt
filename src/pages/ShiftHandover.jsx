import { useState } from "react";
import { useUserRole } from "@/lib/useUserRole";
import { PlusCircle, List, BarChart3, PieChart as PieIcon, Building2, Settings2 } from "lucide-react";
import ShiftHandoverForm from "@/components/shift-handover/ShiftHandoverForm";
import ShiftHandoverList from "@/components/shift-handover/ShiftHandoverList";
import ShiftHandoverDashboard from "@/components/shift-handover/ShiftHandoverDashboard";
import ExpenseAnalysis from "@/components/shift-handover/ExpenseAnalysis";
import BranchReports from "@/components/shift-handover/BranchReports";
import ExpenseTemplatesManager from "@/components/shift-handover/ExpenseTemplatesManager";

export default function ShiftHandover() {
  const { isAdmin, isManager, user } = useUserRole();
  const [tab, setTab] = useState("form");

  const tabs = [
    { key: "form", icon: PlusCircle, label: "تسليم جديد", show: true },
    { key: "list", icon: List, label: "التسليمات", show: isAdmin },
    { key: "dashboard", icon: BarChart3, label: "الإحصائيات", show: isAdmin },
    { key: "expenses", icon: PieIcon, label: "تحليل المصروفات", show: isAdmin },
    { key: "branches", icon: Building2, label: "تقارير الفروع", show: isAdmin },
    { key: "templates", icon: Settings2, label: "بنود المصروفات", show: isAdmin },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <div className="w-full">
      <div className="px-3 md:px-6 pt-3 md:pt-4 border-b flex overflow-x-auto scrollbar-hide gap-1 pb-0">
        {visibleTabs.map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <div style={{ display: tab === "form" ? undefined : "none" }}><ShiftHandoverForm user={user} isAdmin={isAdmin} onSaved={() => setTab("list")} /></div>
      <div style={{ display: tab === "list" ? undefined : "none" }}><ShiftHandoverList /></div>
      <div style={{ display: tab === "dashboard" ? undefined : "none" }}><ShiftHandoverDashboard /></div>
      <div style={{ display: tab === "expenses" ? undefined : "none" }}><ExpenseAnalysis /></div>
      <div style={{ display: tab === "branches" ? undefined : "none" }}><BranchReports /></div>
      <div style={{ display: tab === "templates" ? undefined : "none" }}><ExpenseTemplatesManager /></div>
    </div>
  );
}