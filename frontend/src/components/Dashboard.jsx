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
    <div className="fade-in">
      {/* Page Header (Touch Border Grid) */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--whisper-border)',
        marginBottom: '24px'
      }}>
        <div>
          <h2 className="title-text" style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '0.05em' }}>
            Telemetry Overview
          </h2>
          <p style={{ color: 'var(--ink-secondary)', margin: '4px 0 0 0', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            LOCAL_PORTFOLIO_TELEMETRY // SECURE_STORAGE
          </p>
        </div>
        <button 
          onClick={triggerSync} 
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '32px',
            padding: '0 12px',
            background: 'var(--surface-bg)',
            border: '1px solid var(--whisper-border)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px'
          }}
        >
          <RefreshCw size={12} className={syncing ? 'spin-anim' : ''} /> 
          {syncing ? 'SYNCING...' : 'SYNC PRICES'}
        </button>
      </header>

      {/* Strict Border Grid: Parent background acts as separator lines */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        background: 'var(--whisper-border)',
        gap: '1px',
        border: '1px solid var(--whisper-border)',
        marginBottom: '24px'
      }}>
        {/* Net Worth Module */}
        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          padding: '24px'
        }}>
          <p style={{ 
            color: 'var(--ink-secondary)', 
            margin: '0 0 12px 0', 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            [01] Net Asset Value (NAV)
          </p>
          <h3 className="mono-num" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'var(--accent)',
            margin: 0
          }}>
            {symbol}{format(summary.netWorth)}
          </h3>
        </div>

        {/* Allocation Donut Module */}
        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
            <svg width="90" height="90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="transparent" stroke="var(--canvas-bg)" strokeWidth="16" />
              {summary.allocation.map((alloc, idx) => {
                const strokeDashoffset = circ - (alloc.percent / 100) * circ;
                const rotation = (accumulatedPercent / 100) * 360;
                accumulatedPercent += alloc.percent;
                const colors = ['#007aff', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
                return (
                  <circle 
                    key={idx}
                    cx="60" 
                    cy="60" 
                    r={radius} 
                    fill="transparent" 
                    stroke={colors[idx % colors.length]} 
                    strokeWidth="16"
                    strokeDasharray={circ}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(${rotation - 90} 60 60)`}
                  />
                );
              })}
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ 
              color: 'var(--ink-secondary)', 
              margin: '0 0 10px 0', 
              fontSize: '11px', 
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              [02] Class Weights
            </p>
            {summary.allocation.map((a, idx) => {
              const colors = ['#007aff', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', background: colors[idx % colors.length] }} />
                  <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{a.type.replace('_', ' ')}</span>
                  <span className="mono-num" style={{ fontFamily: 'var(--font-mono)', marginLeft: 'auto', fontWeight: 'bold' }}>{a.percent.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget Module */}
        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          padding: '24px'
        }}>
          <p style={{ 
            color: 'var(--ink-secondary)', 
            margin: '0 0 12px 0', 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            [03] Active Limits (Monthly)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {budgets.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0 }}>NO BUDGETS CONFIGURED</p>
            ) : (
              budgets.slice(0, 3).map((b, idx) => {
                const percent = Math.min((b.spent / b.limit) * 100, 100);
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ textTransform: 'uppercase' }}>{b.category}</span>
                      <span className="mono-num" style={{ color: percent >= 90 ? 'var(--negative)' : 'var(--ink-primary)' }}>
                        {symbol}{format(b.spent, 0)} / {symbol}{format(b.limit, 0)}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--canvas-bg)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: percent >= 90 ? 'var(--negative)' : 'var(--accent)'
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Transactions Grid Module */}
      <div style={{
        background: 'var(--surface-bg)',
        border: '1px solid var(--whisper-border)',
        padding: '24px'
      }}>
        <h4 className="title-text" style={{ margin: '0 0 16px 0', fontSize: '14px', letterSpacing: '0.05em' }}>
          Recent Telemetry Feed
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Telemetry ID / Desc</th>
                <th style={{ textAlign: 'left' }}>Category</th>
                <th style={{ textAlign: 'left' }}>Timestamp</th>
                <th style={{ textAlign: 'right' }}>Telemetry Value</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--ink-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '24px 0' }}>
                    NO DATA AVAILABLE
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '13px', fontWeight: '600' }}>{t.description}</td>
                    <td style={{ fontSize: '12px', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      {t.category}
                    </td>
                    <td className="mono-num" style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                      {new Date(t.timestamp).toLocaleDateString()}
                    </td>
                    <td className="mono-num" style={{
                      textAlign: 'right',
                      fontWeight: 'bold',
                      color: t.type === 'expense' ? 'var(--negative)' : 'var(--positive)'
                    }}>
                      {t.type === 'expense' ? '-' : '+'}{symbol}{format(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
