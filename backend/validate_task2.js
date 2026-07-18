import assert from 'assert';
import { spawn } from 'child_process';
import db from './database.js';

// Clean assets first
db.prepare('DELETE FROM assets').run();

console.log('Starting validation server...');
const server = spawn('node', ['server.js'], { stdio: 'inherit' });

// Wait for server to boot
await new Promise(resolve => setTimeout(resolve, 2000));

try {
  // Test POST /api/assets validation
  console.log('Testing POST /api/assets validation...');
  const badRes1 = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'stock'
    })
  });
  assert.strictEqual(badRes1.status, 400);

  const badRes2 = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tesla Inc',
      type: ' '
    })
  });
  assert.strictEqual(badRes2.status, 400);

  const badRes3 = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tesla Inc',
      type: 'stock',
      avg_buy_price: 200
    })
  });
  assert.strictEqual(badRes3.status, 400);

  const badRes4 = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tesla Inc',
      type: 'stock',
      units: 'invalid',
      avg_buy_price: 200
    })
  });
  assert.strictEqual(badRes4.status, 400);

  const badRes5 = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tesla Inc',
      type: 'stock',
      units: 10,
      avg_buy_price: 'invalid'
    })
  });
  assert.strictEqual(badRes5.status, 400);

  console.log('POST /api/assets validation success!');

  // Test POST /api/assets
  console.log('Testing POST /api/assets...');
  const postRes = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tesla Inc',
      type: 'stock',
      ticker: 'TSLA',
      units: 10,
      avg_buy_price: 200
    })
  });
  const postData = await postRes.json();
  assert.strictEqual(postData.success, true);
  console.log('POST /api/assets success!');

  // Test GET /api/assets
  console.log('Testing GET /api/assets...');
  const getRes = await fetch('http://localhost:5001/api/assets');
  const getData = await getRes.json();
  assert.strictEqual(getData.length, 1);
  assert.strictEqual(getData[0].name, 'Tesla Inc');
  assert.strictEqual(getData[0].ticker, 'TSLA');
  assert.strictEqual(getData[0].current_price, 200); // defaults to avg_buy_price
  console.log('GET /api/assets success!');

  // Test POST /api/portfolio/sync
  console.log('Testing POST /api/portfolio/sync...');
  const syncRes = await fetch('http://localhost:5001/api/portfolio/sync', { method: 'POST' });
  const syncData = await syncRes.json();
  assert.strictEqual(syncData.success, true);
  assert.strictEqual(syncData.updated.length, 1);
  assert.strictEqual(syncData.updated[0].name, 'Tesla Inc');
  assert.ok(syncData.updated[0].price > 0);
  console.log('POST /api/portfolio/sync success! New price:', syncData.updated[0].price);

  // Test UPDATE via POST with id
  console.log('Testing UPDATE via POST...');
  const assetId = getData[0].id;
  const updateRes = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: assetId,
      name: 'Tesla Inc (Updated)',
      type: 'stock',
      ticker: 'TSLA',
      units: 12,
      avg_buy_price: 190,
      current_price: syncData.updated[0].price
    })
  });
  const updateData = await updateRes.json();
  assert.strictEqual(updateData.success, true);

  // Verify update
  const getRes2 = await fetch('http://localhost:5001/api/assets');
  const getData2 = await getRes2.json();
  assert.strictEqual(getData2[0].name, 'Tesla Inc (Updated)');
  assert.strictEqual(getData2[0].units, 12);
  assert.strictEqual(getData2[0].avg_buy_price, 190);
  assert.strictEqual(getData2[0].current_price, syncData.updated[0].price);

  // Test UPDATE via POST without current_price (should keep current_price)
  console.log('Testing UPDATE via POST without current_price...');
  const updateResWithoutPrice = await fetch('http://localhost:5001/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: assetId,
      name: 'Tesla Inc (Updated Again)',
      type: 'stock',
      ticker: 'TSLA',
      units: 15,
      avg_buy_price: 180
    })
  });
  const updateDataWithoutPrice = await updateResWithoutPrice.json();
  assert.strictEqual(updateDataWithoutPrice.success, true);

  // Verify update kept existing current_price
  const getRes2b = await fetch('http://localhost:5001/api/assets');
  const getData2b = await getRes2b.json();
  assert.strictEqual(getData2b[0].name, 'Tesla Inc (Updated Again)');
  assert.strictEqual(getData2b[0].units, 15);
  assert.strictEqual(getData2b[0].avg_buy_price, 180);
  assert.strictEqual(getData2b[0].current_price, syncData.updated[0].price);
  console.log('UPDATE via POST without current_price success (kept existing price)!');

  // Test DELETE /api/assets/:id
  console.log('Testing DELETE /api/assets/:id...');
  const delRes = await fetch(`http://localhost:5001/api/assets/${assetId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  assert.strictEqual(delData.success, true);

  // Verify deletion
  const getRes3 = await fetch('http://localhost:5001/api/assets');
  const getData3 = await getRes3.json();
  assert.strictEqual(getData3.length, 0);
  console.log('DELETE /api/assets/:id success!');

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
} catch (err) {
  console.error('Validation failed:', err);
  process.exitCode = 1;
} finally {
  console.log('Stopping validation server...');
  server.kill();
  // wait for shutdown
  await new Promise(resolve => setTimeout(resolve, 1000));
}
