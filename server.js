const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const BACKUP_DIR = path.join(__dirname, 'backups');
const CREDENTIALS_FILE = path.join(__dirname, '.credentials.json');

// Ensure directories exist
[PUBLIC_DIR, DATA_DIR, UPLOADS_DIR, BACKUP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Credentials helper
function getCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    try { return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8')); } catch (e) {}
  }
  const defaultCreds = { username: 'admin', passwordHash: bcrypt.hashSync('admin', 10) };
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(defaultCreds, null, 2), 'utf8');
  console.log('[auth] Created default admin login (username: "admin", password: "admin").');
  return defaultCreds;
}

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jungle-agency-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));

// CSRF middleware
app.use((req, res, next) => {
  req.session.csrf = req.session.csrf || Math.random().toString(36).slice(2);
  res.locals.csrf = req.session.csrf;
  next();
});

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function checkCsrf(req, res, next) {
  const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
  if (!token || token !== req.session.csrf) return res.status(403).json({ error: 'Invalid CSRF token' });
  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm)$/i.test(file.originalname);
    cb(null, ok);
  }
});

// API Routes
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const creds = getCredentials();
  if (username === creds.username && bcrypt.compareSync(password, creds.passwordHash)) {
    req.session.user = username;
    req.session.csrf = Math.random().toString(36).slice(2);
    res.json({ ok: true, csrf: req.session.csrf });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user, csrf: req.session.csrf });
  } else {
    res.json({ user: null });
  }
});

app.get('/api/data', requireAuth, (req, res) => {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
  const data = {};
  files.forEach(f => {
    try { data[f] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f + '.json'), 'utf8')); } catch (e) {}
  });
  res.json({ files, data });
});

app.get('/api/data/:name', requireAuth, (req, res) => {
  const file = path.join(DATA_DIR, req.params.name + '.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});

app.put('/api/data/:name', requireAuth, checkCsrf, (req, res) => {
  const name = req.params.name;
  if (!/^[a-z0-9_-]+$/i.test(name)) return res.status(400).json({ error: 'Invalid name' });
  const file = path.join(DATA_DIR, name + '.json');
  const tmp = file + '.tmp';
  const backup = path.join(BACKUP_DIR, name + '.' + Date.now() + '.json');

  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, backup); } catch (e) {}
  }
  fs.writeFileSync(tmp, JSON.stringify(req.body, null, 2), 'utf8');
  fs.renameSync(tmp, file);

  // Sync JS fallback file for instant file:// opening
  try {
    const varMap = { site: 'JUNGLE_SITE', home: 'JUNGLE_HOME', about: 'JUNGLE_ABOUT', contact: 'JUNGLE_CONTACT', projects: 'JUNGLE_PROJECTS' };
    if (varMap[name]) {
      const jsFile = path.join(DATA_DIR, name + '.js');
      fs.writeFileSync(jsFile, 'window.' + varMap[name] + ' = ' + JSON.stringify(req.body, null, 2) + ';\n', 'utf8');
    }
  } catch (e) {}

  res.json({ ok: true });
});

app.get('/api/backups/:name', requireAuth, (req, res) => {
  const prefix = req.params.name + '.';
  const files = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR) : [];
  const backups = files
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .map(f => ({ file: f, time: parseInt(f.slice(prefix.length, -5), 10) }))
    .sort((a, b) => b.time - a.time);
  res.json(backups);
});

app.post('/api/restore/:name', requireAuth, checkCsrf, (req, res) => {
  const { file } = req.body || {};
  const src = path.join(BACKUP_DIR, file || '');
  const dst = path.join(DATA_DIR, req.params.name + '.json');
  if (!fs.existsSync(src)) return res.status(400).json({ error: 'Backup not found' });
  fs.copyFileSync(src, dst);
  res.json({ ok: true });
});

app.post('/api/upload', requireAuth, checkCsrf, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
  const target = path.join(UPLOADS_DIR, filename);
  fs.renameSync(req.file.path, target);
  res.json({ ok: true, path: 'uploads/' + filename, name: req.file.originalname });
});

app.post('/api/account/password', requireAuth, checkCsrf, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const creds = getCredentials();
  if (!bcrypt.compareSync(oldPassword, creds.passwordHash)) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }
  creds.passwordHash = bcrypt.hashSync(newPassword, 10);
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf8');
  res.json({ ok: true });
});

// Admin SPA static & catch-all
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Serve Public Agency Website
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, HOST, () => {
  console.log(`==================================================`);
  console.log(`Jungle. Agency Website: http://localhost:${PORT}`);
  console.log(`Jungle. CMS Admin:      http://localhost:${PORT}/admin`);
  console.log(`==================================================`);
});
