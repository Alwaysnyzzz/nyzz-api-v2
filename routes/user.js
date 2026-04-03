const router = require('express').Router();
const pool   = require('../utils/db');
const { authJWT } = require('../middleware/auth');

// GET /user/stats
router.get('/stats', async (req, res) => {
  try {
    const { rows: total } = await pool.query('SELECT COUNT(*) as count FROM api_usage');
    const { rows: users } = await pool.query('SELECT COUNT(*) as count FROM users');
    const { rows: today } = await pool.query(
      "SELECT SUM(count) as count FROM daily_usage WHERE date=CURRENT_DATE"
    );
    res.json({
      status: 'sukses',
      data: {
        total_requests: parseInt(total[0].count),
        total_users:    parseInt(users[0].count),
        today_requests: parseInt(today[0].count || 0)
      }
    });
  } catch(e) { res.status(500).json({ status:'error', message: e.message }); }
});

module.exports = router;
