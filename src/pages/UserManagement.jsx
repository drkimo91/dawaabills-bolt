import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, UserPlus, Mail, Check, X, Lock, KeyRound,
  Building2, Users, ChevronDown, ChevronUp, Pencil, Save
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole } from "@/lib/useUserRole";
import BranchCredentials from "@/components/user-management/BranchCredentials";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

const ROLE_CONFIG = {
  admin: { label: "مدير عام", color: "bg-red-100 text-red-700 border-red-200", desc: "صلاحيات كاملة على كل شيء" },
  manager: { label: "محاسب / مشرف", color: "bg-blue-100 text-blue-700 border-blue-200", desc: "صلاحيات واسعة افتراضية" },
  viewer: { label: "موظف / مشاهد", color: "bg-gray-100 text-gray-600 border-gray-200", desc: "صلاحيات مخصصة فقط" },
};

const PERMISSION_GROUPS = [
  {
    group: "الفواتير",
    color: "blue",
    perms: [
      { key: "can_save_invoice", label: "إضافة وتعديل الفواتير" },
      { key: "can_delete_invoice", label: "حذف الفواتير" },
    ]
  },
  {
    group: "المالية",
    color: "green",
    perms: [
      { key: "can_view_balances", label: "عرض أرصدة الموردين" },
      { key: "can_manage_expenses", label: "إدارة المصروفات" },
      { key: "can_set_budget", label: "تحديد الميزانية" },
    ]
  },
  {
    group: "التقارير",
    color: "purple",
    perms: [
      { key: "can_view_reports", label: "عرض التقارير" },
    ]
  },
  {
    group: "العمليات",
    color: "orange",
    perms: [
      { key: "can_manage_suppliers", label: "إدارة الموردين" },
      { key: "can_manage_returns", label: "إدارة المرتجعات" },
      { key: "can_manage_orders", label: "إدارة طلبات العملاء" },
      { key: "can_manage_inventory", label: "إدارة الجرد" },
      { key: "can_manage_team", label: "إدارة فريق العمل" },
    ]
  },
];

const groupColors = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", title: "text-blue-700", badge: "bg-blue-100 text-blue-700", on: "bg-blue-600 text-white border-blue-600", off: "bg-white text-gray-500 border-gray-200 hover:border-blue-300" },
  green: { bg: "bg-green-50", border: "border-green-200", title: "text-green-700", badge: "bg-green-100 text-green-700", on: "bg-green-600 text-white border-green-600", off: "bg-white text-gray-500 border-gray-200 hover:border-green-300" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", title: "text-purple-700", badge: "bg-purple-100 text-purple-700", on: "bg-purple-600 text-white border-purple-600", off: "bg-white text-gray-500 border-gray-200 hover:border-purple-300" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", title: "text-orange-700", badge: "bg-orange-100 text-orange-700", on: "bg-orange-600 text-white border-orange-600", off: "bg-white text-gray-500 border-gray-200 hover:border-orange-300" },
};

function UserCard({ user, onPermChange, onRoleChange, onBranchChange }) {
  const [expanded, setExpanded] = useState(false);
  const role = user.role || "viewer";
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
  const branches = user.branch_access || [];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
            {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm">{user.full_name || "—"}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={role} onValueChange={(v) => onRoleChange(user.id, v)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">مدير عام</SelectItem>
              <SelectItem value="manager">محاسب / مشرف</SelectItem>
              <SelectItem value="viewer">موظف / مشاهد</SelectItem>
            </SelectContent>
          </Select>
          <Badge className={`${cfg.color} border text-xs hidden sm:inline-flex`}>{cfg.label}</Badge>
          {role !== "admin" && (
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-teal-600 p-1 rounded">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded permissions */}
      {role !== "admin" && expanded && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          {/* Branch Access */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> الوصول للفروع
            </p>
            <div className="flex flex-wrap gap-2">
              {BRANCHES.map(b => {
                const active = branches.includes(b);
                return (
                  <button
                    key={b}
                    onClick={() => {
                      const updated = active ? branches.filter(x => x !== b) : [...branches, b];
                      onBranchChange(user.id, updated);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                      active ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-500 border-gray-200 hover:border-teal-300"
                    }`}
                  >
                    {active ? <Check className="w-3 h-3 inline ml-1" /> : null}
                    {b}
                  </button>
                );
              })}
              {branches.length === 0 && <span className="text-xs text-gray-400">كل الفروع (لم يُحدَّد)</span>}
            </div>
          </div>

          {/* Permission Groups */}
          {PERMISSION_GROUPS.map(({ group, color, perms }) => {
            const c = groupColors[color];
            const activeCount = perms.filter(p => !!user[p.key]).length;
            return (
              <div key={group} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${c.title}`}>{group}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>{activeCount}/{perms.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {perms.map(p => {
                    const val = !!user[p.key];
                    return (
                      <button
                        key={p.key}
                        onClick={() => onPermChange(user.id, p.key, !val)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all font-medium ${
                          val ? c.on : c.off
                        }`}
                      >
                        {val ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quick All/None */}
          <div className="flex gap-2 pt-1 border-t">
            <Button variant="outline" size="sm" className="text-xs h-7 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => {
                const allPerms = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.key));
                allPerms.forEach(k => onPermChange(user.id, k, true));
              }}>
              <Check className="w-3 h-3 ml-1" /> تفعيل الكل
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => {
                const allPerms = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p.key));
                allPerms.forEach(k => onPermChange(user.id, k, false));
              }}>
              <X className="w-3 h-3 ml-1" /> إلغاء الكل
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function UserManagement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "viewer" });
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleRoleChange = (id, role) => updateUser.mutate({ id, data: { role } });

  const handlePermChange = (id, perm, value) => updateUser.mutate({ id, data: { [perm]: value } });

  const handleBranchChange = (id, branch_access) => updateUser.mutate({ id, data: { branch_access } });

  const handleInvite = async () => {
    await base44.users.inviteUser(inviteForm.email, inviteForm.role === "admin" ? "admin" : "user");
    toast({ title: "تم إرسال الدعوة", description: `تم إرسال دعوة إلى ${inviteForm.email}` });
    setInviteDialog(false);
    setInviteForm({ email: "", role: "viewer" });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  if (!isAdmin) {
    return (
      <div dir="rtl" className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <Lock className="w-12 h-12" />
        <p className="text-lg font-medium">هذه الصفحة للمدير فقط</p>
      </div>
    );
  }

  const filtered = users.filter(u =>
    (u.full_name || "").includes(search) || (u.email || "").includes(search)
  );

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين والصلاحيات</h1>
            <p className="text-gray-500 text-sm mt-0.5">تحكم كامل في أدوار وصلاحيات المستخدمين</p>
          </div>
        </div>
        <Button onClick={() => setInviteDialog(true)} className="bg-teal-600 hover:bg-teal-700 gap-2">
          <UserPlus className="w-4 h-4" /> دعوة مستخدم جديد
        </Button>
      </div>

      <Tabs defaultValue="users" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> المستخدمون</TabsTrigger>
          <TabsTrigger value="branches" className="gap-2"><KeyRound className="w-4 h-4" /> حسابات الفروع</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Role summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
              const count = users.filter(u => (u.role || "viewer") === key).length;
              return (
                <Card key={key} className={`p-4 border-r-4 ${key === "admin" ? "border-r-red-400" : key === "manager" ? "border-r-blue-400" : "border-r-gray-300"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={`${cfg.color} border text-xs`}>{cfg.label}</Badge>
                    <span className="text-2xl font-bold text-gray-700">{count}</span>
                  </div>
                  <p className="text-xs text-gray-400">{cfg.desc}</p>
                </Card>
              );
            })}
          </div>

          {/* Search */}
          <Input
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {/* Users list */}
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onRoleChange={handleRoleChange}
                  onPermChange={handlePermChange}
                  onBranchChange={handleBranchChange}
                />
              ))}
              {filtered.length === 0 && (
                <Card className="p-8 text-center text-gray-400">لا يوجد مستخدمون</Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="branches">
          <BranchCredentials />
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" /> دعوة مستخدم جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                placeholder="example@email.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>الدور الوظيفي</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير عام</SelectItem>
                  <SelectItem value="manager">محاسب / مشرف</SelectItem>
                  <SelectItem value="viewer">موظف / مشاهد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`rounded-lg p-3 text-xs ${ROLE_CONFIG[inviteForm.role]?.color} border`}>
              <strong>{ROLE_CONFIG[inviteForm.role]?.label}:</strong> {ROLE_CONFIG[inviteForm.role]?.desc}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteDialog(false)}>إلغاء</Button>
            <Button disabled={!inviteForm.email} onClick={handleInvite} className="bg-teal-600 hover:bg-teal-700">
              إرسال الدعوة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}