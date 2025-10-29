const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

let pool;

async function initDb() {
  try {
    const sslConfig = await getSSLConfig();

    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'my_countries_api_data',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: sslConfig,
    });

    // Test connection
    await pool.query("SELECT 1");
    console.log("✅ MySQL Connected Successfully");
    
    // Auto-create tables
    await createTables();
    
  } catch (error) {
    console.error("❌ MySQL Connection Failed:", error.message);
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
    throw error;
  }
}

async function getSSLConfig() {
  const possiblePaths = [
    process.env.SSL_CA_PATH,
    './aiven-ca.pem',
    './ca.pem',
    path.join(__dirname, 'aiven-ca.pem'),
    path.join(__dirname, 'ca.pem'),
  ];

  for (const caPath of possiblePaths) {
    if (caPath && fs.existsSync(caPath)) {
      console.log(`✅ SSL CA certificate found at: ${caPath}`);
      return { ca: fs.readFileSync(caPath) };
    }
  }

  console.warn("⚠️ SSL CA certificate not found. Connecting without SSL...");
  return null;
}

async function createTables() {
  const tablesSQL = [
    `CREATE TABLE IF NOT EXISTS countries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      name_normalized VARCHAR(255) NOT NULL,
      capital VARCHAR(255),
      region VARCHAR(255),
      population BIGINT NOT NULL,
      currency_code VARCHAR(10),
      exchange_rate DECIMAL(15,6),
      estimated_gdp DECIMAL(20,2),
      flag_url TEXT,
      last_refreshed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_name_normalized (name_normalized)
    )`,
    
    `CREATE TABLE IF NOT EXISTS meta (
      id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
      last_refreshed_at DATETIME
    )`,
    
    `INSERT IGNORE INTO meta (id, last_refreshed_at) VALUES (1, NOW())`
  ];

const [tables] = await pool.query("SHOW TABLES");
console.log("📊 Current tables:", tables.map(t => Object.values(t)[0]));

  try {
    // Execute each SQL statement separately
    for (const sql of tablesSQL) {
      await pool.query(sql);
      console.log(`✅ Executed: ${sql.split('(')[0]}...`);
    }
    console.log("✅ All database tables verified/created");
  } catch (error) {
    console.error("❌ Table creation failed:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}

function getPool() {
  if (!pool) throw new Error("Database not initialized. Call initDb() first.");
  return pool;
}

module.exports = { initDb, getPool };