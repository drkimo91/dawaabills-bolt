import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Car, MapPin } from "lucide-react";
import { STOP_TYPES } from "@/lib/trip-utils";

export default function StopSelectionDialog({ open, onOpenChange, onConfirm, savedLocations = [], isLoading, title = "إضافة وجهة" }) {
  const [stopType, setStopType] = useState("");
  const [destination, setDestination] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");

  useEffect(() => {
    if (open) {
      setStopType("");
      setDestination("");
      setCustomerName("");
      setCustomerCode("");
    }
  }, [open]);

  const isOrder = stopType === "أوردر";
  const isTrip = stopType === "مشوار";

  const handleConfirm = () => {
    const orderInfo = isOrder
      ? [customerName, customerCode].filter(Boolean).join(" — ")
      : "";
    onConfirm({ stop_type: stopType, destination, order_or_customer_info: orderInfo });
  };

  const canConfirm = stopType && (isOrder ? customerName : destination);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* نوع الوجهة */}
          <div className="space-y-2">
            <Label>١. نوع الوجهة</Label>
            <div className="grid grid-cols-2 gap-3">
              {STOP_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setStopType(type)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                    stopType === type
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {type === "أوردر"
                    ? <Package className="w-6 h-6 text-teal-600" />
                    : <Car className="w-6 h-6 text-amber-600" />}
                  <span className="font-medium text-sm">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* حقول الأوردر */}
          {isOrder && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>٢. اسم العميل <span className="text-red-500">*</span></Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="اكتب اسم العميل"
                />
              </div>
              <div className="space-y-1.5">
                <Label>٣. كود العميل (اختياري)</Label>
                <Input
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  placeholder="مثال: C-1234"
                />
              </div>
              <div className="space-y-1.5">
                <Label>٤. الوجهة / العنوان (اختياري)</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="اكتب العنوان أو المنطقة"
                />
              </div>
            </div>
          )}

          {/* حقول المشوار */}
          {isTrip && (
            <div className="space-y-2">
              <Label>٢. الوجهة <span className="text-red-500">*</span></Label>
              {savedLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {savedLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setDestination(loc.location_name)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        destination === loc.location_name
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <MapPin className="w-3 h-3" /> {loc.location_name}
                    </button>
                  ))}
                </div>
              )}
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="أو اكتب الوجهة يدويًا"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-row-reverse gap-2 mt-2">
          <Button
            className="bg-teal-600 hover:bg-teal-700 flex-1"
            disabled={isLoading || !canConfirm}
            onClick={handleConfirm}
          >
            {isLoading ? "جاري التأكيد..." : "تأكيد"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}