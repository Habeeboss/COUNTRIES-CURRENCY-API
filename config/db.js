const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

let pool;

async function initDb() {
  try {
    const sslConfig = await getSSLConfig();

    // Use Railway's provided database if available, otherwise use Aiven
    const dbConfig = {
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'my_countries_api_data',
      port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: sslConfig,
    };

    console.log('🔧 Database Configuration:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port
    });

    pool = mysql.createPool(dbConfig);

    // Test connection
    await pool.query("SELECT 1");
    console.log("✅ MySQL Connected Successfully");
    
    // Auto-create tables
    await createTables();
    
  } catch (error) {
    console.error("❌ MySQL Connection Failed:", error.message);
    console.error("Full error:", error);
    
    // Don't exit in production - let Railway handle retries
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
    throw error;
  }
}

async function getSSLConfig() {
  // For Railway + Aiven, we need SSL
  const possiblePaths = [
    process.env.SSL_CA_PATH,
    './aiven-ca.pem',
    '/etc/ssl/certs/ca-certificates.crt', // System certs
  ];

  for (const caPath of possiblePaths) {
    if (caPath && fs.existsSync(caPath)) {
      console.log(`✅ SSL CA certificate found at: ${caPath}`);
      return { ca: fs.readFileSync(caPath) };
    }
  }

  // For Railway's internal MySQL, SSL might not be needed
  if (process.env.MYSQLHOST && process.env.MYSQLHOST.includes('railway.internal')) {
    console.log("ℹ️  Using Railway internal MySQL - SSL not required");
    return null;
  }

  console.warn("⚠️ SSL CA certificate not found. This may fail for Aiven.");
  return null;
}

// ... rest of your db.js code remains the same
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

  try {
    for (const sql of tablesSQL) {
      await pool.query(sql);
    }
    console.log("✅ Database tables verified/created");
    
    // Verify tables
    const [tables] = await pool.query("SHOW TABLES");
    console.log("📊 Current tables:", tables.map(t => Object.values(t)[0]));
  } catch (error) {
    console.error("❌ Table creation failed:", error.message);
    throw error;
  }
}

function getPool() {
  if (!pool) throw new Error("Database not initialized. Call initDb() first.");
  return pool;
}

module.exports = { initDb, getPool };