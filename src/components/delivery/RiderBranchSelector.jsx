import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, ChevronDown, Check } from "lucide-react";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export default function RiderBranchSelector({ rider }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (branch) => base44.entities.Rider.update(rider.id, { branch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-rider-linked"] });
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      setOpen(false);
    },
  });

  return (
    <div className="relative" dir="rtl">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-teal-400 transition-colors"
      >
        <MapPin className="w-4 h-4 text-teal-600" />
        <span>{rider?.branch || "تحديد الفرع"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[160px] py-1">
          {BRANCHES.map((b) => (
            <button
              key={b}
              onClick={() => !mutation.isPending && mutation.mutate(b)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-teal-50 transition-colors ${
                rider?.branch === b ? "text-teal-700 font-bold" : "text-gray-600"
              }`}
            >
              {b}
              {rider?.branch === b && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}