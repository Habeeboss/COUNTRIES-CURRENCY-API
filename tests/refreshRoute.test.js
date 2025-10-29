const request = require('supertest');
const app = require('../server');
const countryService = require('../services/countryService');
jest.setTimeout(20000);

describe('POST /countries/refresh (route/controller)', () => {
  it('responds 200 and returns stats when service succeeds', async () => {
    // Mock service to avoid hitting real external APIs in this unit test
    const mockResult = { message: 'Refresh completed', stats: { total_fetched: 1, skipped_missing_required: 0, inserted_or_updated: 1 } };
    jest.spyOn(countryService, 'fetchAndSaveCountries').mockResolvedValueOnce(mockResult);

    const res = await request(app).post('/countries/refresh').send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Refresh completed');
    expect(res.body).toHaveProperty('stats');
    countryService.fetchAndSaveCountries.mockRestore();
  });

  it('responds 503 when service throws 503 external error', async () => {
    const err = new Error('External data source unavailable');
    err.status = 503;
    err.details = 'Could not fetch data from https://restcountries.com';
    jest.spyOn(countryService, 'fetchAndSaveCountries').mockRejectedValueOnce(err);

    const res = await request(app).post('/countries/refresh').send();
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error', 'External data source unavailable');

    countryService.fetchAndSaveCountries.mockRestore();
  });
});
