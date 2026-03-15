const request = require('supertest');
const { createApp } = require('../server');

describe('Shodan Geo Search API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('POST /api/search', () => {
    test('should return 400 when latitude is missing', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when longitude is missing', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when radius is missing', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: -46.6333 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when radius is negative', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: -46.6333, radius: -10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when radius is zero', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when latitude is not a number', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: 'invalid', longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when latitude is out of range', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: 999, longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when longitude is out of range', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: 999, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 400 when body is empty', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 500 when SHODAN_API_KEY is not configured', async () => {
      const originalKey = process.env.SHODAN_API_KEY;
      delete process.env.SHODAN_API_KEY;

      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('SHODAN_API_KEY');

      if (originalKey) process.env.SHODAN_API_KEY = originalKey;
    });

    const runIfKey = process.env.SHODAN_API_KEY ? test : test.skip;

    runIfKey('should accept valid coordinates', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 1 });

      expect([200, 400, 401, 403, 429]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.devices).toBeDefined();
        expect(Array.isArray(response.body.devices)).toBe(true);
      }
    });
  });

  describe('Static files', () => {
    test('should serve index.html at root', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Shodan Geo Search');
    });

    test('should serve styles.css', async () => {
      const response = await request(app).get('/styles.css');
      expect(response.status).toBe(200);
      expect(response.text).toContain('--accent');
    });

    test('should serve script.js', async () => {
      const response = await request(app).get('/script.js');
      expect(response.status).toBe(200);
      expect(response.text).toContain('search-form');
    });
  });
});
