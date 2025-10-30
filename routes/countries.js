const express = require("express");
const router = express.Router();
const countryService = require("../services/countryService");
const { getPool } = require("../config/db");
const fs = require("fs");
const path = require("path");
router.get("/refresh", async (req, res) => {
  try {
    const result = await countryService.fetchAndSaveCountries();
    res.json({ updated: result.updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 

router.post("/refresh-test", async (req, res) => {
  console.log('🔄 Refresh test endpoint called');
  res.json({
    message: 'Refresh test endpoint working',
    timestamp: new Date().toISOString(),
  });
});

router.get("/status", async (req, res) => {
  try {
    const status = await countryService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.get("/image", (req, res) => {
  const cacheDir = process.env.CACHE_DIR || './cache';
  const filePath = path.resolve(path.join(cacheDir, 'summary.png'));
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Summary image not found' });
  }
  
  res.type('image/png').sendFile(filePath);
});

router.get("/gdp/top", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const topCountries = await countryService.getTopCountries(limit);
    res.json(topCountries);
  } catch (error) {
    console.error('Top countries error:', error);
    res.status(500).json({ error: 'Failed to fetch top countries' });
  }
});

// Dynamic routes last
router.get("/:name", async (req, res) => {
  try {
    const country = await countryService.getCountryByName(req.params.name);
    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(country);
  } catch (error) {
    console.error('Get country error:', error);
    res.status(500).json({ error: 'Failed to fetch country' });
  }
});

// List / filter countries
router.get("/", async (req, res) => {
  try {
    const filters = {
      region: req.query.region,
      currency: req.query.currency,
      min_population: req.query.min_population,
      max_population: req.query.max_population,
      sort: req.query.sort
    };
    
    const countries = await countryService.getAllCountries(filters);
    res.json(countries);
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// Refresh countries from API
router.post("/refresh", async (req, res) => {
  console.log(' Refresh endpoint called at:', new Date().toISOString());
  try {
    const result = await countryService.fetchAndSaveCountries();
    console.log(` Refresh completed successfully: ${result.updated} countries updated`);
    res.json({ updated: result.updated });
  } catch (error) {
    console.error(' Refresh process failed:', error.message);
    res.status(500).json({
      error: 'Failed to refresh countries',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Add a new country
router.post("/add", async (req, res) => {
  try {
    const pool = getPool();
    const { name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url } = req.body;
    
    if (!name || !population) {
      return res.status(400).json({ error: 'Name and population are required' });
    }
    
    await pool.execute(
      `INSERT INTO countries 
       (name, name_normalized, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
       capital=?, region=?, population=?, currency_code=?, exchange_rate=?, estimated_gdp=?, flag_url=?, last_refreshed_at=NOW()`,
      [
        name, name.toLowerCase(), capital, region, population,
        currency_code, exchange_rate, estimated_gdp, flag_url,
        capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url
      ]
    );
    
    res.json({ message: `Country ${name} added/updated successfully` });
  } catch (error) {
    console.error('Add country error:', error);
    res.status(500).json({ error: 'Failed to add country' });
  }
});

// Delete a country
router.delete("/:name", async (req, res) => {
  try {
    const deleted = await countryService.deleteCountry(req.params.name);
    if (!deleted) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json({ message: `Country ${req.params.name} deleted successfully` });
  } catch (error) {
    console.error('Delete country error:', error);
    res.status(500).json({ error: 'Failed to delete country' });
  }
});

module.exports = router;
