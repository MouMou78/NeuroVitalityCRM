/**
 * Engine API Router
 *
 * Exposes REST endpoints for the sequencing engine UI:
 *   GET/POST   /api/engine/workflows
 *   GET/PATCH/DELETE /api/engine/workflows/:id
 *   PATCH      /api/engine/workflows/:id/status
 *   GET        /api/engine/enrollments
 *   POST       /api/engine/enrollments/:id/pause|resume|stop
 *   GET        /api/engine/scores
 *   GET        /api/engine/scores/stats
 *   POST       /api/engine/scores/adjust
 *   GET/POST   /api/engine/suppression
 *   POST       /api/engine/suppression/bulk
 *   DELETE     /api/engine/suppression/:id
 *   GET        /api/engine/events
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { getDb } from "../db";
import {
  workflowDefinitions,
  workflowEnrollments,
  engineLeadScores,
  suppressionList,
  crmEvents,
} from "../../drizzle/schema";
import { eq, and, or, like, ilike, desc, asc, sql, inArray } from "drizzle-orm";

export const engineRouter = Router();

// ─── Helper ──────────────────────────────────────────────────────────────────
function getTenantId(req: Request): string {
  return (req as any).user?.tenantId || "default";
}

// ─── Workflows ────────────────────────────────────────────────────────────────

// GET /api/engine/workflows
engineRouter.get("/workflows", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const rows = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.tenant_id, tenant_id))
      .orderBy(desc(workflowDefinitions.updated_at));

    // Attach enrollment counts
    const wfIds = rows.map((r) => r.workflow_id);
    let countMap: Record<string, number> = {};
    if (wfIds.length > 0) {
      const counts = await db
        .select({
          workflow_id: workflowEnrollments.workflow_id,
          count: sql<number>`count(*)::int`,
        })
        .from(workflowEnrollments)
        .where(inArray(workflowEnrollments.workflow_id, wfIds))
        .groupBy(workflowEnrollments.workflow_id);
      counts.forEach((c) => { countMap[c.workflow_id] = c.count; });
    }

    const result = rows.map((r) => ({
      ...r,
      enrollment_count: countMap[r.workflow_id] || 0,
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/workflows
engineRouter.post("/workflows", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { name, definition } = req.body;
    if (!name || !definition) return res.status(400).json({ error: "name and definition required" });
    const workflow_id = definition.workflow_id || randomUUID();
    const id = randomUUID();
    const now = new Date();
    await db.insert(workflowDefinitions).values({
      id,
      workflow_id,
      tenant_id,
      name,
      version: 1,
      status: "draft",
      definition,
      created_at: now,
      updated_at: now,
    });
    res.status(201).json({ id, workflow_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/workflows/:id
engineRouter.get("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const rows = await db
      .select()
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, req.params.id))
      .limit(1);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/engine/workflows/:id
engineRouter.patch("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const { name, definition, status } = req.body;
    const updates: any = { updated_at: new Date() };
    if (name) updates.name = name;
    if (definition) { updates.definition = definition; updates.version = sql`${workflowDefinitions.version} + 1`; }
    if (status) updates.status = status;
    await db.update(workflowDefinitions).set(updates).where(eq(workflowDefinitions.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/engine/workflows/:id/status
engineRouter.patch("/workflows/:id/status", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const { status } = req.body;
    if (!["draft","active","paused","archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    await db
      .update(workflowDefinitions)
      .set({ status, updated_at: new Date() })
      .where(eq(workflowDefinitions.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/engine/workflows/:id
engineRouter.delete("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    await db.delete(workflowDefinitions).where(eq(workflowDefinitions.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Enrollments ──────────────────────────────────────────────────────────────

// GET /api/engine/enrollments
engineRouter.get("/enrollments", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { status } = req.query;
    const conditions = [eq(workflowEnrollments.tenant_id, tenant_id)];
    if (status && status !== "all") {
      conditions.push(eq(workflowEnrollments.status, status as string));
    }
    const rows = await db
      .select()
      .from(workflowEnrollments)
      .where(and(...conditions))
      .orderBy(desc(workflowEnrollments.last_transition_at))
      .limit(200);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/enrollments/:id/pause
engineRouter.post("/enrollments/:id/pause", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    await db
      .update(workflowEnrollments)
      .set({ status: "paused", last_transition_at: new Date() })
      .where(eq(workflowEnrollments.enrollment_id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/enrollments/:id/resume
engineRouter.post("/enrollments/:id/resume", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    await db
      .update(workflowEnrollments)
      .set({ status: "active", last_transition_at: new Date() })
      .where(eq(workflowEnrollments.enrollment_id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/enrollments/:id/stop
engineRouter.post("/enrollments/:id/stop", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    await db
      .update(workflowEnrollments)
      .set({ status: "stopped", outcome: "manual_stop", last_transition_at: new Date() })
      .where(eq(workflowEnrollments.enrollment_id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Lead Scores ──────────────────────────────────────────────────────────────

// GET /api/engine/scores
engineRouter.get("/scores", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { tier, q } = req.query;
    const conditions = [eq(engineLeadScores.tenant_id, tenant_id)];
    if (tier && tier !== "all") conditions.push(eq(engineLeadScores.tier, tier as string));
    const rows = await db
      .select()
      .from(engineLeadScores)
      .where(and(...conditions))
      .orderBy(desc(engineLeadScores.score))
      .limit(500);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/scores/stats
engineRouter.get("/scores/stats", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const rows = await db
      .select({
        tier: engineLeadScores.tier,
        count: sql<number>`count(*)::int`,
        avg_score: sql<number>`avg(score)::numeric(5,1)`,
      })
      .from(engineLeadScores)
      .where(eq(engineLeadScores.tenant_id, tenant_id))
      .groupBy(engineLeadScores.tier);

    const dist = [
      { range: "0–24", count: 0 },
      { range: "25–49", count: 0 },
      { range: "50–74", count: 0 },
      { range: "75–100", count: 0 },
    ];
    const distRows = await db
      .select({ score: engineLeadScores.score })
      .from(engineLeadScores)
      .where(eq(engineLeadScores.tenant_id, tenant_id));
    distRows.forEach(({ score }) => {
      if (score < 25) dist[0].count++;
      else if (score < 50) dist[1].count++;
      else if (score < 75) dist[2].count++;
      else dist[3].count++;
    });

    const stats: any = { total: 0, cold: 0, warm: 0, hot: 0, sales_ready: 0, avg_score: 0, distribution: dist };
    let totalScore = 0;
    rows.forEach((r) => {
      stats[r.tier] = r.count;
      stats.total += r.count;
      totalScore += Number(r.avg_score) * r.count;
    });
    stats.avg_score = stats.total > 0 ? Math.round(totalScore / stats.total) : 0;
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/scores/adjust
engineRouter.post("/scores/adjust", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { entity_id, delta } = req.body;
    if (!entity_id || delta === undefined) return res.status(400).json({ error: "entity_id and delta required" });
    const existing = await db
      .select()
      .from(engineLeadScores)
      .where(and(eq(engineLeadScores.tenant_id, tenant_id), eq(engineLeadScores.entity_id, entity_id)))
      .limit(1);
    const newScore = Math.max(0, Math.min(100, (existing[0]?.score || 0) + delta));
    const tier = newScore >= 80 ? "sales_ready" : newScore >= 50 ? "hot" : newScore >= 25 ? "warm" : "cold";
    if (existing.length > 0) {
      await db
        .update(engineLeadScores)
        .set({ score: newScore, tier, updated_at: new Date() })
        .where(eq(engineLeadScores.id, existing[0].id));
    } else {
      await db.insert(engineLeadScores).values({
        id: randomUUID(), tenant_id, entity_id, score: newScore, tier,
        created_at: new Date(), updated_at: new Date(),
      });
    }
    res.json({ score: newScore, tier });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Suppression ──────────────────────────────────────────────────────────────

// GET /api/engine/suppression
engineRouter.get("/suppression", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { reason, q } = req.query;
    const conditions = [eq(suppressionList.tenant_id, tenant_id)];
    if (reason && reason !== "all") conditions.push(eq(suppressionList.reason, reason as string));
    if (q) conditions.push(ilike(suppressionList.email, `%${q}%`));
    const rows = await db
      .select()
      .from(suppressionList)
      .where(and(...conditions))
      .orderBy(desc(suppressionList.created_at))
      .limit(500);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/suppression
engineRouter.post("/suppression", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { email, reason, expires_at } = req.body;
    if (!email || !reason) return res.status(400).json({ error: "email and reason required" });
    const id = randomUUID();
    const now = new Date();
    await db.insert(suppressionList).values({
      id, tenant_id, email: email.toLowerCase(), reason,
      expires_at: expires_at ? new Date(expires_at) : undefined,
      created_at: now, updated_at: now,
    });
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/suppression/bulk
engineRouter.post("/suppression/bulk", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { emails, reason = "manual" } = req.body;
    if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: "emails array required" });
    const now = new Date();
    const rows = emails.map((email: string) => ({
      id: randomUUID(), tenant_id, email: email.toLowerCase(), reason,
      created_at: now, updated_at: now,
    }));
    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      await db.insert(suppressionList).values(rows.slice(i, i + 100)).onConflictDoNothing();
    }
    res.json({ added: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/engine/suppression/:id
engineRouter.delete("/suppression/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    await db.delete(suppressionList).where(eq(suppressionList.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Events ───────────────────────────────────────────────────────────────────

// GET /api/engine/events
engineRouter.get("/events", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const tenant_id = getTenantId(req);
    const { q, source, processed, event_type, limit = "50", offset = "0" } = req.query;

    const conditions = [eq(crmEvents.tenant_id, tenant_id)];
    if (source && source !== "all") conditions.push(eq(crmEvents.source, source as string));
    if (processed !== undefined && processed !== "all") {
      conditions.push(eq(crmEvents.processed, processed === "true"));
    }
    if (q) {
      conditions.push(
        or(
          ilike(crmEvents.entity_id, `%${q}%`),
          ilike(crmEvents.event_type, `%${q}%`)
        )!
      );
    }

    // Handle multiple event_type params
    const eventTypes = Array.isArray(event_type) ? event_type : event_type ? [event_type] : [];
    if (eventTypes.length > 0) {
      conditions.push(inArray(crmEvents.event_type, eventTypes as string[]));
    }

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(crmEvents)
        .where(and(...conditions))
        .orderBy(desc(crmEvents.occurred_at))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(crmEvents)
        .where(and(...conditions)),
    ]);

    res.json({ events: rows, total: countResult[0]?.count || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
