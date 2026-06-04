import { Router, type IRouter } from "express";
import { getSupabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/leads", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  let query = supabase
    .from("leads")
    .select(
      "*, service:services(name, category, country), agent:profiles!assigned_to(id, full_name, avatar_color)"
    )
    .order("created_at", { ascending: false });

  if (req.query["status"]) query = query.eq("status", req.query["status"] as string);
  if (req.query["source"]) query = query.eq("source", req.query["source"] as string);
  if (req.query["assigned_to"]) query = query.eq("assigned_to", req.query["assigned_to"] as string);
  if (req.query["service_name"]) query = query.eq("service_name", req.query["service_name"] as string);
  if (req.query["search"]) {
    const s = req.query["search"] as string;
    query = query.or(`pax_name.ilike.%${s}%,phone.ilike.%${s}%,service_name.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    req.log.error({ error }, "Failed to list leads");
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.post("/leads", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .insert([req.body])
    .select()
    .single();
  if (error) {
    req.log.error({ error }, "Failed to create lead");
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];

  const [leadRes, notesRes, paymentsRes, docsRes, historyRes] = await Promise.all([
    supabase.from("leads").select("*, service:services(name, category, country), agent:profiles!assigned_to(id, full_name, avatar_color)").eq("id", id).single(),
    supabase.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: true }),
    supabase.from("lead_payments").select("*").eq("lead_id", id).order("created_at", { ascending: true }),
    supabase.from("lead_documents").select("*").eq("lead_id", id).order("created_at", { ascending: true }),
    supabase.from("lead_status_history").select("*").eq("lead_id", id).order("created_at", { ascending: true }),
  ]);

  if (leadRes.error || !leadRes.data) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json({
    ...leadRes.data,
    lead_notes: notesRes.data || [],
    lead_payments: paymentsRes.data || [],
    lead_documents: docsRes.data || [],
    lead_status_history: historyRes.data || [],
  });
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("leads")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    req.log.error({ error }, "Failed to update lead");
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) {
    req.log.error({ error }, "Failed to delete lead");
    res.status(400).json({ error: error.message });
    return;
  }
  res.sendStatus(204);
});

router.get("/leads/:id/notes", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/leads/:id/notes", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("lead_notes")
    .insert([{ lead_id: id, ...req.body }])
    .select()
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.get("/leads/:id/payments", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("lead_payments")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/leads/:id/payments", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("lead_payments")
    .insert([{ lead_id: id, ...req.body }])
    .select()
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.get("/leads/:id/documents", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("lead_documents")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.get("/leads/:id/history", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("lead_status_history")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

export default router;
