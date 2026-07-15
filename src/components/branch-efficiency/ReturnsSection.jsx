import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RotateCcw, FileText, Clock, ChevronDown } from "lucide-react";

const DONE_STATUSES = ["Returned", "Approved"];

function ReturnItem({ ret }) {
  return (
    <div className="p-2 rounded-lg border border-orange-200 bg-orange-50">
      <p className="text-sm font-medium text-gray-800 line-clamp-1">{ret.supplier_name}</p>
      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
        <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{ret.invoice_number}</span>
        {ret.returned_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ret.returned_at.split("T")[0]}</span>}
      </div>
      <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{ret.status}</span>
    </div>
  );
}

export default function ReturnsSection({ branch, returns }) {
  const bReturns = returns.filter(r => r.branch_name === branch);
  const done = bReturns.filter(r => DONE_STATUSES.includes(r.status));
  const pending = bReturns.filter(r => !DONE_STATUSES.includes(r.status));
  const total = bReturns.length;
  const donePct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4 border-2 border-pink-200 bg-pink-50/30">
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw className="w-5 h-5 text-pink-600" />
        <h2 className="font-bold text-gray-800">المرتجعات</h2>
        <span className="text-xs text-gray-400 mr-auto">إجمالي {total} مرتجع</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
          <span className="text-sm text-green-700 font-medium">مرتجعات منفذة</span>
          <span className="text-sm font-bold text-green-700">{done.length} / {total} ({donePct}%)</span>
        </div>
        <div>
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-orange-700"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <RotateCcw className="w-4 h-4" /> مرتجعات متأخرة ({pending.length})
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="space-y-1.5 mt-2 max-h-80 overflow-y-auto">
              {pending.length === 0
                ? <p className="text-xs text-gray-400 text-center py-3">لا توجد مرتجعات متأخرة</p>
                : pending.map(r => <ReturnItem key={r.id} ret={r} />)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}