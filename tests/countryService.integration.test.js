const countryService = require('../services/countryService');
const { pool } = require('../config/db');

describe('countryService.fetchAndSaveCountries integration', () => {
  jest.setTimeout(20000);

  it('inserts/updates rows when external APIs return data', async () => {
    // This runs real fetch — ensure network is available and DB is set
    const result = await countryService.fetchAndSaveCountries();
    expect(result).toHaveProperty('message', 'Refresh completed');
    expect(result).toHaveProperty('stats');
    expect(result.stats.inserted_or_updated).toBeGreaterThanOrEqual(0);
  });

  it('throws 503 when external API fails (mocked)', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('network fail'));
    await expect(countryService.fetchAndSaveCountries()).rejects.toHaveProperty('status', 503);
    axios.get.mockRestore();
  });
});
