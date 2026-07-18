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
    const last_updated = new Date().toISOString();
    if (id) {
      const stmt = db.prepare(`
        UPDATE assets 
        SET name = ?, type = ?, ticker = ?, units = ?, avg_buy_price = ?, current_price = ?, last_updated = ? 
        WHERE id = ?
      `);
      stmt.run(name, type, ticker || null, units, avg_buy_price, current_price || avg_buy_price, last_updated, id);
    } else {
      const stmt = db.prepare(`
        INSERT INTO assets (name, type, ticker, units, avg_buy_price, current_price, last_updated) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(name, type, ticker || null, units, avg_buy_price, current_price || avg_buy_price, last_updated);
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

