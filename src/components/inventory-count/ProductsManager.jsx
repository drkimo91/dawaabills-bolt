import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

const BRANCHES = ["فرع زكريا", "فرع بسيسة", "فرع المنشية"];

// ── قراءة ملف Excel أو CSV وإرجاع مصفوفة rows ──
function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const wb = XLSX.read(data, { type: "binary", codepage: 1256 });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(new Error("تعذّر قراءة الملف: " + err.message));
      }
    };
    reader.readAsBinaryString(file);
  });
}

// ── اكتشاف اسم العمود ──
function findColumn(headers, candidates) {
  for (const h of headers) {
    const clean = String(h).trim().toLowerCase();
    for (const c of candidates) {
      if (clean === c.toLowerCase() || clean.includes(c.toLowerCase())) return h;
    }
  }
  return null;
}

const NAME_CANDIDATES  = ["اسم الصنف", "اسم", "الاسم", "الصنف", "product_name", "name"];
const QTY_CANDIDATES   = ["الرصيد", "رصيد", "الكمية", "كمية", "stock_quantity", "quantity", "qty", "الكميه", "الكمية الحالية"];
const CODE_CANDIDATES  = ["كود", "كود الصنف", "الكود", "رقم الصنف", "product_code", "code"];

// ── جلب كل أصناف فرع ──
async function getBranchProducts(branch) {
  return base44.entities.InventoryProduct.filter({ branch }, null, 5000);
}

// ── حذف قائمة IDs بـ 3 متزامن مع تأخير بين المجموعات لتجنب rate limit ──
async function deleteAll(ids, onProgress) {
  const CONCURRENCY = 3;
  const DELAY = 600; // ms بين كل مجموعة
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(id => base44.entities.InventoryProduct.delete(id)));
    onProgress(Math.min(i + CONCURRENCY, ids.length), ids.length);
    if (i + CONCURRENCY < ids.length) await new Promise(r => setTimeout(r, DELAY));
  }
}

// ── حذف المهام والـ entries غير المنفذة للفرع ──
async function deletePendingTasksForBranch(branch) {
  const pendingStatuses = ["مجدول", "جاري"];
  const tasks = await base44.entities.InventoryCountTask.filter({ branch }, null, 1000);
  const pendingTasks = tasks.filter(t => pendingStatuses.includes(t.status));
  for (const task of pendingTasks) {
    // حذف الـ entries المرتبطة
    const entries = await base44.entities.InventoryCountEntry.filter({ task_id: task.id }, null, 5000);
    for (const entry of entries) {
      await base44.entities.InventoryCountEntry.delete(entry.id);
    }
    await base44.entities.InventoryCountTask.delete(task.id);
  }
}

// ── رفع أصناف جديدة ──
async function createAll(items, branch, onProgress) {
  const BATCH = 30;
  const DELAY = 800; // ms بين كل دفعة
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH).map(p => ({ ...p, branch }));
    await base44.entities.InventoryProduct.bulkCreate(batch);
    onProgress(Math.min(i + BATCH, items.length), items.length);
    if (i + BATCH < items.length) await new Promise(r => setTimeout(r, DELAY));
  }
}

function BranchCard({ branch }) {
  const fileRef = useRef(null);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });
  const [progress, setProgress] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(null); // { items, fileName }
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    loadCount();
  }, [branch]);

  async function loadCount() {
    setLoading(true);
    try {
      const items = await getBranchProducts(branch);
      setCount(items.length);
    } catch {
      setCount(0);
    }
    setLoading(false);
  }

  function showMsg(text, error = false) {
    setMsg({ text, error });
    if (!error) setTimeout(() => setMsg({ text: "", error: false }), 5000);
  }

  // ── اختيار ملف ──
  async function onFileChange(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setParseError("");
    setPreview(null);

    try {
      const rows = await parseFile(file);
      if (!rows.length) throw new Error("الملف فارغ أو لا يحتوي على بيانات");

      const headers = Object.keys(rows[0]);
      const nameCol = findColumn(headers, NAME_CANDIDATES);
      if (!nameCol) {
        throw new Error(`لم يُعثر على عمود الاسم.\nالأعمدة الموجودة: ${headers.join("، ")}`);
      }

      const qtyCol  = findColumn(headers, QTY_CANDIDATES);
      const codeCol = findColumn(headers, CODE_CANDIDATES);

      const items = rows
        .map(r => ({
          product_name:    String(r[nameCol] ?? "").trim(),
          stock_quantity:  qtyCol  ? (parseFloat(r[qtyCol])  || 0) : 0,
          product_code:    codeCol ? String(r[codeCol] ?? "").trim() : "",
        }))
        .filter(i => i.product_name.length > 0);

      if (!items.length) throw new Error("لا توجد أصناف صالحة في الملف");

      setPreview({ items, fileName: file.name });
    } catch (err) {
      setParseError(err.message);
    }
  }

  // ── حذف الكل ──
  async function handleDelete() {
    setBusy(true);
    setConfirmDelete(false);
    try {
      setProgress("جاري جلب الأصناف...");
      const products = await getBranchProducts(branch);
      if (!products.length) { setCount(0); setProgress(""); setBusy(false); return; }

      const ids = products.map(p => p.id);
      setProgress(`حذف 0 / ${ids.length}`);
      await deleteAll(ids, (done, total) => setProgress(`حذف ${done} / ${total}`));
      setProgress("حذف المهام غير المنفذة...");
      await deletePendingTasksForBranch(branch);
      setCount(0);
      setProgress("");
      showMsg("تم الحذف بنجاح ✓");
    } catch (err) {
      setProgress("");
      showMsg("خطأ في الحذف: " + err.message, true);
    }
    setBusy(false);
  }

  // ── رفع الملف (حذف + إنشاء) ──
  async function handleUpload() {
    if (!preview) return;
    setBusy(true);
    try {
      // حذف القديم
      setProgress("جاري جلب الأصناف القديمة...");
      const old = await getBranchProducts(branch);
      if (old.length > 0) {
        const ids = old.map(p => p.id);
        setProgress(`حذف القديم: 0 / ${ids.length}`);
        await deleteAll(ids, (done, total) => setProgress(`حذف القديم: ${done} / ${total}`));
        setProgress("حذف المهام غير المنفذة...");
        await deletePendingTasksForBranch(branch);
      }

      // رفع الجديد
      const total = preview.items.length;
      setProgress(`رفع: 0 / ${total}`);
      await createAll(preview.items, branch, (done, tot) => setProgress(`رفع: ${done} / ${tot}`));

      setCount(total);
      setPreview(null);
      setProgress("");
      showMsg(`تم رفع ${total} صنف بنجاح ✓`);
    } catch (err) {
      setProgress("");
      showMsg("خطأ: " + err.message, true);
    }
    setBusy(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-800 text-base">{branch}</span>
        {loading ? (
          <span className="text-xs text-gray-400">جاري التحميل...</span>
        ) : (
          <span className="text-2xl font-bold text-teal-700">{count ?? 0}</span>
        )}
      </div>
      {!loading && <p className="text-xs text-gray-400 text-center -mt-2">صنف مسجّل</p>}

      {/* Progress */}
      {busy && progress && (
        <div className="text-sm text-teal-600 font-medium text-center bg-teal-50 rounded py-2">
          {progress}
        </div>
      )}

      {/* Status message */}
      {!busy && msg.text && (
        <div className={`text-sm text-center rounded py-1.5 ${msg.error ? "text-red-600 bg-red-50" : "text-green-700 bg-green-50"}`}>
          {msg.text}
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2 whitespace-pre-wrap">
          {parseError}
        </div>
      )}

      {/* Preview info */}
      {preview && !busy && (
        <div className="text-xs text-teal-700 bg-teal-50 rounded p-2 text-center">
          ✓ {preview.fileName} — {preview.items.length} صنف جاهز للرفع
          {count > 0 && <div className="text-amber-600 mt-1">⚠️ سيتم حذف {count} صنف قديم أولاً</div>}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && !busy && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2 text-center">
          هل تريد حذف {count} صنف نهائياً؟
        </div>
      )}

      {/* Buttons */}
      {!busy && (
        <div className="space-y-2">
          {/* Upload row */}
          {!preview ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs gap-1 text-teal-700 border-teal-300 hover:bg-teal-50"
              onClick={() => { setParseError(""); fileRef.current?.click(); }}
            >
              📂 اختر ملف Excel
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-xs"
                onClick={handleUpload}
              >
                ✓ تأكيد الرفع
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setPreview(null)}
              >
                إلغاء
              </Button>
            </div>
          )}

          {/* Delete row */}
          {count > 0 && !preview && (
            confirmDelete ? (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-xs" onClick={handleDelete}>
                  تأكيد الحذف
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setConfirmDelete(false)}>
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                🗑️ حذف الأصناف ({count})
              </Button>
            )
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

export default function ProductsManager() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-sm">
        ⚠️ عند رفع ملف جديد سيتم <strong>حذف الأصناف القديمة تلقائياً</strong> ثم رفع الجديدة.
        الملف يجب أن يحتوي على عمود <strong>اسم الصنف</strong> على الأقل.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BRANCHES.map(b => <BranchCard key={b} branch={b} />)}
      </div>
    </div>
  );
}