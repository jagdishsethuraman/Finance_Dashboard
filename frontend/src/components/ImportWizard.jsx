import React, { useState, useRef } from 'react';
import { Upload, Key, CheckCircle, FileText, AlertCircle, X } from 'lucide-react';

const inputStyle = {
  width: '100%',
  background: 'var(--canvas-bg)',
  border: '1px solid var(--whisper-border)',
  padding: '10px 12px',
  borderRadius: '8px',
  color: 'var(--ink-primary)',
  outline: 'none',
  fontSize: '14px',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
};

const btnPrimary = {
  width: '100%',
  background: 'var(--accent)',
  border: 'none',
  padding: '12px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  color: 'var(--ink-primary)',
  fontSize: '14px',
  transition: 'opacity 0.2s'
};

export default function ImportWizard() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | staging | success | error
  const [stagedData, setStagedData] = useState({ transactions: [], assets: [] });
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const uploadFile = async (targetFile, customPassword = '') => {
    if (!targetFile) return;
    setStatus('uploading');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', targetFile);
    formData.append('password', customPassword);
    formData.append('remember', remember ? 'true' : 'false');

    try {
      const res = await fetch('/api/import/pdf', { method: 'POST', body: formData });

      if (res.status === 401) {
        setShowPasswordPrompt(true);
        setStatus('idle');
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const resJson = await res.json();
      setStagedData(resJson.data || { transactions: [], assets: [] });
      setStatus('staging');
      setShowPasswordPrompt(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are supported.');
      setStatus('error');
      return;
    }
    setFile(selectedFile);
    uploadFile(selectedFile, '');
  };

  const confirmImport = async () => {
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: stagedData.transactions,
          assets: stagedData.assets,
          filename: file?.name
        })
      });
      if (!res.ok) throw new Error('Failed to save import');
      setStatus('success');
      setFile(null);
      setStagedData({ transactions: [], assets: [] });
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setFile(null);
    setPassword('');
    setRemember(false);
    setShowPasswordPrompt(false);
    setStagedData({ transactions: [], assets: [] });
    setErrorMsg('');
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '900px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Import Financial Statements</h2>
        <p style={{ color: 'var(--ink-secondary)', margin: '4px 0 0 0' }}>
          Upload PDF bank or brokerage statements. Ollama (Gemma4) extracts and structures the data automatically.
        </p>
      </header>

      {/* Upload Zone */}
      {status === 'idle' && !showPasswordPrompt && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped) handleFileSelect(dropped);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--whisper-border)'}`,
            borderRadius: '16px',
            padding: '80px 40px',
            textAlign: 'center',
            background: isDragOver ? 'rgba(0, 122, 255, 0.05)' : 'var(--surface-bg)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          <Upload size={48} style={{ color: 'var(--ink-secondary)', marginBottom: '16px' }} />
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>
            Drag and drop or click to upload statement PDF
          </p>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '8px' }}>
            Supports local Ollama automatic parsing via Gemma4
          </p>
        </div>
      )}

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div style={{
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
              <Key size={20} /> Password Required
            </h3>
            <button
              onClick={() => { if (status !== 'uploading') reset(); }}
              disabled={status === 'uploading'}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: status === 'uploading' ? 'default' : 'pointer', 
                color: 'var(--ink-secondary)',
                opacity: status === 'uploading' ? 0.4 : 1
              }}
            >
              <X size={18} />
            </button>
          </div>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            PDF statement is encrypted. Enter credentials to unlock and parse.
          </p>
          {file && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--canvas-bg)', padding: '10px 12px',
              borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
              minWidth: 0
            }}>
              <FileText size={14} style={{ color: 'var(--ink-secondary)', flexShrink: 0 }} />
              <span 
                title={file.name}
                style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: 'var(--ink-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1
                }}
              >
                {file.name}
              </span>
            </div>
          )}
          <input
            type="password"
            placeholder="Enter PDF password"
            value={password}
            disabled={status === 'uploading'}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && status !== 'uploading') uploadFile(file, password); }}
            style={{ ...inputStyle, marginBottom: '12px', opacity: status === 'uploading' ? 0.6 : 1 }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--whisper-border)'}
            autoFocus
          />
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '13px', color: 'var(--ink-secondary)', marginBottom: '20px', cursor: status === 'uploading' ? 'default' : 'pointer'
          }}>
            <input
              type="checkbox"
              checked={remember}
              disabled={status === 'uploading'}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            Remember password pattern for similar files
          </label>
          <button 
            onClick={() => { if (status !== 'uploading') uploadFile(file, password); }} 
            disabled={status === 'uploading'}
            style={{ ...btnPrimary, opacity: status === 'uploading' ? 0.7 : 1, cursor: status === 'uploading' ? 'default' : 'pointer' }}
          >
            {status === 'uploading' ? 'Unlocking & Parsing (Ollama)...' : 'Unlock and Parse PDF'}
          </button>
        </div>
      )}

      {/* Uploading State (only full-screen if not in password modal) */}
      {status === 'uploading' && !showPasswordPrompt && (
        <div style={{
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          borderRadius: '16px',
          padding: '80px 40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid var(--whisper-border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            margin: '0 auto 24px',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Parsing statement...</p>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '8px' }}>
            Ollama is reading and extracting statement contents. This may take a moment.
          </p>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: 'rgba(255, 69, 58, 0.08)',
          border: '1.5px solid rgba(255, 69, 58, 0.25)',
          borderRadius: '12px', padding: '16px', marginBottom: '24px'
        }}>
          <AlertCircle size={20} style={{ color: '#FF453A', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#FF453A', fontSize: '14px' }}>Import failed</p>
            <p style={{ margin: '4px 0 12px', color: 'var(--ink-secondary)', fontSize: '13px' }}>{errorMsg}</p>
            <button onClick={reset} style={{ ...btnPrimary, width: 'auto', padding: '8px 16px', background: 'var(--surface-bg)', border: '1px solid var(--whisper-border)' }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Staging Review */}
      {status === 'staging' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '24px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px' }}>Staged Review</h3>
              {file && (
                <p style={{ margin: '4px 0 0', color: 'var(--ink-secondary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                  {file.name}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={reset}
                style={{
                  padding: '10px 16px', background: 'var(--surface-bg)',
                  border: '1px solid var(--whisper-border)', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold', color: 'var(--ink-secondary)', fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                style={{
                  padding: '10px 20px', background: 'var(--positive)',
                  border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold', color: '#000', fontSize: '14px'
                }}
              >
                Confirm and Save
              </button>
            </div>
          </div>

          {/* Transactions table */}
          <div style={{
            background: 'var(--surface-bg)', border: '1px solid var(--whisper-border)',
            borderRadius: '16px', padding: '24px', marginBottom: '24px'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 'bold' }}>
              Transactions Detected
              <span style={{
                marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px',
                background: 'var(--canvas-bg)', padding: '2px 8px', borderRadius: '4px',
                color: 'var(--ink-secondary)'
              }}>{stagedData.transactions.length}</span>
            </h4>
            {stagedData.transactions.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', margin: 0 }}>No transactions extracted.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--whisper-border)', color: 'var(--ink-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px' }}>Description</th>
                      <th style={{ padding: '10px 8px' }}>Category</th>
                      <th style={{ padding: '10px 8px' }}>Type</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '10px 8px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedData.transactions.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--whisper-border)' }}>
                        <td style={{ padding: '10px 8px' }}>{t.description}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--ink-secondary)' }}>{t.category}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{
                            background: t.type === 'income' ? 'rgba(52,199,89,0.12)' : 'rgba(255,69,58,0.10)',
                            color: t.type === 'income' ? 'var(--positive)' : 'var(--negative)',
                            padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
                          }}>{t.type}</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                          ${Number(t.amount).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {t.timestamp ? new Date(t.timestamp).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assets table */}
          <div style={{
            background: 'var(--surface-bg)', border: '1px solid var(--whisper-border)',
            borderRadius: '16px', padding: '24px'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 'bold' }}>
              Assets Detected
              <span style={{
                marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px',
                background: 'var(--canvas-bg)', padding: '2px 8px', borderRadius: '4px',
                color: 'var(--ink-secondary)'
              }}>{stagedData.assets.length}</span>
            </h4>
            {stagedData.assets.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', margin: 0 }}>No assets extracted.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--whisper-border)', color: 'var(--ink-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px' }}>Asset Name</th>
                      <th style={{ padding: '10px 8px' }}>Type</th>
                      <th style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>Ticker</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Units</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedData.assets.map((a, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--whisper-border)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{a.name}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--ink-secondary)' }}>{a.type}</td>
                        <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{a.ticker || '—'}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{a.units}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${Number(a.avg_buy_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && (
        <div style={{
          background: 'var(--surface-bg)', border: '1px solid var(--whisper-border)',
          borderRadius: '16px', padding: '80px 40px', textAlign: 'center'
        }}>
          <CheckCircle size={56} style={{ color: 'var(--positive)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--positive)', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            Statement data successfully imported
          </p>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '13px', marginTop: '8px' }}>
            Transactions and assets have been saved to your database.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '24px', background: 'var(--surface-bg)',
              border: '1px solid var(--whisper-border)', padding: '10px 24px',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
              color: 'var(--ink-primary)', fontSize: '14px'
            }}
          >
            Upload Another Statement
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
