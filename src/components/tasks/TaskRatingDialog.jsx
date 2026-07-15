import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Star, Loader2, Plus, Minus } from "lucide-react";

export default function TaskRatingDialog({ open, onOpenChange, task, onSaved }) {
  const [points, setPoints] = useState(task?.completion_score || 0);
  const [notes, setNotes] = useState(task?.completion_notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Task.update(task.id, {
      completion_score: points,
      completion_notes: notes,
    });
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const presets = [5, 10, 15, 20, 25, 30];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-indigo-700 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            تقييم المهمة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Task title */}
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">المهمة</p>
            <p className="text-sm font-bold text-gray-800">{task?.title}</p>
            <p className="text-xs text-gray-400">{task?.branch_name}</p>
          </div>

          {/* Points input */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">النقاط المكتسبة</label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPoints((p) => Math.max(0, p - 5))}
                className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-700">{points}</div>
                <div className="text-xs text-gray-400">نقطة</div>
              </div>
              <button
                onClick={() => setPoints((p) => p + 5)}
                className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">اختيار سريع</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setPoints(p)}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                    points === p
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-gray-300 text-gray-600 hover:border-indigo-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">ملاحظات التقييم (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي ملاحظة على أداء المهمة..."
              className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التقييم"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}