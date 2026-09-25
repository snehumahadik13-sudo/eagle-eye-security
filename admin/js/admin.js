const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
const main = document.getElementById('main');
let accessToken = null;

// ---------------------------------------------------------------------------
// Auth guard + bootstrap
// ---------------------------------------------------------------------------
(async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) return (window.location.href = 'index.html');
  accessToken = data.session.access_token;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });

  document.querySelectorAll('.sidebar nav a').forEach((a) => {
    a.addEventListener('click', () => setActiveTab(a.dataset.tab));
  });

  const initialTab = window.location.hash.replace('#', '') || 'enquiries';
  setActiveTab(initialTab);
})();

function setActiveTab(tab) {
  document.querySelectorAll('.sidebar nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  window.location.hash = tab;
  const renderers = { enquiries: renderEnquiries, applications: renderApplications, jobs: renderJobs, services: renderServices, settings: renderSettings };
  (renderers[tab] || renderEnquiries)();
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
    throw new Error('Session expired');
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function badge(status) {
  return `<span class="badge badge-${status.replace(/\s+/g, '-')}">${status}</span>`;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ---------------------------------------------------------------------------
// Client Enquiries
// ---------------------------------------------------------------------------
async function renderEnquiries() {
  main.innerHTML = `<h1>Client Enquiries</h1><div id="content">Loading…</div>`;
  const rows = await api('/api/enquiries').catch((e) => { main.querySelector('#content').textContent = e.message; return []; });
  const statuses = ['New', 'Contacted', 'In Progress', 'Closed'];

  main.querySelector('#content').innerHTML = rows.length ? `
    <table><thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Subject</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <td>${fmtDate(r.created_at)}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.email)}<br><span class="muted">${esc(r.mobile)}</span></td>
        <td>${esc(r.subject)}</td>
        <td>${badge(r.status)}</td>
        <td>
          <select data-id="${r.id}" class="enquiry-status">
            ${statuses.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('')}</tbody></table>
  ` : `<div class="empty-state">No enquiries yet.</div>`;

  main.querySelectorAll('.enquiry-status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await api(`/api/enquiries/${sel.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
      renderEnquiries();
    });
  });
}

// ---------------------------------------------------------------------------
// Job Applications
// ---------------------------------------------------------------------------
async function renderApplications() {
  main.innerHTML = `<h1>Job Applications</h1><div id="content">Loading…</div>`;
  const rows = await api('/api/applications').catch((e) => { main.querySelector('#content').textContent = e.message; return []; });
  const statuses = ['New', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'];

  main.querySelector('#content').innerHTML = rows.length ? `
    <table><thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Applied For</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <td>${fmtDate(r.created_at)}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.email)}<br><span class="muted">${esc(r.mobile)}</span></td>
        <td>${esc(r.job_openings?.title || '—')}</td>
        <td>${badge(r.status)}</td>
        <td>
          <select data-id="${r.id}" class="app-status">
            ${statuses.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('')}</tbody></table>
  ` : `<div class="empty-state">No applications yet.</div>`;

  main.querySelectorAll('.app-status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await api(`/api/applications/${sel.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
      renderApplications();
    });
  });
}

// ---------------------------------------------------------------------------
// Job Openings (full CRUD)
// ---------------------------------------------------------------------------
async function renderJobs() {
  main.innerHTML = `<h1>Job Openings</h1><div class="toolbar"><button class="btn btn-primary btn-sm" id="addJobBtn">+ Add Job</button></div><div id="content">Loading…</div>`;
  const rows = await api('/api/jobs/admin/all').catch((e) => { main.querySelector('#content').textContent = e.message; return []; });

  main.querySelector('#content').innerHTML = rows.length ? `
    <table><thead><tr><th>Title</th><th>Location</th><th>Active</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <td>${esc(r.title)}</td>
        <td>${esc(r.location || '—')}</td>
        <td>${r.is_active ? 'Yes' : 'No'}</td>
        <td>
          <button class="btn btn-ghost btn-sm edit-job" data-id="${r.id}">Edit</button>
          <button class="btn btn-danger btn-sm del-job" data-id="${r.id}">Delete</button>
        </td>
      </tr>`).join('')}</tbody></table>
  ` : `<div class="empty-state">No job openings yet.</div>`;

  document.getElementById('addJobBtn').addEventListener('click', () => openJobModal());
  main.querySelectorAll('.edit-job').forEach((b) => b.addEventListener('click', () => openJobModal(rows.find((r) => r.id === b.dataset.id))));
  main.querySelectorAll('.del-job').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this job opening?')) return;
    await api(`/api/jobs/${b.dataset.id}`, { method: 'DELETE' });
    renderJobs();
  }));
}

function openJobModal(job) {
  const isEdit = !!job;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit' : 'Add'} Job Opening</h3>
      <form id="jobForm">
        <div class="field"><label>Title</label><input name="title" required value="${esc(job?.title || '')}"></div>
        <div class="field"><label>Location</label><input name="location" value="${esc(job?.location || '')}"></div>
        <div class="field"><label>Description</label><textarea name="description">${esc(job?.description || '')}</textarea></div>
        <div class="field"><label>Requirements (one per line)</label><textarea name="requirements">${esc(job?.requirements || '')}</textarea></div>
        <div class="field"><label><input type="checkbox" name="is_active" ${job?.is_active !== false ? 'checked' : ''} style="width:auto;display:inline-block;margin-right:6px;">Active (visible on website)</label></div>
        <div class="row">
          <button type="submit" class="btn btn-primary btn-sm">${isEdit ? 'Save' : 'Create'}</button>
          <button type="button" class="btn btn-ghost btn-sm" id="cancelModal">Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#cancelModal').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const payload = { title: f.get('title'), location: f.get('location'), description: f.get('description'), requirements: f.get('requirements'), is_active: f.get('is_active') === 'on' };
    if (isEdit) await api(`/api/jobs/${job.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });
    backdrop.remove();
    renderJobs();
  });
}

// ---------------------------------------------------------------------------
// Services (full CRUD)
// ---------------------------------------------------------------------------
async function renderServices() {
  main.innerHTML = `<h1>Services</h1><div class="toolbar"><button class="btn btn-primary btn-sm" id="addSvcBtn">+ Add Service</button></div><div id="content">Loading…</div>`;
  const rows = await api('/api/services/admin/all').catch((e) => { main.querySelector('#content').textContent = e.message; return []; });

  main.querySelector('#content').innerHTML = rows.length ? `
    <table><thead><tr><th>Order</th><th>Title</th><th>Active</th><th></th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <td>${r.sort_order}</td>
        <td>${esc(r.title)}</td>
        <td>${r.is_active ? 'Yes' : 'No'}</td>
        <td>
          <button class="btn btn-ghost btn-sm edit-svc" data-id="${r.id}">Edit</button>
          <button class="btn btn-danger btn-sm del-svc" data-id="${r.id}">Delete</button>
        </td>
      </tr>`).join('')}</tbody></table>
  ` : `<div class="empty-state">No services yet.</div>`;

  document.getElementById('addSvcBtn').addEventListener('click', () => openServiceModal());
  main.querySelectorAll('.edit-svc').forEach((b) => b.addEventListener('click', () => openServiceModal(rows.find((r) => r.id === b.dataset.id))));
  main.querySelectorAll('.del-svc').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this service?')) return;
    await api(`/api/services/${b.dataset.id}`, { method: 'DELETE' });
    renderServices();
  }));
}

function openServiceModal(svc) {
  const isEdit = !!svc;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>${isEdit ? 'Edit' : 'Add'} Service</h3>
      <form id="svcForm">
        <div class="field"><label>Title</label><input name="title" required value="${esc(svc?.title || '')}"></div>
        <div class="field"><label>Description</label><textarea name="description">${esc(svc?.description || '')}</textarea></div>
        <div class="field"><label>Icon key</label><input name="icon" value="${esc(svc?.icon || '')}" placeholder="shield, building, pulse…"></div>
        <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${svc?.sort_order ?? 0}"></div>
        <div class="field"><label><input type="checkbox" name="is_active" ${svc?.is_active !== false ? 'checked' : ''} style="width:auto;display:inline-block;margin-right:6px;">Active (visible on website)</label></div>
        <div class="row">
          <button type="submit" class="btn btn-primary btn-sm">${isEdit ? 'Save' : 'Create'}</button>
          <button type="button" class="btn btn-ghost btn-sm" id="cancelModal">Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#cancelModal').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#svcForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const payload = { title: f.get('title'), description: f.get('description'), icon: f.get('icon'), sort_order: Number(f.get('sort_order') || 0), is_active: f.get('is_active') === 'on' };
    if (isEdit) await api(`/api/services/${svc.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/api/services', { method: 'POST', body: JSON.stringify(payload) });
    backdrop.remove();
    renderServices();
  });
}

// ---------------------------------------------------------------------------
// Site Settings
// ---------------------------------------------------------------------------
async function renderSettings() {
  main.innerHTML = `<h1>Site Settings</h1><div id="content">Loading…</div>`;
  const rows = await api('/api/settings/admin/all').catch((e) => { main.querySelector('#content').textContent = e.message; return []; });

  main.querySelector('#content').innerHTML = `
    <div class="card-form">
      <form id="settingsForm">
        ${rows.map((r) => `
          <div class="field">
            <label>${esc(r.key)}</label>
            <input data-key="${esc(r.key)}" value="${esc(typeof r.value === 'string' ? r.value : JSON.stringify(r.value))}">
          </div>`).join('')}
        <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
        <div class="error-msg" id="settingsMsg"></div>
      </form>
    </div>`;

  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('[data-key]');
    for (const input of inputs) {
      let value = input.value;
      try { value = JSON.parse(value); } catch { /* keep as plain string */ }
      await api(`/api/settings/${input.dataset.key}`, { method: 'PUT', body: JSON.stringify({ value }) });
    }
    document.getElementById('settingsMsg').style.color = '#7ee3b0';
    document.getElementById('settingsMsg').textContent = 'Saved.';
  });
}
