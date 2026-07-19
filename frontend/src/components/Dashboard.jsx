import React, { useEffect, useState } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useCurrency } from '../App';

export default function Dashboard() {
  const [summary, setSummary] = useState({ netWorth: 0, change: 0, allocation: [] });
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const { symbol, format } = useCurrency();

  const loadData = async () => {
    try {
      const resAssets = await fetch('/api/assets');
      const assets = await resAssets.json();
      
      const resBudgets = await fetch('/api/budgets');
      const budgetsData = await resBudgets.json();
      
      const resTx = await fetch('/api/transactions');
      const txData = await resTx.json();
      
      // Compute allocations
      let totalVal = 0;
      const typeTotals = {};
      assets.forEach(a => {
        const val = a.units * a.current_price;
        totalVal += val;
        typeTotals[a.type] = (typeTotals[a.type] || 0) + val;
      });

      const allocation = Object.keys(typeTotals).map(k => ({
        type: k,
        value: typeTotals[k],
        percent: totalVal > 0 ? (typeTotals[k] / totalVal) * 100 : 0
      }));

      setSummary({ netWorth: totalVal, allocation });
      setBudgets(budgetsData);
      setTransactions(txData.slice(0, 10));
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    await fetch('/api/portfolio/sync', { method: 'POST' });
    await loadData();
    setSyncing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // SVG Donut calculation constants
  const radius = 50;
  const circ = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="title-text" style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Overview</h2>
          <p style={{ color: 'var(--ink-secondary)', margin: '4px 0 0 0' }}>Financial health and budgets dashboard</p>
        </div>
        <button 
          onClick={triggerSync} 
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: 'var(--surface-bg)',
            border: '1px solid var(--whisper-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          <RefreshCw size={16} className={syncing ? 'spin-anim' : ''} /> {syncing ? 'Syncing...' : 'Sync Prices'}
        </button>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Net Worth Bento */}
        <div className="glass-card" style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }}>
          <p style={{ color: 'var(--ink-secondary)', margin: '0 0 8px 0', fontSize: '14px' }}>Net Worth</p>
          <h3 className="mono-num" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '36px',
            fontWeight: 'bold',
            margin: 0
          }}>
            {symbol}{format(summary.netWorth)}
          </h3>
        </div>

        {/* Allocation Bento */}
        <div className="glass-card" style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="transparent" stroke="var(--canvas-bg)" strokeWidth="12" />
              {summary.allocation.map((alloc, idx) => {
                const strokeDashoffset = circ - (alloc.percent / 100) * circ;
                const rotation = (accumulatedPercent / 100) * 360;
                accumulatedPercent += alloc.percent;
                const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
                return (
                  <circle 
                    key={idx}
                    cx="60" 
                    cy="60" 
                    r={radius} 
                    fill="transparent" 
                    stroke={colors[idx % colors.length]} 
                    strokeWidth="12"
                    strokeDasharray={circ}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(${rotation - 90} 60 60)`}
                  />
                );
              })}
            </svg>
          </div>
          <div>
            <p style={{ color: 'var(--ink-secondary)', margin: '0 0 8px 0', fontSize: '14px' }}>Allocation</p>
            {summary.allocation.map((a, idx) => {
              const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[idx % colors.length] }} />
                  <span style={{ textTransform: 'capitalize' }}>{a.type}</span>
                  <span className="mono-num" style={{ fontFamily: 'var(--font-mono)', marginLeft: 'auto', fontWeight: 'bold' }}>{a.percent.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget Limits Bento */}
        <div className="glass-card" style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }}>
          <p style={{ color: 'var(--ink-secondary)', margin: '0 0 12px 0', fontSize: '14px' }}>Monthly Budgets</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {budgets.slice(0, 3).map((b, idx) => {
              const percent = Math.min((b.spent / b.limit) * 100, 100);
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>{b.category}</span>
                    <span className="mono-num" style={{ fontFamily: 'var(--font-mono)' }}>{symbol}{format(b.spent, 0)} / {symbol}{format(b.limit, 0)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--canvas-bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${percent}%`,
                      background: percent >= 90 ? 'var(--negative)' : 'var(--accent)',
                      borderRadius: 'var(--radius-sm)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transactions Feed */}
      <div className="glass-card" style={{
        background: 'var(--surface-bg)',
        border: '1px solid var(--whisper-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px'
      }}>
        <h4 className="title-text" style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Recent Transactions</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--whisper-border)', color: 'var(--ink-secondary)' }}>
              <th style={{ padding: '12px 8px' }}>Description</th>
              <th style={{ padding: '12px 8px' }}>Category</th>
              <th style={{ padding: '12px 8px' }}>Date</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--whisper-border)' }}>
                <td style={{ padding: '12px 8px' }}>{t.description}</td>
                <td style={{ padding: '12px 8px' }}>{t.category}</td>
                <td style={{ padding: '12px 8px', color: 'var(--ink-secondary)' }}>{new Date(t.timestamp).toLocaleDateString()}</td>
                <td className="mono-num" style={{
                  padding: '12px 8px',
                  textAlign: 'right',
                  fontFamily: 'var(--font-mono)',
                  color: t.type === 'expense' ? 'var(--negative)' : 'var(--positive)'
                }}>
                  {t.type === 'expense' ? '-' : '+'}{symbol}{format(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
