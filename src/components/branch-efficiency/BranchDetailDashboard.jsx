import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import OrdersSection from "./OrdersSection";
import TasksSection from "./TasksSection";
import ReturnsSection from "./ReturnsSection";
import CountsSection from "./CountsSection";
import ListRateSection from "./ListRateSection";

const BRANCH_COLORS = {
  "فرع زكريا": "text-blue-700",
  "فرع بسيسة": "text-purple-700",
  "فرع المنشية": "text-orange-700",
};

export default function BranchDetailDashboard({ branch, tasks, orders, countTasks, returns, medicineSales, onBack }) {
  return (
    <div className="p-4 md:p-6 space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1 text-gray-500" onClick={onBack}>
          <ArrowRight className="w-4 h-4" /> رجوع
        </Button>
        <h1 className={`text-xl font-bold ${BRANCH_COLORS[branch]}`}>{branch}</h1>
      </div>

      <OrdersSection branch={branch} orders={orders} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TasksSection branch={branch} tasks={tasks} />
        <ReturnsSection branch={branch} returns={returns} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CountsSection branch={branch} countTasks={countTasks} />
        <ListRateSection branch={branch} medicineSales={medicineSales} />
      </div>
    </div>
  );
}