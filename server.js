const path = require("path");
const express = require("express");
require("dotenv").config();

// Calculate distance between two coordinates in km (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const app = express();
const port = process.env.PORT || 3000;
const COMMON_TLS_PORTS = new Set([443, 4433, 7443, 8443, 8444, 9443, 10443]);
const DASHBOARD_ENDPOINTS = {
  hostSearch: "/shodan/host/search",
  hostInfo: "/shodan/host/{ip}",
  dnsResolve: "/dns/resolve",
  dnsReverse: "/dns/reverse",
  exploits: "/api-exploit/search",
  myIp: "/tools/myip",
  apiInfo: "/api-info",
  ports: "/shodan/ports",
  protocols: "/shodan/protocols",
};

function buildDashboardProxyUrl(endpointKey, query, apiKey) {
  const endpointPath = DASHBOARD_ENDPOINTS[endpointKey];

  if (!endpointPath) {
    return null;
  }

  let url = new URL(`https://api.shodan.io${endpointPath}`);
  url.searchParams.set("key", apiKey);

  if (endpointPath.includes("{ip}")) {
    url = new URL(`https://api.shodan.io${endpointPath.replace("{ip}", encodeURIComponent(query))}`);
    url.searchParams.set("key", apiKey);
  } else if (endpointPath === "/shodan/host/search" || endpointPath === "/api-exploit/search") {
    url.searchParams.set("query", query);
  } else if (endpointPath === "/dns/resolve") {
    url.searchParams.set("hostnames", query);
  } else if (endpointPath === "/dns/reverse") {
    url.searchParams.set("ips", query);
  }

  return url;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Dashboard route (React app)
app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard", "index.html"));
});

app.use("/dashboard", express.static(path.join(__dirname, "public", "dashboard")));

app.post("/api/dashboard/proxy", async (req, res) => {
  const { endpoint, query = "", apiKey } = req.body || {};

  if (!apiKey) {
    return res.status(400).json({ error: "Informe uma API key do Shodan." });
  }

  const url = buildDashboardProxyUrl(endpoint, query.trim(), apiKey);

  if (!url) {
    return res.status(400).json({ error: "Endpoint do dashboard inválido." });
  }

  try {
    const response = await fetch(url);
    const responseText = await response.text();
    const parsedBody = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      return res.status(response.status).json({
        error: parsedBody.error || response.statusText || "Falha ao consultar o Shodan.",
      });
    }

    return res.json(parsedBody);
  } catch (error) {
    return res.status(502).json({
      error: "Não foi possível consultar o Shodan a partir do servidor.",
    });
  }
});

app.post("/api/search", async (req, res) => {
  const { latitude, longitude, radius } = req.body || {};
  const shodanApiKey = process.env.SHODAN_API_KEY;

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

  // Filter by geographic proximity using latitude, longitude, radius and the term "camera"
  const cameraFilter = `geo:${latitude},${longitude},${radius} camera`;
  const url = new URL("https://api.shodan.io/shodan/host/search");
  url.searchParams.set("key", shodanApiKey);
  url.searchParams.set("query", cameraFilter);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Falha ao consultar o Shodan: ${errorText || response.statusText}`,
      });
    }

    const data = await response.json();
    const devices = Array.isArray(data.matches)
      ? data.matches.map((match) => {
          // Detect camera type from product metadata and HTTP title
          const product = (match.product || "").toLowerCase();
          const title = (match.http?.title || "").toLowerCase();

          let type = "Camera";
          if (title.includes("cctv") || product.includes("cctv")) type = "CCTV";
          else if (title.includes("webcam") || product.includes("webcam")) type = "WebCam";
          else if (title.includes("ip camera") || product.includes("ip camera")) type = "IP Camera";
          else if (title.includes("network camera")) type = "Network Camera";

          // Prefer HTTPS when Shodan reports SSL metadata or a common TLS port.
          const hasSsl = Boolean(
            match.ssl?.tls_version ||
            match.ssl?.versions?.length ||
            match.ssl?.cert ||
            match.ssl?.server
          );
          const protocol = hasSsl || COMMON_TLS_PORTS.has(match.port) ? "https" : "http";
          const accessUrl = `${protocol}://${match.ip_str}:${match.port}`;

          // Calculate distance from search coordinates
          const deviceLat = match.location?.latitude;
          const deviceLon = match.location?.longitude;
          const distance = deviceLat != null && deviceLon != null
            ? calculateDistance(latitude, longitude, deviceLat, deviceLon)
            : null;

          return {
            ip: match.ip_str || "N/A",
            organization: match.org || "N/A",
            port: match.port || "N/A",
            type: type,
            url: accessUrl,
            country: match.location?.country_name || "N/A",
            city: match.location?.city || "N/A",
            distance: distance,
          };
        })
      : [];

    return res.json({ devices });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "Tempo limite excedido ao consultar o Shodan.",
      });
    }
    return res.status(500).json({
      error: "Erro interno ao buscar dispositivos no Shodan.",
    });
  } finally {
    clearTimeout(timer);
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

module.exports = { app, calculateDistance };
