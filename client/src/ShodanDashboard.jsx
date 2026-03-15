import { useState, useCallback, useRef, useEffect } from "react";
import "./ShodanDashboard.css";

const RESULTS_PER_PAGE = 10;

const API_ENDPOINTS = {
  hostSearch: { path: "/shodan/host/search", label: "Host Search", placeholder: "apache country:BR", needsQuery: true },
  hostInfo:   { path: "/shodan/host/{ip}",   label: "Host Info",   placeholder: "8.8.8.8",           needsQuery: true },
  dnsResolve: { path: "/dns/resolve",         label: "DNS Resolve", placeholder: "google.com,github.com", needsQuery: true },
  dnsReverse: { path: "/dns/reverse",         label: "DNS Reverse", placeholder: "8.8.8.8,1.1.1.1",   needsQuery: true },
  exploits:   { path: "/api-exploit/search",  label: "Exploits",   placeholder: "apache 2.4",         needsQuery: true },
  myIp:       { path: "/tools/myip",          label: "My IP",      placeholder: "",                   needsQuery: false },
  apiInfo:    { path: "/api-info",            label: "API Info",   placeholder: "",                   needsQuery: false },
  ports:      { path: "/shodan/ports",        label: "Ports",      placeholder: "",                   needsQuery: false },
  protocols:  { path: "/shodan/protocols",    label: "Protocols",  placeholder: "",                   needsQuery: false },
};

const LOG_COLORS = { info: "#0f0", error: "#f33", warn: "#ff0", req: "#0ff", res: "#0f0" };

const LS_KEY = "shodan_dashboard_api_key";

const LogLine = ({ ts, type, text }) => (
  <div className="log-line">
    <span className="log-line__ts">[{ts}]</span>{" "}
    <span className="log-line__type" style={{ color: LOG_COLORS[type] || "#888" }}>
      {type.toUpperCase().padEnd(5)}
    </span>{" "}
    <span className={`log-line__text${type === "res" ? " log-line__text--res" : ""}`}>{text}</span>
  </div>
);

/* ─── Result renderers ──────────────────────────── */

function HostSearchResult({ result, page, setPage }) {
  const matches = result.matches || [];
  const total = result.total || matches.length;
  const totalPages = Math.ceil(matches.length / RESULTS_PER_PAGE);
  const slice = matches.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE);

  return (
    <div className="host-list">
      <div className="host-list__summary">
        Total: {total.toLocaleString()} resultado(s) · Exibindo página {page} de {totalPages || 1}
      </div>
      {slice.map((m, i) => (
        <div key={i} className="host-card">
          <div className="host-card__header">
            <span className="host-card__ip">{m.ip_str}:{m.port}</span>
            <span className="host-card__org">{m.org || "—"}</span>
          </div>
          {m.hostnames?.length > 0 && (
            <div className="host-card__hosts">{m.hostnames.join(", ")}</div>
          )}
          <div className="host-card__meta">
            {m.location?.country_name}{m.location?.city ? ` · ${m.location.city}` : ""}
            {m.os ? ` · ${m.os}` : ""}
          </div>
          {m.product && (
            <div className="host-card__prod">{m.product} {m.version || ""}</div>
          )}
        </div>
      ))}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination__btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Anterior
          </button>
          <span>{page} / {totalPages}</span>
          <button
            className="pagination__btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

function HostInfoResult({ result }) {
  return (
    <div className="host-info">
      <div className="host-info__ip">{result.ip_str}</div>
      <div className="host-info__grid">
        <div><span className="host-info__key">Org:</span> <span className="host-info__val">{result.org || "—"}</span></div>
        <div><span className="host-info__key">OS:</span> <span className="host-info__val">{result.os || "—"}</span></div>
        <div><span className="host-info__key">País:</span> <span className="host-info__val">{result.country_name || "—"}</span></div>
        <div><span className="host-info__key">Cidade:</span> <span className="host-info__val">{result.city || "—"}</span></div>
        <div>
          <span className="host-info__key">Portas:</span>{" "}
          <span className="host-info__ports">{result.ports?.join(", ") || "—"}</span>
        </div>
        <div><span className="host-info__key">Hostnames:</span> <span className="host-info__val">{result.hostnames?.join(", ") || "—"}</span></div>
        <div>
          <span className="host-info__key">Vulns:</span>{" "}
          <span className={result.vulns?.length ? "host-info__vulns--some" : "host-info__vulns--none"}>
            {result.vulns?.join(", ") || "Nenhuma"}
          </span>
        </div>
        <div><span className="host-info__key">Atualizado:</span> <span className="host-info__val">{result.last_update || "—"}</span></div>
      </div>
      {result.data?.length > 0 && (
        <div className="services">
          <div className="services__label">SERVICES</div>
          {result.data.slice(0, 10).map((s, i) => (
            <div key={i} className="service-row">
              <span className="service-row__port">:{s.port}</span>
              <span className="service-row__proto"> / {s.transport || "tcp"}</span>
              {s.product && (
                <span className="service-row__product"> — {s.product} {s.version || ""}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DnsResult({ result }) {
  const entries = Object.entries(result);
  if (entries.length === 0) return <div className="host-list__summary">Sem resultados.</div>;
  return (
    <table className="dns-table">
      <tbody>
        {entries.map(([host, value]) => (
          <tr key={host}>
            <td>{host}</td>
            <td>{Array.isArray(value) ? value.join(", ") : String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExploitResult({ result }) {
  const matches = result.matches || [];
  const total = result.total || matches.length;
  return (
    <div className="exploit-list">
      <div className="host-list__summary">Total: {total.toLocaleString()} exploit(s)</div>
      {matches.map((e, i) => (
        <div key={i} className="exploit-card">
          <div className="exploit-card__header">
            <span className="exploit-card__id">{e.id || e.cve || `#${i + 1}`}</span>
            <span className="exploit-card__type">{e.type || e.source || "—"}</span>
          </div>
          <div className="exploit-card__desc">{e.description || e.title || "—"}</div>
          {e.source && <div className="exploit-card__source">{e.source}</div>}
        </div>
      ))}
    </div>
  );
}

function ResultView({ activeEndpoint, result, page, setPage }) {
  if (activeEndpoint === "hostSearch" && result.matches) {
    return <HostSearchResult result={result} page={page} setPage={setPage} />;
  }
  if (activeEndpoint === "hostInfo" && result.ip_str) {
    return <HostInfoResult result={result} />;
  }
  if ((activeEndpoint === "dnsResolve" || activeEndpoint === "dnsReverse") && typeof result === "object") {
    return <DnsResult result={result} />;
  }
  if (activeEndpoint === "exploits" && result.matches) {
    return <ExploitResult result={result} />;
  }
  return (
    <pre className="json-pre">{JSON.stringify(result, null, 2)}</pre>
  );
}

/* ─── Main component ────────────────────────────── */

export default function ShodanDashboard() {
  const [apiKey, setApiKey]           = useState(() => localStorage.getItem(LS_KEY) || "");
  const [showKey, setShowKey]         = useState(false);
  const [activeEndpoint, setActiveEndpoint] = useState("hostSearch");
  const [query, setQuery]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [logs, setLogs]               = useState([]);
  const [history, setHistory]         = useState([]);
  const [page, setPage]               = useState(1);
  const logRef  = useRef(null);
  const inputRef = useRef(null);

  const now = () => new Date().toLocaleTimeString("pt-BR", { hour12: false });

  const log = useCallback((type, text) => {
    setLogs(p => [...p.slice(-200), { ts: now(), type, text }]);
  }, []);

  // Persist API key
  const handleApiKeyChange = (val) => {
    setApiKey(val);
    if (val) localStorage.setItem(LS_KEY, val);
    else localStorage.removeItem(LS_KEY);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [activeEndpoint]);

  const switchEndpoint = (key) => {
    setActiveEndpoint(key);
    setResult(null);
    setError(null);
    setPage(1);
  };

  const execute = useCallback(async (overrideQuery) => {
    if (!apiKey) { log("error", "API Key não configurada"); return; }
    const ep = API_ENDPOINTS[activeEndpoint];
    const q = overrideQuery !== undefined ? overrideQuery : query;
    if (ep.needsQuery && !q.trim()) { log("error", "Query vazia"); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    setPage(1);
    const payload = { endpoint: activeEndpoint, query: q.trim(), apiKey };
    log("req", `${ep.label} → /api/dashboard/proxy (${JSON.stringify({ endpoint: payload.endpoint, query: payload.query })})`);

    try {
      const res = await fetch("/api/dashboard/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setHistory(p => [{ endpoint: ep.label, query: q.trim(), endpointKey: activeEndpoint, ts: now() }, ...p.slice(0, 19)]);
      }
    } catch (e) {
      log("error", e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, activeEndpoint, query, log]);

  const replayHistory = (item) => {
    switchEndpoint(item.endpointKey);
    setQuery(item.query);
    // execute after state settles via a micro-task
    setTimeout(() => {
      // call execute with explicit args to avoid stale closure
      const ep = API_ENDPOINTS[item.endpointKey];
      if (!apiKey) { log("error", "API Key não configurada"); return; }
      setLoading(true);
      setError(null);
      setResult(null);
      setPage(1);
      const payload = { endpoint: item.endpointKey, query: item.query, apiKey };
      log("req", `[replay] ${ep.label} → query: ${item.query}`);
      fetch("/api/dashboard/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, d })))
        .then(({ ok, status, d }) => {
          if (!ok) {
            const msg = d.error || `HTTP ${status}`;
            log("error", msg);
            setError(msg);
          } else {
            log("res", `OK — ${JSON.stringify(d).length} bytes`);
            setResult(d);
          }
        })
        .catch(e => { log("error", e.message); setError(e.message); })
        .finally(() => setLoading(false));
    }, 0);
  };

  const ep = API_ENDPOINTS[activeEndpoint];

  return (
    <div className="dash">
      {/* Header */}
      <header className="dash__header">
        <div className="dash__logo">
          <div className="dash__logo-text">SHODAN</div>
          <div className="dash__logo-sub">API Interface v1.0</div>
        </div>
        <div className="dash__status">
          <div className={`dash__status-dot ${apiKey ? "dash__status-dot--on" : "dash__status-dot--off"}`} />
          <span className="dash__status-label">{apiKey ? "CONNECTED" : "NO KEY"}</span>
        </div>
      </header>

      <div className="dash__body">
        {/* Main column */}
        <div className="dash__main">
          {/* API Key */}
          <div className="apikey-row">
            <span className="apikey-row__label">API_KEY:</span>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => handleApiKeyChange(e.target.value)}
              placeholder="sua-chave-shodan"
              className="apikey-row__input"
            />
            <button onClick={() => setShowKey(s => !s)} className="apikey-row__toggle">
              {showKey ? "HIDE" : "SHOW"}
            </button>
          </div>

          {/* Endpoint tabs */}
          <div className="tabs">
            {Object.entries(API_ENDPOINTS).map(([key, e]) => (
              <button
                key={key}
                className={`tab-btn${activeEndpoint === key ? " tab-btn--active" : ""}`}
                onClick={() => switchEndpoint(key)}
              >
                {e.label}
              </button>
            ))}
          </div>

          {/* Query input */}
          {ep.needsQuery && (
            <div className="query-row">
              <div className="query-row__wrap">
                <span className="query-row__prompt">›</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && execute()}
                  placeholder={ep.placeholder}
                  className="query-row__input"
                />
              </div>
              <button className="exec-btn" onClick={() => execute()} disabled={loading}>
                {loading ? "..." : "EXEC"}
              </button>
            </div>
          )}

          {!ep.needsQuery && (
            <button className="exec-btn" onClick={() => execute()} disabled={loading} style={{ alignSelf: "flex-start" }}>
              {loading ? "..." : "EXEC"}
            </button>
          )}

          {/* Error */}
          {error && <div className="error-banner">⚠ {error}</div>}

          {/* Results */}
          {result && (
            <div className="results">
              <div className="results__label">
                Response — {ep.label}
              </div>
              <ResultView
                activeEndpoint={activeEndpoint}
                result={result}
                page={page}
                setPage={setPage}
              />
            </div>
          )}
        </div>

        {/* Right panel */}
        <aside className="dash__side">
          {/* Logs */}
          <div className="log-section">
            <div className="panel-header">System Log</div>
            <div ref={logRef} className="log-body">
              {logs.length === 0 && (
                <div className="log-empty">Aguardando atividade...</div>
              )}
              {logs.map((l, i) => <LogLine key={i} {...l} />)}
              {loading && (
                <div className="log-processing">▌ processando...</div>
              )}
            </div>
          </div>

          {/* History */}
          <div className="history-section">
            <div className="panel-header">History ({history.length})</div>
            {history.map((h, i) => (
              <button key={i} className="history-item" onClick={() => replayHistory(h)} title="Repetir consulta">
                <span>
                  <span className="history-item__ep">{h.endpoint}</span>
                  {h.query && ` · ${h.query}`}
                </span>
                <span className="history-item__ts">{h.ts}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
