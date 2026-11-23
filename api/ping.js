const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
    return res.status(500).json({ error: "Not configured" });

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    await db.from("registrations").select("id").limit(1);
    return res.status(200).json({ ok: true, pinged: new Date().toISOString() });
  } catch (err) {
    console.error("Ping error:", err);
    return res.status(500).json({ error: "Ping failed" });
  }
};
