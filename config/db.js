const mysql = require("mysql2/promise");

let pool;

async function initDb() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "my_countries_api_data",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await pool.query("SELECT 1");
    console.log("✅ MySQL Connected Successfully");
  } catch (error) {
    console.error("❌ MySQL Connection Failed:", error);
    process.exit(1);
  }
}

function getPool() {
  if (!pool) throw new Error("DB not initialized yet");
  return pool;
}

module.exports = { initDb, getPool };
