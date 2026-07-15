import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { User, Lock, LogIn, Eye, EyeOff, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const INTERNAL_DOMAIN = "dawaa-internal.app";

export default function RiderLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);

    const clean = username.trim().toLowerCase().replace(/\s+/g, "_");
    const email = clean.includes("@") ? clean : `${clean}@${INTERNAL_DOMAIN}`;

    try {
      await base44.auth.loginViaEmailPassword(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err?.status === 401 || err?.status === 400 || err?.message?.includes("Invalid")) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      } else if (err?.status === 403) {
        setError("الحساب غير مفعّل — تواصل مع الأدمن");
      } else {
        setError("حدث خطأ، حاول مجدداً");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-800 to-cyan-900" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)`
      }} />

      {/* Decorative floating shapes */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-teal-400/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">صيدليات دواء</h1>
          <p className="text-teal-200/80 text-sm mt-1">نظام إدارة المشتريات والمخزون</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-5">
          <h2 className="font-bold text-gray-800 text-lg text-center">تسجيل الدخول</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-700">اسم المستخدم</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pr-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pr-9 pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  type={showPass ? "text" : "password"}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center animate-slide-down">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 py-5 text-base font-bold shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><LogIn className="w-5 h-5" /> دخول</>
              )}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center pt-1">
            للحصول على حساب، تواصل مع مسؤول النظام
          </p>
        </div>
      </div>
    </div>
  );
}
