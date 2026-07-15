import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import pg from 'npm:pg@8.13.0';

const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL");

const BUILT_IN_COLS = [
  { name: "id", type: "text", pk: true },
  { name: "created_date", type: "timestamptz" },
  { name: "updated_date", type: "timestamptz" },
  { name: "created_by_id", type: "text" },
  { name: "created_by", type: "text" },
  { name: "is_sample", type: "boolean" }
];

// Hardcoded entity schemas: entityName -> { fieldName: postgresType }
const ENTITY_SCHEMAS = {
  "ShiftHandover": { "branch": "text", "shift_type": "text", "date": "date", "posting_date": "date", "handover_time": "text", "employee_name": "text", "total_sales": "numeric", "expenses": "jsonb", "total_expenses": "numeric", "net_amount": "numeric", "created_by_name": "text" },
  "Rider": { "name": "text", "username": "text", "branch": "text", "phone": "text", "is_active": "boolean", "user_id": "text" },
  "ExpenseTemplate": { "name": "text", "is_active": "boolean" },
  "AttendanceRecord": { "rider_id": "text", "rider_name": "text", "rider_user_id": "text", "branch": "text", "date": "date", "check_in_time": "text", "check_out_time": "text", "idle_status": "text", "idle_start_time": "text", "created_by_supervisor": "text" },
  "SavedLocation": { "branch": "text", "location_name": "text", "region": "text", "is_active": "boolean" },
  "TripStop": { "trip_id": "text", "rider_user_id": "text", "stop_type": "text", "destination": "text", "order_or_customer_info": "text", "stop_start_time": "text", "stop_end_time": "text", "created_by_supervisor": "text" },
  "Trip": { "rider_id": "text", "rider_name": "text", "rider_user_id": "text", "branch": "text", "start_time": "text", "end_time": "text", "created_by_supervisor": "text" },
  "RiderSchedule": { "rider_id": "text", "rider_name": "text", "rider_user_id": "text", "weekly_schedule": "jsonb", "override_date": "date", "override_start_time": "text", "override_end_time": "text", "override_reason": "text" },
  "CustomerOrder": { "order_number": "text", "customer_name": "text", "phone": "text", "customer_code": "text", "branch": "text", "request_source": "text", "product_name": "text", "product_image": "text", "delivery_options": "jsonb", "notes": "text", "priority": "text", "customer_type": "text", "assigned_employee": "text", "request_date": "date", "status": "text", "supplier_found": "text", "purchase_price": "numeric", "selling_price": "numeric", "search_notes": "text", "expected_availability_date": "date", "last_followup_date": "date", "product_available": "boolean", "customer_contacted": "boolean", "contact_method": "text", "followup_notes": "text", "cancellation_reason": "text", "timeline": "jsonb" },
  "BranchBudget": { "branch": "text", "budget_limit": "numeric" },
  "PurchaseInvoice": { "system_invoice_number": "text", "supplier_invoice_number": "text", "supplier_name": "text", "branch": "text", "entered_by": "text", "invoice_date": "date", "total_value": "numeric", "returned_value": "numeric", "paid_value": "numeric", "payment_type": "text", "status": "text", "notes": "text" },
  "SupplierMonthStart": { "supplier_name": "text", "month_start_date": "date", "set_by": "text" },
  "Task": { "title": "text", "description": "text", "notes": "text", "template_key": "text", "branch_id": "text", "branch_name": "text", "assigned_to": "text", "assigned_to_name": "text", "due_date": "date", "priority": "text", "category": "text", "status": "text", "completion_score": "numeric", "completion_notes": "text", "bonus_points": "numeric", "deduction_points": "numeric" },
  "InventoryCountTask": { "task_date": "date", "branch": "text", "assigned_employee": "text", "product_ids": "jsonb", "status": "text", "items_count": "numeric", "completed_count": "numeric", "matched_count": "numeric", "diff_count": "numeric", "accuracy_rate": "numeric", "started_at": "text", "finished_at": "text" },
  "TaskTemplate": { "title": "text", "description": "text", "default_priority": "text", "default_category": "text" },
  "InventoryCountEntry": { "task_id": "text", "product_id": "text", "product_code": "text", "product_name": "text", "branch": "text", "count_date": "date", "expected_quantity": "numeric", "actual_quantity": "numeric", "difference": "numeric", "notes": "text", "status": "text", "counted_by": "text" },
  "WeeklySchedule": { "branch": "text", "assignments": "jsonb", "items_per_day": "numeric" },
  "BranchCredential": { "branch": "text", "username": "text", "password": "text", "notes": "text" },
  "MedicineSale": { "branch": "text", "week_label": "text", "week_start": "date", "sales": "jsonb" },
  "InventorySettings": { "branch": "text", "items_per_day": "numeric", "working_days": "jsonb", "priority_fast_moving": "boolean", "priority_expensive": "boolean", "priority_near_expiry": "boolean", "priority_random": "boolean", "priority_repeated_discrepancy": "boolean" },
  "InventoryProduct": { "product_code": "text", "product_name": "text", "company": "text", "category": "text", "stock_quantity": "numeric", "price": "numeric", "branch": "text", "is_fast_moving": "boolean", "near_expiry_date": "date", "priority_score": "numeric", "last_counted_date": "date", "discrepancy_count": "numeric", "is_active": "boolean" },
  "ExpiredItem": { "item_name": "text", "quantity": "numeric", "price": "numeric", "expiry_date": "date", "branch": "text", "status": "text", "source": "text", "notes": "text" },
  "SlowMovingItem": { "item_name": "text", "quantity": "numeric", "price": "numeric", "expiry_date": "date", "branch": "text", "status": "text", "notes": "text" },
  "Return": { "return_number": "text", "invoice_number": "text", "supplier_name": "text", "branch_name": "text", "employee_name": "text", "return_reason": "text", "notes": "text", "internal_notes": "text", "invoice_images": "jsonb", "items": "jsonb", "status": "text", "status_history": "jsonb", "approved_by": "text", "reviewed_by": "text", "returned_at": "text" },
  "MedicineItem": { "name": "text", "item_code": "text", "is_active": "boolean" },
  "ReportSettings": { "key": "text", "value": "text" },
  "SupplierDebt": { "supplier_name": "text", "initial_debt": "numeric", "notes": "text" },
  "Expense": { "description": "text", "amount": "numeric", "branch": "text", "category": "text", "date": "date", "team_member_name": "text", "notes": "text" },
  "Supplier": { "name": "text", "phone": "text", "address": "text", "payment_type": "text", "payment_terms_days": "numeric", "notes": "text" },
  "TeamMember": { "name": "text", "branches": "jsonb", "role": "text", "phone": "text" },
  "TargetGoal": { "label": "text", "target_amount": "numeric", "month": "text" },
  "ActivityLog": { "action_type": "text", "entity_type": "text", "entity_id": "text", "entity_label": "text", "user_email": "text", "user_name": "text", "details": "text" },
  "SupplierPayment": { "supplier_name": "text", "invoice_id": "text", "invoice_number": "text", "amount": "numeric", "payment_date": "date", "notes": "text" },
  "User": { "full_name": "text", "email": "text", "role": "text", "delivery_role": "text", "linked_rider_id": "text", "branch_access": "jsonb", "can_save_invoice": "boolean", "can_delete_invoice": "boolean", "can_manage_team": "boolean", "can_set_budget": "boolean", "can_view_reports": "boolean", "can_manage_returns": "boolean", "can_manage_expenses": "boolean", "can_manage_suppliers": "boolean", "can_manage_orders": "boolean", "can_view_balances": "boolean", "can_manage_inventory": "boolean", "can_manage_attendance": "boolean" }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!SUPABASE_DB_URL) {
      return Response.json({ error: 'SUPABASE_DB_URL not configured' }, { status: 500 });
    }

    const { Client } = pg;
    const client = new Client({
      connectionString: SUPABASE_DB_URL,
      ssl: false,
      connectionTimeoutMillis: 15000,
      query_timeout: 30000
    });

    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected!');

    const results = [];

    for (const [entityName, fields] of Object.entries(ENTITY_SCHEMAS)) {
      try {
        // Build all SQL statements for this entity as one batch
        const statements = [];

        // CREATE TABLE with built-in columns + entity fields
        const colDefs = BUILT_IN_COLS.map(c =>
          c.pk ? `"${c.name}" ${c.type} PRIMARY KEY` : `"${c.name}" ${c.type}`
        );
        for (const [fieldName, pgType] of Object.entries(fields)) {
          colDefs.push(`"${fieldName}" ${pgType}`);
        }
        statements.push(`CREATE TABLE IF NOT EXISTS "public"."${entityName}" (${colDefs.join(", ")});`);

        // ALTER TABLE ADD COLUMN IF NOT EXISTS for built-in columns (handles existing tables)
        for (const c of BUILT_IN_COLS) {
          if (c.name === "id") continue;
          statements.push(`ALTER TABLE "public"."${entityName}" ADD COLUMN IF NOT EXISTS "${c.name}" ${c.type};`);
        }
        // ALTER TABLE ADD COLUMN IF NOT EXISTS for entity fields
        for (const [fieldName, pgType] of Object.entries(fields)) {
          statements.push(`ALTER TABLE "public"."${entityName}" ADD COLUMN IF NOT EXISTS "${fieldName}" ${pgType};`);
          if (pgType === "date") {
            statements.push(`ALTER TABLE "public"."${entityName}" ALTER COLUMN "${fieldName}" TYPE text USING "${fieldName}"::text;`);
          }
        }

        // Execute all statements in one query
        await client.query(statements.join(" "));

        // Try PK constraint (ignore if already exists)
        try {
          await client.query(`ALTER TABLE "public"."${entityName}" ADD CONSTRAINT "${entityName}_pkey" PRIMARY KEY ("id");`);
        } catch (e) {
          // PK already exists
        }

        console.log(`OK: ${entityName} (${colDefs.length} cols)`);
        results.push({ entity: entityName, status: "success", columns: colDefs.length });
      } catch (err) {
        console.error(`FAIL: ${entityName} - ${err.message}`);
        results.push({ entity: entityName, status: "failed", error: err.message.substring(0, 200) });
      }
    }

    await client.end();
    const successCount = results.filter(r => r.status === "success").length;
    console.log(`Schema setup done: ${successCount}/${Object.keys(ENTITY_SCHEMAS).length} tables`);

    return Response.json({
      tables_created: successCount,
      tables_failed: results.filter(r => r.status === "failed").length,
      details: results
    });
  } catch (error) {
    console.error('Schema setup error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});