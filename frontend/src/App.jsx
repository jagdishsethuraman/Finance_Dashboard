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
function CurrencyBar({ currency, rate, lastUpdated, fetching, onToggle, sidebarExpanded, onToggleSidebar, theme, onToggleTheme }) {
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
      paddingLeft: '16px',
      paddingRight: '16px',
      flexShrink: 0
    }}>
      {/* Left Side: Toggle + Icon + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          style={{
            background: 'transparent',
            border: '1px solid var(--whisper-border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-secondary)',
            width: '28px',
            height: '28px',
            padding: 0
          }}
        >
          <Menu size={14} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.jpg"
            alt="Logo"
            style={{
              width: '24px',
              height: '24px',
              border: '1px solid var(--whisper-border)',
              objectFit: 'cover'
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--ink-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Tidal Finance
          </span>
          <span className="technical-tag" style={{ fontSize: '9px', padding: '1px 4px' }}>Local v1.0</span>
        </div>
      </div>

      {/* Right Side: Rate + Theme + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Rate display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink-secondary)' }}>
          {fetching
            ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
            : <TrendingUp size={11} style={{ color: 'var(--positive)' }} />
          }
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--ink-primary)' }}>1 USD</span>
            {' = '}
            <span style={{ color: 'var(--accent)' }}>₹{inr}</span>
            {'  |  '}
            <span style={{ color: 'var(--ink-primary)' }}>1 INR</span>
            {' = '}
            <span style={{ color: 'var(--ink-primary)' }}>${usd}</span>
          </span>
          {lastUpdated && (
            <span style={{ color: isEst ? 'var(--accent)' : 'var(--ink-secondary)', fontSize: '10px' }}>
              ({isEst ? 'indicative' : `sync: ${lastUpdated}`})
            </span>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            height: '28px',
            background: 'transparent',
            border: '1px solid var(--whisper-border)',
            padding: '0 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            color: 'var(--ink-secondary)'
          }}
        >
          MODE: {theme.toUpperCase()}
        </button>

        {/* Currency Switcher (Brutal style segmented button) */}
        <div style={{ display: 'flex' }}>
          {['USD', 'INR'].map((c) => (
            <button
              key={c}
              onClick={() => currency !== c && onToggle()}
              style={{
                height: '28px',
                padding: '0 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 'bold',
                background: currency === c ? 'var(--accent)' : 'transparent',
                color: currency === c ? '#fff' : 'var(--ink-secondary)',
                border: '1px solid var(--whisper-border)',
                borderLeft: c === 'INR' ? 'none' : '1px solid var(--whisper-border)',
                cursor: 'pointer'
              }}
            >
              {c}
            </button>
          ))}
        </div>
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
        padding: '12px 16px',
        border: 'none',
        borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
        background: active ? 'var(--accent-glow)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--ink-secondary)',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.1s ease',
        textAlign: 'left'
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--ink-secondary)' }} />
      {sidebarExpanded && (
        <span style={{ whiteSpace: 'nowrap', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [rate, setRate] = useState(1);
  const [lastUpdated, setLastUpdated] = useState('');
  const [fetching, setFetching] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Apply light/dark class to body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <aside style={{
            width: sidebarExpanded ? '220px' : '56px',
            background: 'var(--surface-bg)',
            borderRight: '1px solid var(--whisper-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 0',
            flexShrink: 0,
            transition: 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <NavBtn
                active={currentTab === 'dashboard'}
                onClick={() => setCurrentTab('dashboard')}
                icon={BarChart2}
                label="Overview"
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
                label="Import"
                sidebarExpanded={sidebarExpanded}
              />
            </nav>
          </aside>

          {/* Main content area */}
          <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            {currentTab === 'dashboard' && <Dashboard />}
            {currentTab === 'portfolio' && <Portfolio />}
            {currentTab === 'import' && <ImportWizard />}
          </main>
        </div>
      </div>
    </CurrencyContext.Provider>
  );
}
