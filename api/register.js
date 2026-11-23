// Vercel serverless endpoint: validates, stores the registration, and sends its confirmation.
// Required Vercel environment variables:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const fields = [
  "school_name", "school_address", "contact_person", "contact_phone", "contact_email",
  "male_student_name", "male_student_class", "male_student_address",
  "female_student_name", "female_student_class", "female_student_address"
];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  for (const field of fields) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return res.status(400).json({ error: "Please complete all required fields." });
    }
  }
  const values = Object.fromEntries(fields.map(field => [field, body[field].trim()]));
  const limits = {
    school_name: 180, school_address: 240, contact_person: 120, contact_phone: 25,
    contact_email: 180, male_student_name: 120, male_student_class: 30,
    male_student_address: 240, female_student_name: 120, female_student_class: 30,
    female_student_address: 240
  };
  for (const [field, max] of Object.entries(limits)) {
    if (values[field].length > max) return res.status(400).json({ error: "One or more fields are too long." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email)) {
    return res.status(400).json({ error: "Please enter a valid school contact email." });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Registration database is not configured." });
  }

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: registration, error } = await db
      .from("registrations").insert(values).select("*").single();
    if (error) {
      console.error("Registration insert error:", error);
      return res.status(500).json({ error: "Could not save registration. Please try again." });
    }

    let emailSent = false;
    if (RESEND_API_KEY && EMAIL_FROM) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const result = await resend.emails.send({
          from: EMAIL_FROM,
          to: [registration.contact_email],
          subject: "MPI RoboFest 2026 – Registration Confirmation",
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5fa;font-family:Arial,sans-serif">
            <div style="max-width:620px;margin:30px auto;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.1)">
              <div style="background:#123b78;padding:32px 36px">
                <p style="margin:0 0 6px;color:#ffcf35;font-size:11px;font-weight:bold;letter-spacing:2px">MECHINAGAR POLYTECHNIC INSTITUTE</p>
                <h1 style="margin:0;color:#fff;font-size:26px">MPI RoboFest 2026</h1>
                <p style="margin:6px 0 0;color:#c6d4e8;font-size:13px">Build. Innovate. Compete.</p>
              </div>
              <div style="background:#fff;padding:32px 36px">
                <p style="font-size:18px;font-weight:bold;color:#123b78;margin:0 0 16px">🎉 You're registered!</p>
                <p style="margin:0 0 12px">Dear <b>${escapeHtml(registration.contact_person)}</b>,</p>
                <p style="margin:0 0 20px;color:#445870">Thank you so much for registering <b>${escapeHtml(registration.school_name)}</b> for the MPI RoboFest 2026 Robotics Workshop! We're thrilled to have your students join us. Get ready for two exciting days of hands-on robotics learning!</p>
                <div style="background:#f7f9fc;border-left:4px solid #123b78;border-radius:6px;padding:18px 20px;margin-bottom:24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#e99020">📋 YOUR REGISTRATION DETAILS</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <tr><td style="padding:6px 0;color:#718098;width:45%">School</td><td style="padding:6px 0;font-weight:bold">${escapeHtml(registration.school_name)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Address</td><td style="padding:6px 0">${escapeHtml(registration.school_address)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Contact person</td><td style="padding:6px 0">${escapeHtml(registration.contact_person)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Contact number</td><td style="padding:6px 0">${escapeHtml(registration.contact_phone)}</td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Contact email</td><td style="padding:6px 0">${escapeHtml(registration.contact_email)}</td></tr>
                  </table>
                </div>
                <div style="background:#f7f9fc;border-left:4px solid #ffca2d;border-radius:6px;padding:18px 20px;margin-bottom:24px">
                  <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#e99020">👨‍🎓 REGISTERED STUDENTS</p>
                  <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <tr><td style="padding:6px 0;color:#718098;width:45%">Male participant</td><td style="padding:6px 0"><b>${escapeHtml(registration.male_student_name)}</b> · ${escapeHtml(registration.male_student_class)}<br><span style="color:#718098;font-size:12px">${escapeHtml(registration.male_student_address)}</span></td></tr>
                    <tr><td style="padding:6px 0;color:#718098">Female participant</td><td style="padding:6px 0"><b>${escapeHtml(registration.female_student_name)}</b> · ${escapeHtml(registration.female_student_class)}<br><span style="color:#718098;font-size:12px">${escapeHtml(registration.female_student_address)}</span></td></tr>
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
                <p style="color:#445870;margin:0 0 20px">The workshop will cover robotics fundamentals and hands-on construction of a <b>Smart Bluetooth Controlled Robotic Car</b>. Please make sure your students arrive on time on Day 1.</p>
                <p style="color:#445870;margin:0 0 24px">We look forward to seeing you and your students at MPI RoboFest 2026. See you there! 🤖</p>
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
    console.error("Registration endpoint error:", error);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}