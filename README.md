# Tidal Finance Dashboard

A privacy-first, local personal finance dashboard built with Node.js, SQLite, React, and local Ollama AI (Gemma4). Track your net worth, manage investments across asset classes, set monthly budgets, and automatically parse bank/brokerage PDF statements — all without sending your financial data to any cloud service.

---

## Features

- **Portfolio Overview** — Net worth card, SVG donut chart for asset allocation, budget progress bars, recent transactions list
- **Assets Manager** — Track stocks, mutual funds, gold, fixed deposits, and cash; live price sync via Yahoo Finance and mfapi.in
- **Portfolio Rebalancer** — Set target allocation percentages per asset class; get buy/sell trade advice based on current vs target weights
- **Statement Import Wizard** — Drag-and-drop PDF upload; local Ollama (Gemma4) AI extracts and structures transactions and assets automatically
- **Password Vault** — Remembers decryption passwords for recurring encrypted PDFs using filename pattern matching
- **Budget Tracker** — Monthly category spend limits with real-time progress against actual transactions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20+, Express 4, better-sqlite3 v12 |
| Database | SQLite (local file, `backend/db/finance.db`) |
| Frontend | React 19, Vite 5, pure CSS (no frameworks) |
| AI Parser | Local Ollama — Gemma4 model |
| Price Sync | yahoo-finance2, mfapi.in |
| Icons | lucide-react |
| Fonts | Satoshi (UI text), Geist Mono (numbers) |

---

## Prerequisites

- **Node.js** v20+ (tested on v26)
- **npm** v9+
- **Ollama** installed locally with `gemma4` model pulled:
  ```bash
  ollama pull gemma4
  ```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/jagdishsethuraman/Finance_Dashboard.git
cd Finance_Dashboard
```

### 2. Install dependencies

```bash
# Root workspace
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install --legacy-peer-deps && cd ..
```

### 3. Run the backend

```bash
node backend/server.js
```

Backend runs at `http://localhost:5001`. SQLite database is auto-created at `backend/db/finance.db` on first run.

### 4. Run the frontend

```bash
cd frontend && npm run dev
```

Frontend runs at `http://localhost:3001`. API requests are proxied to the backend automatically.

---

## Project Structure

```
Finance_Dashboard/
├── backend/
│   ├── database.js          # SQLite schema init (assets, transactions, budgets, pdf_passwords, import_logs)
│   ├── server.js            # Express API routes
│   └── validate_task4.js   # PDF import integration test script
├── frontend/
│   ├── index.html           # HTML entry (Satoshi + Geist Mono font imports)
│   ├── vite.config.js       # Vite config (port 3001, /api proxy to 5001)
│   └── src/
│       ├── main.jsx         # React entry point
│       ├── index.css        # CSS custom properties (dark Apple Clean theme)
│       ├── App.jsx          # Sidebar navigation shell
│       └── components/
│           ├── Dashboard.jsx      # Bento grid overview
│           ├── Portfolio.jsx      # Asset manager + rebalancer
│           └── ImportWizard.jsx   # PDF statement import wizard
├── .superpowers/sdd/        # Subagent-driven development task logs
├── LICENSE
├── CHANGELOG.md
├── ARCHITECTURE.md
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/assets` | List all assets |
| `POST` | `/api/assets` | Add or update an asset |
| `DELETE` | `/api/assets/:id` | Delete an asset |
| `POST` | `/api/portfolio/sync` | Sync live prices (Yahoo Finance + mfapi.in) |
| `GET` | `/api/transactions` | List transactions (supports `?limit=`) |
| `POST` | `/api/transactions` | Add a transaction |
| `GET` | `/api/budgets` | List budgets with current month spend |
| `POST` | `/api/budgets` | Set or update a budget |
| `POST` | `/api/import/pdf` | Upload and parse PDF statement |
| `POST` | `/api/import/confirm` | Confirm and save staged import data |

---

## Design Principles

- **Privacy-first** — No data leaves your machine. All processing is local.
- **Apple Clean** aesthetic — Dark canvas (`#0A0A0C`), Satoshi font, Geist Mono for numbers, no emojis in UI states.
- **No styling frameworks** — Pure CSS custom properties only.

---

## License

MIT — see [LICENSE](./LICENSE).
