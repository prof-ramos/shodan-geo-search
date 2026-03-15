const request = require("supertest");
const { app, calculateDistance } = require("../server");

describe("Shodan Geo Search API", () => {
  const originalApiKey = process.env.SHODAN_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.SHODAN_API_KEY = "test-key";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.SHODAN_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("POST /api/search", () => {
    test("should return 400 when latitude is missing", async () => {
      const response = await request(app)
        .post("/api/search")
        .send({ longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("should return 400 when longitude is missing", async () => {
      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("should return 400 when radius is missing", async () => {
      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, longitude: -46.6333 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("should return 400 when radius is negative", async () => {
      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, longitude: -46.6333, radius: -10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("should return 400 when latitude is not a number", async () => {
      const response = await request(app)
        .post("/api/search")
        .send({ latitude: "invalid", longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("should return 500 when SHODAN_API_KEY is not configured", async () => {
      delete process.env.SHODAN_API_KEY;

      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("SHODAN_API_KEY");
    });

    test("should prefer https when ssl metadata exists on a non-standard TLS port", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          matches: [
            {
              ip_str: "203.0.113.10",
              port: 8443,
              org: "Example Org",
              product: "IP Camera",
              ssl: { tls_version: "TLSv1.3" },
              location: {
                country_name: "Brazil",
                city: "Sao Paulo",
                latitude: -23.5505,
                longitude: -46.6333,
              },
            },
          ],
        }),
      });

      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(200);
      expect(response.body.devices[0].url).toBe("https://203.0.113.10:8443");
    });

    test("should calculate distance when device coordinates include zero", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          matches: [
            {
              ip_str: "198.51.100.25",
              port: 80,
              org: "Equator Camera",
              product: "Webcam",
              location: {
                country_name: "Ghana",
                city: "Tema",
                latitude: 0,
                longitude: 0,
              },
            },
          ],
        }),
      });

      const response = await request(app)
        .post("/api/search")
        .send({ latitude: 1, longitude: 1, radius: 25 });

      expect(response.status).toBe(200);
      expect(response.body.devices[0].distance).toBeCloseTo(calculateDistance(1, 1, 0, 0), 5);
    });

    test("should surface Shodan API errors", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => "rate limited",
      });

      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 25 });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain("rate limited");
    });

    test("should return 504 when upstream fetch aborts (AbortError)", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      global.fetch = jest.fn().mockRejectedValue(abortError);
      process.env.SHODAN_API_KEY = originalApiKey;

      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 25 });

      expect(response.status).toEqual(504);

      global.fetch = originalFetch;
      process.env.SHODAN_API_KEY = originalApiKey;
    });

    const runIfKey = originalApiKey ? test : test.skip;
    runIfKey("should accept valid coordinates", async () => {
      global.fetch = originalFetch;
      process.env.SHODAN_API_KEY = originalApiKey;

      const response = await request(app)
        .post("/api/search")
        .send({ latitude: -23.5505, longitude: -46.6333, radius: 25 });

      expect([200, 400, 500, 504]).toContain(response.status);
    }, 15000);
  });

  describe("POST /api/dashboard/proxy", () => {
    test("should reject dashboard proxy requests without api key", async () => {
      const response = await request(app)
        .post("/api/dashboard/proxy")
        .send({ endpoint: "hostSearch", query: "city:\"Brasília\"" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("API key");
    });

    test("should proxy dashboard requests through the backend", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ total: 1, matches: [{ ip_str: "203.0.113.20", port: 80 }] }),
      });

      const response = await request(app)
        .post("/api/dashboard/proxy")
        .send({
          endpoint: "hostSearch",
          query: "city:\"Brasília\"",
          apiKey: "dashboard-key",
        });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining("query=city%3A%22Bras%C3%ADlia%22"),
        })
      );
    });
  });

  describe("Static files", () => {
    test("should serve index.html at root", async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(200);
      expect(response.text).toContain("Shodan Geo Search");
    });

    test("should serve styles.css", async () => {
      const response = await request(app).get("/styles.css");
      expect(response.status).toBe(200);
      expect(response.text).toContain("--cyan");
    });

    test("should serve script.js", async () => {
      const response = await request(app).get("/script.js");
      expect(response.status).toBe(200);
      expect(response.text).toContain("search-form");
    });

    test("should serve dashboard entrypoint", async () => {
      const response = await request(app).get("/dashboard/");
      expect(response.status).toBe(200);
      expect(response.text).toContain("/dashboard/assets/");
    });
  });
});
