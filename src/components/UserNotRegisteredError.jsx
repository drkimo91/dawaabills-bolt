import { useAuth } from "@/lib/AuthContext";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const UserNotRegisteredError = () => {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-200 animate-slide-up">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-orange-100">
            <ShieldAlert className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">الوصول محظور</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            أنت غير مسجّل في هذا التطبيق. يرجى التواصل مع مسؤول النظام لطلب صلاحية الوصول.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 text-right space-y-2">
            <p>إذا كنت تعتقد أن هذا خطأ:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>تأكد من تسجيل الدخول بالحساب الصحيح</li>
              <li>تواصل مع مسؤول النظام لإضافتك</li>
              <li>سجّل الخروج ثم أعد الدخول</li>
            </ul>
          </div>
          <Button
            onClick={() => logout()}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-700"
          >
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
