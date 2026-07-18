import React, { useState } from 'react';
import { Wallet, RefreshCw, BarChart2, Settings, Download } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import ImportWizard from './components/ImportWizard';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '240px',
        background: 'var(--surface-bg)',
        borderRight: '1px solid var(--whisper-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 32px 0' }}>Tidal Finance</h1>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            onClick={() => setCurrentTab('dashboard')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              background: currentTab === 'dashboard' ? 'var(--accent)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            <BarChart2 size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setCurrentTab('portfolio')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              background: currentTab === 'portfolio' ? 'var(--accent)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            <Wallet size={20} /> Assets & Calc
          </button>
          <button 
            onClick={() => setCurrentTab('import')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              background: currentTab === 'import' ? 'var(--accent)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            <Download size={20} /> Import Statement
          </button>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'portfolio' && <Portfolio />}
        {currentTab === 'import' && <ImportWizard />}
      </main>
    </div>
  );
}
