import { useState } from "react";
import { useUserRole } from "@/lib/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarCheck, Route, BarChart3, PieChart, Users, UserCog, ShieldAlert, Clock } from "lucide-react";
import CheckInScreen from "@/components/attendance/CheckInScreen";
import TripScreen from "@/components/trips/TripScreen";
import RiderStatsScreen from "@/components/trips/RiderStatsScreen";
import RiderScheduleTable from "@/components/delivery/RiderScheduleTable";
import SupervisorBoard from "@/components/delivery/SupervisorBoard";
import AdminTripsBoard from "@/components/trips/AdminTripsBoard";
import AdminRiderAnalytics from "@/components/trips/AdminRiderAnalytics";
import DeliveryAccountsManager from "@/components/delivery/DeliveryAccountsManager";
import RiderBranchSelector from "@/components/delivery/RiderBranchSelector";

export default function DeliveryRiders() {
  const { isAdmin, isDeliveryRider, isDeliverySupervisor, isDeliveryAdmin, hasDeliveryAccess, user } = useUserRole();

  // المستخدم لم يُعيَّن له دور بعد
  if (user && !hasDeliveryAccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8" dir="rtl">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">بانتظار تفعيل حسابك</h2>
          <p className="text-gray-500">لم يتم تفعيل صلاحياتك في وحدة المناديب بعد. تواصل مع الإدارة لتفعيل حسابك.</p>
        </div>
      </div>
    );
  }

  // أدمن الديليفري — مثل Admin الكامل
  if (isDeliveryAdmin || isAdmin) {
    return <AdminView user={user} />;
  }

  // مشرف
  if (isDeliverySupervisor) {
    return <SupervisorView user={user} />;
  }

  // مندوب
  if (isDeliveryRider) {
    return <RiderView user={user} />;
  }

  // لا يزال يتحمل
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  );
}

// ============ واجهة الأدمن ============
function AdminView({ user }) {
  const [tab, setTab] = useState("status");
  return (
    <div className="w-full">
      <div className="px-3 md:px-6 pt-3 md:pt-4 border-b flex overflow-x-auto scrollbar-hide gap-1 pb-0">
        {[
          { key: "status", icon: Users, label: "حالة المناديب" },
          { key: "trips", icon: Route, label: "الحركات" },
          { key: "analytics", icon: PieChart, label: "التحليلات" },
          { key: "accounts", icon: UserCog, label: "إدارة الحسابات" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <div style={{ display: tab === "status" ? undefined : "none" }}><SupervisorBoard actingUser={user} /></div>
      <div style={{ display: tab === "trips" ? undefined : "none" }}><AdminTripsBoard /></div>
      <div style={{ display: tab === "analytics" ? undefined : "none" }}><AdminRiderAnalytics /></div>
      <div style={{ display: tab === "accounts" ? undefined : "none" }}><DeliveryAccountsManager /></div>
    </div>
  );
}

// ============ واجهة المشرف ============
function SupervisorView({ user }) {
  return (
    <div className="w-full">
      <SupervisorBoard actingUser={user} />
    </div>
  );
}

// ============ واجهة المندوب ============
function RiderView({ user }) {
  const [tab, setTab] = useState("trips");
  // جلب سجل المندوب المرتبط بهذا الحساب
  const { data: rider, isLoading } = useQuery({
    queryKey: ["my-rider-linked", user?.id, user?.linked_rider_id],
    queryFn: async () => {
      if (user?.linked_rider_id) {
        const results = await base44.entities.Rider.filter({ id: user.linked_rider_id });
        if (results[0]) return results[0];
      }
      // fallback: البحث بـ user_id
      const results = await base44.entities.Rider.filter({ user_id: user.id });
      return results[0] || null;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8" dir="rtl">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-700 mb-2">لم يتم ربط حسابك بسجل مندوب</h2>
          <p className="text-gray-500">تواصل مع الأدمن لربط حسابك بسجل المندوب الخاص بك.</p>
        </div>
      </div>
    );
  }

  const riderTabs = [
    { key: "trips", icon: Route, label: "الحركات", short: "حركة" },
    { key: "attendance", icon: CalendarCheck, label: "الحضور", short: "حضور" },
    { key: "schedule", icon: Clock, label: "مواعيدي", short: "مواعيد" },
    { key: "stats", icon: BarChart3, label: "إحصائياتي", short: "إحصاء" },
  ];

  return (
    <div className="w-full">
      <div className="sticky top-[52px] md:top-0 z-20 bg-white border-b px-2 md:px-4 py-1.5 flex items-center justify-between gap-2">
        <div className="flex gap-0 flex-1">
          {riderTabs.map(({ key, icon: Icon, label, short }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">{label}</span>
              <span className="xs:hidden">{short}</span>
            </button>
          ))}
        </div>
        <RiderBranchSelector rider={rider} />
      </div>
      <div style={{ display: tab === "trips" ? undefined : "none" }}>
        <TripScreen rider={rider} actingUser={user} isSupervisor={false} />
      </div>
      <div style={{ display: tab === "attendance" ? undefined : "none" }}>
        <CheckInScreen rider={rider} actingUser={user} isSupervisor={false} />
      </div>
      <div style={{ display: tab === "schedule" ? undefined : "none" }}>
        <RiderScheduleTable riders={[rider]} canEdit={true} singleRider={rider} />
      </div>
      <div style={{ display: tab === "stats" ? undefined : "none" }}>
        <RiderStatsScreen />
      </div>
    </div>
  );
}