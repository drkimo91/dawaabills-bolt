/**
 * RiderLogin — شاشة تسجيل دخول المناديب باسم المستخدم
 * يحوّل username → username@dawaa-internal.app ثم يسجّل الدخول عبر Base44
 */
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { User, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const INTERNAL_DOMAIN = "dawaa-internal.app";

export default function RiderLogin() {
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
      window.location.href = "/";
    } catch (err) {
      if (err?.status === 401 || err?.status === 400) {
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
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚴</span>
          </div>
          <h1 className="text-2xl font-bold text-white">صيدليات دواء</h1>
          <p className="text-teal-100 text-sm mt-1">نظام مناديب التوصيل</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="font-bold text-gray-800 text-lg text-center">تسجيل الدخول</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label>اسم المستخدم</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pr-9"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pr-9 pl-9"
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 py-5 text-base font-bold"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><LogIn className="w-5 h-5" /> دخول</>
              )}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center pt-2">
            للحصول على حساب، تواصل مع مسؤول النظام
          </p>
        </div>
      </div>
    </div>
  );
}