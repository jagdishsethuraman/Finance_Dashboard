import React, { useState, useEffect, createContext, useContext } from 'react';
import { Wallet, BarChart2, Download, TrendingUp, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import ImportWizard from './components/ImportWizard';

// ── Currency Context ──────────────────────────────────────────────────────────
export const CurrencyContext = createContext({
  currency: 'USD',
  rate: 1,
  symbol: '$',
  convert: (v) => v,
  format: (v) => v.toFixed(2),
  toggleCurrency: () => {}
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

// ── Top Currency Bar ──────────────────────────────────────────────────────────
function CurrencyBar({ currency, rate, lastUpdated, fetching, onToggle }) {
  const loaded = !!lastUpdated || rate !== 1;
  const inr = loaded ? rate.toFixed(2) : '—';
  const usd = loaded ? (1 / rate).toFixed(4) : '—';
  const isEst = lastUpdated === 'est.';

  return (
    <div style={{
      height: '40px',
      background: 'var(--surface-bg)',
      borderBottom: '1px solid var(--whisper-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '32px',
      gap: '20px',
      fontSize: '12px',
      color: 'var(--ink-secondary)',
      flexShrink: 0
    }}>
      {/* Rate display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* Toggle pill — hover via CSS (.currency-pill) */}
      <button
        className="currency-pill"
        onClick={onToggle}
        title={`Switch to ${currency === 'USD' ? 'INR' : 'USD'}`}
        style={{
          display: 'flex',
          background: 'var(--canvas-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: '20px',
          padding: '3px',
          cursor: 'pointer',
          gap: '2px',
          transition: 'border-color 0.2s'
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
  );
}

// ── Nav Button — hover via CSS (.nav-btn) ─────────────────────────────────────
function NavBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      className={`nav-btn${active ? ' active' : ''}`}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px',
        background: active ? 'var(--accent)' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        fontWeight: 'bold',
        color: 'var(--ink-primary)',
        transition: 'background 0.2s'
      }}
    >
      <Icon size={20} /> {label}
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

  // Fetch live USD→INR rate — try 3 sources, fallback to hardcoded
  useEffect(() => {
    const fetchRate = async () => {
      setFetching(true);
      let inr = null;

      try {
        const d = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR').then(r => r.json());
        if (d?.rates?.INR) inr = d.rates.INR;
      } catch {}

      if (!inr) try {
        const d = await fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json());
        if (d?.rates?.INR) inr = d.rates.INR;
      } catch {}

      if (!inr) try {
        const d = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=INR').then(r => r.json());
        if (d?.rates?.INR) inr = d.rates.INR;
      } catch {}

      if (inr) {
        setRate(inr);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      } else {
        setRate(84.5); // fallback
        setLastUpdated('est.');
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
        />

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <aside style={{
            width: '240px',
            background: 'var(--surface-bg)',
            borderRight: '1px solid var(--whisper-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            flexShrink: 0
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 32px 0' }}>Tidal Finance</h1>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <NavBtn active={currentTab === 'dashboard'} onClick={() => setCurrentTab('dashboard')} icon={BarChart2} label="Dashboard" />
              <NavBtn active={currentTab === 'portfolio'} onClick={() => setCurrentTab('portfolio')} icon={Wallet} label="Assets & Calc" />
              <NavBtn active={currentTab === 'import'} onClick={() => setCurrentTab('import')} icon={Download} label="Import Statement" />
            </nav>
          </aside>

          <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            {currentTab === 'dashboard' && <Dashboard />}
            {currentTab === 'portfolio' && <Portfolio />}
            {currentTab === 'import' && <ImportWizard />}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .nav-btn:hover:not(.active) { background: rgba(255,255,255,0.05) !important; }
        .currency-pill:hover { border-color: var(--accent) !important; }
      `}</style>
    </CurrencyContext.Provider>
  );
}
