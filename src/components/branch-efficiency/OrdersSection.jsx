import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, AlertCircle, ChevronDown, User, Clock } from "lucide-react";

const ORDER_FINAL = ["تم التوصيل", "تم الإلغاء", "النواقص"];

function OrderCard({ order }) {
  return (
    <div className="p-2.5 rounded-lg border border-red-200 bg-red-50">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{order.product_name}</p>
        <Badge className="bg-red-100 text-red-700 text-xs shrink-0">متأخر</Badge>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{order.customer_name}</span>
        {order.assigned_employee && <span className="flex items-center gap-1"><User className="w-3 h-3" />{order.assigned_employee}</span>}
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{order.request_date}</span>
      </div>
      <Badge className="mt-1 bg-gray-200 text-gray-700 text-xs">{order.status}</Badge>
    </div>
  );
}

function DoneSummary({ count, total, label }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
      <span className="text-sm text-green-700 font-medium">{label}</span>
      <span className="text-sm font-bold text-green-700">{count} / {total} ({pct}%)</span>
    </div>
  );
}

function PendingList({ title, items, colorClass, icon: Icon }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors ${colorClass}`}
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {Icon ? <Icon className="w-4 h-4" /> : null} {title} ({items.length})
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
          {items.length === 0
            ? <p className="text-xs text-gray-400 text-center py-3">لا توجد طلبات</p>
            : items.map(o => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}

export default function OrdersSection({ branch, orders }) {
  const bOrders = orders.filter(o => o.branch === branch);
  const newOrders = bOrders.filter(o => o.status === "طلب جديد");
  const doneOrders = bOrders.filter(o => ORDER_FINAL.includes(o.status));
  const pendingOrders = bOrders.filter(o => !ORDER_FINAL.includes(o.status));
  const total = bOrders.length;

  const today = new Date();
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
  const lateOrders = pendingOrders.filter(o => {
    const d = new Date((o.request_date || o.created_date?.split("T")[0]) + "T12:00:00");
    return d < twoDaysAgo;
  });

  return (
    <Card className="p-4 border-2 border-rose-200 bg-rose-50/30">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <ShoppingBag className="w-5 h-5 text-rose-600" />
        <h2 className="font-bold text-gray-800">طلبات العملاء</h2>
        <span className="text-xs text-gray-400 mr-auto">إجمالي {total} طلب</span>
      </div>
      <div className="space-y-3">
        <DoneSummary count={doneOrders.length} total={total} label="طلبات منفذة / مغلقة" />
        <PendingList title="طلبات متأخرة" items={lateOrders} colorClass="text-red-700" icon={AlertCircle} />
        <PendingList title="طلبات جديدة" items={newOrders} colorClass="text-blue-700" icon={ShoppingBag} />
      </div>
    </Card>
  );
}