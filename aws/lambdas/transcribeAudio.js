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

const AUDIO_PROMPT = `You are a voice-to-transaction AI. The user recorded a voice memo describing a purchase or expense.

Transcribe the audio and extract:
1. Transcript (exact words)
2. Amount (numeric, if mentioned)
3. Merchant or description (if mentioned)
4. Category suggestion (one of: Bills, Groceries, Entertainment, Transport, Dining, Health, Shopping, Other)
5. Date (ISO YYYY-MM-DD — use today's date if not specified: ${new Date().toISOString().split('T')[0]})

Return ONLY valid JSON in this exact shape (no markdown):
{
  "transcript": "string",
  "amount": number or null,
  "description": "string",
  "category": "string",
  "date": "YYYY-MM-DD"
}`;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { audioBase64, mimeType } = body;

    if (!audioBase64) return resp(400, { error: 'Missing required field: audioBase64' });
    if (!GEMINI_API_KEY) return resp(500, { error: 'Gemini API key not configured' });

    const resolvedMime = mimeType || 'audio/webm';

    const geminiResponse = await callGemini({
      contents: [{
        role: 'user',
        parts: [
          { text: AUDIO_PROMPT },
          { inlineData: { mimeType: resolvedMime, data: audioBase64 } },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 512,
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

    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);

    return resp(200, { success: true, result: parsed });
  } catch (err) {
    console.error('transcribeAudio error:', err);
    return resp(500, { error: err.message });
  }
};
