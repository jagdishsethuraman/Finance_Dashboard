import assert from 'assert';
import { spawn } from 'child_process';
import db from './database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Clean tables first
db.prepare('DELETE FROM transactions').run();
db.prepare('DELETE FROM budgets').run();

console.log('Starting validation server...');
const server = spawn('node', [join(__dirname, 'server.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

// Wait for server to boot
await new Promise(resolve => setTimeout(resolve, 2000));

try {
  // Test POST /api/budgets
  console.log('Testing POST /api/budgets...');
  const budgetRes1 = await fetch('http://localhost:5001/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Groceries',
      limit: 500
    })
  });
  const budgetData1 = await budgetRes1.json();
  assert.strictEqual(budgetData1.success, true);
  console.log('POST /api/budgets success!');

  // Test GET /api/budgets (initial state)
  console.log('Testing GET /api/budgets (empty spent)...');
  const getBudgetsRes1 = await fetch('http://localhost:5001/api/budgets');
  const budgets1 = await getBudgetsRes1.json();
  assert.strictEqual(budgets1.length, 1);
  assert.strictEqual(budgets1[0].category, 'Groceries');
  assert.strictEqual(budgets1[0].limit, 500);
  assert.strictEqual(budgets1[0].spent, 0);
  console.log('GET /api/budgets (empty spent) success!');

  // Test POST /api/transactions (current month expense)
  console.log('Testing POST /api/transactions (current month expense)...');
  const txRes1 = await fetch('http://localhost:5001/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 55.50,
      description: 'Safeway',
      category: 'Groceries',
      type: 'expense'
    })
  });
  const txData1 = await txRes1.json();
  assert.strictEqual(txData1.success, true);

  // Test POST /api/transactions (past month expense - should not be counted in current budget)
  console.log('Testing POST /api/transactions (past month expense)...');
  const pastMonth = new Date();
  pastMonth.setMonth(pastMonth.getMonth() - 1);
  const txRes2 = await fetch('http://localhost:5001/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 100,
      description: 'Ancient Groceries',
      category: 'Groceries',
      timestamp: pastMonth.toISOString(),
      type: 'expense'
    })
  });
  const txData2 = await txRes2.json();
  assert.strictEqual(txData2.success, true);

  // Test POST /api/transactions (current month income - should not be counted in budget spent)
  console.log('Testing POST /api/transactions (current month income)...');
  const txRes3 = await fetch('http://localhost:5001/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 200,
      description: 'Refund for Groceries',
      category: 'Groceries',
      type: 'income'
    })
  });
  const txData3 = await txRes3.json();
  assert.strictEqual(txData3.success, true);

  console.log('POST transactions success!');

  // Test GET /api/transactions
  console.log('Testing GET /api/transactions...');
  const getTxRes = await fetch('http://localhost:5001/api/transactions');
  const transactions = await getTxRes.json();
  assert.strictEqual(transactions.length, 3);
  // Verify sorting order: newest first
  assert.ok(new Date(transactions[0].timestamp) >= new Date(transactions[1].timestamp));
  assert.ok(new Date(transactions[1].timestamp) >= new Date(transactions[2].timestamp));
  console.log('GET /api/transactions success!');

  // Test GET /api/budgets again to verify calculation
  console.log('Testing GET /api/budgets (verifying spent)...');
  const getBudgetsRes2 = await fetch('http://localhost:5001/api/budgets');
  const budgets2 = await getBudgetsRes2.json();
  assert.strictEqual(getBudgetsRes2.status, 200);
  assert.strictEqual(budgets2.length, 1);
  assert.strictEqual(budgets2[0].category, 'Groceries');
  // spent should only include the current month expense (55.50), not the past month (100) or income (200)
  assert.strictEqual(budgets2[0].spent, 55.50);
  console.log('GET /api/budgets spent calculation success!');

  // Test ON CONFLICT behavior for budgets
  console.log('Testing ON CONFLICT update on budgets...');
  const budgetRes2 = await fetch('http://localhost:5001/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Groceries',
      limit: 600
    })
  });
  const budgetData2 = await budgetRes2.json();
  assert.strictEqual(budgetData2.success, true);

  const getBudgetsRes3 = await fetch('http://localhost:5001/api/budgets');
  const budgets3 = await getBudgetsRes3.json();
  assert.strictEqual(budgets3.length, 1);
  assert.strictEqual(budgets3[0].limit, 600);
  console.log('ON CONFLICT budget update success!');

  console.log('ALL TASK 3 TESTS PASSED SUCCESSFULLY!');
} catch (err) {
  console.error('Validation failed:', err);
  process.exitCode = 1;
} finally {
  console.log('Stopping validation server...');
  server.kill();
  // wait for shutdown
  await new Promise(resolve => setTimeout(resolve, 1000));
}
