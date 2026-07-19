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
  // Show '—' only while we haven't received any rate yet (initial fetch in progress)
  const loaded = lastUpdated !== '' || rate !== 1;
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
        {fetching ? (
          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <TrendingUp size={12} style={{ color: 'var(--positive)' }} />
        )}
        <span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>1 USD</span>
          {' = '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>₹{inr}</span>
          {'  ·  '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>1 INR</span>
          {' = '}
          <span style={{ fontFamily: 'var(--font-mono)', color: '#FF9F0A' }}>${usd}</span>
        </span>
        {lastUpdated && (
          <span style={{ color: isEst ? '#FF9F0A' : 'var(--ink-secondary)', fontSize: '11px' }}>
            · {isEst ? 'indicative rate' : `updated ${lastUpdated}`}
          </span>
        )}
      </div>

      {/* Toggle pill */}
      <button
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
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--whisper-border)'}
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

// ── Nav Button ────────────────────────────────────────────────────────────────
function NavBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
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
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
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

  // Fetch live USD→INR rate
  useEffect(() => {
    const fetchRate = async () => {
      setFetching(true);

      // Try multiple sources in order
      const SOURCES = [
        async () => {
          const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
          const d = await r.json();
          if (d?.rates?.INR) return d.rates.INR;
          throw new Error('no data');
        },
        async () => {
          const r = await fetch('https://open.er-api.com/v6/latest/USD');
          const d = await r.json();
          if (d?.rates?.INR) return d.rates.INR;
          throw new Error('no data');
        },
        async () => {
          // Last-resort: ECB data via exchangerate.host (no key needed)
          const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=INR');
          const d = await r.json();
          if (d?.rates?.INR) return d.rates.INR;
          throw new Error('no data');
        }
      ];

      let fetched = false;
      for (const source of SOURCES) {
        try {
          const inr = await source();
          setRate(inr);
          const now = new Date();
          setLastUpdated(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
          fetched = true;
          break;
        } catch {
          // try next source
        }
      }

      if (!fetched) {
        // Hardcoded indicative fallback — RBI mid-market ~Jul 2025
        setRate(84.5);
        setLastUpdated('est.');
      }

      setFetching(false);
    };
    fetchRate();
    // Refresh every 5 minutes
    const id = setInterval(fetchRate, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const toggleCurrency = () => {
    const next = currency === 'USD' ? 'INR' : 'USD';
    setCurrency(next);
    localStorage.setItem('currency', next);
  };

  // Context value — convert USD → display currency
  const symbol = currency === 'INR' ? '₹' : '$';
  const convert = (usdValue) => currency === 'INR' ? usdValue * rate : usdValue;
  // Convert from display currency back to USD for storage
  const toUSD = (displayValue) => currency === 'INR' ? displayValue / rate : displayValue;
  const format = (usdValue, decimals = 2) => convert(usdValue).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol, convert, toUSD, format, toggleCurrency }}>
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>

        {/* Top currency bar — spans full width above everything */}
        <CurrencyBar
          currency={currency}
          rate={rate}
          lastUpdated={lastUpdated}
          fetching={fetching}
          onToggle={toggleCurrency}
        />

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
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

          {/* Main content */}
          <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            {currentTab === 'dashboard' && <Dashboard />}
            {currentTab === 'portfolio' && <Portfolio />}
            {currentTab === 'import' && <ImportWizard />}
          </main>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </CurrencyContext.Provider>
  );
}
