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
        const result = await resend.emails.send({
          from: EMAIL_FROM,
          to: [reg.contact_email],
          subject: "MPI RoboFest 2026 – Project Exhibition Registration Confirmation",
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5fa;font-family:Arial,sans-serif">
            <div style="max-width:620px;margin:30px auto;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.1)">
              <div style="background:#123b78;padding:32px 36px">
                <p style="margin:0 0 6px;color:#ffcf35;font-size:11px;font-weight:bold;letter-spacing:2px">MECHINAGAR POLYTECHNIC INSTITUTE</p>
                <h1 style="margin:0;color:#fff;font-size:26px">MPI RoboFest 2026</h1>
                <p style="margin:6px 0 0;color:#c6d4e8;font-size:13px">Build. Innovate. Compete.</p>
              </div>
              <div style="background:#fff;padding:32px 36px">
                <p style="font-size:18px;font-weight:bold;color:#123b78;margin:0 0 16px">🎉 Project registered!</p>
                <p style="margin:0 0 12px">Dear <b>${e(reg.contact_person)}</b>,</p>
                <p style="margin:0 0 20px;color:#445870">Thank you for registering your project for the MPI RoboFest 2026 Project Exhibition! We're excited to see what your team has built. Get ready to showcase your innovation to everyone at the event!</p>
                <div style="background:#f7f9fc;border-left:4px solid #123b78;border-radius:6px;padding:18px 20px;margin-bottom:24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#e99020">📋 YOUR REGISTRATION DETAILS</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <tr><td style="padding:6px 0;color:#718098;width:45%">Institution</td><td style="padding:6px 0;font-weight:bold">${e(reg.institution)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Project title</td><td style="padding:6px 0;font-weight:bold">${e(reg.project_title)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Description</td><td style="padding:6px 0">${e(reg.project_description)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Contact person</td><td style="padding:6px 0">${e(reg.contact_person)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Contact number</td><td style="padding:6px 0">${e(reg.contact_phone)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Contact email</td><td style="padding:6px 0">${e(reg.contact_email)}</td></tr>
                  </table>
                </div>
                <div style="background:#f7f9fc;border-left:4px solid #ffca2d;border-radius:6px;padding:18px 20px;margin-bottom:24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#e99020">👥 TEAM MEMBERS</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px">
                    ${[{n:reg.member1_name,c:reg.member1_class},{n:reg.member2_name,c:reg.member2_class},{n:reg.member3_name,c:reg.member3_class},{n:reg.member4_name,c:reg.member4_class}].filter(m=>m.n).map((m,i)=>`<tr><td style="padding:6px 0;color:#718098;width:45%">Member ${i+1}</td><td style="padding:6px 0"><b>${e(m.n)}</b> · ${e(m.c)}</td></tr>`).join("")}
                  </table>
                </div>
                <div style="background:#123b78;border-radius:8px;padding:18px 20px;margin-bottom:24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#ffca2d">📅 EVENT SCHEDULE</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;color:#fff">
                    <tr><td style="padding:5px 0;color:#c6d4e8;width:45%">Workshop</td><td style="padding:5px 0"><b>21–22 Mangsir 2083</b></td></tr>
                    <tr><td style="padding:5px 0;color:#c6d4e8">Exhibition & Robo Race</td><td style="padding:5px 0"><b>28–29 Mangsir 2083</b></td></tr>
                    <tr><td style="padding:5px 0;color:#c6d4e8">Venue</td><td style="padding:5px 0">Mechinagar Polytechnic Institute, Jhapa</td></tr>
                  </table>
                </div>
                <p style="color:#445870;margin:0 0 20px">Please make sure all team members are present on the exhibition days. More details about setup time and booth allocation will be shared closer to the event.</p>
                <p style="color:#445870;margin:0 0 24px">We can't wait to see your project in action. See you at MPI RoboFest 2026! 🤖</p>
                <div style="border-top:1px solid #e5eaf1;padding-top:20px;font-size:12px;color:#718098">
                  <p style="margin:0"><b style="color:#123b78">MPI RoboFest 2026 Organizing Team</b><br>Mechinagar Polytechnic Institute, Mechinagar, Jhapa<br>
                  Technical Partner: <a href="https://pi-innovations.com.np" style="color:#e99020">PI Innovations Pvt. Ltd.</a></p>
                </div>
              </div>
            </div>
          </body></html>`
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
