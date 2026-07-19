# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [0.8.0] — 2026-07-19

### Added
- **Statement Import Wizard** (`ImportWizard.jsx`)
  - Drag-and-drop PDF upload zone with visual hover state
  - Encrypted PDF handling: password modal with remember-pattern checkbox
  - Uploading spinner state while Ollama parses the document
  - Staging review tables for extracted transactions and assets
  - Confirm-and-save flow to `/api/import/confirm`
  - Success and error states with retry/reset

---

## [0.7.0] — 2026-07-19

### Added
- **Assets Manager & Portfolio Rebalancer** (`Portfolio.jsx`)
  - Asset inventory table with filter sub-tabs: All, Stocks, Mutual Funds, Fixed Deposits, Gold, Cash
  - Sidebar add/edit form with scroll-into-view on row selection
  - Sync Prices button triggering `/api/portfolio/sync`
  - Rebalancer: target weight inputs (persisted in localStorage), sum validation warning
  - Buy/Sell advice rows with visual progress bars comparing actual vs target allocation

### Fixed
- `totalVal` now sums only tracked asset types (`stock`, `mutual_fund`, `fixed_deposit`, `gold`, `cash`) — prevents untracked types from skewing rebalancing math
- Added **Cash** asset type across tabs, form select, type badge map, and default weight allocation
- Wrapped `actualPercent`, `targetPercent`, `targetWeightsSum` in `var(--font-mono)` spans

---

## [0.6.0] — 2026-07-19

### Added
- **Bento Grid Dashboard** (`Dashboard.jsx`)
  - Net Worth card with Geist Mono typography
  - Custom SVG donut chart for asset allocation by type
  - Budget progress bars (current month spend vs limit)
  - Recent transactions list

---

## [0.5.0] — 2026-07-19

### Added
- **Frontend scaffolding** with Vite 5 + React 19
  - `vite.config.js`: port 3001, proxy `/api` → backend at 5001
  - `index.css`: CSS custom properties for Apple Clean dark theme (`--canvas-bg`, `--surface-bg`, `--accent`, `--positive`, `--negative`, `--font-sans`, `--font-mono`)
  - `App.jsx`: sidebar navigation shell (Dashboard, Assets & Calc, Import Statement tabs)
  - Stub components: `Dashboard.jsx`, `Portfolio.jsx`, `ImportWizard.jsx`
- Fonts loaded via CDN: Satoshi (UI text), Geist Mono (numbers)

---

## [0.4.0] — 2026-07-18

### Added
- **PDF Statement Import backend** (`/api/import/pdf`, `/api/import/confirm`)
  - Multer file upload (memory buffer, no temp disk write)
  - `pdf_passwords` table for encrypted PDF password vault with wildcard pattern matching
  - Local Ollama (Gemma4) integration to structure extracted text into JSON
  - Robust JSON extraction from Ollama response using `indexOf`/`lastIndexOf` guards
  - Mock flags: `MOCK_PDF_PARSING`, `MOCK_OLLAMA` for offline testing

### Fixed
- Validate script path resolution now uses `__dirname` — works from any working directory
- Ollama JSON parser no longer crashes on conversational text wrapping the JSON block

---

## [0.3.0] — 2026-07-18

### Added
- **Transactions API** (`/api/transactions` — GET, POST)
- **Budgets API** (`/api/budgets` — GET, POST)
  - Budget GET automatically aggregates current month expenses per category using UTC-bounded date ranges
  - `ON CONFLICT` upsert for budget category limits

### Fixed
- Timestamps normalized to UTC ISO strings before insert — prevents lexicographic range query failures in SQLite
- Future-dated transactions excluded from budget spend calculation

---

## [0.2.0] — 2026-07-18

### Added
- **Assets API** (`/api/assets` — GET, POST, DELETE)
  - Input validation with 400 Bad Request for missing or non-numeric fields
  - Partial update preserves existing `current_price` when not supplied
- **Portfolio Sync** (`POST /api/portfolio/sync`)
  - Yahoo Finance integration via `yahoo-finance2` for stocks/ETFs
  - Mutual fund price via `https://api.mfapi.in`

---

## [0.1.0] — 2026-07-18

### Added
- Monorepo workspace setup (`package.json` workspaces: `backend`, `frontend`)
- Express server with `GET /api/health`
- SQLite database initialized via `better-sqlite3` v12 (Node v26 compatible)
- Tables: `assets`, `transactions`, `budgets`, `pdf_passwords`, `import_logs`
- `.gitignore` excluding `node_modules`, `*.db`, `dist`, `.env`
