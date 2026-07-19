# Architecture — Tidal Finance Dashboard

## Overview

Tidal Finance is a **local-first, privacy-preserving** personal finance dashboard. All data — transactions, assets, statements — stays on the user's machine. There are no external cloud dependencies for data storage or AI inference.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User's Machine                               │
│                                                                     │
│  ┌──────────────────────┐       ┌──────────────────────────────┐   │
│  │   React Frontend     │       │     Express Backend           │   │
│  │   Vite dev server    │◄─────►│     Node.js / Express 4      │   │
│  │   localhost:3001     │  HTTP │     localhost:5001            │   │
│  │                      │  API  │                              │   │
│  │  Components:         │       │  Routes:                     │   │
│  │  ├─ App.jsx          │       │  ├─ /api/health              │   │
│  │  ├─ Dashboard.jsx    │       │  ├─ /api/assets              │   │
│  │  ├─ Portfolio.jsx    │       │  ├─ /api/portfolio/sync      │   │
│  │  └─ ImportWizard.jsx │       │  ├─ /api/transactions        │   │
│  └──────────────────────┘       │  ├─ /api/budgets             │   │
│                                 │  ├─ /api/import/pdf          │   │
│                                 │  └─ /api/import/confirm      │   │
│                                 └───────────┬──────────────────┘   │
│                                             │                       │
│                          ┌──────────────────▼──────────────────┐   │
│                          │         SQLite Database              │   │
│                          │   backend/db/finance.db              │   │
│                          │                                      │   │
│                          │  Tables:                             │   │
│                          │  ├─ assets                           │   │
│                          │  ├─ transactions                     │   │
│                          │  ├─ budgets                          │   │
│                          │  ├─ pdf_passwords                    │   │
│                          │  └─ import_logs                      │   │
│                          └──────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────┐       ┌──────────────────────────────┐   │
│  │   Ollama (Local AI)  │       │   External Price APIs        │   │
│  │   localhost:11434    │       │   (network required)         │   │
│  │   Model: gemma4      │       │                              │   │
│  │                      │       │  ├─ Yahoo Finance (stocks)   │   │
│  │  Used for:           │       │  └─ mfapi.in (mutual funds) │   │
│  │  PDF text → JSON     │       └──────────────────────────────┘   │
│  └──────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
Finance_Dashboard/
├── backend/
│   ├── database.js           # SQLite schema creation and table init
│   ├── server.js             # Express server, all API route handlers
│   └── validate_task4.js     # Integration test for PDF import endpoint
│
├── frontend/
│   ├── index.html            # HTML shell, CDN font imports (Satoshi, Geist Mono)
│   ├── vite.config.js        # Vite: port 3001, proxy /api → :5001
│   └── src/
│       ├── main.jsx          # ReactDOM.createRoot entry point
│       ├── index.css         # CSS custom properties (design tokens)
│       ├── App.jsx           # Root layout: sidebar + tab routing
│       └── components/
│           ├── Dashboard.jsx      # Bento grid: net worth, donut chart, budgets, transactions
│           ├── Portfolio.jsx      # Asset inventory table + rebalancer calculator
│           └── ImportWizard.jsx   # PDF upload wizard, password vault UI, staging review
│
├── .superpowers/sdd/         # Internal: subagent-driven development logs and task briefs
├── README.md
├── CHANGELOG.md
├── ARCHITECTURE.md
└── LICENSE
```

---

## Backend Architecture

### Express Server (`server.js`)

Single-file Express server. All routes are registered in one module for simplicity — the project is not large enough to warrant a router-per-resource split.

**Key patterns:**
- `better-sqlite3` synchronous API — no async DB calls, no connection pool complexity
- All timestamps stored as UTC ISO 8601 strings (`new Date().toISOString()`) for portable range queries
- Input validation returns `400` before any DB write
- `ON CONFLICT(category) DO UPDATE` upsert pattern for budgets

### Database (`database.js`)

SQLite, single file. Schema:

| Table | Purpose |
|---|---|
| `assets` | Portfolio holdings (name, type, ticker, units, prices) |
| `transactions` | Income and expense records with category and timestamp |
| `budgets` | Monthly category spend limits |
| `pdf_passwords` | Encrypted PDF password vault with filename wildcard patterns |
| `import_logs` | Audit log of all statement imports |

### PDF Import Pipeline

```
User uploads PDF
      │
      ▼
Multer (memory buffer)
      │
      ▼
pdf-parse → extracts raw text
      │
      ├─ Success → send to Ollama
      │
      └─ PasswordException
            │
            ▼
      Query pdf_passwords table
      Match filename against wildcard patterns (regex)
      Retry decryption with each matching password
            │
            ├─ Unlocked → send to Ollama
            └─ All fail → 401 PASSWORD_REQUIRED
                              │
                              ▼
                     Frontend shows password modal
                     User enters password + remember flag
                     Re-POST with password
                     On success: save pattern to pdf_passwords
```

**Ollama integration:**
- POST to `http://localhost:11434/api/chat` with `gemma4` model
- System prompt instructs model to return only valid JSON matching the import schema
- Response JSON extracted using `indexOf('{')` / `lastIndexOf('}')` guards against conversational wrapping

---

## Frontend Architecture

### Design System

All visual tokens are CSS custom properties in `src/index.css`:

| Token | Value | Purpose |
|---|---|---|
| `--canvas-bg` | `#0A0A0C` | Page background |
| `--surface-bg` | `#151518` | Card/panel backgrounds |
| `--ink-primary` | `#F5F5F7` | Primary text |
| `--ink-secondary` | `#8E8E93` | Secondary/muted text |
| `--whisper-border` | `rgba(255,255,255,0.08)` | Subtle dividers |
| `--positive` | `#34C759` | Gains, success states |
| `--negative` | `#FF453A` | Losses, error states |
| `--accent` | `#007AFF` | Interactive elements |
| `--font-sans` | Satoshi | All UI text |
| `--font-mono` | Geist Mono | All numeric values |

### Component Responsibilities

| Component | Responsibility |
|---|---|
| `App.jsx` | Sidebar layout, tab state, renders active component |
| `Dashboard.jsx` | Fetches `/api/assets`, `/api/budgets`, `/api/transactions`; renders overview cards |
| `Portfolio.jsx` | Fetches `/api/assets`; manages add/edit form; runs rebalancer math client-side |
| `ImportWizard.jsx` | Multi-state upload wizard: idle → uploading → staging → success/error |

### Portfolio Rebalancer Logic

```
TRACKED_TYPES = [stock, mutual_fund, fixed_deposit, gold, cash]

typeTotals = sum asset values per tracked type
totalVal   = sum of typeTotals (NOT all assets — avoids skew from untracked types)

For each type in targetWeights:
  targetValue  = (targetWeight% / 100) × totalVal
  currentValue = typeTotals[type]
  difference   = targetValue - currentValue
  → difference > 0 : BUY
  → difference < 0 : SELL
  → |difference| < 0.01 : ON TARGET
```

---

## Data Flow

### Live Price Sync

```
POST /api/portfolio/sync
      │
      ├─ For each asset where type = 'stock' and ticker exists
      │     → yahoo-finance2.quoteSummary(ticker)
      │     → UPDATE assets SET current_price = ? WHERE id = ?
      │
      └─ For each asset where type = 'mutual_fund' and ticker exists
            → GET https://api.mfapi.in/mf/{ticker}
            → UPDATE assets SET current_price = latest NAV
```

### Budget Spend Calculation

```
GET /api/budgets
      │
      ├─ Fetch all budget rows
      └─ For current UTC month [startOfMonth, endOfMonth):
            SELECT category, SUM(amount) FROM transactions
            WHERE type = 'expense'
            AND timestamp >= isoStart AND timestamp < isoEnd
            GROUP BY category
            → merge spend into budget response
```

---

## Security Considerations

- **No auth layer** — intended for single-user local use only. Do not expose to a network.
- **PDF passwords** stored in plaintext in SQLite — acceptable for local-only deployments; encrypt at rest if sharing the machine.
- **Ollama** runs fully offline; no statement text is sent to external services.
- **validate_task4.js** uses `DELETE FROM` on the live DB in test mode — keep `MOCK_PDF_PARSING=true` and `MOCK_OLLAMA=true` for safe test runs.

---

## Development Conventions

- All timestamps: UTC ISO 8601 (`new Date().toISOString()`)
- No styling frameworks — pure CSS custom properties
- No emojis in UI states or badges
- Numbers always rendered with `font-family: var(--font-mono)`
- Backend runs on port `5001`, frontend on `3001`
