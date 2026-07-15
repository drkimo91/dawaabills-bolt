import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, CheckCircle2 } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];
const TODAY = new Date().toISOString().split("T")[0];

export default function TaskGenerator({ branch: defaultBranch, products: allProducts, onDone }) {
  const qc = useQueryClient();
  const [branch, setBranch] = useState(defaultBranch || BRANCHES[0]);
  const [date, setDate] = useState(TODAY);
  const [employeeName, setEmployeeName] = useState("");
  const [itemsCount, setItemsCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list(),
    staleTime: 60000,
  });

  const branchMembers = teamMembers.filter(m => m.branches && m.branches.includes(branch));
  const branchProducts = allProducts.filter(p => p.branch === branch && p.is_active !== false);

  const handleGenerate = async () => {
    if (!employeeName || !date || itemsCount < 1) return;
    setLoading(true);

    // اختيار عشوائي من أصناف الفرع
    const shuffled = [...branchProducts].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, itemsCount);

    const task = await base44.entities.InventoryCountTask.create({
      task_date: date,
      branch,
      assigned_employee: employeeName,
      product_ids: selected.map(p => p.id),
      status: "مجدول",
      items_count: selected.length,
      completed_count: 0,
      matched_count: 0,
      diff_count: 0,
    });

    const entries = selected.map(p => ({
      task_id: task.id,
      product_id: p.id,
      product_code: p.product_code || "",
      product_name: p.product_name,
      branch,
      count_date: date,
      expected_quantity: p.stock_quantity || 0,
      actual_quantity: null,
      difference: null,
      status: "لم يُجرد",
    }));

    const BATCH = 20;
    for (let i = 0; i < entries.length; i += BATCH) {
      await base44.entities.InventoryCountEntry.bulkCreate(entries.slice(i, i + BATCH));
      if (i + BATCH < entries.length) await new Promise(r => setTimeout(r, 500));
    }

    qc.invalidateQueries(["inventory-tasks"]);
    qc.invalidateQueries(["inventory-entries"]);
    setResult({ count: selected.length, employee: employeeName, branch });
    setLoading(false);
  };

  if (result) {
    return (
      <div dir="rtl" className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="text-lg font-bold text-gray-700">تم إنشاء مهمة الجرد الخاصة!</p>
        <p className="text-sm text-gray-500">{result.branch} — {result.count} صنف — {result.employee}</p>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={onDone}>إغلاق</Button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center gap-2 text-teal-700">
        <Zap className="w-5 h-5" />
        <h3 className="font-bold text-base">مهمة جرد خاصة</h3>
      </div>

      {/* الفرع */}
      <div className="space-y-1">
        <Label>الفرع</Label>
        <Select value={branch} onValueChange={v => { setBranch(v); setEmployeeName(""); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* الموظف */}
      <div className="space-y-1">
        <Label>اسم الموظف</Label>
        <Select value={employeeName || "none"} onValueChange={v => setEmployeeName(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">اختر موظفاً</SelectItem>
            {branchMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* التاريخ */}
      <div className="space-y-1">
        <Label>التاريخ</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {/* عدد الأصناف */}
      <div className="space-y-1">
        <Label>عدد الأصناف <span className="text-gray-400 text-xs">(يتم الاختيار عشوائياً من {branchProducts.length} صنف متاح)</span></Label>
        <Input
          type="number" min={1} max={branchProducts.length || 999}
          value={itemsCount}
          onChange={e => setItemsCount(Number(e.target.value))}
          className="w-32"
        />
      </div>

      {branchProducts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          لا توجد أصناف مسجلة لهذا الفرع — يرجى رفع الأصناف أولاً
        </div>
      )}

      <Button
        className="w-full gap-2 bg-teal-600 hover:bg-teal-700"
        onClick={handleGenerate}
        disabled={!employeeName || !date || itemsCount < 1 || branchProducts.length === 0 || loading}
      >
        <Zap className="w-4 h-4" />
        {loading ? "جاري الإنشاء..." : `إنشاء مهمة جرد (${Math.min(itemsCount, branchProducts.length)} صنف)`}
      </Button>
    </div>
  );
}