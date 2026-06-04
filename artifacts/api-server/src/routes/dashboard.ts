import { Router, type IRouter } from "express";
import { getSupabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("status, source, base_fee, gst_amount, total_amount, amount_paid, payment_method, created_at");

  if (error) { res.status(500).json({ error: error.message }); return; }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const all = leads || [];
  const total_leads = all.length;
  const under_process = all.filter(l => l.status === "Under Process").length;
  const submitted = all.filter(l => l.status === "Submitted").length;
  const completed = all.filter(l => l.status === "Completed").length;
  const cancelled = all.filter(l => l.status === "Cancelled").length;
  const base_revenue = all.reduce((s, l) => s + (l.base_fee || 0), 0);
  const gst_collected = all.reduce((s, l) => s + (l.gst_amount || 0), 0);
  const total_invoiced = all.reduce((s, l) => s + (l.total_amount || 0), 0);
  const total_paid = all.reduce((s, l) => s + (l.amount_paid || 0), 0);
  const balance_pending = total_invoiced - total_paid;
  const cash_received = all.filter(l => l.payment_method === "Cash").reduce((s, l) => s + (l.amount_paid || 0), 0);
  const upi_received = all.filter(l => l.payment_method === "UPI/Transfer").reduce((s, l) => s + (l.amount_paid || 0), 0);
  const completion_rate = total_leads > 0 ? Math.round((completed / total_leads) * 100) : 0;

  const walkIns = all.filter(l => l.source === "Walk-in");
  const walkin_today = walkIns.filter(l => new Date(l.created_at) >= todayStart).length;
  const walkin_week = walkIns.filter(l => new Date(l.created_at) >= weekStart).length;
  const walkin_month = walkIns.filter(l => new Date(l.created_at) >= monthStart).length;

  res.json({
    total_leads, under_process, submitted, completed, cancelled,
    base_revenue, gst_collected, total_invoiced, balance_pending,
    cash_received, upi_received, completion_rate,
    walkin_today, walkin_week, walkin_month,
  });
});

router.get("/dashboard/agent-performance", async (_req, res): Promise<void> => {
  const supabase = getSupabase();
  const [leadsRes, docsRes] = await Promise.all([
    supabase.from("leads").select("assigned_to, agent_name, status, total_amount, amount_paid"),
    supabase.from("lead_documents").select("uploaded_by"),
  ]);

  if (leadsRes.error) { res.status(500).json({ error: leadsRes.error.message }); return; }

  const leads = leadsRes.data || [];
  const docs = docsRes.data || [];

  const agentMap = new Map<string, { agent_id: string; agent_name: string; total_leads: number; completed: number; balance_pending: number; docs_uploaded: number }>();

  for (const l of leads) {
    if (!l.assigned_to) continue;
    const key = l.assigned_to;
    if (!agentMap.has(key)) {
      agentMap.set(key, {
        agent_id: l.assigned_to,
        agent_name: l.agent_name || "Unknown",
        total_leads: 0,
        completed: 0,
        balance_pending: 0,
        docs_uploaded: 0,
      });
    }
    const a = agentMap.get(key)!;
    a.total_leads++;
    if (l.status === "Completed") a.completed++;
    const bal = (l.total_amount || 0) - (l.amount_paid || 0);
    if (bal > 0) a.balance_pending += bal;
  }

  for (const d of docs) {
    if (!d.uploaded_by) continue;
    const a = agentMap.get(d.uploaded_by);
    if (a) a.docs_uploaded++;
  }

  const result = Array.from(agentMap.values()).map(a => ({
    ...a,
    completion_rate: a.total_leads > 0 ? Math.round((a.completed / a.total_leads) * 100) : 0,
  }));

  res.json(result);
});

router.get("/dashboard/revenue-trend", async (_req, res): Promise<void> => {
  const supabase = getSupabase();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const { data: leads, error } = await supabase
    .from("leads")
    .select("base_fee, gst_amount, total_amount, created_at")
    .gte("created_at", sixMonthsAgo.toISOString());

  if (error) { res.status(500).json({ error: error.message }); return; }

  const monthMap = new Map<string, { month: string; base_revenue: number; gst_amount: number; total_invoiced: number; leads_count: number }>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "numeric" });
    monthMap.set(key, { month: label, base_revenue: 0, gst_amount: 0, total_invoiced: 0, leads_count: 0 });
  }

  for (const l of leads || []) {
    const d = new Date(l.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (entry) {
      entry.base_revenue += l.base_fee || 0;
      entry.gst_amount += l.gst_amount || 0;
      entry.total_invoiced += l.total_amount || 0;
      entry.leads_count++;
    }
  }

  res.json(Array.from(monthMap.values()));
});

router.get("/dashboard/pending-payments", async (_req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, pax_name, phone, whatsapp, service_name, total_amount, amount_paid, agent_name, status")
    .order("total_amount", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const pending = (leads || [])
    .map(l => ({ ...l, balance: (l.total_amount || 0) - (l.amount_paid || 0) }))
    .filter(l => l.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  res.json(pending);
});

router.get("/activity-log", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (req.query["type"]) query = query.eq("entity_type", req.query["type"] as string);
  if (req.query["from"]) query = query.gte("created_at", req.query["from"] as string);
  if (req.query["to"]) query = query.lte("created_at", req.query["to"] as string);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

export default router;
