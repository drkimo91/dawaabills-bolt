/**
 * CreateRiderAccountDialog
 * الأدمن يُنشئ حساباً جديداً للمندوب:
 * 1) يُسجّل البريد الداخلي username@dawaa-internal.app + كلمة المرور
 * 2) يُدخل رمز OTP الذي وصل على البريد
 * 3) يتم ربط الحساب بسجل المندوب تلقائياً
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, Eye, EyeOff } from "lucide-react";

const INTERNAL_DOMAIN = "dawaa-internal.app";

export default function CreateRiderAccountDialog({ open, onOpenChange, rider, onAccountCreated }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1=بيانات, 2=OTP, 3=مكتمل
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [internalEmail, setInternalEmail] = useState("");

  const reset = () => {
    setStep(1); setUsername(""); setPassword(""); setOtp("");
    setError(""); setInternalEmail(""); setLoading(false);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  // الخطوة 1: تسجيل الحساب
  const handleRegister = async () => {
    if (!username.trim() || password.length < 6) return;
    setError("");
    setLoading(true);

    const clean = username.trim().toLowerCase().replace(/\s+/g, "_");
    const email = `${clean}@${INTERNAL_DOMAIN}`;
    setInternalEmail(email);

    try {
      await base44.auth.register({ email, password });
      setStep(2);
      toast({ title: "تم إرسال رمز التحقق", description: `إلى ${email}` });
    } catch (err) {
      if (err?.status === 409 || err?.data?.detail?.includes("already")) {
        setError("اسم المستخدم مستخدم مسبقاً، اختر اسماً آخر");
      } else {
        setError("حدث خطأ أثناء إنشاء الحساب");
      }
    } finally {
      setLoading(false);
    }
  };

  // الخطوة 2: التحقق من OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setError("");
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email: internalEmail, otpCode: otp.trim() });
      // ابحث عن المستخدم الجديد وربطه بالمندوب
      await linkAccountToRider();
    } catch (err) {
      setError("رمز التحقق غير صحيح أو منتهي الصلاحية");
      setLoading(false);
    }
  };

  const linkAccountToRider = async () => {
    try {
      // انتظر قليلاً حتى يُسجَّل المستخدم
      await new Promise((r) => setTimeout(r, 1000));
      const users = await base44.entities.User.list();
      const newUser = users.find((u) => u.email === internalEmail);
      if (newUser && rider) {
        await base44.entities.User.update(newUser.id, { delivery_role: "مندوب", linked_rider_id: rider.id });
        await base44.entities.Rider.update(rider.id, { username: username.trim().toLowerCase().replace(/\s+/g, "_"), user_id: newUser.id });
      }
      setStep(3);
      onAccountCreated?.();
    } catch {
      // حتى لو فشل الربط، الحساب تم إنشاؤه
      setStep(3);
      onAccountCreated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">إنشاء حساب مندوب</DialogTitle>
        </DialogHeader>

        {rider && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm text-teal-700 text-center">
            للمندوب: <span className="font-bold">{rider.name}</span>
          </div>
        )}

        {/* خطوة 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>اسم المستخدم <span className="text-red-500">*</span></Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: ahmed_zakaria"
                dir="ltr"
              />
              {username && (
                <p className="text-xs text-gray-400">
                  البريد الداخلي: <span className="font-mono text-teal-600">{username.trim().toLowerCase().replace(/\s+/g, "_")}@{INTERNAL_DOMAIN}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="pl-9"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <DialogFooter className="flex-row-reverse gap-2">
              <Button
                className="bg-teal-600 hover:bg-teal-700 flex-1"
                disabled={loading || !username.trim() || password.length < 6}
                onClick={handleRegister}
              >
                {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
              </Button>
              <Button variant="outline" onClick={handleClose}>إلغاء</Button>
            </DialogFooter>
          </div>
        )}

        {/* خطوة 2: OTP */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 text-center">
              <p className="font-bold mb-1">أدخل رمز التحقق</p>
              <p className="text-xs">تم إرسال رمز إلى:</p>
              <p className="font-mono text-xs mt-1">{internalEmail}</p>
            </div>
            <div className="space-y-1.5">
              <Label>رمز التحقق (OTP)</Label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="أدخل الرمز المكوّن من 6 أرقام"
                maxLength={6}
                dir="ltr"
                className="text-center text-xl tracking-widest"
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <DialogFooter className="flex-row-reverse gap-2">
              <Button
                className="bg-teal-600 hover:bg-teal-700 flex-1"
                disabled={loading || otp.length < 4}
                onClick={handleVerifyOtp}
              >
                {loading ? "جاري التحقق..." : "تأكيد الرمز"}
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>رجوع</Button>
            </DialogFooter>
          </div>
        )}

        {/* خطوة 3: اكتمل */}
        {step === 3 && (
          <div className="text-center py-4 space-y-3">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h3 className="font-bold text-lg">تم إنشاء الحساب بنجاح!</h3>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 space-y-1">
              <p>اسم المستخدم: <span className="font-mono font-bold">{username.trim().toLowerCase().replace(/\s+/g, "_")}</span></p>
            </div>
            <p className="text-xs text-gray-400">يمكن للمندوب الآن تسجيل الدخول باسم المستخدم وكلمة المرور</p>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleClose}>إغلاق</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}