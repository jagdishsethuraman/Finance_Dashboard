import express from 'express';
import cors from 'cors';
import YahooFinanceClass from 'yahoo-finance2';
import db from './database.js';
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js';


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
    const normalizedTimestamp = new Date(timestamp || Date.now()).toISOString();
    const stmt = db.prepare(`
      INSERT INTO transactions (amount, description, category, timestamp, type) 
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(amount, description, category, normalizedTimestamp, type);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/budgets', (req, res) => {
  try {
    const budgets = db.prepare('SELECT * FROM budgets').all();
    
    // Calculate current month's spending for each category
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    
    const startOfMonthUTC = new Date(Date.UTC(utcYear, utcMonth, 1, 0, 0, 0, 0));
    const isoStart = startOfMonthUTC.toISOString();
    
    const endOfMonthUTC = new Date(Date.UTC(utcYear, utcMonth + 1, 1, 0, 0, 0, 0));
    const isoEnd = endOfMonthUTC.toISOString();
    
    const spending = db.prepare(`
      SELECT category, SUM(amount) as total 
      FROM transactions 
      WHERE type = 'expense' AND timestamp >= ? AND timestamp < ?
      GROUP BY category
    `).all(isoStart, isoEnd);
    
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

const upload = multer({ storage: multer.memoryStorage() });

async function tryParsePDF(buffer, password = '') {
  if (process.env.MOCK_PDF_PARSING === 'true') {
    try {
      const mockConfig = JSON.parse(buffer.toString());
      if (mockConfig.isEncrypted && password !== mockConfig.expectedPassword) {
        const err = new Error('Incorrect password');
        err.name = 'PasswordException';
        throw err;
      }
      return { text: mockConfig.text || 'Mock PDF extracted text' };
    } catch (e) {
      if (e.name === 'PasswordException') throw e;
      // If it is not valid JSON, treat it as a standard PDF buffer failure in mock mode
      const err = new Error('Invalid PDF format or wrong password in mock');
      err.name = 'PasswordException';
      throw err;
    }
  }

  const options = {
    ownerPassword: password,
    userPassword: password
  };
  return await pdf(buffer, options);
}


app.post('/api/import/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const filename = req.file.originalname;
    let password = req.body.password || '';
    let text = '';
    let parsingSuccess = false;
    
    // Try parsing with supplied password first (or empty)
    try {
      const pdfData = await tryParsePDF(req.file.buffer, password);
      text = pdfData.text;
      parsingSuccess = true;
    } catch (err) {
      // If password is required/wrong, look at saved vault
      if (err.name === 'PasswordException' || err.message.includes('password') || err.message.includes('Password')) {
        // Look up saved passwords by pattern match
        const saved = db.prepare('SELECT * FROM pdf_passwords').all();
        for (const item of saved) {
          const escapedPattern = item.name_pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*');
          const regex = new RegExp('^' + escapedPattern + '$', 'i');
          if (regex.test(filename)) {
            try {
              const pdfData = await tryParsePDF(req.file.buffer, item.encrypted_password);
              text = pdfData.text;
              password = item.encrypted_password;
              parsingSuccess = true;
              break;
            } catch (retryErr) {
              // Stored password failed, keep looking
            }
          }
        }
      } else {
        throw err;
      }
    }

    if (!parsingSuccess) {
      return res.status(401).json({ status: 'PASSWORD_REQUIRED', filename });
    }

    // If password worked and user asked to remember
    if ((req.body.remember === 'true' || req.body.remember === true) && password) {
      const fileBasePattern = filename.split('_')[0] + '_*.pdf'; // simple auto-pattern
      db.prepare(`
        INSERT INTO pdf_passwords (name_pattern, encrypted_password) 
        VALUES (?, ?) 
        ON CONFLICT(name_pattern) DO UPDATE SET encrypted_password = excluded.encrypted_password
      `).run(fileBasePattern, password);
    }

    // Send raw text to local Ollama (Gemma4) or fallback
    let parsedData;
    if (process.env.MOCK_OLLAMA === 'true') {
      parsedData = {
        transactions: [
          { amount: 120.50, description: "Mock Vendor", category: "Food", timestamp: "2026-07-15T00:00:00Z", type: "expense" }
        ],
        assets: [
          { name: "Mock Asset", type: "stock", ticker: "MOCK", units: 10.0, avg_buy_price: 50.0 }
        ]
      };
    } else {
      try {
        const ollamaRes = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma4',
            messages: [
              {
                role: 'system',
                content: 'Analyze text and return ONLY valid JSON matching this schema: { "transactions": [{"amount": 10.0, "description": "Vendor", "category": "Food", "timestamp": "2026-07-15T00:00:00Z", "type": "expense"}], "assets": [{"name": "Asset Name", "type": "stock", "ticker": "TICKER", "units": 10.0, "avg_buy_price": 50.0}] }'
              },
              {
                role: 'user',
                content: `Extract from this text:\n\n${text.substring(0, 8000)}`
              }
            ],
            stream: false,
            options: {
              temperature: 0.1
            }
          })
        });

        if (!ollamaRes.ok) {
          throw new Error(`Ollama returned status ${ollamaRes.status}`);
        }
        const ollamaData = await ollamaRes.json();
        const content = ollamaData.message.content;
        const startIndex = content.indexOf('{');
        const endIndex = content.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
          throw new Error('No valid JSON block found in response');
        }
        const rawJson = content.substring(startIndex, endIndex + 1);
        parsedData = JSON.parse(rawJson);
      } catch (fetchErr) {
        if (process.env.NODE_ENV === 'test' || process.env.ALLOW_FALLBACK === 'true') {
          console.warn('Ollama offline, falling back to parsed metadata mock');
          parsedData = {
            transactions: [
              { amount: 100.0, description: "Ollama Offline Fallback", category: "Utilities", timestamp: new Date().toISOString(), type: "expense" }
            ],
            assets: []
          };
        } else {
          throw fetchErr;
        }
      }
    }

    res.json({ success: true, data: parsedData, filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/confirm', (req, res) => {
  try {
    const { transactions = [], assets = [], filename } = req.body;
    
    const insertTx = db.prepare(`
      INSERT INTO transactions (amount, description, category, timestamp, type) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertAsset = db.prepare(`
      INSERT INTO assets (name, type, ticker, units, avg_buy_price, current_price, last_updated) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      transactions.forEach(t => {
        insertTx.run(t.amount, t.description, t.category, t.timestamp || new Date().toISOString(), t.type);
      });
      assets.forEach(a => {
        const now = new Date().toISOString();
        insertAsset.run(a.name, a.type, a.ticker || null, a.units, a.avg_buy_price, a.avg_buy_price, now);
      });
      
      db.prepare('INSERT INTO import_logs (filename, status, records_added, timestamp) VALUES (?, ?, ?, ?)')
        .run(filename, 'success', transactions.length + assets.length, new Date().toISOString());
    })();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});


