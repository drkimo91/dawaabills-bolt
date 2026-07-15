import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const NOTIFY_EMAIL = Deno.env.get("BACKUP_NOTIFY_EMAIL");

const ENTITIES = [
  "ShiftHandover", "Rider", "ExpenseTemplate", "AttendanceRecord",
  "SavedLocation", "TripStop", "Trip", "RiderSchedule",
  "CustomerOrder", "BranchBudget", "PurchaseInvoice", "SupplierMonthStart",
  "Task", "InventoryCountTask", "TaskTemplate", "InventoryCountEntry",
  "WeeklySchedule", "BranchCredential", "MedicineSale", "InventorySettings",
  "InventoryProduct", "ExpiredItem", "SlowMovingItem", "Return",
  "MedicineItem", "ReportSettings", "SupplierDebt", "Expense",
  "Supplier", "TeamMember", "TargetGoal", "ActivityLog",
  "SupplierPayment", "User"
];

const MAX_RETRIES = 3;
const BATCH_SIZE = 500;

const BUILT_IN_FIELDS = ["id", "created_date", "updated_date", "created_by_id", "created_by", "is_sample"];

const ENTITY_FIELDS = {
  "ShiftHandover": ["branch", "shift_type", "date", "posting_date", "handover_time", "employee_name", "total_sales", "expenses", "total_expenses", "net_amount", "created_by_name"],
  "Rider": ["name", "username", "branch", "phone", "is_active", "user_id"],
  "ExpenseTemplate": ["name", "is_active"],
  "AttendanceRecord": ["rider_id", "rider_name", "rider_user_id", "branch", "date", "check_in_time", "check_out_time", "idle_status", "idle_start_time", "created_by_supervisor"],
  "SavedLocation": ["branch", "location_name", "region", "is_active"],
  "TripStop": ["trip_id", "rider_user_id", "stop_type", "destination", "order_or_customer_info", "stop_start_time", "stop_end_time", "created_by_supervisor"],
  "Trip": ["rider_id", "rider_name", "rider_user_id", "branch", "start_time", "end_time", "created_by_supervisor"],
  "RiderSchedule": ["rider_id", "rider_name", "rider_user_id", "weekly_schedule", "override_date", "override_start_time", "override_end_time", "override_reason"],
  "CustomerOrder": ["order_number", "customer_name", "phone", "customer_code", "branch", "request_source", "product_name", "product_image", "delivery_options", "notes", "priority", "customer_type", "assigned_employee", "request_date", "status", "supplier_found", "purchase_price", "selling_price", "search_notes", "expected_availability_date", "last_followup_date", "product_available", "customer_contacted", "contact_method", "followup_notes", "cancellation_reason", "timeline"],
  "BranchBudget": ["branch", "budget_limit"],
  "PurchaseInvoice": ["system_invoice_number", "supplier_invoice_number", "supplier_name", "branch", "entered_by", "invoice_date", "total_value", "returned_value", "paid_value", "payment_type", "status", "notes"],
  "SupplierMonthStart": ["supplier_name", "month_start_date", "set_by"],
  "Task": ["title", "description", "notes", "template_key", "branch_id", "branch_name", "assigned_to", "assigned_to_name", "due_date", "priority", "category", "status", "completion_score", "completion_notes", "bonus_points", "deduction_points"],
  "InventoryCountTask": ["task_date", "branch", "assigned_employee", "product_ids", "status", "items_count", "completed_count", "matched_count", "diff_count", "accuracy_rate", "started_at", "finished_at"],
  "TaskTemplate": ["title", "description", "default_priority", "default_category"],
  "InventoryCountEntry": ["task_id", "product_id", "product_code", "product_name", "branch", "count_date", "expected_quantity", "actual_quantity", "difference", "notes", "status", "counted_by"],
  "WeeklySchedule": ["branch", "assignments", "items_per_day"],
  "BranchCredential": ["branch", "username", "password", "notes"],
  "MedicineSale": ["branch", "week_label", "week_start", "sales"],
  "InventorySettings": ["branch", "items_per_day", "working_days", "priority_fast_moving", "priority_expensive", "priority_near_expiry", "priority_random", "priority_repeated_discrepancy"],
  "InventoryProduct": ["product_code", "product_name", "company", "category", "stock_quantity", "price", "branch", "is_fast_moving", "near_expiry_date", "priority_score", "last_counted_date", "discrepancy_count", "is_active"],
  "ExpiredItem": ["item_name", "quantity", "price", "expiry_date", "branch", "status", "source", "notes"],
  "SlowMovingItem": ["item_name", "quantity", "price", "expiry_date", "branch", "status", "notes"],
  "Return": ["return_number", "invoice_number", "supplier_name", "branch_name", "employee_name", "return_reason", "notes", "internal_notes", "invoice_images", "items", "status", "status_history", "approved_by", "reviewed_by", "returned_at"],
  "MedicineItem": ["name", "item_code", "is_active"],
  "ReportSettings": ["key", "value"],
  "SupplierDebt": ["supplier_name", "initial_debt", "notes"],
  "Expense": ["description", "amount", "branch", "category", "date", "team_member_name", "notes"],
  "Supplier": ["name", "phone", "address", "payment_type", "payment_terms_days", "notes"],
  "TeamMember": ["name", "branches", "role", "phone"],
  "TargetGoal": ["label", "target_amount", "month"],
  "ActivityLog": ["action_type", "entity_type", "entity_id", "entity_label", "user_email", "user_name", "details"],
  "SupplierPayment": ["supplier_name", "invoice_id", "invoice_number", "amount", "payment_date", "notes"],
  "User": ["full_name", "email", "role", "delivery_role", "linked_rider_id", "branch_access", "can_save_invoice", "can_delete_invoice", "can_manage_team", "can_set_budget", "can_view_reports", "can_manage_returns", "can_manage_expenses", "can_manage_suppliers", "can_manage_orders", "can_view_balances", "can_manage_inventory", "can_manage_attendance"]
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function upsertToSupabase(tableName, records, knownFields) {
  if (!records || records.length === 0) return;
  const colsParam = knownFields ? `&columns=${knownFields.join(",")}` : "";
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?on_conflict=id${colsParam}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(records)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase upsert ${tableName}: ${resp.status} - ${text.substring(0, 300)}`);
  }
}

async function fetchRecords(base44, entityName, lastSyncDate) {
  if (lastSyncDate) {
    return await base44.asServiceRole.entities[entityName].filter(
      { updated_date: { $gt: lastSyncDate } },
      "-updated_date",
      10000
    );
  }
  return await base44.asServiceRole.entities[entityName].list("-updated_date", 10000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow automation (no user) and admin manual calls
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    const startTime = new Date().toISOString();
    const triggeredBy = user ? 'manual' : 'auto';

    // Create backup log entry
    const backupLog = await base44.asServiceRole.entities.BackupLog.create({
      backup_type: "incremental",
      status: "in_progress",
      started_at: startTime,
      total_records_synced: 0,
      total_records_failed: 0,
      entities_synced: 0,
      entities_failed: 0,
      entity_details: [],
      retry_count: 0,
      triggered_by: triggeredBy
    });

    // Get last successful backup for incremental sync
    const lastBackups = await base44.asServiceRole.entities.BackupLog.filter(
      { status: "success" },
      "-completed_at",
      1
    );
    const lastSyncDate = lastBackups.length > 0 ? lastBackups[0].completed_at : null;
    const isFullBackup = !lastSyncDate;

    if (isFullBackup) {
      await base44.asServiceRole.entities.BackupLog.update(backupLog.id, { backup_type: "full" });
    }

    // Mark stale in_progress logs as failed (timed out / interrupted)
    const staleLogs = await base44.asServiceRole.entities.BackupLog.filter(
      { status: "in_progress" },
      "-started_at",
      10
    );
    for (const sl of staleLogs) {
      if (sl.id !== backupLog.id) {
        await base44.asServiceRole.entities.BackupLog.update(sl.id, {
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "انقطع / انتهت المهلة"
        });
      }
    }

    const entityDetails = [];
    let totalSynced = 0;
    let totalFailed = 0;
    let entitiesSynced = 0;
    let entitiesFailed = 0;
    const allErrors = [];

    for (const entityName of ENTITIES) {
      let entitySynced = 0;
      let entityFailed = 0;
      let entityStatus = "success";
      let entityError = "";
      let success = false;

      for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
        try {
          if (attempt > 0) await sleep(2000 * attempt);

          const records = await fetchRecords(base44, entityName, lastSyncDate);

          if (!records || records.length === 0) {
            success = true;
            break;
          }

          // Upsert in batches
          const knownFields = [...BUILT_IN_FIELDS, ...(ENTITY_FIELDS[entityName] || [])];
          for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            await upsertToSupabase(entityName, batch, knownFields);
          }

          entitySynced = records.length;
          success = true;
        } catch (err) {
          entityError = err.message;
        }
      }

      if (!success) {
        entityStatus = "failed";
        entityFailed = 0;
        entitiesFailed++;
        allErrors.push(`${entityName}: ${entityError}`);
      } else {
        entitiesSynced++;
      }

      entityDetails.push({
        entity_name: entityName,
        records_synced: entitySynced,
        records_failed: entityFailed,
        status: entityStatus,
        error: success ? "" : entityError
      });
      totalSynced += entitySynced;
      totalFailed += entityFailed;
    }

    const completedAt = new Date().toISOString();
    const overallStatus = entitiesFailed === ENTITIES.length
      ? "failed"
      : (entitiesFailed > 0 ? "partial" : "success");

    await base44.asServiceRole.entities.BackupLog.update(backupLog.id, {
      status: overallStatus,
      completed_at: completedAt,
      total_records_synced: totalSynced,
      total_records_failed: totalFailed,
      entities_synced: entitiesSynced,
      entities_failed: entitiesFailed,
      entity_details: entityDetails,
      error_message: allErrors.length > 0 ? allErrors.join(" | ") : "",
      retry_count: MAX_RETRIES
    });

    // Send notification email on failure
    if ((overallStatus === "failed" || overallStatus === "partial") && NOTIFY_EMAIL) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: NOTIFY_EMAIL,
          subject: overallStatus === "failed"
            ? "فشل النسخ الاحتياطي - Base44 to Supabase"
            : "نسخة احتياطية جزئية - Base44 to Supabase",
          body: `حالة النسخ الاحتياطي: ${overallStatus}\nوقت الانتهاء: ${completedAt}\nالنوع: ${isFullBackup ? "كامل" : "تزايدي"}\nالجداول الناجحة: ${entitiesSynced}/${ENTITIES.length}\nالجداول الفاشلة: ${entitiesFailed}\nالسجلات المتزامنة: ${totalSynced}\n\nالأخطاء:\n${allErrors.join("\n") || "لا توجد"}`
        });
      } catch (e) {
        // Email failure shouldn't affect the backup result
      }
    }

    return Response.json({
      status: overallStatus,
      backup_type: isFullBackup ? "full" : "incremental",
      total_synced: totalSynced,
      total_failed: totalFailed,
      entities_synced: entitiesSynced,
      entities_failed: entitiesFailed,
      log_id: backupLog.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});