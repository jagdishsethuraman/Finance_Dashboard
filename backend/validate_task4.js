import assert from 'assert';
import { spawn } from 'child_process';
import db from './database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Clean tables first
db.prepare('DELETE FROM transactions').run();
db.prepare('DELETE FROM assets').run();
db.prepare('DELETE FROM pdf_passwords').run();
db.prepare('DELETE FROM import_logs').run();

console.log('Starting validation server...');
const server = spawn('node', [join(__dirname, 'server.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MOCK_PDF_PARSING: 'true',
    MOCK_OLLAMA: 'true',
    NODE_ENV: 'test',
    PORT: '5001'
  }
});

// Wait for server to boot
await new Promise(resolve => setTimeout(resolve, 2000));

try {
  // Test case 1: upload normal PDF (not encrypted)
  console.log('Test case 1: uploading unencrypted mock PDF...');
  
  const mockUnencryptedPDF = JSON.stringify({
    isEncrypted: false,
    text: "HDFC transaction text details"
  });

  const formData1 = new FormData();
  formData1.append('file', new Blob([mockUnencryptedPDF], { type: 'application/pdf' }), 'Statement_July2026.pdf');

  const res1 = await fetch('http://localhost:5001/api/import/pdf', {
    method: 'POST',
    body: formData1
  });
  
  const data1 = await res1.json();
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(data1.success, true);
  assert.ok(data1.data.transactions.length > 0);
  assert.strictEqual(data1.data.transactions[0].description, 'Mock Vendor');
  console.log('Test case 1 passed!');

  // Test case 2: upload password-protected PDF without password
  console.log('Test case 2: uploading password-protected PDF without password...');
  const mockEncryptedPDF = JSON.stringify({
    isEncrypted: true,
    expectedPassword: 'secret_hdfc_password',
    text: "HDFC secure transactions details"
  });

  const formData2 = new FormData();
  formData2.append('file', new Blob([mockEncryptedPDF], { type: 'application/pdf' }), 'HDFC_Statement_July2026.pdf');

  const res2 = await fetch('http://localhost:5001/api/import/pdf', {
    method: 'POST',
    body: formData2
  });

  const data2 = await res2.json();
  assert.strictEqual(res2.status, 401);
  assert.strictEqual(data2.status, 'PASSWORD_REQUIRED');
  assert.strictEqual(data2.filename, 'HDFC_Statement_July2026.pdf');
  console.log('Test case 2 passed!');

  // Test case 3: upload password-protected PDF WITH correct password and remember=true
  console.log('Test case 3: uploading password-protected PDF with correct password and remember=true...');
  const formData3 = new FormData();
  formData3.append('file', new Blob([mockEncryptedPDF], { type: 'application/pdf' }), 'HDFC_Statement_July2026.pdf');
  formData3.append('password', 'secret_hdfc_password');
  formData3.append('remember', 'true');

  const res3 = await fetch('http://localhost:5001/api/import/pdf', {
    method: 'POST',
    body: formData3
  });

  const data3 = await res3.json();
  assert.strictEqual(res3.status, 200);
  assert.strictEqual(data3.success, true);
  console.log('Test case 3 passed!');

  // Verify password was saved in db
  console.log('Verifying password pattern saved in DB...');
  const passwordsInDb = db.prepare('SELECT * FROM pdf_passwords').all();
  assert.strictEqual(passwordsInDb.length, 1);
  assert.strictEqual(passwordsInDb[0].name_pattern, 'HDFC_*.pdf');
  assert.strictEqual(passwordsInDb[0].encrypted_password, 'secret_hdfc_password');
  console.log('Password persistence verified!');

  // Test case 4: upload password-protected PDF without password, but utilizing remembered password
  console.log('Test case 4: uploading password-protected PDF without password (utilizing remembered password)...');
  // Different filename but matching pattern HDFC_*.pdf
  const formData4 = new FormData();
  formData4.append('file', new Blob([mockEncryptedPDF], { type: 'application/pdf' }), 'HDFC_Statement_August2026.pdf');

  const res4 = await fetch('http://localhost:5001/api/import/pdf', {
    method: 'POST',
    body: formData4
  });

  const data4 = await res4.json();
  assert.strictEqual(res4.status, 200);
  assert.strictEqual(data4.success, true);
  console.log('Test case 4 passed (automatic password decryption works)!');

  // Test case 5: Confirm staging data write to SQLite database
  console.log('Test case 5: confirming staging data write to database...');
  const confirmRes = await fetch('http://localhost:5001/api/import/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'HDFC_Statement_August2026.pdf',
      transactions: data4.data.transactions,
      assets: data4.data.assets
    })
  });

  const confirmData = await confirmRes.json();
  assert.strictEqual(confirmRes.status, 200);
  assert.strictEqual(confirmData.success, true);

  // Verify transactions exist in DB
  const txs = db.prepare('SELECT * FROM transactions').all();
  assert.strictEqual(txs.length, 1);
  assert.strictEqual(txs[0].description, 'Mock Vendor');
  assert.strictEqual(txs[0].amount, 120.50);

  // Verify assets exist in DB
  const asts = db.prepare('SELECT * FROM assets').all();
  assert.strictEqual(asts.length, 1);
  assert.strictEqual(asts[0].name, 'Mock Asset');
  assert.strictEqual(asts[0].ticker, 'MOCK');

  // Verify import log entry
  const logs = db.prepare('SELECT * FROM import_logs').all();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].filename, 'HDFC_Statement_August2026.pdf');
  assert.strictEqual(logs[0].status, 'success');
  assert.strictEqual(logs[0].records_added, 2); // 1 transaction + 1 asset

  console.log('Test case 5 passed!');
  console.log('ALL TASK 4 TESTS PASSED SUCCESSFULLY!');
} catch (err) {
  console.error('Validation failed:', err);
  process.exitCode = 1;
} finally {
  console.log('Stopping validation server...');
  server.kill();
  await new Promise(resolve => setTimeout(resolve, 1000));
}
