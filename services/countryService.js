// services/countryService.js
const axios = require("axios");
const { getPool } = require("../config/db");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas"); // npm i canvas

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
  let count = 0;

  for (const c of countries) {
    const name = c.name;
    if (!name || !c.population) continue;

    const normalized = normalizeName(name);
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
  } else {
    exchangeRate = null;
    estimatedGdp = 0;
  }
} else {
  currencyCode = null;
  exchangeRate = null;
  estimatedGdp = 0; 
}


    await pool.query(sql, [
      name,
      normalized,
      capital,
      region,
      population,
      currencyCode,
      exchangeRate,
      estimatedGdp,
      c.flag || null,
      now
    ]);
    count++;
  }

  await pool.query("UPDATE meta SET last_refreshed_at = ? WHERE id = 1", [now]);

  // Ensure cache directory exists and generate summary image
  const cacheDir = path.join(__dirname, "../cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  await generateSummaryImage();

  return count;
}

async function generateSummaryImage() {
  const pool = getPool();
  const [[{ total_countries }]] = await pool.query("SELECT COUNT(*) as total_countries FROM countries");
  const [topCountries] = await pool.query(
    "SELECT name, estimated_gdp FROM countries ORDER BY estimated_gdp DESC LIMIT 5"
  );
  const [[{ last_refreshed_at }]] = await pool.query("SELECT last_refreshed_at FROM meta WHERE id = 1");

  console.log("Top 5 GDPs after refresh:");
  topCountries.forEach(c => console.log(c.name, c.estimated_gdp));

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
}

// Exports
async function fetchAndSaveCountries() {
  const { countries, rates } = await fetchExternalData();
  const count = await saveCountries(countries, rates);
  return { updated: count };
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


// Get top countries by GDP
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
  generateSummaryImage 
};

