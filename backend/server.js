import express from 'express';
import cors from 'cors';
import YahooFinanceClass from 'yahoo-finance2';
import db from './database.js';

const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbPath: db.name });
});

app.get('/api/assets', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM assets');
    const assets = stmt.all();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', (req, res) => {
  try {
    const { id, name, type, ticker, units, avg_buy_price, current_price } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: name' });
    }
    if (!type || typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: type' });
    }
    if (units === undefined || units === null || typeof units !== 'number' || isNaN(units)) {
      return res.status(400).json({ error: 'Missing or invalid required field: units' });
    }
    if (avg_buy_price === undefined || avg_buy_price === null || typeof avg_buy_price !== 'number' || isNaN(avg_buy_price)) {
      return res.status(400).json({ error: 'Missing or invalid required field: avg_buy_price' });
    }
    if (current_price !== undefined && current_price !== null && (typeof current_price !== 'number' || isNaN(current_price))) {
      return res.status(400).json({ error: 'Invalid field: current_price' });
    }
    const last_updated = new Date().toISOString();
    if (id) {
      const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      const final_current_price = (current_price !== undefined && current_price !== null) ? current_price : existing.current_price;
      const stmt = db.prepare(`
        UPDATE assets 
        SET name = ?, type = ?, ticker = ?, units = ?, avg_buy_price = ?, current_price = ?, last_updated = ? 
        WHERE id = ?
      `);
      stmt.run(name, type, ticker || null, units, avg_buy_price, final_current_price, last_updated, id);
    } else {
      const final_current_price = (current_price !== undefined && current_price !== null) ? current_price : avg_buy_price;
      const stmt = db.prepare(`
        INSERT INTO assets (name, type, ticker, units, avg_buy_price, current_price, last_updated) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(name, type, ticker || null, units, avg_buy_price, final_current_price, last_updated);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM assets WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/portfolio/sync', async (req, res) => {
  try {
    const assets = db.prepare("SELECT * FROM assets WHERE ticker IS NOT NULL AND ticker != ''").all();
    const updated = [];
    
    for (const asset of assets) {
      try {
        let price = null;
        // Handle MF API or Yahoo Finance
        if (asset.type === 'mutual_fund' && /^\d+$/.test(asset.ticker)) {
          // mfapi.in
          const resMF = await fetch(`https://api.mfapi.in/mf/${asset.ticker}`);
          const dataMF = await resMF.json();
          if (dataMF.data && dataMF.data.length > 0) {
            const parsed = parseFloat(dataMF.data[0].nav);
            if (!isNaN(parsed)) {
              price = parsed;
            }
          }
        } else {
          // yahoo finance
          const quote = await yahooFinance.quote(asset.ticker);
          if (quote && (quote.regularMarketPrice !== undefined && quote.regularMarketPrice !== null)) {
            price = quote.regularMarketPrice;
          }
        }
        
        if (price !== null) {
          const last_updated = new Date().toISOString();
          db.prepare('UPDATE assets SET current_price = ?, last_updated = ? WHERE id = ?')
            .run(price, last_updated, asset.id);
          updated.push({ id: asset.id, name: asset.name, price });
        }
      } catch (syncErr) {
        console.error(`Failed to sync ticker: ${asset.ticker}`, syncErr);
      }
    }
    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', (req, res) => {
  try {
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC').all();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const { amount, description, category, timestamp, type } = req.body;
    const stmt = db.prepare(`
      INSERT INTO transactions (amount, description, category, timestamp, type) 
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(amount, description, category, timestamp || new Date().toISOString(), type);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/budgets', (req, res) => {
  try {
    const budgets = db.prepare('SELECT * FROM budgets').all();
    
    // Calculate current month's spending for each category
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const isoStart = startOfMonth.toISOString();
    
    const spending = db.prepare(`
      SELECT category, SUM(amount) as total 
      FROM transactions 
      WHERE type = 'expense' AND timestamp >= ? 
      GROUP BY category
    `).all(isoStart);
    
    const spendingMap = {};
    spending.forEach(s => { spendingMap[s.category] = s.total; });
    
    const result = budgets.map(b => ({
      id: b.id,
      category: b.category,
      limit: b.monthly_limit,
      spent: spendingMap[b.category] || 0
    }));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/budgets', (req, res) => {
  try {
    const { category, limit } = req.body;
    const stmt = db.prepare(`
      INSERT INTO budgets (category, monthly_limit) 
      VALUES (?, ?) 
      ON CONFLICT(category) DO UPDATE SET monthly_limit = excluded.monthly_limit
    `);
    stmt.run(category, limit);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

