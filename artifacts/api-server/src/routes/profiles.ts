import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/profiles", async (_req, res): Promise<void> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, role:roles(name, permissions)")
    .order("full_name");
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.patch("/profiles/:id", async (req, res): Promise<void> => {
  const supabase = getSupabase();
  const id = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json(data);
});

// Admin: create a new team member (Supabase auth user + profile)
router.post("/team-members", async (req, res): Promise<void> => {
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!serviceKey) {
    res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });
    return;
  }

  const rawUrl = process.env["VITE_SUPABASE_URL"] || "";
  const supabaseUrl = rawUrl.startsWith("http")
    ? rawUrl
    : `https://${rawUrl}.supabase.co`;

  const { email, password, full_name, role_id, role_name, phone, avatar_color } = req.body;

  if (!email || !password || !full_name) {
    res.status(400).json({ error: "email, password, and full_name are required" });
    return;
  }

  try {
    // Create the Supabase auth user
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      }),
    });

    const authData = await authRes.json() as any;
    if (!authRes.ok) {
      res.status(400).json({ error: authData.message || authData.msg || "Failed to create auth user" });
      return;
    }

    // Upsert the profile using service role key to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.id,
        email,
        full_name,
        role_id: role_id || null,
        role_name: role_name || "Agent",
        phone: phone || null,
        avatar_color: avatar_color || "#1A5FB4",
        is_active: true,
      }, { onConflict: "id" })
      .select()
      .single();

    if (profileError) {
      res.status(400).json({ error: profileError.message });
      return;
    }

    res.json({ success: true, user: profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
