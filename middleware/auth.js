const jwt  = require('jsonwebtoken');
const pool = require('../utils/db');

// ── JWT AUTH ─────────────────────────────────
function authJWT(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ status: 'error', message: 'Token diperlukan' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Token tidak valid' });
  }
}

// ── API KEY RATE LIMITER ──────────────────────
async function apiKeyLimit(req, res, next) {
  const apiKey = req.query.apikey || req.headers['x-api-key'];
  if (!apiKey)
    return res.status(401).json({ status: 'error', message: 'API key diperlukan. Daftar di docs.nyzz.my.id' });

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, daily_limit, plan FROM users WHERE api_key = $1', [apiKey]
    );
    if (!rows.length)
      return res.status(401).json({ status: 'error', message: 'API key tidak valid' });

    const user = rows[0];

    // Upsert daily usage
    await client.query(`
      INSERT INTO daily_usage (user_id, date, count)
      VALUES ($1, CURRENT_DATE, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET count = daily_usage.count + 1
    `, [user.id]);

    const { rows: usage } = await client.query(
      'SELECT count FROM daily_usage WHERE user_id=$1 AND date=CURRENT_DATE', [user.id]
    );
    const todayCount = usage[0]?.count || 0;

    if (todayCount > user.daily_limit) {
      return res.status(429).json({
        status: 'error',
        message: `Limit harian tercapai (${user.daily_limit} request/hari). Upgrade ke Premium di docs.nyzz.my.id`,
        limit: user.daily_limit,
        used: todayCount,
        reset: 'Besok 00:00 WIB'
      });
    }

    // Log usage
    await client.query(
      'INSERT INTO api_usage (user_id, endpoint) VALUES ($1, $2)',
      [user.id, req.path]
    );

    req.apiUser = user;
    res.setHeader('X-RateLimit-Limit',     user.daily_limit);
    res.setHeader('X-RateLimit-Remaining', user.daily_limit - todayCount);
    next();
  } finally {
    client.release();
  }
}

module.exports = { authJWT, apiKeyLimit };
