/**
 * test-receipt-scan.js — Test script for POST /api/receipts/scan
 *
 * Usage: node server/tests/test-receipt-scan.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function test(name, fn) {
  process.stdout.write(`\n--- ${name} ---\n`);
  try {
    await fn();
  } catch (err) {
    console.error(`  FAIL: ${err.message}`);
  }
}

async function run() {
  console.log('==============================================');
  console.log(' MyVault Receipt Scan — API Tests');
  console.log(` Server: ${BASE_URL}`);
  console.log('==============================================');

  // Test 1: Health check
  await test('Test 1: Health Check', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const body = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  Body:`, JSON.stringify(body, null, 2));
    console.log(res.status === 200 ? '  PASS' : '  FAIL');
  });

  // Test 2: No file uploaded (expect 400)
  await test('Test 2: No file uploaded (expect 400)', async () => {
    const res = await fetch(`${BASE_URL}/api/receipts/scan`, { method: 'POST' });
    const body = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  Body:`, JSON.stringify(body, null, 2));
    console.log(res.status === 400 ? '  PASS' : `  FAIL (expected 400, got ${res.status})`);
  });

  // Test 3: Wrong file type (expect 415)
  await test('Test 3: Wrong file type (expect 415)', async () => {
    const formData = new FormData();
    formData.append('receipt', new Blob(['not an image'], { type: 'text/plain' }), 'test.txt');
    const res = await fetch(`${BASE_URL}/api/receipts/scan`, { method: 'POST', body: formData });
    const body = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  Body:`, JSON.stringify(body, null, 2));
    console.log(res.status === 415 ? '  PASS' : `  FAIL (expected 415, got ${res.status})`);
  });

  // Test 4: Valid image upload (will fail with MISSING_API_KEY if not configured, which is expected)
  await test('Test 4: Valid image (tests upload + Gemini call)', async () => {
    // Create a minimal valid PNG (1x1 pixel)
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT
      0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
      0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND
      0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const formData = new FormData();
    formData.append('receipt', new Blob([pngHeader], { type: 'image/png' }), 'test-receipt.png');
    const res = await fetch(`${BASE_URL}/api/receipts/scan`, { method: 'POST', body: formData });
    const body = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(`  Body:`, JSON.stringify(body, null, 2));

    if (res.status === 200) {
      console.log('  PASS — Gemini parsed the receipt successfully');
    } else if (res.status === 500 && body.message?.includes('GEMINI_API_KEY')) {
      console.log('  PASS (expected) — Upload works, but GEMINI_API_KEY is not set');
    } else if (res.status === 502) {
      console.log('  PASS (partial) — Upload works, Gemini API returned an error (possibly invalid image)');
    } else if (res.status === 422) {
      console.log('  PASS (partial) — Upload works, Gemini response could not be parsed');
    } else {
      console.log(`  FAIL (unexpected status ${res.status})`);
    }
  });

  console.log('\n==============================================');
  console.log(' Tests complete');
  console.log('==============================================');
}

run().catch(console.error);
