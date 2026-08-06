'use strict';
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

const resp = (code, body) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  },
  body: JSON.stringify(body),
});

function callGemini(requestBody) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(requestBody);
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`Gemini parse error: ${data}`)); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

const RECEIPT_PROMPT = `You are a receipt analysis AI. Analyze this receipt image and extract:
1. Merchant name
2. Total amount (numeric, no currency symbol)
3. Date (ISO format YYYY-MM-DD if visible, otherwise null)
4. Category suggestion (one of: Bills, Groceries, Entertainment, Transport, Dining, Health, Shopping, Other)
5. Line items if visible

Return ONLY valid JSON in this exact shape (no markdown, no code block):
{
  "merchant": "string",
  "amount": number,
  "date": "YYYY-MM-DD or null",
  "category": "string",
  "description": "short description string",
  "line_items": [{"name": "string", "amount": number}] or null
}`;

exports.handler = async (event) => {
  try {
    // Authorizer validates the Firebase JWT; userId available if needed for audit logging
    const body = JSON.parse(event.body || '{}');
    const { imageBase64, mimeType } = body;

    if (!imageBase64) return resp(400, { error: 'Missing required field: imageBase64' });
    if (!GEMINI_API_KEY) return resp(500, { error: 'Gemini API key not configured' });

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const resolvedMime = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';

    const geminiResponse = await callGemini({
      contents: [{
        role: 'user',
        parts: [
          { text: RECEIPT_PROMPT },
          { inlineData: { mimeType: resolvedMime, data: imageBase64 } },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    });

    if (geminiResponse.status !== 200) {
      const err = geminiResponse.body?.error;
      if (err?.status === 'RESOURCE_EXHAUSTED') {
        return resp(429, { error: 'Gemini quota exceeded. Please try again shortly.' });
      }
      return resp(502, { error: `Gemini API error: ${err?.message || 'Unknown error'}` });
    }

    const text = geminiResponse.body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return resp(502, { error: 'Empty response from Gemini' });

    // Strip any accidental markdown fences
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);

    return resp(200, { success: true, result: parsed });
  } catch (err) {
    console.error('scanReceipt error:', err);
    return resp(500, { error: err.message });
  }
};
