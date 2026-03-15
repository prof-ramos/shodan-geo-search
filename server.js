const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const port = process.env.PORT || 3000;

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(
    "/api/",
    rateLimit({
      windowMs: 60_000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use(express.static(path.join(__dirname, "public")));

  app.post("/api/search", async (req, res) => {
    const { latitude, longitude, radius } = req.body || {};

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      return res.status(400).json({
        error: "Informe latitude, longitude e raio validos.",
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: "Coordenadas fora dos limites validos.",
      });
    }

    const shodanApiKey = process.env.SHODAN_API_KEY;

    if (!shodanApiKey) {
      return res.status(500).json({
        error: "A variavel SHODAN_API_KEY nao foi configurada no servidor.",
      });
    }

    const locationFilter = `geo:${latitude},${longitude},${radius}`;
    const url = new URL("https://api.shodan.io/shodan/host/search");
    url.searchParams.set("key", shodanApiKey);
    url.searchParams.set("query", locationFilter);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Shodan API error:", response.status, errorText);
        return res.status(502).json({
          error: "Falha ao consultar o Shodan. Tente novamente.",
        });
      }

      const data = await response.json();
      const devices = Array.isArray(data.matches)
        ? data.matches.map((match) => ({
            ip: match.ip_str || "N/A",
            organization: match.org || "N/A",
            port: match.port || "N/A",
          }))
        : [];

      return res.json({ devices });
    } catch (error) {
      clearTimeout(timer);
      console.error("Shodan fetch error:", error);
      return res.status(500).json({
        error: "Erro interno ao buscar dispositivos no Shodan.",
      });
    }
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const app = createApp();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
