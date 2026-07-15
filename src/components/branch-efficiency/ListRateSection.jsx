import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function ListRateSection({ branch, medicineSales }) {
  const bSales = medicineSales.filter(s => s.branch === branch);
  const totalSoldQty = bSales.reduce((sum, r) =>
    sum + (r.sales || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0), 0);
  const SALES_TARGET = 100;
  const rate = Math.min(Math.round((totalSoldQty / SALES_TARGET) * 100), 100);
  const color = rate >= 70 ? "#16a34a" : rate >= 40 ? "#d97706" : "#dc2626";

  const soldItems = new Set();
  bSales.forEach(r => (r.sales || []).forEach(i => { if (i.medicine_name) soldItems.add(i.medicine_name); }));

  const r = 31;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;

  return (
    <Card className="p-4 border-2 border-teal-200 bg-teal-50/30">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-5 h-5 text-teal-600" />
        <h2 className="font-bold text-gray-800">معدل تحقيق اللستة</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="72" height="72" className="-rotate-90">
            <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: color }}>{rate}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">إجمالي الكميات المباعة: <b className="text-gray-800">{totalSoldQty}</b></p>
          <p className="text-sm text-gray-600">عدد أصناف مباعة: <b className="text-gray-800">{soldItems.size}</b></p>
          <p className="text-sm text-gray-600">المستهدف: <b className="text-gray-800">{SALES_TARGET} وحدة</b></p>
        </div>
      </div>
    </Card>
  );
}