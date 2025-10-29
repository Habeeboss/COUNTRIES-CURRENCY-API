const countryService = require("../services/countryService");
const fs = require("fs");
const path = require("path");

exports.refreshCountries = async (req, res) => {
  try {
    const result = await countryService.fetchAndSaveCountries();
    return res.json(result);
  } catch (error) {
    console.error(error);
    if (error.status === 503) {
      return res.status(503).json({
        error: "External data source unavailable",
        details: error.details || "Could not fetch data from external API",
      });
    }
    return res.status(500).json({ error: "Failed to refresh countries" });
  }
};

exports.getAllCountries = async (req, res) => {
  try {
    const filters = {
      region: req.query.region,
      currency: req.query.currency,
      sort: req.query.sort,
      min_population: req.query.min_population,
      max_population: req.query.max_population,
    };
    const rows = await countryService.getAllCountries(filters);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getCountryByName = async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) return res.status(400).json({ error: "Country name required in path" });

    const data = await countryService.getCountryByName(name);
    if (!data) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteCountry = async (req, res) => {
  try {
    const name = req.params.name;
    const ok = await countryService.deleteCountry(name);
    if (!ok) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json({ message: "Country deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const status = await countryService.getStatus();
    res.json({
      total_countries: Number(status.total_countries || 0),
      last_refreshed_at: status.last_refreshed_at
        ? new Date(status.last_refreshed_at).toISOString()
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getSummaryImage = (req, res) => {
  try {
    const imagePath = path.join(__dirname, "../cache/summary.png");
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Summary image not found" });
    }
    res.setHeader("Content-Type", "image/png");
    res.sendFile(imagePath);
  } catch (err) {
    console.error("Error serving summary image:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getTopCountries = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const topCountries = await countryService.getTopCountries(limit);
    res.json(topCountries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.addCountry = async (req, res) => {
  try {
    const {
      name,
      capital,
      region,
      population,
      currency_code,
      exchange_rate,
      estimated_gdp,
      flag_url,
    } = req.body;

    if (!name || !population) {
      return res.status(400).json({ error: "Name and population are required" });
    }

    const pool = require("../config/db").getPool();
    const normalized = name.toLowerCase().trim();
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

    await pool.query(sql, [
      name,
      normalized,
      capital || null,
      region || null,
      population,
      currency_code || null,
      exchange_rate || null,
      estimated_gdp || 0,
      flag_url || null,
      now,
    ]);

    const countryService = require("../services/countryService");
    await countryService.generateSummaryImage();

    res.json({ message: `Country ${name} added/updated successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add country" });
  }
};
