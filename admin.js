const cfg = window.APP_CONFIG || {};
const ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("YOUR_PROJECT") && !cfg.SUPABASE_ANON_KEY.includes("YOUR_");
const client = ready ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginMessage = document.getElementById("loginMessage");
let registrations = [];

if (!client) loginMessage.textContent = "Set your Supabase URL and anon key in config.js first.";

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!client) return;
  loginMessage.textContent = "Signing in…";
  const { error } = await client.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  });
  if (error) { loginMessage.textContent = error.message; return; }
  await showDashboard();
});

async function showDashboard() {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;
  const { data: admin, error: adminError } = await client.from("registrations_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminError || !admin) {
    await client.auth.signOut();
    loginMessage.textContent = "This account is not authorized as an MPI RoboFest administrator.";
    return;
  }
  loginView.hidden = true;
  dashboardView.hidden = false;
  document.getElementById("adminEmail").textContent = user.email;
  await loadRegistrations();
}

async function loadRegistrations() {
  const tbody = document.getElementById("registrationRows");
  tbody.innerHTML = '<tr><td colspan="5" class="empty">Loading registrations…</td></tr>';
  const { data, error } = await client.from("registrations").select("*").order("created_at", { ascending: false });
  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Could not load registrations.</td></tr>';
    document.getElementById("dashboardMessage").textContent = error.message;
    return;
  }
  registrations = data || [];
  document.getElementById("totalCount").textContent = registrations.length;
  document.getElementById("studentCount").textContent = registrations.length * 2;
  renderRows();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function renderRows() {
  const q = document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered = registrations.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  const tbody = document.getElementById("registrationRows");
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No registrations found.</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(r => `<tr>
    <td>${escapeHTML(new Date(r.created_at).toLocaleDateString())}</td>
    <td><b>${escapeHTML(r.school_name)}</b><br>${escapeHTML(r.school_address)}</td>
    <td>${escapeHTML(r.contact_person)}<br>${escapeHTML(r.contact_phone)}<br>${escapeHTML(r.contact_email)}</td>
    <td><b>${escapeHTML(r.male_student_name)}</b><br>${escapeHTML(r.male_student_class)}<br>${escapeHTML(r.male_student_address)}</td>
    <td><b>${escapeHTML(r.female_student_name)}</b><br>${escapeHTML(r.female_student_class)}<br>${escapeHTML(r.female_student_address)}</td>
  </tr>`).join("");
}
document.getElementById("searchInput").addEventListener("input", renderRows);
document.getElementById("refreshBtn").addEventListener("click", loadRegistrations);
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await client.auth.signOut();
  dashboardView.hidden = true;
  loginView.hidden = false;
});
document.getElementById("csvBtn").addEventListener("click", () => {
  const headers = ["created_at","school_name","school_address","contact_person","contact_phone","contact_email","male_student_name","male_student_class","male_student_address","female_student_name","female_student_class","female_student_address"];
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...registrations.map(r => headers.map(h => csvCell(r[h])).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "mpi-robofest-registrations.csv"; a.click();
  URL.revokeObjectURL(url);
});
(async () => {
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  if (session) await showDashboard();
})();