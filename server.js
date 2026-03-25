require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const { AccessToken } = require('livekit-server-sdk');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- LiveKit Configuration ----------
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'APIzHJSnWvqVcm8';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'your_livekit_secret_here';

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---------- LiveKit Token Endpoint ----------
app.get('/api/livekit-token', (req, res) => {
  const roomName = req.query.room || 'lifeline-main';
  const participantName = req.query.name || 'Patient-' + Math.floor(Math.random() * 1000);

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
  });
  
  at.addGrant({ 
    roomJoin: true, 
    room: roomName,
    canPublish: true,
    canSubscribe: true 
  });

  res.json({ 
    token: at.toJwt(),
    url: process.env.LIVEKIT_URL || 'wss://your-project.livekit.cloud'
  });
});

// ---------- Database Setup ----------
const db = new Database(path.join(__dirname, 'lifeline.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    qualification TEXT NOT NULL,
    specialty TEXT NOT NULL,
    experience INTEGER NOT NULL,
    availability_days TEXT NOT NULL,
    availability_time TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT '🏥',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caller_phone TEXT NOT NULL,
    call_type TEXT DEFAULT 'incoming',
    duration INTEGER DEFAULT 0,
    summary TEXT DEFAULT '',
    action_taken TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ---------- Seed Data ----------
const doctorCount = db.prepare('SELECT COUNT(*) as count FROM doctors').get().count;
if (doctorCount === 0) {
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (name, qualification, specialty, experience, availability_days, availability_time, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const doctors = [
    ['Dr. Rajesh Sharma', 'MBBS, MD (Cardiology), FACC', 'Cardiology', 18, 'Mon–Sat', '10:00 AM – 4:00 PM', 'images/doctor-1.png'],
    ['Dr. Priya Deshmukh', 'MBBS, MS (Gynaecology)', 'Gynecology', 12, 'Mon–Fri', '11:00 AM – 5:00 PM', 'images/doctor-2.png'],
    ['Dr. Anil Patil', 'MBBS, MS (Orthopaedics)', 'Orthopedics', 20, 'Mon–Sat', '9:00 AM – 2:00 PM', ''],
    ['Dr. Sneha Kulkarni', 'MBBS, MD (Dermatology)', 'Dermatology', 8, 'Tue–Sat', '12:00 PM – 6:00 PM', ''],
    ['Dr. Vikram Joshi', 'MBBS, MD (Paediatrics)', 'Pediatrics', 14, 'Mon–Fri', '10:00 AM – 3:00 PM', ''],
    ['Dr. Suresh Mehta', 'MBBS, MD (General Medicine)', 'General Medicine', 22, 'Mon–Sat', '8:00 AM – 1:00 PM', '']
  ];

  doctors.forEach(d => insertDoctor.run(...d));
  console.log('✅ Seeded 6 doctors');
}

const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
if (serviceCount === 0) {
  const insertService = db.prepare('INSERT INTO services (name, description, icon) VALUES (?, ?, ?)');
  const services = [
    ['ICU', '24/7 intensive care with advanced monitoring', '🏨'],
    ['General Ward', 'Comfortable rooms with round-the-clock nursing', '🛏️'],
    ['Operation Theatre', 'State-of-the-art modular OTs for surgeries', '🔬'],
    ['X-Ray & Imaging', 'Digital X-ray, ultrasound, and CT scan', '📷'],
    ['Pathology Lab', 'In-house lab for blood tests and diagnostics', '🧪'],
    ['Pharmacy', '24-hour pharmacy with all medicines available', '💊'],
    ['Ambulance', 'GPS-equipped ambulances for quick response', '🚑']
  ];
  services.forEach(s => insertService.run(...s));
  console.log('✅ Seeded 7 services');
}

// ==========================================
//  API ROUTES
// ==========================================

// ---------- DOCTORS ----------
app.get('/api/doctors', (req, res) => {
  const doctors = db.prepare('SELECT * FROM doctors WHERE status = ? ORDER BY name').all('active');
  res.json(doctors);
});

app.get('/api/doctors/:id', (req, res) => {
  const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json(doctor);
});

app.post('/api/doctors', (req, res) => {
  const { name, qualification, specialty, experience, availability_days, availability_time, image_url } = req.body;
  if (!name || !qualification || !specialty) {
    return res.status(400).json({ error: 'Name, qualification, and specialty are required' });
  }
  const result = db.prepare(`
    INSERT INTO doctors (name, qualification, specialty, experience, availability_days, availability_time, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, qualification, specialty, experience || 0, availability_days || '', availability_time || '', image_url || '');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Doctor added successfully' });
});

app.put('/api/doctors/:id', (req, res) => {
  const { name, qualification, specialty, experience, availability_days, availability_time, image_url, status } = req.body;
  db.prepare(`
    UPDATE doctors SET name=?, qualification=?, specialty=?, experience=?, availability_days=?, availability_time=?, image_url=?, status=?
    WHERE id=?
  `).run(name, qualification, specialty, experience, availability_days, availability_time, image_url || '', status || 'active', req.params.id);
  res.json({ message: 'Doctor updated successfully' });
});

app.delete('/api/doctors/:id', (req, res) => {
  db.prepare('UPDATE doctors SET status = ? WHERE id = ?').run('inactive', req.params.id);
  res.json({ message: 'Doctor removed' });
});

// ---------- APPOINTMENTS ----------
app.get('/api/appointments', (req, res) => {
  let query = 'SELECT * FROM appointments ORDER BY created_at DESC';
  const params = [];

  if (req.query.date) {
    query = 'SELECT * FROM appointments WHERE appointment_date = ? ORDER BY appointment_time';
    params.push(req.query.date);
  }

  if (req.query.status) {
    query = 'SELECT * FROM appointments WHERE status = ? ORDER BY created_at DESC';
    params.push(req.query.status);
  }

  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const { name, phone, doctor, date, time } = req.body;
  if (!name || !phone || !doctor || !date || !time) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const result = db.prepare(`
    INSERT INTO appointments (patient_name, phone, doctor_id, appointment_date, appointment_time)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, phone, doctor, date, time);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Appointment booked successfully' });
});

app.put('/api/appointments/:id', (req, res) => {
  const { status, notes } = req.body;
  db.prepare('UPDATE appointments SET status=?, notes=? WHERE id=?').run(status, notes || '', req.params.id);
  res.json({ message: 'Appointment updated' });
});

// ---------- SERVICES ----------
app.get('/api/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE status = ? ORDER BY name').all('active');
  res.json(services);
});

app.post('/api/services', (req, res) => {
  const { name, description, icon } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }
  const result = db.prepare('INSERT INTO services (name, description, icon) VALUES (?, ?, ?)').run(name, description, icon || '🏥');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Service added' });
});

app.put('/api/services/:id', (req, res) => {
  const { name, description, icon, status } = req.body;
  db.prepare('UPDATE services SET name=?, description=?, icon=?, status=? WHERE id=?').run(name, description, icon, status || 'active', req.params.id);
  res.json({ message: 'Service updated' });
});

app.delete('/api/services/:id', (req, res) => {
  db.prepare('UPDATE services SET status = ? WHERE id = ?').run('inactive', req.params.id);
  res.json({ message: 'Service removed' });
});

// ---------- CALL LOGS ----------
app.get('/api/call-logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 50').all();
  res.json(logs);
});

app.post('/api/call-logs', (req, res) => {
  const { caller_phone, call_type, duration, summary, action_taken } = req.body;
  const result = db.prepare(`
    INSERT INTO call_logs (caller_phone, call_type, duration, summary, action_taken)
    VALUES (?, ?, ?, ?, ?)
  `).run(caller_phone, call_type || 'incoming', duration || 0, summary || '', action_taken || '');
  res.status(201).json({ id: result.lastInsertRowid });
});

// ---------- DASHBOARD STATS ----------
app.get('/api/stats', (req, res) => {
  const totalAppointments = db.prepare('SELECT COUNT(*) as count FROM appointments').get().count;
  const todayAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = date('now')").get().count;
  const totalDoctors = db.prepare("SELECT COUNT(*) as count FROM doctors WHERE status = 'active'").get().count;
  const pendingAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'").get().count;
  const totalCalls = db.prepare('SELECT COUNT(*) as count FROM call_logs').get().count;

  res.json({
    totalAppointments,
    todayAppointments,
    totalDoctors,
    pendingAppointments,
    totalCalls
  });
});

// ---------- Serve frontend ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`\n🏥 LifeLine Hospital Server running at http://localhost:${PORT}`);
  console.log(`📋 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`📡 API: http://localhost:${PORT}/api/doctors\n`);
});
