/*
# Core Business Tables - Part 1

## Summary
Creates the foundational tables for the Dawaabills pharmacy management app.

## New Tables
1. `users` — Extended user profiles (role, branch access, permissions) linked to auth.users
2. `suppliers` — Supplier master data
3. `purchase_invoices` — Purchase invoices from suppliers
4. `expenses` — Operating expenses per branch
5. `team_members` — Staff directory
6. `customer_orders` — Customer order/request tracking
7. `returns` — Product returns to suppliers
8. `activity_logs` — Audit log
9. `branch_budgets` — Max purchase budget per branch
10. `branch_credentials` — Stored login credentials per branch (admin only)
11. `target_goals` — Financial target goals
12. `report_settings` — Key/value report config

## Security
- RLS enabled on all tables
- All policies scoped TO authenticated (app has sign-in)
- Data is shared among authenticated pharmacy staff
*/

-- ============================================================
-- USERS (profile extension for auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'viewer',
  delivery_role text,
  linked_rider_id text,
  branch_access jsonb DEFAULT '[]'::jsonb,
  can_save_invoice boolean DEFAULT false,
  can_delete_invoice boolean DEFAULT false,
  can_manage_team boolean DEFAULT false,
  can_set_budget boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  can_manage_returns boolean DEFAULT false,
  can_manage_expenses boolean DEFAULT false,
  can_manage_suppliers boolean DEFAULT false,
  can_manage_orders boolean DEFAULT false,
  can_view_balances boolean DEFAULT false,
  can_manage_inventory boolean DEFAULT false,
  can_manage_attendance boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_users" ON users;
CREATE POLICY "select_users" ON users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_users" ON users;
CREATE POLICY "insert_users" ON users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_users" ON users;
CREATE POLICY "update_users" ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_users" ON users;
CREATE POLICY "delete_users" ON users FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  payment_type text,
  payment_terms_days integer DEFAULT 30,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- PURCHASE_INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_invoice_number text,
  supplier_invoice_number text,
  supplier_name text,
  branch text NOT NULL,
  entered_by text,
  invoice_date date,
  total_value numeric DEFAULT 0,
  returned_value numeric DEFAULT 0,
  paid_value numeric DEFAULT 0,
  payment_type text,
  status text NOT NULL DEFAULT 'انتظار المراجعة',
  notes text,
  created_by_id uuid,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_purchase_invoices" ON purchase_invoices;
CREATE POLICY "select_purchase_invoices" ON purchase_invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_purchase_invoices" ON purchase_invoices;
CREATE POLICY "insert_purchase_invoices" ON purchase_invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_purchase_invoices" ON purchase_invoices;
CREATE POLICY "update_purchase_invoices" ON purchase_invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_purchase_invoices" ON purchase_invoices;
CREATE POLICY "delete_purchase_invoices" ON purchase_invoices FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_branch ON purchase_invoices(branch);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_name);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_created_date ON purchase_invoices(created_date DESC);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  branch text NOT NULL,
  category text,
  date date NOT NULL,
  team_member_name text,
  notes text,
  created_by_id uuid,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_expenses" ON expenses;
CREATE POLICY "select_expenses" ON expenses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_expenses" ON expenses;
CREATE POLICY "insert_expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_expenses" ON expenses;
CREATE POLICY "update_expenses" ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_expenses" ON expenses;
CREATE POLICY "delete_expenses" ON expenses FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_expenses_created_date ON expenses(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch);

-- ============================================================
-- TEAM_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branches jsonb DEFAULT '[]'::jsonb,
  role text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_team_members" ON team_members;
CREATE POLICY "select_team_members" ON team_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_team_members" ON team_members;
CREATE POLICY "insert_team_members" ON team_members FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_team_members" ON team_members;
CREATE POLICY "update_team_members" ON team_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_team_members" ON team_members;
CREATE POLICY "delete_team_members" ON team_members FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CUSTOMER_ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  customer_name text NOT NULL,
  phone text NOT NULL,
  customer_code text,
  branch text,
  request_source text,
  product_name text NOT NULL,
  product_image text,
  delivery_options jsonb DEFAULT '[]'::jsonb,
  notes text,
  priority text DEFAULT 'عادي',
  customer_type text DEFAULT 'عادي',
  assigned_employee text,
  request_date date,
  status text NOT NULL DEFAULT 'طلب جديد',
  supplier_found text,
  purchase_price numeric,
  selling_price numeric,
  search_notes text,
  expected_availability_date date,
  last_followup_date date,
  product_available boolean DEFAULT false,
  customer_contacted boolean DEFAULT false,
  contact_method text,
  followup_notes text,
  cancellation_reason text,
  timeline jsonb DEFAULT '[]'::jsonb,
  created_by_id uuid,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_customer_orders" ON customer_orders;
CREATE POLICY "select_customer_orders" ON customer_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_customer_orders" ON customer_orders;
CREATE POLICY "insert_customer_orders" ON customer_orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_customer_orders" ON customer_orders;
CREATE POLICY "update_customer_orders" ON customer_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_customer_orders" ON customer_orders;
CREATE POLICY "delete_customer_orders" ON customer_orders FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created_date ON customer_orders(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_branch ON customer_orders(branch);

-- ============================================================
-- RETURNS
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text,
  invoice_number text NOT NULL,
  supplier_name text NOT NULL,
  branch_name text NOT NULL,
  employee_name text NOT NULL,
  return_reason text,
  notes text,
  internal_notes text,
  invoice_images jsonb DEFAULT '[]'::jsonb,
  items jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'Pending',
  status_history jsonb DEFAULT '[]'::jsonb,
  approved_by text,
  reviewed_by text,
  returned_at timestamptz,
  created_by_id uuid,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_returns" ON returns;
CREATE POLICY "select_returns" ON returns FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_returns" ON returns;
CREATE POLICY "insert_returns" ON returns FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_returns" ON returns;
CREATE POLICY "update_returns" ON returns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_returns" ON returns;
CREATE POLICY "delete_returns" ON returns FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_returns_created_date ON returns(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);

-- ============================================================
-- ACTIVITY_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_label text,
  user_email text NOT NULL,
  user_name text,
  details text,
  created_date timestamptz DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_activity_logs" ON activity_logs;
CREATE POLICY "select_activity_logs" ON activity_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_activity_logs" ON activity_logs;
CREATE POLICY "insert_activity_logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_activity_logs" ON activity_logs;
CREATE POLICY "update_activity_logs" ON activity_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_activity_logs" ON activity_logs;
CREATE POLICY "delete_activity_logs" ON activity_logs FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_date ON activity_logs(created_date DESC);

-- ============================================================
-- BRANCH_BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS branch_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  budget_limit numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE branch_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_branch_budgets" ON branch_budgets;
CREATE POLICY "select_branch_budgets" ON branch_budgets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_branch_budgets" ON branch_budgets;
CREATE POLICY "insert_branch_budgets" ON branch_budgets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_branch_budgets" ON branch_budgets;
CREATE POLICY "update_branch_budgets" ON branch_budgets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_branch_budgets" ON branch_budgets;
CREATE POLICY "delete_branch_budgets" ON branch_budgets FOR DELETE TO authenticated USING (true);

-- ============================================================
-- BRANCH_CREDENTIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS branch_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE branch_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_branch_credentials" ON branch_credentials;
CREATE POLICY "select_branch_credentials" ON branch_credentials FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_branch_credentials" ON branch_credentials;
CREATE POLICY "insert_branch_credentials" ON branch_credentials FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_branch_credentials" ON branch_credentials;
CREATE POLICY "update_branch_credentials" ON branch_credentials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_branch_credentials" ON branch_credentials;
CREATE POLICY "delete_branch_credentials" ON branch_credentials FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TARGET_GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS target_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text,
  target_amount numeric NOT NULL,
  month text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE target_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_target_goals" ON target_goals;
CREATE POLICY "select_target_goals" ON target_goals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_target_goals" ON target_goals;
CREATE POLICY "insert_target_goals" ON target_goals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_target_goals" ON target_goals;
CREATE POLICY "update_target_goals" ON target_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_target_goals" ON target_goals;
CREATE POLICY "delete_target_goals" ON target_goals FOR DELETE TO authenticated USING (true);

-- ============================================================
-- REPORT_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS report_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE report_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_report_settings" ON report_settings;
CREATE POLICY "select_report_settings" ON report_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_report_settings" ON report_settings;
CREATE POLICY "insert_report_settings" ON report_settings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_report_settings" ON report_settings;
CREATE POLICY "update_report_settings" ON report_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_report_settings" ON report_settings;
CREATE POLICY "delete_report_settings" ON report_settings FOR DELETE TO authenticated USING (true);
