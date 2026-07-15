import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function deleteWithRetry(base44, id, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await base44.asServiceRole.entities.InventoryProduct.delete(id);
      return;
    } catch (e) {
      if (e.message?.includes('429') || e.message?.includes('Rate limit')) {
        await sleep(1000 * (attempt + 1)); // exponential backoff
      } else {
        return; // ignore other errors (record may not exist)
      }
    }
  }
}

async function deleteAllForBranch(base44, branch) {
  let totalDeleted = 0;
  const limit = 100;

  while (true) {
    const batch = await base44.asServiceRole.entities.InventoryProduct.filter(
      { branch }, "-created_date", limit, 0
    );
    if (!batch.length) break;

    // Delete sequentially with retry
    for (const p of batch) {
      await deleteWithRetry(base44, p.id);
      await sleep(150);
    }

    totalDeleted += batch.length;
    if (batch.length < limit) break;
    await sleep(500);
  }

  return totalDeleted;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { branch, products } = await req.json();
    if (!branch || !products?.length) return Response.json({ error: 'branch and products required' }, { status: 400 });

    // Delete all old records for this branch
    const deleted = await deleteAllForBranch(base44, branch);
    await sleep(500);

    // Insert new products in batches of 50 with retry
    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < products.length; i += BATCH) {
      const chunk = products.slice(i, i + BATCH).map(item => ({
        product_name: item.product_name,
        stock_quantity: item.stock_quantity || 0,
        product_code: item.product_code || "",
        branch,
        is_active: true,
        priority_score: 0,
        discrepancy_count: 0,
      }));

      let success = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await base44.asServiceRole.entities.InventoryProduct.bulkCreate(chunk);
          success = true;
          break;
        } catch (e) {
          if (e.message?.includes('429') || e.message?.includes('Rate limit')) {
            await sleep(1000 * (attempt + 1));
          } else {
            throw e;
          }
        }
      }
      if (!success) throw new Error('Failed to insert batch after retries');

      inserted += chunk.length;
      if (i + BATCH < products.length) await sleep(300);
    }

    return Response.json({ deleted, inserted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});