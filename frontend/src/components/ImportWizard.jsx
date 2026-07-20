import React, { useState, useRef } from 'react';
import { Upload, Key, CheckCircle, FileText, AlertCircle, X } from 'lucide-react';

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
    <div className="fade-in" style={{ maxWidth: '900px' }}>
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
            Import Statement
          </h2>
          <p style={{ color: 'var(--ink-secondary)', margin: '4px 0 0 0', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            OLLAMA_STATEMENT_PARSER // PARSE_TELEMETRY
          </p>
        </div>
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
            padding: '80px 40px',
            textAlign: 'center',
            background: isDragOver ? 'var(--accent-glow)' : 'var(--surface-bg)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          <Upload size={32} style={{ color: 'var(--ink-secondary)', marginBottom: '16px' }} />
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Drag and drop or click to upload statement PDF
          </p>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
            OLLAMA_AI_DEC ENGINE // GEMMA4 // SECURE LOCAL PROCESSING
          </p>
        </div>
      )}

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div style={{
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          padding: '24px',
          maxWidth: '440px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', letterSpacing: '0.05em' }}>
              <Key size={14} /> PASSWORD REQUIRED
            </h3>
            <button
              onClick={() => { if (status !== 'uploading') reset(); }}
              disabled={status === 'uploading'}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer',
                color: 'var(--ink-secondary)'
              }}
            >
              <X size={16} />
            </button>
          </div>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '16px', lineHeight: '1.4' }}>
            STATEMENT IS ENCRYPTED. SPECIFY PASSKEY TO EXTRACT TELEMETRY DATA.
          </p>
          {file && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--canvas-bg)', padding: '10px 12px',
              border: '1px solid var(--whisper-border)', marginBottom: '16px', fontSize: '11px',
              minWidth: 0
            }}>
              <FileText size={12} style={{ color: 'var(--ink-secondary)', flexShrink: 0 }} />
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
            placeholder="ENTER PASSKEY"
            value={password}
            disabled={status === 'uploading'}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && status !== 'uploading') uploadFile(file, password); }}
            style={{ marginBottom: '12px' }}
            autoFocus
          />
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', marginBottom: '20px', cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={remember}
              disabled={status === 'uploading'}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 'auto' }}
            />
            REMEMBER PASSKEY PATTERN
          </label>
          <button 
            onClick={() => { if (status !== 'uploading') uploadFile(file, password); }} 
            disabled={status === 'uploading'}
            style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          >
            {status === 'uploading' ? 'PROCESSING...' : 'DECRYPT AND PARSE'}
          </button>
        </div>
      )}

      {/* Uploading State */}
      {status === 'uploading' && !showPasswordPrompt && (
        <div style={{
          background: 'var(--surface-bg)',
          border: '1px solid var(--whisper-border)',
          padding: '80px 40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '32px', height: '32px', border: '2px solid var(--whisper-border)',
            borderTopColor: 'var(--accent)',
            margin: '0 auto 24px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>PROCESSING STATEMENT TELEMETRY...</p>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
            OLLAMA GEMMA4 MODEL RUNNING ON LOCAL SYSTEM
          </p>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: 'rgba(255, 69, 58, 0.05)',
          border: '1px solid var(--negative)',
          padding: '16px', marginBottom: '24px'
        }}>
          <AlertCircle size={16} style={{ color: 'var(--negative)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--negative)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>IMPORT ERROR</p>
            <p style={{ margin: '4px 0 12px', color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{errorMsg}</p>
            <button onClick={reset} style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              RESET RUN
            </button>
          </div>
        </div>
      )}

      {/* Staging Review */}
      {status === 'staging' && (
        <div className="fade-in">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '20px', borderBottom: '1px solid var(--whisper-border)', paddingBottom: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '0.05em' }}>STAGED IMPORT TELEMETRY</h3>
              {file && (
                <p style={{ margin: '4px 0 0', color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  FILE: {file.name}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={reset}
                style={{
                  height: '32px', padding: '0 12px', background: 'var(--surface-bg)',
                  border: '1px solid var(--whisper-border)', fontWeight: 'bold', color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)'
                }}
              >
                CANCEL
              </button>
              <button
                onClick={confirmImport}
                style={{
                  height: '32px', padding: '0 16px', background: 'var(--accent)',
                  border: 'none', fontWeight: 'bold', color: '#fff', fontSize: '11px', fontFamily: 'var(--font-mono)'
                }}
              >
                CONFIRM AND SAVE
              </button>
            </div>
          </div>

          {/* Transactions table */}
          <div style={{
            background: 'var(--surface-bg)', border: '1px solid var(--whisper-border)',
            padding: '20px', marginBottom: '24px'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '800', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
              [01] DETECTED TRANSACTIONS
              <span className="technical-tag" style={{ marginLeft: '12px' }}>{stagedData.transactions.length} ITEMS</span>
            </h4>
            {stagedData.transactions.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0 }}>NO TRANSACTIONS DETECTED.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Telemetry ID / Desc</th>
                      <th style={{ textAlign: 'left' }}>Category</th>
                      <th style={{ textAlign: 'left' }}>Type</th>
                      <th style={{ textAlign: 'right' }}>Telemetry Value</th>
                      <th style={{ textAlign: 'left' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedData.transactions.map((t, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '13px', fontWeight: '600' }}>{t.description}</td>
                        <td style={{ fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{t.category}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            background: t.type === 'income' ? 'rgba(52,199,89,0.1)' : 'rgba(255,69,58,0.08)',
                            color: t.type === 'income' ? 'var(--positive)' : 'var(--negative)',
                            padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', textTransform: 'uppercase'
                          }}>{t.type}</span>
                        </td>
                        <td className="mono-num" style={{ textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>
                          ${Number(t.amount).toFixed(2)}
                        </td>
                        <td className="mono-num" style={{ fontSize: '11px', color: 'var(--ink-secondary)' }}>
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
            padding: '20px'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '800', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
              [02] DETECTED ASSETS
              <span className="technical-tag" style={{ marginLeft: '12px' }}>{stagedData.assets.length} ITEMS</span>
            </h4>
            {stagedData.assets.length === 0 ? (
              <p style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0 }}>NO ASSET CHANGES DETECTED.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Asset Description</th>
                      <th style={{ textAlign: 'left' }}>Type</th>
                      <th style={{ textAlign: 'left' }}>Ticker</th>
                      <th style={{ textAlign: 'right' }}>Units</th>
                      <th style={{ textAlign: 'right' }}>Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedData.assets.map((a, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '13px', fontWeight: '700' }}>{a.name}</td>
                        <td style={{ fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{a.type}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-secondary)' }}>{a.ticker || '—'}</td>
                        <td className="mono-num" style={{ textAlign: 'right', fontSize: '12px' }}>{a.units}</td>
                        <td className="mono-num" style={{ textAlign: 'right', fontSize: '12px' }}>${Number(a.avg_buy_price).toFixed(2)}</td>
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
          padding: '80px 40px', textAlign: 'center'
        }}>
          <CheckCircle size={32} style={{ color: 'var(--positive)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--positive)', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            STATEMENT PARSING COMPLETED SUCCESSFULLY
          </p>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
            RECORD SAVED IN LOCAL DATABASE.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '24px', background: 'var(--surface-bg)',
              border: '1px solid var(--whisper-border)', padding: '10px 24px',
              fontWeight: 'bold', color: 'var(--ink-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)'
            }}
          >
            LOAD NEXT STATEMENT
          </button>
        </div>
      )}
    </div>
  );
}
