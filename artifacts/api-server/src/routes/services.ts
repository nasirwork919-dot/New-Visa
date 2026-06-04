import { Router, type IRouter } from "express";
import { getSupabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/services", async (_req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("services").select("*").order("name");
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/services", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("services").insert([req.body]).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("services")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.sendStatus(204);
});

export default router;
