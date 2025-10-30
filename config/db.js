const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

let pool;

async function initDb() {
  try {
    console.log(' Initializing database connection...');
    console.log(' Available Environment Variables:');
    console.log('- MYSQLHOST:', process.env.MYSQLHOST || 'NOT SET');
    console.log('- MYSQLUSER:', process.env.MYSQLUSER || 'NOT SET');
    console.log('- MYSQLDATABASE:', process.env.MYSQLDATABASE || 'NOT SET');
    console.log('- MYSQLPORT:', process.env.MYSQLPORT || 'NOT SET');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('- DB_HOST:', process.env.DB_HOST || 'NOT SET');
    
    const dbConfig = getDbConfig();
    const sslConfig = await getSSLConfig(dbConfig.host);

    console.log('🔧 Final Database Configuration:');

    pool = mysql.createPool({ ...dbConfig, ssl: sslConfig });

    await pool.query("SELECT 1");
    console.log(" MySQL Connected Successfully");
   
    await createTables();
    
  } catch (error) {
    console.error(" MySQL Connection Failed:", error.message);
    
    console.log('\n SOLUTION REQUIRED:');
    console.log('1. Go to Railway dashboard');
    console.log('2. Click "New Service"');
    console.log('3. Select "MySQL"');
    console.log('4. Wait 2-3 minutes for provisioning');
    console.log('5. Your app will auto-redeploy and connect');
    
    throw error;
  }
}

function getDbConfig() {
  // Priority 1: Railway MySQL service variables
  if (process.env.MYSQLHOST) {
    return {
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  // Priority 2: Custom DB_* variables
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'my_countries_api_data',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  // Priority 3: DATABASE_URL
  if (process.env.DATABASE_URL) {
    return parseDatabaseUrl(process.env.DATABASE_URL);
  }

  // Fallback (will fail in production)
  console.log('  No database configuration found. Using localhost fallback (will fail in production)');
  return {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'my_countries_api_data',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

function parseDatabaseUrl(databaseUrl) {
  try {
  
    const urlString = databaseUrl.replace(/^mysql:\/\//, '');
    const [auth, hostPortDatabase] = urlString.split('@');
    const [user, password] = auth.split(':');
    const [hostPort, database] = hostPortDatabase.split('/');
    const [host, port] = hostPort.split(':');
    
    return {
      host: host,
      port: port || 3306,
      user: user,
      password: password,
      database: database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  } catch (error) {
    console.error(' Error parsing DATABASE_URL:', error);
    throw new Error('Invalid DATABASE_URL format');
  }
}

async function getSSLConfig(host) {
  // No SSL needed for Railway MySQL
  if (host && (host.includes('railway.app') || host.includes('railway.internal'))) {
    console.log(" Using Railway MySQL - SSL not required");
    return null;
  }

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

  try {
    for (const sql of tablesSQL) {
      await pool.query(sql);
    }
    console.log(" Database tables verified/created");
    
    const [tables] = await pool.query("SHOW TABLES");
    console.log(" Current tables:", tables.map(t => Object.values(t)[0]));
  } catch (error) {
    console.error(" Table creation failed:", error.message);
    throw error;
  }
}

function getPool() {
  if (!pool) throw new Error("Database not initialized. Call initDb() first.");
  return pool;
}

module.exports = { initDb, getPool };