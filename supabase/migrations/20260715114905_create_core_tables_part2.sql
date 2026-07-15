/*
# Core Business Tables - Part 2

## Summary
Creates the remaining tables for the Dawaabills pharmacy management app.

## New Tables
1. `riders` — Delivery rider profiles
2. `trips` — Delivery trips
3. `trip_stops` — Stops within a trip
4. `shift_handovers` — Shift handover/closing records
5. `tasks` — Employee task assignments
6. `task_templates` — Reusable task templates
7. `expense_templates` — Reusable expense templates
8. `rider_schedules` — Rider weekly schedules
9. `attendance_records` — Rider attendance/check-in
10. `saved_locations` — Delivery destinations
11. `supplier_debts` — Opening/legacy debt per supplier
12. `supplier_payments` — Payments to suppliers
13. `supplier_month_starts` — Supplier month start dates
14. `medicine_items` — Medicine list items
15. `medicine_sales` — Weekly medicine sales
16. `inventory_products` — Inventory product catalog
17. `inventory_count_tasks` — Inventory count tasks
18. `inventory_count_entries` — Individual count entries
19. `inventory_settings` — Per-branch inventory config
20. `weekly_schedules` — Weekly employee schedules
21. `expired_items` — Expired stock items
22. `slow_moving_items` — Slow-moving stock items
23. `backup_logs` — Backup log entries

## Security
- RLS enabled on all tables
- All policies scoped TO authenticated (app has sign-in)
*/

-- ============================================================
-- RIDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  username text,
  branch text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  user_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_riders" ON riders;
CREATE POLICY "select_riders" ON riders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_riders" ON riders;
CREATE POLICY "insert_riders" ON riders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_riders" ON riders;
CREATE POLICY "update_riders" ON riders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_riders" ON riders;
CREATE POLICY "delete_riders" ON riders FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id text NOT NULL,
  rider_name text NOT NULL,
  rider_user_id text NOT NULL,
  branch text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  created_by_supervisor text,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_trips" ON trips;
CREATE POLICY "select_trips" ON trips FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_trips" ON trips;
CREATE POLICY "insert_trips" ON trips FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_trips" ON trips;
CREATE POLICY "update_trips" ON trips FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_trips" ON trips;
CREATE POLICY "delete_trips" ON trips FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON trips(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_trips_rider_id ON trips(rider_id);

-- ============================================================
-- TRIP_STOPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text NOT NULL,
  rider_user_id text NOT NULL,
  stop_type text NOT NULL,
  destination text NOT NULL,
  order_or_customer_info text,
  stop_start_time timestamptz NOT NULL,
  stop_end_time timestamptz,
  created_by_supervisor text,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE trip_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_trip_stops" ON trip_stops;
CREATE POLICY "select_trip_stops" ON trip_stops FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_trip_stops" ON trip_stops;
CREATE POLICY "insert_trip_stops" ON trip_stops FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_trip_stops" ON trip_stops;
CREATE POLICY "update_trip_stops" ON trip_stops FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_trip_stops" ON trip_stops;
CREATE POLICY "delete_trip_stops" ON trip_stops FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON trip_stops(trip_id);

-- ============================================================
-- SHIFT_HANDOVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  shift_type text NOT NULL,
  date date NOT NULL,
  posting_date date,
  handover_time timestamptz,
  employee_name text NOT NULL,
  total_sales numeric NOT NULL DEFAULT 0,
  expenses jsonb DEFAULT '[]'::jsonb,
  total_expenses numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  created_by_name text,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_shift_handovers" ON shift_handovers;
CREATE POLICY "select_shift_handovers" ON shift_handovers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_shift_handovers" ON shift_handovers;
CREATE POLICY "insert_shift_handovers" ON shift_handovers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_shift_handovers" ON shift_handovers;
CREATE POLICY "update_shift_handovers" ON shift_handovers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_shift_handovers" ON shift_handovers;
CREATE POLICY "delete_shift_handovers" ON shift_handovers FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_date ON shift_handovers(date DESC);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  notes text,
  template_key text,
  branch_id text,
  branch_name text NOT NULL,
  assigned_to text,
  assigned_to_name text,
  due_date date,
  priority text DEFAULT 'medium',
  category text DEFAULT 'weekly',
  status text NOT NULL DEFAULT 'pending',
  completion_score numeric DEFAULT 0,
  completion_notes text,
  bonus_points numeric DEFAULT 0,
  deduction_points numeric DEFAULT 0,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_tasks" ON tasks;
CREATE POLICY "select_tasks" ON tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_tasks" ON tasks;
CREATE POLICY "insert_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_tasks" ON tasks;
CREATE POLICY "update_tasks" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_tasks" ON tasks;
CREATE POLICY "delete_tasks" ON tasks FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_tasks_created_date ON tasks(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch_name);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================================
-- TASK_TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  default_priority text DEFAULT 'medium',
  default_category text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_task_templates" ON task_templates;
CREATE POLICY "select_task_templates" ON task_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_task_templates" ON task_templates;
CREATE POLICY "insert_task_templates" ON task_templates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_task_templates" ON task_templates;
CREATE POLICY "update_task_templates" ON task_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_task_templates" ON task_templates;
CREATE POLICY "delete_task_templates" ON task_templates FOR DELETE TO authenticated USING (true);

-- ============================================================
-- EXPENSE_TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_expense_templates" ON expense_templates;
CREATE POLICY "select_expense_templates" ON expense_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_expense_templates" ON expense_templates;
CREATE POLICY "insert_expense_templates" ON expense_templates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_expense_templates" ON expense_templates;
CREATE POLICY "update_expense_templates" ON expense_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_expense_templates" ON expense_templates;
CREATE POLICY "delete_expense_templates" ON expense_templates FOR DELETE TO authenticated USING (true);

-- ============================================================
-- RIDER_SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS rider_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id text NOT NULL,
  rider_name text NOT NULL,
  rider_user_id text,
  weekly_schedule jsonb DEFAULT '[]'::jsonb,
  override_date date,
  override_start_time text,
  override_end_time text,
  override_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE rider_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_rider_schedules" ON rider_schedules;
CREATE POLICY "select_rider_schedules" ON rider_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_rider_schedules" ON rider_schedules;
CREATE POLICY "insert_rider_schedules" ON rider_schedules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_rider_schedules" ON rider_schedules;
CREATE POLICY "update_rider_schedules" ON rider_schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_rider_schedules" ON rider_schedules;
CREATE POLICY "delete_rider_schedules" ON rider_schedules FOR DELETE TO authenticated USING (true);

-- ============================================================
-- ATTENDANCE_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id text NOT NULL,
  rider_name text NOT NULL,
  rider_user_id text,
  branch text NOT NULL,
  date date NOT NULL,
  check_in_time timestamptz NOT NULL,
  check_out_time timestamptz,
  idle_status text,
  idle_start_time timestamptz,
  created_by_supervisor text,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_attendance_records" ON attendance_records;
CREATE POLICY "select_attendance_records" ON attendance_records FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_attendance_records" ON attendance_records;
CREATE POLICY "insert_attendance_records" ON attendance_records FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_attendance_records" ON attendance_records;
CREATE POLICY "update_attendance_records" ON attendance_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_attendance_records" ON attendance_records;
CREATE POLICY "delete_attendance_records" ON attendance_records FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_rider_id ON attendance_records(rider_id);

-- ============================================================
-- SAVED_LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  location_name text NOT NULL,
  region text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_saved_locations" ON saved_locations;
CREATE POLICY "select_saved_locations" ON saved_locations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_saved_locations" ON saved_locations;
CREATE POLICY "insert_saved_locations" ON saved_locations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_saved_locations" ON saved_locations;
CREATE POLICY "update_saved_locations" ON saved_locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_saved_locations" ON saved_locations;
CREATE POLICY "delete_saved_locations" ON saved_locations FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SUPPLIER_DEBTS
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  initial_debt numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_supplier_debts" ON supplier_debts;
CREATE POLICY "select_supplier_debts" ON supplier_debts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_supplier_debts" ON supplier_debts;
CREATE POLICY "insert_supplier_debts" ON supplier_debts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_supplier_debts" ON supplier_debts;
CREATE POLICY "update_supplier_debts" ON supplier_debts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_supplier_debts" ON supplier_debts;
CREATE POLICY "delete_supplier_debts" ON supplier_debts FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SUPPLIER_PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  invoice_id text,
  invoice_number text,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  notes text,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_supplier_payments" ON supplier_payments;
CREATE POLICY "select_supplier_payments" ON supplier_payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_supplier_payments" ON supplier_payments;
CREATE POLICY "insert_supplier_payments" ON supplier_payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_supplier_payments" ON supplier_payments;
CREATE POLICY "update_supplier_payments" ON supplier_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_supplier_payments" ON supplier_payments;
CREATE POLICY "delete_supplier_payments" ON supplier_payments FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SUPPLIER_MONTH_STARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_month_starts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  month_start_date date NOT NULL,
  set_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_month_starts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_supplier_month_starts" ON supplier_month_starts;
CREATE POLICY "select_supplier_month_starts" ON supplier_month_starts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_supplier_month_starts" ON supplier_month_starts;
CREATE POLICY "insert_supplier_month_starts" ON supplier_month_starts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_supplier_month_starts" ON supplier_month_starts;
CREATE POLICY "update_supplier_month_starts" ON supplier_month_starts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_supplier_month_starts" ON supplier_month_starts;
CREATE POLICY "delete_supplier_month_starts" ON supplier_month_starts FOR DELETE TO authenticated USING (true);

-- ============================================================
-- MEDICINE_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS medicine_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  item_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE medicine_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_medicine_items" ON medicine_items;
CREATE POLICY "select_medicine_items" ON medicine_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_medicine_items" ON medicine_items;
CREATE POLICY "insert_medicine_items" ON medicine_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_medicine_items" ON medicine_items;
CREATE POLICY "update_medicine_items" ON medicine_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_medicine_items" ON medicine_items;
CREATE POLICY "delete_medicine_items" ON medicine_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- MEDICINE_SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS medicine_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  week_label text NOT NULL,
  week_start date NOT NULL,
  sales jsonb DEFAULT '[]'::jsonb,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE medicine_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_medicine_sales" ON medicine_sales;
CREATE POLICY "select_medicine_sales" ON medicine_sales FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_medicine_sales" ON medicine_sales;
CREATE POLICY "insert_medicine_sales" ON medicine_sales FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_medicine_sales" ON medicine_sales;
CREATE POLICY "update_medicine_sales" ON medicine_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_medicine_sales" ON medicine_sales;
CREATE POLICY "delete_medicine_sales" ON medicine_sales FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_medicine_sales_week_start ON medicine_sales(week_start DESC);

-- ============================================================
-- INVENTORY_PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text,
  product_name text NOT NULL,
  company text,
  category text,
  stock_quantity numeric DEFAULT 0,
  price numeric DEFAULT 0,
  branch text NOT NULL,
  is_fast_moving boolean DEFAULT false,
  near_expiry_date date,
  priority_score numeric DEFAULT 0,
  last_counted_date date,
  discrepancy_count numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_inventory_products" ON inventory_products;
CREATE POLICY "select_inventory_products" ON inventory_products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_inventory_products" ON inventory_products;
CREATE POLICY "insert_inventory_products" ON inventory_products FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_inventory_products" ON inventory_products;
CREATE POLICY "update_inventory_products" ON inventory_products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_inventory_products" ON inventory_products;
CREATE POLICY "delete_inventory_products" ON inventory_products FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_inventory_products_branch ON inventory_products(branch);

-- ============================================================
-- INVENTORY_COUNT_TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_count_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_date date NOT NULL,
  branch text NOT NULL,
  assigned_employee text,
  product_ids jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'مجدول',
  items_count numeric DEFAULT 0,
  completed_count numeric DEFAULT 0,
  matched_count numeric DEFAULT 0,
  diff_count numeric DEFAULT 0,
  accuracy_rate numeric DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_count_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_inventory_count_tasks" ON inventory_count_tasks;
CREATE POLICY "select_inventory_count_tasks" ON inventory_count_tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_inventory_count_tasks" ON inventory_count_tasks;
CREATE POLICY "insert_inventory_count_tasks" ON inventory_count_tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_inventory_count_tasks" ON inventory_count_tasks;
CREATE POLICY "update_inventory_count_tasks" ON inventory_count_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_inventory_count_tasks" ON inventory_count_tasks;
CREATE POLICY "delete_inventory_count_tasks" ON inventory_count_tasks FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_inventory_count_tasks_task_date ON inventory_count_tasks(task_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_count_tasks_branch ON inventory_count_tasks(branch);

-- ============================================================
-- INVENTORY_COUNT_ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_count_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL,
  product_id text,
  product_code text,
  product_name text NOT NULL,
  branch text,
  count_date date,
  expected_quantity numeric NOT NULL DEFAULT 0,
  actual_quantity numeric,
  difference numeric,
  notes text,
  status text DEFAULT 'لم تُجرد',
  counted_by text,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_count_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_inventory_count_entries" ON inventory_count_entries;
CREATE POLICY "select_inventory_count_entries" ON inventory_count_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_inventory_count_entries" ON inventory_count_entries;
CREATE POLICY "insert_inventory_count_entries" ON inventory_count_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_inventory_count_entries" ON inventory_count_entries;
CREATE POLICY "update_inventory_count_entries" ON inventory_count_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_inventory_count_entries" ON inventory_count_entries;
CREATE POLICY "delete_inventory_count_entries" ON inventory_count_entries FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_inventory_count_entries_task_id ON inventory_count_entries(task_id);

-- ============================================================
-- INVENTORY_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  items_per_day integer DEFAULT 20,
  working_days jsonb DEFAULT '[0,1,2,3,4]'::jsonb,
  priority_fast_moving boolean DEFAULT true,
  priority_expensive boolean DEFAULT true,
  priority_near_expiry boolean DEFAULT true,
  priority_random boolean DEFAULT true,
  priority_repeated_discrepancy boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_inventory_settings" ON inventory_settings;
CREATE POLICY "select_inventory_settings" ON inventory_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_inventory_settings" ON inventory_settings;
CREATE POLICY "insert_inventory_settings" ON inventory_settings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_inventory_settings" ON inventory_settings;
CREATE POLICY "update_inventory_settings" ON inventory_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_inventory_settings" ON inventory_settings;
CREATE POLICY "delete_inventory_settings" ON inventory_settings FOR DELETE TO authenticated USING (true);

-- ============================================================
-- WEEKLY_SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL,
  assignments jsonb DEFAULT '[]'::jsonb,
  items_per_day integer DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_weekly_schedules" ON weekly_schedules;
CREATE POLICY "select_weekly_schedules" ON weekly_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_weekly_schedules" ON weekly_schedules;
CREATE POLICY "insert_weekly_schedules" ON weekly_schedules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_weekly_schedules" ON weekly_schedules;
CREATE POLICY "update_weekly_schedules" ON weekly_schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_weekly_schedules" ON weekly_schedules;
CREATE POLICY "delete_weekly_schedules" ON weekly_schedules FOR DELETE TO authenticated USING (true);

-- ============================================================
-- EXPIRED_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS expired_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  expiry_date date NOT NULL,
  branch text NOT NULL,
  status text DEFAULT 'منتهية',
  source text DEFAULT 'إدخال مباشر',
  notes text,
  created_by_id uuid,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE expired_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_expired_items" ON expired_items;
CREATE POLICY "select_expired_items" ON expired_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_expired_items" ON expired_items;
CREATE POLICY "insert_expired_items" ON expired_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_expired_items" ON expired_items;
CREATE POLICY "update_expired_items" ON expired_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_expired_items" ON expired_items;
CREATE POLICY "delete_expired_items" ON expired_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SLOW_MOVING_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS slow_moving_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  expiry_date date NOT NULL,
  branch text NOT NULL,
  status text DEFAULT 'راكد',
  notes text,
  created_by_id uuid,
  created_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE slow_moving_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_slow_moving_items" ON slow_moving_items;
CREATE POLICY "select_slow_moving_items" ON slow_moving_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_slow_moving_items" ON slow_moving_items;
CREATE POLICY "insert_slow_moving_items" ON slow_moving_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_slow_moving_items" ON slow_moving_items;
CREATE POLICY "update_slow_moving_items" ON slow_moving_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_slow_moving_items" ON slow_moving_items;
CREATE POLICY "delete_slow_moving_items" ON slow_moving_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- BACKUP_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  total_records_synced integer DEFAULT 0,
  total_records_failed integer DEFAULT 0,
  entities_synced integer DEFAULT 0,
  entities_failed integer DEFAULT 0,
  entity_details jsonb DEFAULT '[]'::jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  triggered_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_backup_logs" ON backup_logs;
CREATE POLICY "select_backup_logs" ON backup_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_backup_logs" ON backup_logs;
CREATE POLICY "insert_backup_logs" ON backup_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_backup_logs" ON backup_logs;
CREATE POLICY "update_backup_logs" ON backup_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_backup_logs" ON backup_logs;
CREATE POLICY "delete_backup_logs" ON backup_logs FOR DELETE TO authenticated USING (true);
