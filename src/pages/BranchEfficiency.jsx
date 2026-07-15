import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BranchOverviewCard from "@/components/branch-efficiency/BranchOverviewCard";
import BranchDetailDashboard from "@/components/branch-efficiency/BranchDetailDashboard";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export default function BranchEfficiency() {
  const [selectedBranch, setSelectedBranch] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["eff-tasks"], queryFn: () => base44.entities.Task.list("-created_date", 1000), staleTime: 30000,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["eff-orders"], queryFn: () => base44.entities.CustomerOrder.list("-created_date", 1000), staleTime: 30000,
  });
  const { data: countTasks = [] } = useQuery({
    queryKey: ["eff-counts"], queryFn: () => base44.entities.InventoryCountTask.list("-created_date", 500), staleTime: 30000,
  });
  const { data: returns = [] } = useQuery({
    queryKey: ["eff-returns"], queryFn: () => base44.entities.Return.list("-created_date", 500), staleTime: 30000,
  });
  const { data: medicineSales = [] } = useQuery({
    queryKey: ["eff-sales"], queryFn: () => base44.entities.MedicineSale.list("-week_start", 500), staleTime: 30000,
  });

  if (selectedBranch) {
    return (
      <BranchDetailDashboard
        branch={selectedBranch}
        tasks={tasks}
        orders={orders}
        countTasks={countTasks}
        returns={returns}
        medicineSales={medicineSales}
        onBack={() => setSelectedBranch(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">كفاءة الفروع</h1>
        <p className="text-gray-500 text-sm mt-0.5">اختر فرعاً لعرض التفاصيل والمؤشرات</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BRANCHES.map((branch) => (
          <BranchOverviewCard
            key={branch}
            branch={branch}
            tasks={tasks}
            orders={orders}
            countTasks={countTasks}
            returns={returns}
            medicineSales={medicineSales}
            onClick={() => setSelectedBranch(branch)}
          />
        ))}
      </div>
    </div>
  );
}