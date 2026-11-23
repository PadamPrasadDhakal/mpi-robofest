const cfg = window.APP_CONFIG || {};
const ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("YOUR_PROJECT") && !cfg.SUPABASE_ANON_KEY.includes("YOUR_");
const client = ready ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginMessage = document.getElementById("loginMessage");
let workshopData = [];
let projectData = [];

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
  await loadAll();
}

async function loadAll() {
  await Promise.all([loadWorkshop(), loadProject()]);
}

async function loadWorkshop() {
  const tbody = document.getElementById("workshopRows");
  tbody.innerHTML = '<tr><td colspan="5" class="empty">Loading…</td></tr>';
  const { data, error } = await client.from("registrations").select("*").order("created_at", { ascending: false });
  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Could not load registrations.</td></tr>';
    document.getElementById("workshopMessage").textContent = error.message;
    return;
  }
  workshopData = data || [];
  document.getElementById("workshopCount").textContent = workshopData.length;
  document.getElementById("studentCount").textContent = workshopData.length * 2;
  renderWorkshop();
}

async function loadProject() {
  const tbody = document.getElementById("projectRows");
  tbody.innerHTML = '<tr><td colspan="5" class="empty">Loading…</td></tr>';
  const { data, error } = await client.from("project_registrations").select("*").order("created_at", { ascending: false });
  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Could not load registrations.</td></tr>';
    document.getElementById("projectMessage").textContent = error.message;
    return;
  }
  projectData = data || [];
  document.getElementById("projectCount").textContent = projectData.length;
  renderProject();
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function renderWorkshop() {
  const q = document.getElementById("searchWorkshop").value.toLowerCase().trim();
  const filtered = workshopData.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  const tbody = document.getElementById("workshopRows");
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No registrations found.</td></tr>'; return; }
  tbody.innerHTML = filtered.map(r => `<tr>
    <td>${esc(new Date(r.created_at).toLocaleDateString())}</td>
    <td><b>${esc(r.school_name)}</b><br>${esc(r.school_address)}</td>
    <td>${esc(r.contact_person)}<br>${esc(r.contact_phone)}<br>${esc(r.contact_email)}</td>
    <td><b>${esc(r.male_student_name)}</b><br>${esc(r.male_student_class)}<br>${esc(r.male_student_address)}</td>
    <td><b>${esc(r.female_student_name)}</b><br>${esc(r.female_student_class)}<br>${esc(r.female_student_address)}</td>
  </tr>`).join("");
}

function renderProject() {
  const q = document.getElementById("searchProject").value.toLowerCase().trim();
  const filtered = projectData.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  const tbody = document.getElementById("projectRows");
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No registrations found.</td></tr>'; return; }
  tbody.innerHTML = filtered.map(r => {
    const members = [
      r.member1_name && `${esc(r.member1_name)} (${esc(r.member1_class)})`,
      r.member2_name && `${esc(r.member2_name)} (${esc(r.member2_class)})`,
      r.member3_name && `${esc(r.member3_name)} (${esc(r.member3_class)})`,
      r.member4_name && `${esc(r.member4_name)} (${esc(r.member4_class)})`
    ].filter(Boolean).join("<br>");
    return `<tr>
      <td>${esc(new Date(r.created_at).toLocaleDateString())}</td>
      <td><b>${esc(r.institution)}</b></td>
      <td><b>${esc(r.project_title)}</b><br><span style="color:#718098;font-size:11px">${esc(r.project_description)}</span></td>
      <td>${esc(r.contact_person)}<br>${esc(r.contact_phone)}<br>${esc(r.contact_email)}</td>
      <td>${members}</td>
    </tr>`;
  }).join("");
}

// Tabs
document.getElementById("tabWorkshop").addEventListener("click", () => {
  document.getElementById("tabWorkshop").classList.add("active");
  document.getElementById("tabProject").classList.remove("active");
  document.getElementById("panelWorkshop").hidden = false;
  document.getElementById("panelProject").hidden = true;
});
document.getElementById("tabProject").addEventListener("click", () => {
  document.getElementById("tabProject").classList.add("active");
  document.getElementById("tabWorkshop").classList.remove("active");
  document.getElementById("panelProject").hidden = false;
  document.getElementById("panelWorkshop").hidden = true;
});

// Search
document.getElementById("searchWorkshop").addEventListener("input", renderWorkshop);
document.getElementById("searchProject").addEventListener("input", renderProject);

// Refresh
document.getElementById("refreshBtn").addEventListener("click", loadAll);

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await client.auth.signOut();
  dashboardView.hidden = true;
  loginView.hidden = false;
});

// CSV exports
function downloadCSV(rows, headers, filename) {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => cell(r[h])).join(","))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename;
  a.click();
}

document.getElementById("csvWorkshop").addEventListener("click", () => {
  downloadCSV(workshopData,
    ["created_at","school_name","school_address","contact_person","contact_phone","contact_email","male_student_name","male_student_class","male_student_address","female_student_name","female_student_class","female_student_address"],
    "mpi-robofest-workshop.csv");
});

document.getElementById("csvProject").addEventListener("click", () => {
  downloadCSV(projectData,
    ["created_at","institution","project_title","project_description","contact_person","contact_phone","contact_email","member1_name","member1_class","member2_name","member2_class","member3_name","member3_class","member4_name","member4_class"],
    "mpi-robofest-projects.csv");
});

(async () => {
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  if (session) await showDashboard();
})();
