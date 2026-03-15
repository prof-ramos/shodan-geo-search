const request = require('supertest');
const express = require('express');
const path = require('path');

// Mock app for testing (without starting the server)
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.post('/api/search', async (req, res) => {
    const { latitude, longitude, radius } = req.body || {};

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      return res.status(400).json({
        error: 'Informe latitude, longitude e raio validos.',
      });
    }

    const shodanApiKey = process.env.SHODAN_API_KEY;

    if (!shodanApiKey) {
      return res.status(500).json({
        error: 'A variavel SHODAN_API_KEY nao foi configurada no servidor.',
      });
    }

    const locationFilter = `geo:${latitude},${longitude},${radius}`;
    const url = new URL('https://api.shodan.io/shodan/host/search');
    url.searchParams.set('key', shodanApiKey);
    url.searchParams.set('query', locationFilter);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `Falha ao consultar o Shodan: ${errorText || response.statusText}`,
        });
      }

      const data = await response.json();
      const devices = Array.isArray(data.matches)
        ? data.matches.map((match) => ({
            ip: match.ip_str || 'N/A',
            organization: match.org || 'N/A',
            port: match.port || 'N/A',
          }))
        : [];

      return res.json({ devices });
    } catch (error) {
      return res.status(500).json({
        error: 'Erro interno ao buscar dispositivos no Shodan.',
      });
    }
  });

  return app;
}

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

    test('should return 400 when latitude is not a number', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ latitude: 'invalid', longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 500 when SHODAN_API_KEY is not configured', async () => {
      // Temporarily remove the API key
      const originalKey = process.env.SHODAN_API_KEY;
      delete process.env.SHODAN_API_KEY;

      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('SHODAN_API_KEY');

      // Restore the API key
      if (originalKey) process.env.SHODAN_API_KEY = originalKey;
    });

    test('should accept valid coordinates', async () => {
      // This test requires a valid API key
      if (!process.env.SHODAN_API_KEY) {
        console.log('Skipping test: SHODAN_API_KEY not set');
        return;
      }

      const response = await request(app)
        .post('/api/search')
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 1 });

      // Should be 200 or 4xx from Shodan API, not 500
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
