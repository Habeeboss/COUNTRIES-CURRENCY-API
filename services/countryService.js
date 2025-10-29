const axios = require("axios");
const { getPool } = require("../config/db");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

function normalizeName(name) {
  return name.toLowerCase().trim();
}

async function fetchExternalData() {
  const timeout = Number(process.env.EXTERNAL_TIMEOUT_MS || 10000);
  try {
    const [countryRes, rateRes] = await Promise.all([
      axios.get(
        "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies",
        { timeout }
      ),
      axios.get("https://open.er-api.com/v6/latest/USD", { timeout })
    ]);

    return {
      countries: countryRes.data,
      rates: rateRes.data.rates
    };
  } catch (err) {
    const error = new Error("External data source unavailable");
    error.status = 503;
    const apiName = err?.config?.url?.includes("restcountries.com")
      ? "Countries API"
      : err?.config?.url?.includes("er-api.com")
      ? "Exchange Rates API"
      : "External API";
    error.details = `Could not fetch data from ${apiName}`;
    throw error;
  }
}

function randomMultiplier() {
  return Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
}

async function saveCountries(countries, rates) {
  const pool = getPool();
  const now = new Date();
  
  let count = 0;
  const batchSize = 25;

  for (let i = 0; i < countries.length; i += batchSize) {
    const batch = countries.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(countries.length/batchSize)}`);
    
    const batchPromises = batch.map(async (c) => {
      if (!c.name || !c.population) return null;

      const normalized = normalizeName(c.name);
      const capital = c.capital || null;
      const region = c.region || null;
      const population = c.population;

      let currencyCode = null;
      let exchangeRate = null;
      let estimatedGdp = 0;

      if (c.currencies && c.currencies.length > 0) {
        currencyCode = c.currencies[0].code;
        if (currencyCode && rates[currencyCode] != null && rates[currencyCode] !== 0) {
          exchangeRate = rates[currencyCode];
          const multiplier = randomMultiplier();
          estimatedGdp = (population * multiplier) / exchangeRate;
        }
      }

      const sql = `
        INSERT INTO countries 
        (name, name_normalized, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          capital = VALUES(capital),
          region = VALUES(region),
          population = VALUES(population),
          currency_code = VALUES(currency_code),
          exchange_rate = VALUES(exchange_rate),
          estimated_gdp = VALUES(estimated_gdp),
          flag_url = VALUES(flag_url),
          last_refreshed_at = VALUES(last_refreshed_at),
          updated_at = CURRENT_TIMESTAMP
      `;

      try {
        await pool.query(sql, [
          c.name, normalized, capital, region, population,
          currencyCode, exchangeRate, estimatedGdp, c.flag || null, now
        ]);
        return true;
      } catch (error) {
        console.error(` Error processing ${c.name}:`, error.message);
        return false;
      }
    });

    const results = await Promise.allSettled(batchPromises);
    count += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  }

  await pool.query("UPDATE meta SET last_refreshed_at = ? WHERE id = 1", [now]);

  await generateSummaryImage();

  return count;
}

async function quickRefresh() {
  const pool = getPool();
  const now = new Date();
  
  try {
    console.log('⚡ Starting quick refresh (exchange rates only)...');
    
  
    const rateRes = await axios.get("https://open.er-api.com/v6/latest/USD", { 
      timeout: Number(process.env.EXTERNAL_TIMEOUT_MS || 10000) 
    });
    const rates = rateRes.data.rates;
    

    const [countries] = await pool.query("SELECT id, name, population, currency_code FROM countries");
    
    let updatedCount = 0;
    const batchSize = 50; 
    
    for (let i = 0; i < countries.length; i += batchSize) {
      const batch = countries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (country) => {
        let exchangeRate = null;
        let estimatedGdp = 0;
        
        if (country.currency_code && rates[country.currency_code] != null && rates[country.currency_code] !== 0) {
          exchangeRate = rates[country.currency_code];
          const multiplier = randomMultiplier();
          estimatedGdp = (country.population * multiplier) / exchangeRate;
        }
        
        try {
          await pool.execute(
            'UPDATE countries SET exchange_rate = ?, estimated_gdp = ?, last_refreshed_at = ? WHERE id = ?',
            [exchangeRate, estimatedGdp, now, country.id]
          );
          return true;
        } catch (error) {
          console.error(` Error updating ${country.name}:`, error.message);
          return false;
        }
      });
      
      const results = await Promise.allSettled(batchPromises);
      updatedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      
      console.log(`⚡ Quick refresh batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(countries.length/batchSize)} completed`);
    }
    
    // Update meta table
    await pool.query("UPDATE meta SET last_refreshed_at = ? WHERE id = 1", [now]);
    
    console.log(` Quick refresh completed: ${updatedCount} countries updated`);
    return { updated: updatedCount };
    
  } catch (error) {
    console.error(' Quick refresh failed:', error.message);
    throw error;
  }
}

async function generateSummaryImage() {
  try {
    const pool = getPool();
    const [[{ total_countries }]] = await pool.query("SELECT COUNT(*) as total_countries FROM countries");
    const [topCountries] = await pool.query(
      "SELECT name, estimated_gdp FROM countries ORDER BY estimated_gdp DESC LIMIT 5"
    );
    const [[{ last_refreshed_at }]] = await pool.query("SELECT last_refreshed_at FROM meta WHERE id = 1");

    const width = 800, height = 700;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#000";
    ctx.font = "bold 24px Arial";
    ctx.fillText(`Total countries: ${total_countries}`, 50, 50);
    ctx.fillText(`Last refreshed: ${new Date(last_refreshed_at).toISOString()}`, 50, 90);

    ctx.fillText(`Top 5 countries by GDP:`, 50, 130);
    topCountries.forEach((c, i) => {
      const gdp = Number(c.estimated_gdp) || 0;
      ctx.fillText(`${i + 1}. ${c.name} - ${gdp.toFixed(2)}`, 50, 170 + i * 40);
    });

    const cacheDir = path.join(__dirname, "../cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const outPath = path.join(cacheDir, "summary.png");
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    
    console.log(" Summary image generated");
  } catch (error) {
    console.error(" Error generating summary image:", error.message);
  }
}

// Exports
async function fetchAndSaveCountries() {
  try {
    const { countries, rates } = await fetchExternalData();
    const count = await saveCountries(countries, rates);
    return { updated: count };
  } catch (error) {
    console.error(" fetchAndSaveCountries error:", error.message);
    throw error;
  }
}

async function getAllCountries(filters = {}) {
  const pool = getPool();
  let sql = "SELECT * FROM countries WHERE 1=1";
  const params = [];

  if (filters.region) {
    sql += " AND region = ?";
    params.push(filters.region);
  }

  if (filters.currency) {
    sql += " AND currency_code = ?";
    params.push(filters.currency);
  }

  if (filters.min_population) {
    sql += " AND population >= ?";
    params.push(Number(filters.min_population));
  }

  if (filters.max_population) {
    sql += " AND population <= ?";
    params.push(Number(filters.max_population));
  }

  if (filters.sort) {
    const allowed = ["estimated_gdp", "population", "name"];
    if (allowed.includes(filters.sort)) sql += ` ORDER BY ${filters.sort} DESC`;
  }

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getCountryByName(name) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM countries WHERE name_normalized = ?",
    [normalizeName(name)]
  );
  return rows[0] || null;
}

async function deleteCountry(name) {
  const pool = getPool();
  const [result] = await pool.query(
    "DELETE FROM countries WHERE name_normalized = ?",
    [normalizeName(name)]
  );
  return result.affectedRows > 0;
}

async function getStatus() {
  const pool = getPool();
  const [[{ total_countries }]] = await pool.query("SELECT COUNT(*) as total_countries FROM countries");
  const [[{ last_refreshed_at }]] = await pool.query("SELECT last_refreshed_at FROM meta WHERE id = 1");
  return { total_countries, last_refreshed_at };
}

async function getTopCountries(limit = 5) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM countries ORDER BY estimated_gdp DESC LIMIT ?",
    [limit]
  );
  return rows;
}

module.exports = {
  fetchAndSaveCountries,
  getAllCountries,
  getCountryByName,
  deleteCountry,
  getStatus,
  getTopCountries,
  generateSummaryImage,
  quickRefresh 
};