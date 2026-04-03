const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const pool    = require('../utils/db');

function genKey(prefix = 'nyzz') {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ status: 'error', message: 'username, email, password wajib diisi' });
  if (password.length < 6)
    return res.status(400).json({ status: 'error', message: 'Password minimal 6 karakter' });
  try {
    const hash    = await bcrypt.hash(password, 10);
    const apiKey  = genKey('nyzz');
    const signKey = genKey('sign');
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password, api_key, sign_key)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, username, email, api_key, sign_key, plan, daily_limit, created_at`,
      [username.toLowerCase(), email.toLowerCase(), hash, apiKey, signKey]
    );
    const user  = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ status: 'sukses', message: 'Registrasi berhasil!', token, user });
  } catch (e) {
    if (e.code === '23505') {
      const field = e.detail.includes('email') ? 'Email' : 'Username';
      return res.status(409).json({ status: 'error', message: `${field} sudah digunakan` });
    }
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { login, password } = req.body; // login = email atau username
  if (!login || !password)
    return res.status(400).json({ status: 'error', message: 'Login dan password wajib diisi' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email=$1 OR username=$1', [login.toLowerCase()]
    );
    if (!rows.length)
      return res.status(401).json({ status: 'error', message: 'Akun tidak ditemukan' });
    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ status: 'error', message: 'Password salah' });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ status: 'sukses', message: 'Login berhasil!', token, user: safeUser });
  } catch {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// GET /auth/me  (butuh token)
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ status: 'error', message: 'Token diperlukan' });
  try {
    const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id,username,email,api_key,sign_key,plan,daily_limit,created_at FROM users WHERE id=$1', [id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });

    // Usage hari ini
    const { rows: usage } = await pool.query(
      'SELECT count FROM daily_usage WHERE user_id=$1 AND date=CURRENT_DATE', [id]
    );
    const today = usage[0]?.count || 0;

    res.json({ status: 'sukses', user: rows[0], usage: { today, limit: rows[0].daily_limit } });
  } catch {
    res.status(401).json({ status: 'error', message: 'Token tidak valid' });
  }
});

// POST /auth/regen-apikey
router.post('/regen-apikey', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ status: 'error', message: 'Token diperlukan' });
  try {
    const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const newKey = genKey('nyzz');
    await pool.query('UPDATE users SET api_key=$1 WHERE id=$2', [newKey, id]);
    res.json({ status: 'sukses', message: 'API Key berhasil dibuat ulang', api_key: newKey });
  } catch {
    res.status(401).json({ status: 'error', message: 'Token tidak valid' });
  }
});

// POST /auth/regen-signkey
router.post('/regen-signkey', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ status: 'error', message: 'Token diperlukan' });
  try {
    const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const newKey = genKey('sign');
    await pool.query('UPDATE users SET sign_key=$1 WHERE id=$2', [newKey, id]);
    res.json({ status: 'sukses', message: 'Sign Key berhasil dibuat ulang', sign_key: newKey });
  } catch {
    res.status(401).json({ status: 'error', message: 'Token tidak valid' });
  }
});

module.exports = router;
