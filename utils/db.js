const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        username    VARCHAR(64) UNIQUE NOT NULL,
        email       VARCHAR(128) UNIQUE NOT NULL,
        password    VARCHAR(256) NOT NULL,
        api_key     VARCHAR(64) UNIQUE NOT NULL,
        sign_key    VARCHAR(64) UNIQUE NOT NULL,
        plan        VARCHAR(16) DEFAULT 'free',
        daily_limit INT DEFAULT 1000,
        created_at  TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_usage (
        id         SERIAL PRIMARY KEY,
        user_id    INT REFERENCES users(id) ON DELETE CASCADE,
        endpoint   VARCHAR(128),
        used_at    TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_usage (
        id       SERIAL PRIMARY KEY,
        user_id  INT REFERENCES users(id) ON DELETE CASCADE,
        date     DATE DEFAULT CURRENT_DATE,
        count    INT DEFAULT 0,
        UNIQUE(user_id, date)
      );
    `);
    console.log('✓ Database tables ready');
  } finally {
    client.release();
  }
}

initDB().catch(console.error);

module.exports = pool;
