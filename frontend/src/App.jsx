import React, { useState, useEffect, createContext, useContext } from 'react';
import { Wallet, BarChart2, Download, TrendingUp, RefreshCw, Menu } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import ImportWizard from './components/ImportWizard';

// ── Currency Context ──────────────────────────────────────────────────────────
export const CurrencyContext = createContext(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside <App> (CurrencyContext.Provider)');
  return ctx;
}

// ── Top Currency Bar ──────────────────────────────────────────────────────────
function CurrencyBar({ currency, rate, lastUpdated, fetching, onToggle, sidebarExpanded, onToggleSidebar }) {
  const loaded = !!lastUpdated || rate !== 1;
  const inr = loaded ? rate.toFixed(2) : '—';
  const usd = loaded ? (1 / rate).toFixed(4) : '—';
  const isEst = lastUpdated === 'est.';

  return (
    <div style={{
      height: '48px',
      background: 'var(--surface-bg)',
      borderBottom: '1px solid var(--whisper-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: '20px',
      paddingRight: '32px',
      flexShrink: 0
    }}>
      {/* Left Side: Toggle + Icon + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-secondary)',
            padding: '6px',
            borderRadius: '6px',
            transition: 'background 0.2s, color 0.2s'
          }}
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.jpg"
            alt="Logo"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid var(--whisper-border)',
              objectFit: 'cover'
            }}
          />
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--ink-primary)', letterSpacing: '-0.2px' }}>
            Tidal Finance
          </span>
        </div>
      </div>

      {/* Right Side: Rate + Toggle pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Rate display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
          {fetching
            ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
            : <TrendingUp size={12} style={{ color: 'var(--positive)' }} />
          }
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--ink-primary)' }}>1 USD</span>
            {' = '}
            <span style={{ color: 'var(--accent)' }}>₹{inr}</span>
            {'  ·  '}
            <span style={{ color: 'var(--ink-primary)' }}>1 INR</span>
            {' = '}
            <span style={{ color: '#FF9F0A' }}>${usd}</span>
          </span>
          {lastUpdated && (
            <span style={{ color: isEst ? '#FF9F0A' : 'var(--ink-secondary)', fontSize: '11px' }}>
              · {isEst ? 'indicative rate' : `updated ${lastUpdated}`}
            </span>
          )}
        </div>

        {/* Toggle pill */}
        <button
          className="currency-pill"
          onClick={onToggle}
          title={`Switch to ${currency === 'USD' ? 'INR' : 'USD'}`}
          style={{
            display: 'flex',
            background: 'var(--canvas-bg)',
            borderRadius: '20px',
            padding: '3px',
            cursor: 'pointer',
            gap: '2px',
            transition: 'border-color 0.2s',
            border: 'none'
          }}
        >
          {['USD', 'INR'].map((c) => (
            <span
              key={c}
              style={{
                padding: '3px 10px',
                borderRadius: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 'bold',
                background: currency === c ? 'var(--accent)' : 'transparent',
                color: currency === c ? '#fff' : 'var(--ink-secondary)',
                transition: 'all 0.15s'
              }}
            >
              {c === 'USD' ? '$ USD' : '₹ INR'}
            </span>
          ))}
        </button>
      </div>
    </div>
  );
}

// ── Nav Button ────────────────────────────────────────────────────────────────
function NavBtn({ active, onClick, icon: Icon, label, sidebarExpanded }) {
  return (
    <button
      className={`nav-btn${active ? ' active' : ''}`}
      onClick={onClick}
      title={!sidebarExpanded ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarExpanded ? 'flex-start' : 'center',
        gap: sidebarExpanded ? '12px' : '0',
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: 'var(--ink-primary)',
        transition: 'background 0.2s, gap 0.15s, padding 0.15s'
      }}
    >
      <Icon size={20} style={{ flexShrink: 0 }} />
      {sidebarExpanded && (
        <span style={{ whiteSpace: 'nowrap', opacity: 1, transition: 'opacity 0.15s' }}>
          {label}
        </span>
      )}
    </button>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'USD');
  const [rate, setRate] = useState(1);
  const [lastUpdated, setLastUpdated] = useState('');
  const [fetching, setFetching] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Fetch cached rate from local backend
  useEffect(() => {
    const fetchRate = async () => {
      setFetching(true);
      try {
        const d = await fetch('/api/rates').then(r => r.json());
        if (d?.rate) {
          setRate(d.rate);
          setLastUpdated(d.lastUpdated || '');
        }
      } catch (e) {
        console.error('[rates] failed to fetch from backend proxy:', e.message);
      }
      setFetching(false);
    };

    fetchRate();
    const id = setInterval(fetchRate, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'INR' : 'USD';
    setCurrency(next);
    localStorage.setItem('currency', next);
  };

  const symbol  = currency === 'INR' ? '₹' : '$';
  const convert = (usdValue) => currency === 'INR' ? usdValue * rate : usdValue;
  const toUSD   = (displayValue) => currency === 'INR' ? displayValue / rate : displayValue;
  const format  = (usdValue, decimals = 2) => convert(usdValue).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol, convert, toUSD, format, toggleCurrency }}>
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>

        <CurrencyBar
          currency={currency}
          rate={rate}
          lastUpdated={lastUpdated}
          fetching={fetching}
          onToggle={toggleCurrency}
          sidebarExpanded={sidebarExpanded}
          onToggleSidebar={() => setSidebarExpanded(!sidebarExpanded)}
        />

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <aside style={{
            width: sidebarExpanded ? '240px' : '64px',
            background: 'var(--surface-bg)',
            borderRight: '1px solid var(--whisper-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: sidebarExpanded ? '24px' : '24px 8px',
            flexShrink: 0,
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), padding 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <NavBtn
                active={currentTab === 'dashboard'}
                onClick={() => setCurrentTab('dashboard')}
                icon={BarChart2}
                label="Dashboard"
                sidebarExpanded={sidebarExpanded}
              />
              <NavBtn
                active={currentTab === 'portfolio'}
                onClick={() => setCurrentTab('portfolio')}
                icon={Wallet}
                label="Assets & Calc"
                sidebarExpanded={sidebarExpanded}
              />
              <NavBtn
                active={currentTab === 'import'}
                onClick={() => setCurrentTab('import')}
                icon={Download}
                label="Import Statement"
                sidebarExpanded={sidebarExpanded}
              />
            </nav>
          </aside>

          {/* Main content */}
          <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            {currentTab === 'dashboard' && <Dashboard />}
            {currentTab === 'portfolio' && <Portfolio />}
            {currentTab === 'import' && <ImportWizard />}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .nav-btn              { background: transparent; }
        .nav-btn.active       { background: var(--accent); }
        .nav-btn:hover:not(.active) { background: rgba(255,255,255,0.05); }
        .currency-pill        { border: 1px solid var(--whisper-border); }
        .currency-pill:hover  { border-color: var(--accent); }
        .sidebar-toggle:hover { background: rgba(255,255,255,0.08) !important; color: var(--ink-primary) !important; }
      `}</style>
    </CurrencyContext.Provider>
  );
}
