const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

let pool;

async function initDb() {
  try {
    const config = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: true, // safer for production
      },
    };

    pool = mysql.createPool(config);

    await pool.query("SELECT 1");
    console.log("✅ Connected to Aiven MySQL successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

function getPool() {
  if (!pool) throw new Error("Database not initialized yet!");
  return pool;
}

module.exports = { initDb, getPool };
