/**
 * DeliveryAccountsManager — شاشة إدارة الحسابات (أدمن فقط)
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { UserCog, Link as LinkIcon, UserPlus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DELIVERY_ROLES = [
  { value: "مندوب", label: "مندوب" },
  { value: "مشرف", label: "مشرف" },
  { value: "أدمن", label: "أدمن" },
  { value: "__none__", label: "بدون دور (محجوب)" },
];

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

export default function DeliveryAccountsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLinkForm, setShowLinkForm] = useState(null); // user object
  const [riderName, setRiderName] = useState("");
  const [riderBranch, setRiderBranch] = useState(BRANCHES[0]);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["all-users-delivery"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: riders = [] } = useQuery({
    queryKey: ["riders"],
    queryFn: () => base44.entities.Rider.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-users-delivery"] }),
    onError: () => toast({ title: "خطأ", description: "تعذر الحفظ", variant: "destructive" }),
  });

  const createAndLinkMutation = useMutation({
    mutationFn: async ({ user, name, branch }) => {
      // إنشاء سجل المندوب
      const rider = await base44.entities.Rider.create({
        name,
        branch,
        user_id: user.id,
        is_active: true,
      });
      // ربط المستخدم بالسجل وتعيين دور مندوب
      await base44.entities.User.update(user.id, {
        delivery_role: "مندوب",
        linked_rider_id: rider.id,
      });
      return rider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      toast({ title: "✓ تم ربط المندوب بنجاح" });
      setShowLinkForm(null);
      setRiderName("");
    },
    onError: () => toast({ title: "خطأ", description: "تعذر الإنشاء والربط", variant: "destructive" }),
  });

  const handleRoleChange = (user, value) => {
    const newRole = value === "__none__" ? null : value;
    const data = { delivery_role: newRole };
    if (newRole !== "مندوب") data.linked_rider_id = null;
    updateMutation.mutate({ userId: user.id, data });
  };

  const handleRiderLink = (user, riderId) => {
    updateMutation.mutate({ userId: user.id, data: { linked_rider_id: riderId } });
    if (riderId) {
      base44.entities.Rider.update(riderId, { user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ["riders"] });
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex items-center gap-2 mb-5">
        <UserCog className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-bold text-gray-800">إدارة حسابات المناديب</h2>
      </div>

      {/* نموذج الربط السريع */}
      {showLinkForm && (
        <div className="mb-5 bg-teal-50 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-teal-800 text-sm">
              ربط مندوب جديد بـ: <span className="font-bold">{showLinkForm.full_name}</span>
            </p>
            <button onClick={() => setShowLinkForm(null)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="اسم المندوب"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              className="text-sm h-9"
            />
            <Select value={riderBranch} onValueChange={setRiderBranch}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 h-9"
              disabled={!riderName.trim() || createAndLinkMutation.isPending}
              onClick={() => createAndLinkMutation.mutate({ user: showLinkForm, name: riderName.trim(), branch: riderBranch })}
            >
              {createAndLinkMutation.isPending ? "جاري..." : "إنشاء وربط"}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-right p-3 font-medium">المستخدم</th>
              <th className="text-right p-3 font-medium">البريد</th>
              <th className="text-right p-3 font-medium">الدور</th>
              <th className="text-right p-3 font-medium">سجل المندوب</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((user) => {
              const linkedRider = riders.find((r) => r.id === user.linked_rider_id);
              return (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{user.full_name || "—"}</td>
                  <td className="p-3 text-gray-500 text-xs">{user.email || "—"}</td>
                  <td className="p-3">
                    <Select
                      value={user.delivery_role || "__none__"}
                      onValueChange={(val) => handleRoleChange(user, val)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    {user.delivery_role === "مندوب" ? (
                      <Select
                        value={user.linked_rider_id || "__none__"}
                        onValueChange={(val) => handleRiderLink(user, val === "__none__" ? null : val)}
                      >
                        <SelectTrigger className="w-48 h-8 text-xs">
                          <SelectValue placeholder="اختر سجل مندوب..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— غير مربوط —</SelectItem>
                          {riders.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} ({r.branch})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {user.delivery_role === "مندوب" && !user.linked_rider_id && (
                      <button
                        onClick={() => { setShowLinkForm(user); setRiderName(user.full_name || ""); }}
                        className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> إنشاء وربط
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {allUsers.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">لا توجد حسابات</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-400">* الحسابات بدون دور لن تتمكن من الوصول لشاشات وحدة المناديب.</p>
        <Link
          to="/rider-login"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg"
        >
          <LinkIcon className="w-3 h-3" /> رابط تسجيل دخول المناديب
        </Link>
      </div>
    </div>
  );
}