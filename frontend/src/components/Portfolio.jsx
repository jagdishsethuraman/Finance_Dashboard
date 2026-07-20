import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, AlertCircle, Scale, RefreshCw, X, DollarSign } from 'lucide-react';
import { useCurrency } from '../App';

export default function Portfolio() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { symbol, format, toUSD, currency, rate } = useCurrency();
  
  const [form, setForm] = useState({
    name: '',
    type: 'stock',
    ticker: '',
    units: '',
    avg_buy_price: '',
    current_price: ''
  });
  
  const [editingAssetId, setEditingAssetId] = useState(null);
  
  const defaultWeights = { stock: 40, mutual_fund: 30, fixed_deposit: 10, gold: 10, cash: 10 };
  const [targetWeights, setTargetWeights] = useState(() => {
    const saved = localStorage.getItem('targetWeights');
    return saved ? JSON.parse(saved) : defaultWeights;
  });
  
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error('Error loading assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/portfolio/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      await loadAssets();
    } catch (err) {
      console.error('Error syncing prices:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        ticker: form.ticker.trim() || null,
        units: parseFloat(form.units),
        avg_buy_price: toUSD(parseFloat(form.avg_buy_price)),
      };
      
      if (form.current_price !== '') {
        payload.current_price = toUSD(parseFloat(form.current_price));
      }

      if (editingAssetId) {
        payload.id = editingAssetId;
      }

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || 'Failed to save asset'}`);
        return;
      }

      setForm({ name: '', type: 'stock', ticker: '', units: '', avg_buy_price: '', current_price: '' });
      setEditingAssetId(null);
      setIsDrawerOpen(false);
      loadAssets();
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };
 
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingAssetId === id) {
          setEditingAssetId(null);
          setForm({ name: '', type: 'stock', ticker: '', units: '', avg_buy_price: '', current_price: '' });
          setIsDrawerOpen(false);
        }
        loadAssets();
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };
 
  const startEdit = (asset) => {
    setEditingAssetId(asset.id);
    const toDisplay = (usd) => currency === 'INR' ? (usd * rate).toFixed(2) : usd.toString();
    setForm({
      name: asset.name,
      type: asset.type,
      ticker: asset.ticker || '',
      units: asset.units.toString(),
      avg_buy_price: toDisplay(asset.avg_buy_price),
      current_price: asset.current_price ? toDisplay(asset.current_price) : ''
    });
    setIsDrawerOpen(true);
  };
 
  const cancelEdit = () => {
    setEditingAssetId(null);
    setForm({ name: '', type: 'stock', ticker: '', units: '', avg_buy_price: '', current_price: '' });
    setIsDrawerOpen(false);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    localStorage.setItem('targetWeights', JSON.stringify(targetWeights));
  }, [targetWeights]);

  const TRACKED_TYPES = ['stock', 'mutual_fund', 'fixed_deposit', 'gold', 'cash'];
  const typeTotals = { stock: 0, mutual_fund: 0, fixed_deposit: 0, gold: 0, cash: 0 };
  assets.forEach(a => {
    if (typeTotals[a.type] !== undefined) {
      typeTotals[a.type] += a.units * a.current_price;
    }
  });
  const totalVal = TRACKED_TYPES.reduce((sum, t) => sum + typeTotals[t], 0);
  const targetWeightsSum = Object.values(targetWeights).reduce((sum, w) => sum + w, 0);

  const rebalanceAdvice = Object.keys(targetWeights).map(type => {
    const targetPercent = targetWeights[type];
    const targetValue = (targetPercent / 100) * totalVal;
    const currentValue = typeTotals[type] || 0;
    const difference = targetValue - currentValue;
    const actualPercent = totalVal > 0 ? (currentValue / totalVal) * 100 : 0;
    
    return {
      type,
      currentValue,
      targetValue,
      difference,
      actualPercent,
      targetPercent
    };
  });

  const getTypeBadgeStyles = (type) => {
    const maps = {
      stock: { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--accent)', label: 'Stock' },
      mutual_fund: { bg: 'rgba(175, 82, 222, 0.1)', color: '#BF5AF2', label: 'Mutual Fund' },
      gold: { bg: 'rgba(255, 149, 0, 0.1)', color: '#FF9F0A', label: 'Gold' },
      fixed_deposit: { bg: 'rgba(52, 199, 89, 0.1)', color: 'var(--positive)', label: 'Fixed Deposit' },
      cash: { bg: 'rgba(94, 210, 203, 0.1)', color: '#5ED2CB', label: 'Cash' }
    };
    return maps[type] || { bg: 'var(--whisper-border)', color: 'var(--ink-secondary)', label: type };
  };

  const getSubTabLabel = (tab) => {
    const maps = {
      all: 'All Assets',
      stock: 'Stocks',
      mutual_fund: 'Mutual Funds',
      gold: 'Gold',
      fixed_deposit: 'Fixed Deposits',
      cash: 'Cash'
    };
    return maps[tab] || tab;
  };

  return (
    <div className="fade-in">
      {/* Header section */}
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
            Assets Inventory
          </h2>
          <p style={{ color: 'var(--ink-secondary)', margin: '4px 0 0 0', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            PORTFOLIO_ASSETS_MANAGER // ASSET_REBALANCING_MATRIX
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => {
              setEditingAssetId(null);
              setForm({ name: '', type: 'stock', ticker: '', units: '', avg_buy_price: '', current_price: '' });
              setIsDrawerOpen(true);
            }}
            style={{
              height: '32px',
              padding: '0 12px',
              background: 'var(--accent)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#FFFFFF'
            }}
          >
            <Plus size={12} /> ADD ASSET
          </button>
          <button 
            onClick={triggerSync} 
            disabled={syncing || loading}
            style={{
              height: '32px',
              padding: '0 12px',
              background: 'var(--surface-bg)',
              border: '1px solid var(--whisper-border)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--ink-primary)'
            }}
          >
            <RefreshCw size={12} className={syncing ? 'spin-anim' : ''} /> 
            {syncing ? 'SYNCING...' : 'SYNC PRICES'}
          </button>
        </div>
      </header>

      {/* Contiguous Telemetry Overview Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        background: 'var(--whisper-border)',
        gap: '1px',
        border: '1px solid var(--whisper-border)',
        marginBottom: '24px'
      }}>
        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <span style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '8px' }}>
            [A-01] Total Portfolio Value
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>
            {symbol}{format(totalVal)}
          </span>
        </div>

        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <span style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '8px' }}>
            [A-02] Total Assets Tracked
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 'bold', color: 'var(--ink-primary)' }}>
            {assets.length}
          </span>
        </div>

        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <span style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '8px' }}>
            [A-03] Target Allocation Sum
          </span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: targetWeightsSum === 100 ? 'var(--positive)' : 'var(--negative)' 
          }}>
            {targetWeightsSum}%
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Inventory Sub-tabs and Table */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--whisper-border)', padding: '20px' }}>
          {/* Flat Technical Tabs */}
          <div style={{ display: 'flex', marginBottom: '16px', borderBottom: '1px solid var(--whisper-border)' }}>
            {['all', 'stock', 'mutual_fund', 'fixed_deposit', 'gold', 'cash'].map(t => (
              <button
                key={t}
                onClick={() => setActiveSubTab(t)}
                style={{
                  padding: '10px 16px',
                  background: activeSubTab === t ? 'var(--accent-glow)' : 'transparent',
                  border: 'none',
                  borderBottom: activeSubTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  color: activeSubTab === t ? 'var(--accent)' : 'var(--ink-secondary)',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase'
                }}
              >
                {getSubTabLabel(t)}
              </button>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Asset Description</th>
                  <th style={{ textAlign: 'left' }}>Type</th>
                  <th style={{ textAlign: 'left' }}>Ticker</th>
                  <th style={{ textAlign: 'right' }}>Units</th>
                  <th style={{ textAlign: 'right' }}>Avg Price</th>
                  <th style={{ textAlign: 'right' }}>Current</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                  <th style={{ textAlign: 'center' }}>Ctrl</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      LOADING ASSETS DATA...
                    </td>
                  </tr>
                ) : assets.filter(a => activeSubTab === 'all' || a.type === activeSubTab).length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      NO ASSETS REGISTERED IN THIS CATEGORY.
                    </td>
                  </tr>
                ) : (
                  assets
                    .filter(a => activeSubTab === 'all' || a.type === activeSubTab)
                    .map(a => {
                      const badge = getTypeBadgeStyles(a.type);
                      return (
                        <tr key={a.id}>
                          <td style={{ fontSize: '13px', fontWeight: '700' }}>{a.name}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              textTransform: 'uppercase',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                            {a.ticker || '—'}
                          </td>
                          <td className="mono-num" style={{ textAlign: 'right', fontSize: '12px' }}>
                            {a.units.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </td>
                          <td className="mono-num" style={{ textAlign: 'right', fontSize: '12px' }}>
                            {symbol}{format(a.avg_buy_price)}
                          </td>
                          <td className="mono-num" style={{ textAlign: 'right', fontSize: '12px' }}>
                            {symbol}{format(a.current_price)}
                          </td>
                          <td className="mono-num" style={{ textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>
                            {symbol}{format(a.units * a.current_price)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => startEdit(a)}
                                style={{ 
                                  background: 'transparent', 
                                  border: '1px solid var(--whisper-border)',
                                  color: 'var(--ink-secondary)', 
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-mono)'
                                }}
                                title="Edit holding"
                              >
                                EDIT
                              </button>
                              <button 
                                onClick={() => handleDelete(a.id)}
                                style={{ 
                                  background: 'transparent', 
                                  border: '1px solid var(--whisper-border)',
                                  color: 'var(--negative)', 
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-mono)'
                                }}
                                title="Remove asset"
                              >
                                DEL
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rebalancing Panel */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--whisper-border)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Scale size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', letterSpacing: '0.05em' }}>
              Rebalancing Calculator Matrix
            </h3>
          </div>

          <p style={{ color: 'var(--ink-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)', lineHeight: '1.5', marginBottom: '20px' }}>
            Enter target values for asset category allocations. The matrix will output mechanical trade signals.
          </p>

          {/* Target Weights Input Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            background: 'var(--whisper-border)',
            gap: '1px',
            border: '1px solid var(--whisper-border)',
            marginBottom: '20px'
          }}>
            {Object.keys(targetWeights).map(type => {
              const badge = getTypeBadgeStyles(type);
              return (
                <div key={type} style={{
                  background: 'var(--canvas-bg)',
                  padding: '12px'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '10px', 
                    fontWeight: 'bold',
                    color: badge.color, 
                    textTransform: 'uppercase', 
                    marginBottom: '6px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {badge.label} Target
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={targetWeights[type]}
                      onChange={(e) => setTargetWeights({ ...targetWeights, [type]: Math.max(0, parseInt(e.target.value) || 0) })}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--whisper-border)',
                        padding: '4px 16px 4px 0',
                        fontSize: '14px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--ink-primary)',
                        outline: 'none'
                      }}
                    />
                    <span style={{ position: 'absolute', right: 0, color: 'var(--ink-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Target Weights Sum Validation Warning */}
          {targetWeightsSum !== 100 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              background: 'rgba(255, 69, 58, 0.06)', 
              border: '1px solid var(--negative)',
              color: 'var(--negative)',
              padding: '12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              marginBottom: '20px'
            }}>
              <AlertCircle size={14} />
              <span>ALLOCATION WARNING: TARGET SUM = {targetWeightsSum}% (MUST BE EXACTLY 100%)</span>
            </div>
          )}

          {/* Comparison and Advice */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 'bold', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              // Target vs Actual Matrix Comparison
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rebalanceAdvice.map(advice => {
                const badge = getTypeBadgeStyles(advice.type);
                const isBuy = advice.difference >= 0;
                const diffAbs = Math.abs(advice.difference);
                const isOnTarget = diffAbs < 0.01;

                return (
                  <div key={advice.type} style={{ 
                    background: 'var(--canvas-bg)', 
                    border: '1px solid var(--whisper-border)',
                    padding: '12px 16px', 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>{badge.label}</span>
                        <span style={{ marginLeft: '8px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
                          (ACTUAL: {advice.actualPercent.toFixed(1)}% | TARGET: {advice.targetPercent}%)
                        </span>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: isOnTarget ? 'var(--ink-secondary)' : isBuy ? 'var(--positive)' : 'var(--negative)'
                      }}>
                        {isOnTarget ? '[ OK ]' : isBuy ? `[ BUY +${symbol}${format(diffAbs)} ]` : `[ SELL -${symbol}${format(diffAbs)} ]`}
                      </div>
                    </div>

                    <div style={{ height: '4px', background: 'var(--surface-bg)', position: 'relative', overflow: 'hidden' }}>
                      {/* Target marker */}
                      <div style={{
                        position: 'absolute',
                        left: `${advice.targetPercent}%`,
                        top: 0,
                        width: '2px',
                        height: '100%',
                        backgroundColor: 'var(--ink-primary)',
                        zIndex: 2,
                        opacity: 0.5
                      }} />

                      {/* Actual progress */}
                      <div style={{
                        height: '100%',
                        width: `${Math.min(advice.actualPercent, 100)}%`,
                        background: badge.color
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Side Slide Drawer */}
      <div 
        className={`drawer-overlay ${isDrawerOpen ? 'active' : ''}`} 
        onClick={() => cancelEdit()}
      >
        <div 
          className="drawer-content" 
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--whisper-border)', paddingBottom: '12px' }}>
            <h3 className="title-text" style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '0.05em' }}>
              {editingAssetId ? 'EDIT_HOLDING' : 'NEW_ASSET_RECORD'}
            </h3>
            <button 
              onClick={cancelEdit}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Close drawer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', marginBottom: '6px' }}>ASSET NAME</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Apple Inc, Vanguard S&P 500"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', marginBottom: '6px' }}>ASSET TYPE</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="stock">Stock</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="fixed_deposit">Fixed Deposit</option>
                <option value="gold">Gold</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', marginBottom: '6px' }}>
                TICKER / SYMBOL (OPTIONAL)
              </label>
              <input
                type="text"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                placeholder="e.g. AAPL, 100033"
              />
              <span style={{ fontSize: '10px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px', display: 'block' }}>
                Yahoo Finance / MF API sync key
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', marginBottom: '6px' }}>UNITS</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', marginBottom: '6px' }}>AVG PRICE</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={form.avg_buy_price}
                  onChange={(e) => setForm({ ...form, avg_buy_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', marginBottom: '6px' }}>
                CURRENT PRICE (OPTIONAL)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.current_price}
                onChange={(e) => setForm({ ...form, current_price: e.target.value })}
                placeholder={form.avg_buy_price || '0.00'}
              />
            </div>

            <button
              type="submit"
              style={{
                background: 'var(--accent)',
                border: 'none',
                color: '#ffffff',
                padding: '12px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                marginTop: '12px',
                cursor: 'pointer'
              }}
            >
              {editingAssetId ? 'COMMIT UPDATE' : 'CREATE RECORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
