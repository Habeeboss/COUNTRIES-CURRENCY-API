const mysql = require("mysql2/promise");
require("dotenv").config();

let pool;

async function initDb() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
      user: process.env.DB_USER || process.env.MYSQLUSER || "root",
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || "my_countries_api_data",
      port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test the connection
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
