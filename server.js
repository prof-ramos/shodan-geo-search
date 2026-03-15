const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const shodanApiKey = process.env.SHODAN_API_KEY;

app.use(express.json());
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

  if (!shodanApiKey) {
    return res.status(500).json({
      error: "A variavel SHODAN_API_KEY nao foi configurada no servidor.",
    });
  }

  const locationFilter = `geo:${latitude},${longitude},${radius}`;
  const url = new URL("https://api.shodan.io/shodan/host/search");
  url.searchParams.set("key", shodanApiKey);
  url.searchParams.set("query", locationFilter);

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
          ip: match.ip_str || "N/A",
          organization: match.org || "N/A",
          port: match.port || "N/A",
        }))
      : [];

    return res.json({ devices });
  } catch (error) {
    return res.status(500).json({
      error: "Erro interno ao buscar dispositivos no Shodan.",
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
