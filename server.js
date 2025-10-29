require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const countriesRouter = require('./routes/countries');
const { errorHandler } = require('./middleware/errorHandler');
const { initDb, getPool } = require('./config/db');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json());
app.use('/countries', countriesRouter);

// ✅ Correct DB Test Route
app.get("/test-db", async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT 1");
    res.json({ db: "connected", result: rows });
  } catch (err) {
    console.error("DB Test Error:", err);
    res.status(500).json({ error: "DB Error" });
  }
});

// ✅ Status Route
app.get('/status', async (req, res, next) => {
  try {
    const pool = getPool();
    const [countRows] = await pool.query('SELECT COUNT(*) as total_countries FROM countries');
    const [[metaRow]] = await pool.query('SELECT last_refreshed_at FROM meta WHERE id = 1');
    const last = metaRow ? new Date(metaRow.last_refreshed_at).toISOString() : null;
    res.json({ total_countries: countRows[0].total_countries, last_refreshed_at: last });
  } catch (err) {
    next(err);
  }
});

// ✅ Serve Stored Summary Image (optional task feature)
app.get('/countries/image', (req, res) => {
  const filePath = path.resolve((process.env.CACHE_DIR || './cache') + '/summary.png');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Summary image not found' });
  
  res.type('image/png').sendFile(filePath);
});

app.use(errorHandler);

// ✅ Start Server Only if Not Running Tests
if (require.main === module) {
  (async () => {
    try {
      await initDb();
      const cacheDir = process.env.CACHE_DIR || './cache';
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
    } catch (err) {
      console.error('❌ Failed to start:', err);
      process.exit(1);
    }
  })();
}

module.exports = app;
