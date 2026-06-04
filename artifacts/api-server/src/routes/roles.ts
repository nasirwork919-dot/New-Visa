import { Router, type IRouter } from "express";
import { getSupabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/roles", async (_req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("roles").select("*").order("name");
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/roles", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("roles")
    .insert([{ ...req.body, is_preset: false }])
    .select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch("/roles/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("roles").update(req.body).eq("id", id).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

router.delete("/roles/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { error } = await supabase
    .from("roles").delete().eq("id", id).eq("is_preset", false);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.sendStatus(204);
});

export default router;
