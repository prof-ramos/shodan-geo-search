import { useState, useCallback, useRef, useEffect } from "react";

const API_ENDPOINTS = {
  hostSearch: { path: "/shodan/host/search", label: "Host Search", placeholder: "apache country:BR" },
  hostInfo: { path: "/shodan/host/{ip}", label: "Host Info", placeholder: "8.8.8.8" },
  dnsResolve: { path: "/dns/resolve", label: "DNS Resolve", placeholder: "google.com,github.com" },
  dnsReverse: { path: "/dns/reverse", label: "DNS Reverse", placeholder: "8.8.8.8,1.1.1.1" },
  exploits: { path: "/api-exploit/search", label: "Exploits", placeholder: "apache 2.4" },
  myIp: { path: "/tools/myip", label: "My IP", placeholder: "" },
  apiInfo: { path: "/api-info", label: "API Info", placeholder: "" },
  ports: { path: "/shodan/ports", label: "Ports", placeholder: "" },
  protocols: { path: "/shodan/protocols", label: "Protocols", placeholder: "" },
};

const GlitchText = ({ children, className = "" }) => {
  return <span className={className} style={{ fontFamily: "'Share Tech Mono', monospace" }}>{children}</span>;
};

const LogLine = ({ ts, type, text }) => {
  const colors = { info: "#0f0", error: "#f33", warn: "#ff0", req: "#0ff", res: "#0f0" };
  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, lineHeight: "1.6", color: "#888" }}>
      <span style={{ color: "#555" }}>[{ts}]</span>{" "}
      <span style={{ color: colors[type] || "#888" }}>{type.toUpperCase().padEnd(5)}</span>{" "}
      <span style={{ color: type === "res" ? "#0f0" : "#ccc" }}>{text}</span>
    </div>
  );
};

export default function ShodanDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [activeEndpoint, setActiveEndpoint] = useState("hostSearch");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  const now = () => new Date().toLocaleTimeString("pt-BR", { hour12: false });

  const log = useCallback((type, text) => {
    setLogs((p) => [...p.slice(-200), { ts: now(), type, text }]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [activeEndpoint]);

  const execute = useCallback(async () => {
    if (!apiKey) { log("error", "API Key não configurada"); return; }
    const ep = API_ENDPOINTS[activeEndpoint];
    const needsQuery = ep.placeholder !== "";
    if (needsQuery && !query.trim()) { log("error", "Query vazia"); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    const payload = {
      endpoint: activeEndpoint,
      query: query.trim(),
      apiKey,
    };
    log("req", `${ep.label} → /api/dashboard/proxy (${JSON.stringify({ endpoint: payload.endpoint, query: payload.query })})`);

    try {
      const res = await fetch("/api/dashboard/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || `HTTP ${res.status}`;
        log("error", msg);
        setError(msg);
      } else {
        log("res", `OK — ${JSON.stringify(data).length} bytes`);
        setResult(data);
        setHistory((p) => [{ endpoint: ep.label, query: query.trim(), ts: now() }, ...p.slice(0, 19)]);
      }
    } catch (e) {
      log("error", e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, activeEndpoint, query, log]);

  const scanlines = `repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)`;
  const noise = `radial-gradient(ellipse at 50% 0%, rgba(0,255,65,0.03) 0%, transparent 70%)`;

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#0f0", fontFamily: "'Share Tech Mono', monospace",
      backgroundImage: `${scanlines}, ${noise}`, position: "relative", overflow: "hidden"
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap'); * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #1a3a1a #0a0a0a; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0a0a; } ::-webkit-scrollbar-thumb { background: #1a3a1a; border-radius: 3px; } ::selection { background: #0f0; color: #000; } input:focus { outline: none; } @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} } @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} } @keyframes slideIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} } .tab-btn { padding: 6px 14px; border: 1px solid #1a3a1a; background: transparent; color: #555; cursor: pointer; font-family: 'Share Tech Mono', monospace; font-size: 11px; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px; } .tab-btn:hover { color: #0f0; border-color: #0f0; } .tab-btn.active { color: #0f0; border-color: #0f0; background: rgba(0,255,65,0.05); box-shadow: 0 0 8px rgba(0,255,65,0.15); } .exec-btn { padding: 10px 32px; border: 1px solid #0f0; background: transparent; color: #0f0; cursor: pointer; font-family: 'Share Tech Mono', monospace; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; transition: all 0.15s; } .exec-btn:hover { background: #0f0; color: #000; box-shadow: 0 0 20px rgba(0,255,65,0.4); } .exec-btn:disabled { opacity: 0.3; cursor: not-allowed; } .exec-btn:disabled:hover { background: transparent; color: #0f0; box-shadow: none; }`}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a3a1a", padding: "16px 24px", display: "flex",
        alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, letterSpacing: 4,
            color: "#0f0", textShadow: "0 0 10px rgba(0,255,65,0.5)" }}>
            SHODAN
          </div>
          <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, textTransform: "uppercase",
            borderLeft: "1px solid #1a3a1a", paddingLeft: 16 }}>
            API Interface v1.0
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%",
            background: apiKey ? "#0f0" : "#f33",
            boxShadow: apiKey ? "0 0 6px #0f0" : "0 0 6px #f33",
            animation: "pulse 2s ease infinite" }} />
          <span style={{ fontSize: 10, color: "#555" }}>{apiKey ? "CONNECTED" : "NO KEY"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0, height: "calc(100vh - 57px)" }}>
        {/* Main */}
        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* API Key */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#555", minWidth: 70 }}>API_KEY:</span>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sua-chave-shodan"
              style={{ flex: 1, background: "#111", border: "1px solid #1a3a1a", padding: "8px 12px",
                color: "#0f0", fontFamily: "'Share Tech Mono', monospace", fontSize: 13 }}
            />
            <button onClick={() => setShowKey(!showKey)}
              style={{ background: "transparent", border: "1px solid #1a3a1a", color: "#555",
                padding: "8px 12px", cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 11 }}>
              {showKey ? "HIDE" : "SHOW"}
            </button>
          </div>

          {/* Endpoint Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {Object.entries(API_ENDPOINTS).map(([key, ep]) => (
              <button key={key} className={`tab-btn ${activeEndpoint === key ? "active" : ""}`}
                onClick={() => { setActiveEndpoint(key); setResult(null); setError(null); }}>
                {ep.label}
              </button>
            ))}
          </div>

          {/* Query Input */}
          {API_ENDPOINTS[activeEndpoint].placeholder && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: "#333", fontSize: 14 }}>›</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && execute()}
                  placeholder={API_ENDPOINTS[activeEndpoint].placeholder}
                  style={{ width: "100%", background: "#111", border: "1px solid #1a3a1a", padding: "12px 12px 12px 28px",
                    color: "#0f0", fontFamily: "'Share Tech Mono', monospace", fontSize: 14 }}
                />
              </div>
              <button className="exec-btn" onClick={execute} disabled={loading}>
                {loading ? "..." : "EXEC"}
              </button>
            </div>
          )}

          {!API_ENDPOINTS[activeEndpoint].placeholder && (
            <button className="exec-btn" onClick={execute} disabled={loading} style={{ alignSelf: "flex-start" }}>
              {loading ? "..." : "EXEC"}
            </button>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: 12, border: "1px solid #f33", background: "rgba(255,50,50,0.05)",
              color: "#f33", fontSize: 12, animation: "slideIn 0.2s ease" }}>
              ⚠ {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ animation: "slideIn 0.3s ease" }}>
              <div style={{ fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: 2,
                marginBottom: 8 }}>
                Response — {API_ENDPOINTS[activeEndpoint].label}
              </div>

              {/* Host Search Results */}
              {activeEndpoint === "hostSearch" && result.matches && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                    Total: {result.total?.toLocaleString()} resultados
                  </div>
                  {result.matches.map((m, i) => (
                    <div key={i} style={{ border: "1px solid #1a3a1a", padding: 12, background: "rgba(0,0,0,0.3)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#0ff", fontSize: 14 }}>{m.ip_str}:{m.port}</span>
                        <span style={{ color: "#555", fontSize: 11 }}>{m.org || "—"}</span>
                      </div>
                      {m.hostnames?.length > 0 && (
                        <div style={{ fontSize: 11, color: "#0a0" }}>{m.hostnames.join(", ")}</div>
                      )}
                      <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                        {m.location?.country_name} {m.location?.city ? `· ${m.location.city}` : ""}
                        {m.os ? ` · ${m.os}` : ""}
                      </div>
                      {m.product && <div style={{ fontSize: 11, color: "#0a0", marginTop: 2 }}>{m.product} {m.version || ""}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Host Info */}
              {activeEndpoint === "hostInfo" && result.ip_str && (
                <div style={{ border: "1px solid #1a3a1a", padding: 16, background: "rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize: 16, color: "#0ff", marginBottom: 8 }}>{result.ip_str}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                    <div><span style={{ color: "#555" }}>Org:</span> <span style={{ color: "#0f0" }}>{result.org || "—"}</span></div>
                    <div><span style={{ color: "#555" }}>OS:</span> <span style={{ color: "#0f0" }}>{result.os || "—"}</span></div>
                    <div><span style={{ color: "#555" }}>Country:</span> <span style={{ color: "#0f0" }}>{result.country_name || "—"}</span></div>
                    <div><span style={{ color: "#555" }}>City:</span> <span style={{ color: "#0f0" }}>{result.city || "—"}</span></div>
                    <div><span style={{ color: "#555" }}>Ports:</span> <span style={{ color: "#0ff" }}>{result.ports?.join(", ") || "—"}</span></div>
                    <div><span style={{ color: "#555" }}>Hostnames:</span> <span style={{ color: "#0f0" }}>{result.hostnames?.join(", ") || "—"}</span></div>
                    <div><span style={{ color: "#555" }}>Vulns:</span> <span style={{ color: result.vulns?.length ? "#f33" : "#0f0" }}>
                      {result.vulns?.join(", ") || "Nenhuma"}
                    </span></div>
                    <div><span style={{ color: "#555" }}>Last Update:</span> <span style={{ color: "#0f0" }}>{result.last_update || "—"}</span></div>
                  </div>
                  {result.data?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 6 }}>SERVICES</div>
                      {result.data.slice(0, 10).map((s, i) => (
                        <div key={i} style={{ borderTop: "1px solid #111", padding: "6px 0", fontSize: 11 }}>
                          <span style={{ color: "#0ff" }}>:{s.port}</span>
                          <span style={{ color: "#555" }}> / {s.transport || "tcp"}</span>
                          {s.product && <span style={{ color: "#0a0" }}> — {s.product} {s.version || ""}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Generic JSON fallback */}
              {activeEndpoint !== "hostSearch" && activeEndpoint !== "hostInfo" && (
                <pre style={{ background: "#111", border: "1px solid #1a3a1a", padding: 16,
                  overflow: "auto", maxHeight: 400, fontSize: 11, color: "#0a0", lineHeight: 1.5 }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Right Panel — Logs + History */}
        <div style={{ borderLeft: "1px solid #1a3a1a", display: "flex", flexDirection: "column",
          background: "rgba(0,0,0,0.3)" }}>
          {/* Logs */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #111", fontSize: 10,
              color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>
              System Log
            </div>
            <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
              {logs.length === 0 && (
                <div style={{ color: "#222", fontSize: 11, fontStyle: "italic" }}>
                  Aguardando atividade...
                </div>
              )}
              {logs.map((l, i) => <LogLine key={i} {...l} />)}
              {loading && (
                <div style={{ color: "#0ff", fontSize: 12, animation: "blink 1s step-end infinite" }}>
                  ▌ processando...
                </div>
              )}
            </div>
          </div>

          {/* History */}
          <div style={{ borderTop: "1px solid #1a3a1a", maxHeight: 200, overflowY: "auto" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #111", fontSize: 10,
              color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>
              History ({history.length})
            </div>
            {history.map((h, i) => (
              <div key={i} style={{ padding: "6px 16px", borderBottom: "1px solid #0a0a0a",
                fontSize: 11, color: "#555", display: "flex", justifyContent: "space-between" }}>
                <span><span style={{ color: "#0a0" }}>{h.endpoint}</span> {h.query && `· ${h.query}`}</span>
                <span style={{ color: "#333" }}>{h.ts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
