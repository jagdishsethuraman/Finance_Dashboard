import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, AlertCircle, Scale, RefreshCw, X, DollarSign } from 'lucide-react';

export default function Portfolio() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
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
        avg_buy_price: parseFloat(form.avg_buy_price),
      };
      
      // Send current_price if provided (especially useful for custom assets without tickers)
      if (form.current_price !== '') {
        payload.current_price = parseFloat(form.current_price);
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

      // Reset form and reload
      setForm({ name: '', type: 'stock', ticker: '', units: '', avg_buy_price: '', current_price: '' });
      setEditingAssetId(null);
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
        }
        loadAssets();
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };

  const startEdit = (asset) => {
    setEditingAssetId(asset.id);
    setForm({
      name: asset.name,
      type: asset.type,
      ticker: asset.ticker || '',
      units: asset.units.toString(),
      avg_buy_price: asset.avg_buy_price.toString(),
      current_price: asset.current_price ? asset.current_price.toString() : ''
    });
    // Scroll to form smoothly
    const formEl = document.getElementById('asset-form-card');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEdit = () => {
    setEditingAssetId(null);
    setForm({ name: '', type: 'stock', ticker: '', units: '', avg_buy_price: '', current_price: '' });
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    localStorage.setItem('targetWeights', JSON.stringify(targetWeights));
  }, [targetWeights]);

  // Calculate totals by tracked type only — totalVal limited to tracked types to keep rebalancing math consistent
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

  // Type styling helpers
  const getTypeBadgeStyles = (type) => {
    const maps = {
      stock: { bg: 'rgba(0, 122, 255, 0.12)', color: '#0A84FF', label: 'Stock' },
      mutual_fund: { bg: 'rgba(175, 82, 222, 0.12)', color: '#BF5AF2', label: 'Mutual Fund' },
      gold: { bg: 'rgba(255, 149, 0, 0.12)', color: '#FF9F0A', label: 'Gold' },
      fixed_deposit: { bg: 'rgba(52, 199, 89, 0.12)', color: '#30D158', label: 'Fixed Deposit' },
      cash: { bg: 'rgba(94, 210, 203, 0.12)', color: '#5ED2CB', label: 'Cash' }
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
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Assets & Rebalancing</h2>
          <p style={{ color: 'var(--ink-secondary)', margin: '4px 0 0 0' }}>Manage portfolio holdings and calculate rebalancing trade advice</p>
        </div>
        <button 
          onClick={triggerSync} 
          disabled={syncing || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: 'var(--surface-bg)',
            border: '1px solid var(--whisper-border)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: 'var(--ink-primary)',
            transition: 'all 0.2s',
            opacity: syncing ? 0.7 : 1
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--whisper-border)'}
        >
          <RefreshCw size={16} className={syncing ? 'spin-anim' : ''} /> {syncing ? 'Syncing...' : 'Sync Prices'}
        </button>
      </header>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginBottom: '6px' }}>Total Portfolio Value</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 'bold', color: 'var(--ink-primary)' }}>
            ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginBottom: '6px' }}>Total Assets Tracked</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 'bold', color: 'var(--ink-primary)' }}>
            {assets.length}
          </span>
        </div>

        <div style={{
          gridColumn: 'span 4',
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginBottom: '6px' }}>Target Weights Sum</span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: targetWeightsSum === 100 ? 'var(--positive)' : 'var(--negative)' 
          }}>
            {targetWeightsSum}%
          </span>
        </div>
      </div>

      {/* Main Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Side: Table & Rebalancer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Inventory Sub-tabs and Table */}
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['all', 'stock', 'mutual_fund', 'fixed_deposit', 'gold', 'cash'].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveSubTab(t)}
                  style={{
                    padding: '8px 16px',
                    background: activeSubTab === t ? 'var(--accent)' : 'var(--surface-bg)',
                    border: '1px solid var(--whisper-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--ink-primary)',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (activeSubTab !== t) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeSubTab !== t) e.currentTarget.style.background = 'var(--surface-bg)';
                  }}
                >
                  {getSubTabLabel(t)}
                </button>
              ))}
            </div>

            <div style={{ 
              background: 'var(--surface-bg)', 
              border: '1px solid var(--whisper-border)', 
              borderRadius: '16px', 
              padding: '24px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--whisper-border)', color: 'var(--ink-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px' }}>Asset</th>
                      <th style={{ padding: '12px 8px' }}>Type</th>
                      <th style={{ padding: '12px 8px' }}>Ticker</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Units</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Avg Price</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Current Price</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Value</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-secondary)' }}>
                          Loading holdings...
                        </td>
                      </tr>
                    ) : assets.filter(a => activeSubTab === 'all' || a.type === activeSubTab).length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-secondary)' }}>
                          No assets found for this category. Add one using the sidebar form.
                        </td>
                      </tr>
                    ) : (
                      assets
                        .filter(a => activeSubTab === 'all' || a.type === activeSubTab)
                        .map(a => {
                          const badge = getTypeBadgeStyles(a.type);
                          return (
                            <tr key={a.id} style={{ borderBottom: '1px solid var(--whisper-border)', transition: 'background 0.2s' }}>
                              <td style={{ padding: '14px 8px', fontWeight: 'bold' }}>{a.name}</td>
                              <td style={{ padding: '14px 8px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  backgroundColor: badge.bg,
                                  color: badge.color,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  {badge.label}
                                </span>
                              </td>
                              <td style={{ padding: '14px 8px', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>
                                {a.ticker || '—'}
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {a.units.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                ${a.avg_buy_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                ${a.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--ink-primary)' }}>
                                ${(a.units * a.current_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                  <button 
                                    onClick={() => startEdit(a)}
                                    style={{ 
                                      background: 'transparent', 
                                      border: 'none', 
                                      color: 'var(--ink-secondary)', 
                                      cursor: 'pointer',
                                      padding: '4px',
                                      borderRadius: '4px',
                                      transition: 'color 0.2s, background 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                                    title="Edit holding"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(a.id)}
                                    style={{ 
                                      background: 'transparent', 
                                      border: 'none', 
                                      color: 'var(--ink-secondary)', 
                                      cursor: 'pointer',
                                      padding: '4px',
                                      borderRadius: '4px',
                                      transition: 'color 0.2s, background 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--negative)'; e.currentTarget.style.background = 'rgba(255, 45, 85, 0.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                                    title="Remove asset"
                                  >
                                    <Trash2 size={15} />
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
          </div>

          {/* Rebalancing Panel */}
          <div style={{ 
            background: 'var(--surface-bg)', 
            border: '1px solid var(--whisper-border)', 
            borderRadius: '16px', 
            padding: '24px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Scale size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Portfolio Rebalancer</h3>
            </div>

            <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
              Define target allocation percentages for each asset class. The calculator evaluates your current allocation and recommends Buy/Sell trade actions.
            </p>

            {/* Target Weights Input Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {Object.keys(targetWeights).map(type => {
                const badge = getTypeBadgeStyles(type);
                return (
                  <div key={type} style={{
                    background: 'var(--canvas-bg)',
                    border: '1px solid var(--whisper-border)',
                    padding: '12px',
                    borderRadius: '12px'
                  }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      color: badge.color, 
                      textTransform: 'uppercase', 
                      marginBottom: '6px',
                      letterSpacing: '0.5px'
                    }}>
                      {badge.label} Target %
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
                          borderBottom: '1.5px solid var(--whisper-border)',
                          padding: '4px 20px 4px 0',
                          fontSize: '16px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--ink-primary)',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
                      />
                      <span style={{ position: 'absolute', right: 0, color: 'var(--ink-secondary)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>%</span>
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
                background: 'rgba(255, 69, 58, 0.1)', 
                border: '1.5px solid rgba(255, 69, 58, 0.2)',
                color: '#FF453A',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 'bold',
                marginBottom: '24px'
              }}>
                <AlertCircle size={16} />
                <span>Allocation warning: Target weights sum to <span style={{ fontFamily: 'var(--font-mono)' }}>{targetWeightsSum}%</span>. Adjust inputs to equal exactly 100% for proper rebalancing.</span>
              </div>
            )}

            {/* Comparison and Advice */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Rebalancing Steps & Allocation Comparison
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rebalanceAdvice.map(advice => {
                  const badge = getTypeBadgeStyles(advice.type);
                  const isBuy = advice.difference >= 0;
                  const diffAbs = Math.abs(advice.difference);
                  const isOnTarget = diffAbs < 0.01;

                  return (
                    <div key={advice.type} style={{ 
                      background: 'var(--canvas-bg)', 
                      border: '1px solid var(--whisper-border)',
                      padding: '16px', 
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--ink-primary)' }}>{badge.label}</span>
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                            (Current: <span style={{ fontFamily: 'var(--font-mono)' }}>{advice.actualPercent.toFixed(1)}%</span> vs Target: <span style={{ fontFamily: 'var(--font-mono)' }}>{advice.targetPercent}%</span>)
                          </span>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          color: isOnTarget ? 'var(--ink-secondary)' : isBuy ? 'var(--positive)' : 'var(--negative)'
                        }}>
                          {isOnTarget ? 'ON TARGET' : isBuy ? `BUY $${diffAbs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `SELL $${diffAbs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                      </div>

                      {/* Visual Allocation bar */}
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
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
                        }} title={`Target ${advice.targetPercent}%`} />

                        {/* Actual progress */}
                        <div style={{
                          height: '100%',
                          width: `${Math.min(advice.actualPercent, 100)}%`,
                          background: badge.color,
                          borderRadius: '3px',
                          transition: 'width 0.4s ease-out'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Sidebar Add/Edit Form */}
        <div id="asset-form-card" style={{ 
          background: 'var(--surface-bg)', 
          border: '1px solid var(--whisper-border)', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
          position: 'sticky',
          top: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              {editingAssetId ? 'Edit Holding' : 'Add Asset'}
            </h3>
            {editingAssetId && (
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
                title="Cancel editing"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--ink-secondary)', marginBottom: '6px' }}>Asset Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Apple Inc, Vanguard S&P 500"
                style={{ 
                  width: '100%', 
                  background: 'var(--canvas-bg)', 
                  border: '1px solid var(--whisper-border)', 
                  padding: '10px 12px', 
                  borderRadius: '8px',
                  color: 'var(--ink-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--ink-secondary)', marginBottom: '6px' }}>Asset Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ 
                  width: '100%', 
                  background: 'var(--canvas-bg)', 
                  border: '1px solid var(--whisper-border)', 
                  padding: '10px 12px', 
                  borderRadius: '8px',
                  color: 'var(--ink-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
              >
                <option value="stock">Stock</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="fixed_deposit">Fixed Deposit</option>
                <option value="gold">Gold</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--ink-secondary)', marginBottom: '6px' }}>
                Ticker / Code <span style={{ fontWeight: 'normal', color: 'var(--ink-secondary)' }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                placeholder="e.g. AAPL, 100033 (MF Code)"
                style={{ 
                  width: '100%', 
                  background: 'var(--canvas-bg)', 
                  border: '1px solid var(--whisper-border)', 
                  padding: '10px 12px', 
                  borderRadius: '8px',
                  color: 'var(--ink-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
              />
              <span style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '4px', display: 'block' }}>
                Used for syncing live prices from Yahoo Finance or Mutual Fund API.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--ink-secondary)', marginBottom: '6px' }}>Units</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                  placeholder="0.00"
                  style={{ 
                    width: '100%', 
                    background: 'var(--canvas-bg)', 
                    border: '1px solid var(--whisper-border)', 
                    padding: '10px 12px', 
                    borderRadius: '8px',
                    color: 'var(--ink-primary)',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'var(--font-mono)',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--ink-secondary)', marginBottom: '6px' }}>Avg Buy Price</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', color: 'var(--ink-secondary)', fontSize: '14px' }}>$</span>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={form.avg_buy_price}
                    onChange={(e) => setForm({ ...form, avg_buy_price: e.target.value })}
                    placeholder="0.00"
                    style={{ 
                      width: '100%', 
                      background: 'var(--canvas-bg)', 
                      border: '1px solid var(--whisper-border)', 
                      padding: '10px 12px 10px 22px', 
                      borderRadius: '8px',
                      color: 'var(--ink-primary)',
                      outline: 'none',
                      fontSize: '14px',
                      fontFamily: 'var(--font-mono)',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: 'var(--ink-secondary)', 
                marginBottom: '6px' 
              }}>
                Current Price <span style={{ fontWeight: 'normal', color: 'var(--ink-secondary)' }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '10px', color: 'var(--ink-secondary)', fontSize: '14px' }}>$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.current_price}
                  onChange={(e) => setForm({ ...form, current_price: e.target.value })}
                  placeholder={form.avg_buy_price || '0.00'}
                  style={{ 
                    width: '100%', 
                    background: 'var(--canvas-bg)', 
                    border: '1px solid var(--whisper-border)', 
                    padding: '10px 12px 10px 22px', 
                    borderRadius: '8px',
                    color: 'var(--ink-primary)',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'var(--font-mono)',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--ink-secondary)', marginTop: '4px', display: 'block' }}>
                Defaults to Avg Buy Price if empty. Best for fixed deposits/gold manual valuation updates.
              </span>
            </div>

            <button
              type="submit"
              style={{
                background: 'var(--accent)',
                border: 'none',
                color: 'var(--ink-primary)',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                marginTop: '8px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              {editingAssetId ? <Edit3 size={16} /> : <Plus size={16} />}
              {editingAssetId ? 'Update Holding' : 'Save Asset'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
