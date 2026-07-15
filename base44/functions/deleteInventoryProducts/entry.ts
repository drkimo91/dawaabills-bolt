import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function deleteWithRetry(base44, id, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await base44.asServiceRole.entities.InventoryProduct.delete(id);
      return;
    } catch (e) {
      if (e.message?.includes('429') || e.message?.includes('Rate limit')) {
        await sleep(1000 * (attempt + 1));
      } else {
        return;
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { branch } = await req.json();
    if (!branch) return Response.json({ error: 'branch required' }, { status: 400 });

    let totalDeleted = 0;
    const limit = 100;

    while (true) {
      const batch = await base44.asServiceRole.entities.InventoryProduct.filter(
        { branch }, "-created_date", limit, 0
      );
      if (!batch.length) break;

      for (const p of batch) {
        await deleteWithRetry(base44, p.id);
        await sleep(150);
      }

      totalDeleted += batch.length;
      if (batch.length < limit) break;
      await sleep(500);
    }

    return Response.json({ deleted: totalDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});