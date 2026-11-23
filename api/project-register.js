const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const required = [
  "contact_person", "contact_phone", "contact_email", "institution",
  "project_title", "project_description",
  "member1_name", "member1_class",
  "member2_name", "member2_class",
  "member3_name", "member3_class"
];

const limits = {
  contact_person: 120, contact_phone: 25, contact_email: 180, institution: 200,
  project_title: 200, project_description: 600,
  member1_name: 120, member1_class: 50,
  member2_name: 120, member2_class: 50,
  member3_name: 120, member3_class: 50,
  member4_name: 120, member4_class: 50
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  for (const field of required) {
    if (typeof body[field] !== "string" || !body[field].trim())
      return res.status(400).json({ error: "Please complete all required fields." });
  }

  const values = {};
  for (const [field, max] of Object.entries(limits)) {
    const val = typeof body[field] === "string" ? body[field].trim() : "";
    if (val.length > max) return res.status(400).json({ error: "One or more fields are too long." });
    values[field] = val;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email))
    return res.status(400).json({ error: "Please enter a valid contact email." });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
    return res.status(500).json({ error: "Registration database is not configured." });

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: reg, error } = await db
      .from("project_registrations").insert(values).select("*").single();
    if (error) {
      console.error("Project registration insert error:", error);
      return res.status(500).json({ error: "Could not save registration. Please try again." });
    }

    let emailSent = false;
    if (RESEND_API_KEY && EMAIL_FROM) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const members = [
          `${e(reg.member1_name)} (${e(reg.member1_class)})`,
          `${e(reg.member2_name)} (${e(reg.member2_class)})`,
          `${e(reg.member3_name)} (${e(reg.member3_class)})`,
          reg.member4_name ? `${e(reg.member4_name)} (${e(reg.member4_class)})` : null
        ].filter(Boolean).map((m, i) => `<li>Member ${i + 1}: ${m}</li>`).join("");

        const result = await resend.emails.send({
          from: EMAIL_FROM,
          to: [reg.contact_email],
          subject: "MPI RoboFest 2026 – Project Exhibition Registration Confirmation",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#18365f;line-height:1.6">
              <div style="background:#123b78;color:white;padding:26px;border-radius:10px 10px 0 0">
                <p style="color:#ffcf35;font-size:12px;font-weight:bold;letter-spacing:2px">MECHINAGAR POLYTECHNIC INSTITUTE</p>
                <h1 style="margin:5px 0">MPI RoboFest 2026</h1><p style="margin:0">Build. Innovate. Compete.</p>
              </div>
              <div style="padding:25px;border:1px solid #e5eaf1;border-top:0">
                <h2>Project Exhibition Registration Received!</h2>
                <p>Dear ${e(reg.contact_person)},</p>
                <p>Thank you. Your project <b>${e(reg.project_title)}</b> from <b>${e(reg.institution)}</b> has been successfully registered for the Project Exhibition.</p>
                <h3>Exhibition details</h3>
                <p><b>Date:</b> 28–29 Mangsir 2083<br><b>Venue:</b> Mechinagar Polytechnic Institute, Mechinagar, Jhapa</p>
                <h3>Team members</h3><ul>${members}</ul>
                <p>For details, visit <a href="https://mpi-robofest.vercel.app">mpi-robofest.vercel.app</a>.</p>
                <p>Regards,<br><b>MPI RoboFest 2026 Organizing Team</b><br>Mechinagar Polytechnic Institute</p>
              </div>
            </div>`
        });
        emailSent = !result.error;
        if (result.error) console.error("Resend error:", result.error);
      } catch (emailError) {
        console.error("Confirmation email error:", emailError);
      }
    }
    return res.status(200).json({ success: true, emailSent });
  } catch (error) {
    console.error("Project registration endpoint error:", error);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
};

function e(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
