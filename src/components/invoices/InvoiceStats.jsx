import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText, DollarSign, Clock, CheckCircle } from "lucide-react";

export default function InvoiceStats({ invoices }) {
  const [selectedMonth, setSelectedMonth] = useState("current");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevDate.getMonth();
  const prevYear = prevDate.getFullYear();

  const filtered = invoices.filter((i) => {
    if (!i.invoice_date) return false;
    const d = new Date(i.invoice_date);
    if (selectedMonth === "current") {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } else {
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }
  });

  const total = filtered.length;
  const totalValue = filtered.reduce((s, i) => s + (i.total_value || 0), 0);
  const totalPaid = filtered.reduce((s, i) => s + (i.paid_value || 0), 0);
  const pending = filtered.filter((i) => i.status === "انتظار المراجعة").length;

  const stats = [
    { label: "إجمالي الفواتير", value: total, icon: FileText, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "إجمالي القيمة", value: totalValue.toLocaleString("ar-EG"), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "إجمالي المدفوع", value: totalPaid.toLocaleString("ar-EG"), icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "انتظار المراجعة", value: pending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  ];

  const monthLabel = (month, year) =>
    new Date(year, month, 1).toLocaleString("ar-EG", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      {/* Month Selector */}
      <div className="flex gap-2 justify-end" dir="rtl">
        <button
          onClick={() => setSelectedMonth("current")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedMonth === "current"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {monthLabel(currentMonth, currentYear)}
        </button>
        <button
          onClick={() => setSelectedMonth("prev")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedMonth === "prev"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {monthLabel(prevMonth, prevYear)}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-lg font-bold text-gray-800">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}