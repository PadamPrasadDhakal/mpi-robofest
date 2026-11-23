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
          html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#18365f;line-height:1.6">
              <div style="background:#123b78;color:white;padding:26px;border-radius:10px 10px 0 0">
                <p style="color:#ffcf35;font-size:12px;font-weight:bold;letter-spacing:2px">MECHINAGAR POLYTECHNIC INSTITUTE</p>
                <h1 style="margin:5px 0">MPI RoboFest 2026</h1><p style="margin:0">Build. Innovate. Compete.</p>
              </div>
              <div style="padding:25px;border:1px solid #e5eaf1;border-top:0">
                <h2>Registration received!</h2>
                <p>Dear ${escapeHtml(registration.contact_person)},</p>
                <p>Thank you. The registration for <b>${escapeHtml(registration.school_name)}</b> has been successfully received.</p>
                <h3>Workshop details</h3>
                <p><b>Date:</b> 21–22 Mangsir 2083<br><b>Venue:</b> Mechinagar Polytechnic Institute, Mechinagar, Jhapa</p>
                <h3>Registered participants</h3>
                <p><b>Male participant:</b> ${escapeHtml(registration.male_student_name)} (${escapeHtml(registration.male_student_class)})<br>
                <b>Female participant:</b> ${escapeHtml(registration.female_student_name)} (${escapeHtml(registration.female_student_class)})</p>
                <p>The workshop will cover robotics fundamentals and hands-on construction of a Smart Bluetooth Controlled Robotic Car.</p>
                <p>Project Exhibition and Robo Race: <b>28–29 Mangsir 2083</b>.</p>
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
    console.error("Registration endpoint error:", error);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}