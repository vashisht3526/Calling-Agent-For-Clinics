/* ============================================
   LifeLine Hospital — Admin Interactivity & API
   ============================================ */

const API_BASE = '/api';

// Global Data
let doctorsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadDashboardData();
  
  // Event Listeners
  document.getElementById('doctorForm').addEventListener('submit', handleDoctorSubmit);
  document.getElementById('aptForm').addEventListener('submit', handleAptSubmit);
  document.getElementById('btn-filter-apt').addEventListener('click', loadAppointments);
  document.getElementById('btn-clear-apt').addEventListener('click', () => {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-status').value = '';
    loadAppointments();
  });
});

// ---------- Tab switching ----------
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const panes = document.querySelectorAll('.tab-pane');
  const title = document.getElementById('pageTitle');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update UI
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      const tabId = item.getAttribute('data-tab');
      panes.forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');
      
      // Update Title
      title.textContent = item.textContent.trim().split(' ')[1] || item.textContent.trim();
      
      // Load specific data
      if (tabId === 'dashboard') loadDashboardData();
      else if (tabId === 'appointments') loadAppointments();
      else if (tabId === 'doctors') loadDoctors();
      else if (tabId === 'services') loadServices();
      else if (tabId === 'calls') loadCallLogs();
    });
  });
}

// ---------- Modals ----------
function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

function openDoctorModal(doc = null) {
  const form = document.getElementById('doctorForm');
  form.reset();
  
  if (doc) {
    document.getElementById('doctorModalTitle').textContent = 'Edit Doctor';
    document.getElementById('doc_id').value = doc.id;
    document.getElementById('doc_name').value = doc.name;
    document.getElementById('doc_qual').value = doc.qualification;
    document.getElementById('doc_spec').value = doc.specialty;
    document.getElementById('doc_exp').value = doc.experience;
    document.getElementById('doc_days').value = doc.availability_days;
    document.getElementById('doc_time').value = doc.availability_time;
    document.getElementById('doc_status').value = doc.status;
  } else {
    document.getElementById('doctorModalTitle').textContent = 'Add New Doctor';
    document.getElementById('doc_id').value = '';
  }
  
  document.getElementById('doctorModal').classList.add('active');
}

function openAptModal(aptId, currentStatus, notes) {
  document.getElementById('apt_id').value = aptId;
  document.getElementById('apt_status').value = currentStatus;
  document.getElementById('apt_notes').value = notes || '';
  document.getElementById('aptModal').classList.add('active');
}

// ---------- Formatting Utilities ----------
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTypeTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getDoctorName(id) {
  // If id is string like 'dr-rajesh-sharma', parse it. Real DB uses int IDs.
  if (typeof id === 'string' && id.startsWith('dr-')) {
    return id.replace('dr-', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  const doc = doctorsCache.find(d => d.id == id);
  return doc ? doc.name : 'Unknown';
}

function getStatusBadge(status) {
  const s = status.toLowerCase();
  return `<span class="badge badge-${s}">${s}</span>`;
}


// ---------- API Calls: Dashboard ----------
async function loadDashboardData() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const stats = await res.json();
    
    document.getElementById('stat-total-apt').textContent = stats.totalAppointments;
    document.getElementById('stat-today-apt').textContent = stats.todayAppointments;
    document.getElementById('stat-pending-apt').textContent = stats.pendingAppointments;
    document.getElementById('stat-calls').textContent = stats.totalCalls;

    // Load recent appts
    const apRes = await fetch(`${API_BASE}/appointments`);
    const appointments = await apRes.json();
    
    // We need doctors cache first
    const docRes = await fetch(`${API_BASE}/doctors`);
    doctorsCache = await docRes.json();

    const tbody = document.getElementById('recent-appointments-body');
    tbody.innerHTML = '';
    
    appointments.slice(0, 5).forEach(apt => {
      tbody.innerHTML += `
        <tr>
          <td>${apt.patient_name}</td>
          <td>${apt.phone}</td>
          <td>${formatDate(apt.appointment_date)} at ${apt.appointment_time}</td>
          <td>${getStatusBadge(apt.status)}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// ---------- API Calls: Appointments ----------
async function loadAppointments() {
  try {
    if (!doctorsCache.length) {
      const docRes = await fetch(`${API_BASE}/doctors`);
      doctorsCache = await docRes.json();
    }

    const date = document.getElementById('filter-date').value;
    const status = document.getElementById('filter-status').value;
    
    let url = `${API_BASE}/appointments?`;
    if (date) url += `date=${date}&`;
    if (status) url += `status=${status}`;

    const res = await fetch(url);
    const appointments = await res.json();

    const tbody = document.getElementById('appointments-body');
    tbody.innerHTML = '';

    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">No appointments found.</td></tr>';
      return;
    }

    appointments.forEach(apt => {
      const docName = getDoctorName(apt.doctor_id);
      tbody.innerHTML += `
        <tr>
          <td>#${apt.id}</td>
          <td><strong>${apt.patient_name}</strong></td>
          <td>${apt.phone}</td>
          <td>${docName}</td>
          <td>${formatDate(apt.appointment_date)}</td>
          <td>${apt.appointment_time}</td>
          <td>${getStatusBadge(apt.status)}</td>
          <td>
            <button class="btn-action" onclick="openAptModal(${apt.id}, '${apt.status}', '${apt.notes || ''}')">Edit</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading appointments:', err);
  }
}

async function handleAptSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('apt_id').value;
  const status = document.getElementById('apt_status').value;
  const notes = document.getElementById('apt_notes').value;

  try {
    await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    closeModals();
    loadAppointments(); // Refresh current tab
    loadDashboardData(); // Update stats
  } catch (err) {
    console.error(err);
    alert('Failed to update appointment');
  }
}

// ---------- API Calls: Doctors ----------
async function loadDoctors() {
  try {
    const res = await fetch(`${API_BASE}/doctors`);
    doctorsCache = await res.json();
    
    const tbody = document.getElementById('doctors-body');
    tbody.innerHTML = '';

    doctorsCache.forEach(doc => {
      // Pass doc object carefully to modal (stringified)
      const docJson = JSON.stringify(doc).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
      
      tbody.innerHTML += `
        <tr>
          <td><strong>${doc.name}</strong><br><small class="text-muted">${doc.qualification}</small></td>
          <td>${doc.specialty}</td>
          <td>${doc.experience} years</td>
          <td>${doc.availability_days}<br><small class="text-muted">${doc.availability_time}</small></td>
          <td>${getStatusBadge(doc.status)}</td>
          <td>
            <button class="btn-action" onclick="openDoctorModal(JSON.parse('${docJson}'))">Edit</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

async function handleDoctorSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('doc_id').value;
  
  const payload = {
    name: document.getElementById('doc_name').value,
    qualification: document.getElementById('doc_qual').value,
    specialty: document.getElementById('doc_spec').value,
    experience: document.getElementById('doc_exp').value,
    availability_days: document.getElementById('doc_days').value,
    availability_time: document.getElementById('doc_time').value,
    status: document.getElementById('doc_status').value
  };

  try {
    if (id) {
      await fetch(`${API_BASE}/doctors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    closeModals();
    loadDoctors();
  } catch (err) {
    console.error(err);
    alert('Error saving doctor');
  }
}

// ---------- API Calls: Services ----------
async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/services`);
    const services = await res.json();
    
    const tbody = document.getElementById('services-body');
    tbody.innerHTML = '';

    services.forEach(serv => {
      tbody.innerHTML += `
        <tr>
          <td style="font-size:24px;">${serv.icon}</td>
          <td><strong>${serv.name}</strong></td>
          <td style="max-width:300px;">${serv.description}</td>
          <td>${getStatusBadge(serv.status)}</td>
          <td>
            <button class="btn-action">Edit (WIP)</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

function openServiceModal() {
  alert('Service modal implementation details pending. Core backend logic exists.');
}

// ---------- API Calls: Call Logs ----------
async function loadCallLogs() {
  try {
    const res = await fetch(`${API_BASE}/call-logs`);
    const logs = await res.json();
    
    const tbody = document.getElementById('calls-body');
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">No AI call logs found yet. Wait for Vapi/Sarvam integration.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const typeBadge = `<span class="badge ${log.call_type === 'incoming' ? 'badge-confirmed' : 'badge-pending'}">${log.call_type}</span>`;
      
      tbody.innerHTML += `
        <tr>
          <td>${formatTypeTime(log.created_at)}</td>
          <td><strong>${log.caller_phone}</strong></td>
          <td>${typeBadge}</td>
          <td>${log.duration} sec</td>
          <td>${log.action_taken || '-'}</td>
          <td style="max-width:250px; font-size:12px;">${log.summary}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}
