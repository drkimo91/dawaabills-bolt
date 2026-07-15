import { supabase } from '@/lib/supabaseClient';

/**
 * Map of Base44 entity names -> Supabase table names.
 * Keys are the exact names used as base44.entities.<Name> throughout the app.
 */
const entityTableMap = {
  User: 'users',
  Supplier: 'suppliers',
  PurchaseInvoice: 'purchase_invoices',
  Expense: 'expenses',
  TeamMember: 'team_members',
  CustomerOrder: 'customer_orders',
  Return: 'returns',
  ActivityLog: 'activity_logs',
  BranchBudget: 'branch_budgets',
  BranchCredential: 'branch_credentials',
  TargetGoal: 'target_goals',
  ReportSettings: 'report_settings',
  Rider: 'riders',
  Trip: 'trips',
  TripStop: 'trip_stops',
  ShiftHandover: 'shift_handovers',
  Task: 'tasks',
  TaskTemplate: 'task_templates',
  ExpenseTemplate: 'expense_templates',
  RiderSchedule: 'rider_schedules',
  AttendanceRecord: 'attendance_records',
  SavedLocation: 'saved_locations',
  SupplierDebt: 'supplier_debts',
  SupplierPayment: 'supplier_payments',
  SupplierMonthStart: 'supplier_month_starts',
  MedicineItem: 'medicine_items',
  MedicineSale: 'medicine_sales',
  InventoryProduct: 'inventory_products',
  InventoryCountTask: 'inventory_count_tasks',
  InventoryCountEntry: 'inventory_count_entries',
  InventorySettings: 'inventory_settings',
  WeeklySchedule: 'weekly_schedules',
  ExpiredItem: 'expired_items',
  SlowMovingItem: 'slow_moving_items',
  BackupLog: 'backup_logs',
};

/**
 * Parse a Base44-style sort string ("-created_date" => { column, ascending }).
 * Returns null if no sort.
 */
function parseSort(sort) {
  if (!sort) return null;
  const desc = sort.startsWith('-');
  const column = desc ? sort.slice(1) : sort;
  return { column, ascending: !desc };
}

/**
 * Build a Supabase query with filters from a Base44-style filter object.
 * Base44 filter uses exact-match field equality.
 */
function applyFilters(query, filterObj) {
  if (!filterObj || typeof filterObj !== 'object') return query;
  for (const [key, value] of Object.entries(filterObj)) {
    if (value === null || value === undefined) continue;
    query = query.eq(key, value);
  }
  return query;
}

/**
 * Create an entity proxy that mimics the Base44 SDK entity interface.
 * Methods: list, filter, get, create, update, delete, bulkCreate, subscribe
 */
function createEntityProxy(tableName) {
  return {
    async list(sort, limit, skip, fields) {
      let query = supabase.from(tableName).select('*');
      const sortInfo = parseSort(sort);
      if (sortInfo) {
        query = query.order(sortInfo.column, { ascending: sortInfo.ascending });
      }
      if (limit) query = query.limit(limit);
      if (skip) query = query.range(skip, skip + (limit || 1000) - 1);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async filter(filterObj, sort, limit, skip, fields) {
      let query = supabase.from(tableName).select('*');
      query = applyFilters(query, filterObj);
      const sortInfo = parseSort(sort);
      if (sortInfo) {
        query = query.order(sortInfo.column, { ascending: sortInfo.ascending });
      }
      if (limit) query = query.limit(limit);
      if (skip) query = query.range(skip, skip + (limit || 1000) - 1);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    async bulkCreate(items) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(items)
        .select('*');
      if (error) throw error;
      return data || [];
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`realtime:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          callback(payload);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

/**
 * Auth wrapper mimicking base44.auth
 */
const authProxy = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { status: 401, message: 'Not authenticated' };

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!profile) {
      return {
        id: user.id,
        email: user.email,
        full_name: user.email,
        role: 'viewer',
        data: { role: 'viewer', branch_access: [] },
      };
    }

    return {
      id: profile.auth_user_id || user.id,
      _id: profile.id,
      email: profile.email,
      full_name: profile.full_name || profile.email,
      role: profile.role,
      delivery_role: profile.delivery_role,
      linked_rider_id: profile.linked_rider_id,
      branch_access: profile.branch_access || [],
      can_save_invoice: profile.can_save_invoice,
      can_delete_invoice: profile.can_delete_invoice,
      can_manage_team: profile.can_manage_team,
      can_set_budget: profile.can_set_budget,
      can_view_reports: profile.can_view_reports,
      can_manage_returns: profile.can_manage_returns,
      can_manage_expenses: profile.can_manage_expenses,
      can_manage_suppliers: profile.can_manage_suppliers,
      can_manage_orders: profile.can_manage_orders,
      can_view_balances: profile.can_view_balances,
      can_manage_inventory: profile.can_manage_inventory,
      can_manage_attendance: profile.can_manage_attendance,
      data: {
        role: profile.role,
        delivery_role: profile.delivery_role,
        linked_rider_id: profile.linked_rider_id,
        branch_access: profile.branch_access || [],
        can_save_invoice: profile.can_save_invoice,
        can_delete_invoice: profile.can_delete_invoice,
        can_manage_team: profile.can_manage_team,
        can_set_budget: profile.can_set_budget,
        can_view_reports: profile.can_view_reports,
        can_manage_returns: profile.can_manage_returns,
        can_manage_expenses: profile.can_manage_expenses,
        can_manage_suppliers: profile.can_manage_suppliers,
        can_manage_orders: profile.can_manage_orders,
        can_view_balances: profile.can_view_balances,
        can_manage_inventory: profile.can_manage_inventory,
        can_manage_attendance: profile.can_manage_attendance,
      },
    };
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { access_token: data.session?.access_token, user: data.user };
  },

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
    if (error) throw error;
    return data;
  },

  logout(redirectUrl) {
    supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin(nextUrl) {
    const currentUrl = nextUrl || window.location.href;
    window.location.href = `/rider-login?next=${encodeURIComponent(currentUrl)}`;
  },
};

/**
 * Functions wrapper — stub for edge function invocations.
 */
const functionsProxy = {
  async invoke(name, params) {
    const { data, error } = await supabase.functions.invoke(name, { body: params });
    if (error) throw error;
    return data;
  },
};

/**
 * Integrations wrapper — maps UploadFile to Supabase Storage.
 */
const integrationsProxy = {
  Core: {
    async UploadFile({ file }) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);
      if (uploadError) {
        return { file_url: URL.createObjectURL(file) };
      }
      const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
      return { file_url: data.publicUrl };
    },
  },
};

// Build the entities proxy
const entities = {};
for (const [entityName, tableName] of Object.entries(entityTableMap)) {
  entities[entityName] = createEntityProxy(tableName);
}

/**
 * base44-compatible client exported as the default.
 * Drop-in replacement for the @base44/sdk createClient result.
 */
export const base44 = {
  entities,
  auth: authProxy,
  functions: functionsProxy,
  integrations: integrationsProxy,
};
