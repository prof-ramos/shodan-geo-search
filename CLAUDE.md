# CLAUDE.md — AI Assistant Guide for Shodan Geo Search

## Project Overview

**Shodan Geo Search** is a Node.js/Express web application that lets users search for internet-connected devices by geographic location using the [Shodan API](https://www.shodan.io/). Users submit latitude, longitude, and a radius, and the backend queries Shodan and returns results rendered in a table.

- **Live demo:** https://shodan.proframos.com
- **Language:** Portuguese (pt-BR) UI
- **Stack:** Node.js + Express (backend), Vanilla JS + HTML + CSS (frontend)

---

## Repository Structure

```
shodan-geo-search/
├── public/              # Static frontend assets (served by Express)
│   ├── index.html       # Main UI — search form and results table (pt-BR)
│   ├── script.js        # Client-side logic: form submit, fetch, render results
│   └── styles.css       # Responsive CSS with CSS variables, gradients, glassmorphism
├── tests/
│   └── server.test.js   # Jest + Supertest end-to-end tests (10 tests)
├── server.js            # Express entry point — API routes, validation, static serving
├── package.json         # Scripts, dependencies, Node ≥18 requirement
├── jest.config.js       # Jest config — coverage from server.js and public/**/*.js
├── Dockerfile           # Node 22 Alpine multi-stage image
├── .env.example         # Environment variable template
└── README.md            # Setup, usage, API docs (Portuguese)
```

---

## Development Setup

### Prerequisites
- Node.js ≥ 18.0.0
- A Shodan API key (https://account.shodan.io/)

### Local Setup

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env — set SHODAN_API_KEY and optionally PORT

# Start the server
npm start
# Server runs on http://localhost:3000 (or $PORT)
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SHODAN_API_KEY` | Yes | — | Shodan API key for device search |
| `PORT` | No | 3000 | HTTP port the server listens on |

### Docker

```bash
docker build -t shodan-geo-search .
docker run -p 3000:3000 -e SHODAN_API_KEY=your_key shodan-geo-search
```

---

## Running Tests

```bash
# Run all tests with coverage report
npm test

# Run in watch mode during development
npm run test:watch
```

**Test framework:** Jest 30 + Supertest 7

**Test file:** `tests/server.test.js` (10 tests, all passing)

**Test suites:**
1. `POST /api/search` — Input validation (missing params, negative radius, non-numeric values, missing API key, valid input)
2. Static file serving — `index.html`, `styles.css`, `script.js` all accessible

**Coverage** is collected from `server.js` and `public/**/*.js`. Reports are written to `coverage/` (gitignored).

---

## API Endpoint

### `POST /api/search`

Accepts JSON body; returns Shodan device results.

**Request body:**
```json
{
  "latitude": "48.8566",
  "longitude": "2.3522",
  "radius": "10"
}
```

**Success response (`200`):**
```json
{
  "matches": [ ... ],
  "total": 42
}
```

**Error responses:**
- `400` — Missing or invalid parameters (latitude, longitude, radius must be numeric; radius must be positive)
- `500` — Missing `SHODAN_API_KEY` or Shodan API failure

---

## Code Conventions

### Backend (`server.js`)
- **Module system:** CommonJS (`require()` / `module.exports`)
- **Naming:** camelCase for variables and functions
- **Error handling:** `try/catch` blocks; JSON error responses with `{ error: "..." }`
- **Validation:** Validate all inputs before calling external APIs
- **No unused imports** — keep dependencies minimal

### Frontend (`public/script.js`)
- **Vanilla JS only** — no frameworks or bundlers
- **Async/await** for all fetch calls
- **DOM access:** `document.getElementById()` and `innerHTML` for rendering
- **Error handling:** `try/catch` around fetch; display user-friendly Portuguese error messages

### HTML (`public/index.html`)
- **Semantic HTML5** — uses `<main>`, `<form>`, `<table>`
- **Accessibility** — `aria-live="polite"` on status containers
- **Form inputs** — use `type="number"`, `step="any"`, `required` attributes
- **Language:** `lang="pt-BR"` — UI text is in Portuguese

### CSS (`public/styles.css`)
- **CSS custom properties** for colors and shadows
- **CSS Grid** for form layout
- **Responsive breakpoints:** 880px and 560px
- **Modern effects:** gradients, `backdrop-filter`, transitions

### Tests (`tests/server.test.js`)
- One `describe` block per feature area
- `beforeAll` / `afterAll` for app lifecycle
- Descriptive test names in English
- Assertions use Jest built-ins (`.toBe()`, `.toContain()`, `.toBeDefined()`)
- Tests must not call the real Shodan API (missing key triggers 500 path)

---

## Key Workflows for AI Assistants

### Adding a New Feature
1. Read `server.js` to understand existing route structure before adding new routes
2. Add backend route in `server.js` with input validation
3. Update `public/script.js` for any new client interactions
4. Add tests in `tests/server.test.js` covering success and error paths
5. Run `npm test` — all 10+ tests must pass before committing

### Modifying Validation Logic
- Validation lives in `server.js` inside the `POST /api/search` handler
- Mirror any backend changes in frontend UX feedback (`public/script.js`)
- Update or add corresponding tests in `tests/server.test.js`

### Changing the UI
- HTML structure is in `public/index.html`; keep semantic HTML and pt-BR text
- Styles are in `public/styles.css`; use existing CSS variables for colors
- Do not introduce JS frameworks or build tools — the frontend is intentionally vanilla

### Dependency Changes
- Only add dependencies that are genuinely needed
- Production deps go in `dependencies`; test/dev tools go in `devDependencies`
- Run `npm test` after any dependency change to confirm nothing broke

---

## Important Notes

- **Never commit `.env`** — it is gitignored; `.env.example` is the template
- **`coverage/`** is gitignored — do not commit coverage reports
- **`node_modules/`** is gitignored — always run `npm install` after cloning
- The Dockerfile uses `npm ci --only=production` — devDependencies are not in the image
- Node ≥ 18 is required; the Dockerfile uses Node 22 Alpine
- All user-facing text is in **Portuguese (pt-BR)**; keep this consistent when adding UI copy
