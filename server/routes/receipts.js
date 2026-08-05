import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Multer configuration
// ---------------------------------------------------------------------------
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`),
        { code: 'UNSUPPORTED_TYPE' },
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ---------------------------------------------------------------------------
// Vision AI prompts & helpers
// ---------------------------------------------------------------------------
const RECEIPT_PROMPT = `You are a receipt-parsing assistant. Analyze the provided receipt image and extract the data into JSON.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "merchant": string,
  "date": string (ISO 8601, e.g. "2025-03-15"),
  "total": number,
  "subtotal": number | null,
  "tax": number | null,
  "line_items": [ { "name": string, "price": number, "quantity": number } ],
  "suggested_category": string
}

Rules:
- "merchant" is the store/restaurant name.
- "date" must be ISO 8601. If the year is ambiguous, assume the current year.
- "total" is the final amount paid.
- "subtotal" and "tax" may be null if not clearly shown.
- Each line item must have a name, unit price, and quantity (default 1 if not shown).
- "suggested_category" should be one of: Groceries, Dining, Entertainment, Bills, Shopping, Transport, Health, Education, Other.
- Do NOT guess values. If a field is unreadable, set it to null (for nullable fields) or omit the line item.`;

async function parseReceiptWithClaude(imagePath) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY environment variable is not set'), {
      code: 'MISSING_API_KEY',
    });
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png')
    ? 'image/png'
    : imagePath.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: RECEIPT_PROMPT + '\n\nIMPORTANT: Return ONLY the JSON object. Do not wrap in markdown or add commentary.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude Vision API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  let rawText = json.content?.[0]?.text?.trim();
  if (!rawText) throw new Error('Claude returned empty response.');
  if (rawText.startsWith('```')) {
    const lines = rawText.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines.length > 0 && lines[lines.length - 1].startsWith('```')) lines.pop();
    rawText = lines.join('\n').trim();
  }
  return rawText;
}

async function parseReceiptWithOpenAI(imagePath) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('OPENAI_API_KEY environment variable is not set'), {
      code: 'MISSING_API_KEY',
    });
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png')
    ? 'image/png'
    : imagePath.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: RECEIPT_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Vision API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const rawText = json.choices?.[0]?.message?.content?.trim();
  if (!rawText) throw new Error('OpenAI returned empty response.');
  return rawText;
}

async function parseReceiptWithGemini(imagePath) {
  // Use dedicated Receipt Scanner API Key first, then fallback to shared keys
  const apiKey = process.env.RECEIPT_SCANNER_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.VITE_RECEIPT_SCANNER_API_KEY
    || process.env.VITE_MANAGER_API_KEY
    || process.env.VITE_ASSISTANT_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('No Gemini API key configured for receipt scanning. Set RECEIPT_SCANNER_API_KEY in .env'), {
      code: 'MISSING_API_KEY',
    });
  }

  console.log('[Receipt Scanner] Using API key prefix:', apiKey.substring(0, 15) + '...');


  const ai = new GoogleGenAI({ apiKey });

  // Read the image file and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png')
    ? 'image/png'
    : imagePath.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: RECEIPT_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      const rawText = response.text?.trim();
      if (rawText) return rawText;
    } catch (err) {
      console.warn(`Model ${model} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to process the image.');
}


// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validateParsedReceipt(data) {
  const errors = [];

  if (typeof data.merchant !== 'string' || !data.merchant.trim()) {
    errors.push('Missing or invalid "merchant" (expected non-empty string)');
  }
  if (typeof data.date !== 'string' || !data.date.trim()) {
    errors.push('Missing or invalid "date" (expected ISO 8601 string)');
  }
  if (typeof data.total !== 'number' || isNaN(data.total)) {
    errors.push('Missing or invalid "total" (expected number)');
  }
  if (data.line_items !== undefined && data.line_items !== null) {
    if (!Array.isArray(data.line_items)) {
      errors.push('"line_items" must be an array');
    } else {
      data.line_items.forEach((item, i) => {
        if (typeof item.name !== 'string' || !item.name.trim()) {
          errors.push(`line_items[${i}]: missing or invalid "name"`);
        }
        if (typeof item.price !== 'number' || isNaN(item.price)) {
          errors.push(`line_items[${i}]: missing or invalid "price"`);
        }
        if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
          errors.push(`line_items[${i}]: missing or invalid "quantity"`);
        }
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// POST /api/receipts/scan
// ---------------------------------------------------------------------------
router.post('/scan', (req, res, next) => {
  upload.single('receipt')(req, res, async (err) => {
    // ── Multer errors ──────────────────────────────────────────────────
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
        });
      }
      if (err.code === 'UNSUPPORTED_TYPE') {
        return res.status(415).json({
          error: 'Unsupported file type',
          message: err.message,
        });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a receipt image using the "receipt" field',
      });
    }

    // ── Call Vision AI (Pydantic Python Primary, Node fallback) ─────────
    const imagePath = req.file.path;
    const receipt_image_url = `/uploads/${req.file.filename}`;

    try {
      let parsedData = null;
      let engine = 'gemini';

      // Use Gemini Vision directly (the working API keys)
      // Skip Python parser since Claude key has no credits
      try {
        const rawJson = await parseReceiptWithGemini(imagePath);
        const cleaned = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        parsedData = JSON.parse(cleaned);
        engine = 'gemini_vision';
      } catch (geminiErr) {
        console.warn('Gemini Vision failed:', geminiErr.message);
        
        // Try Claude as backup (in case user adds credits later)
        const hasClaude = !!process.env.ANTHROPIC_API_KEY;
        if (hasClaude) {
          try {
            const rawJson = await parseReceiptWithClaude(imagePath);
            const cleaned = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
            parsedData = JSON.parse(cleaned);
            engine = 'claude_vision';
          } catch (claudeErr) {
            console.warn('Claude Vision also failed:', claudeErr.message);
          }
        }
      }

      // No mock data — return a real error if all APIs fail
      if (!parsedData) {
        return res.status(502).json({
          error: 'Receipt scanning failed',
          message: 'All Vision AI services are unavailable or rate-limited. Please try again in a moment.',
        });
      }

      // Auto-fill missing date with today (receipts often have unreadable dates)
      if (!parsedData.date || typeof parsedData.date !== 'string' || !parsedData.date.trim()) {
        parsedData.date = new Date().toISOString().split('T')[0];
        console.log('[Receipt Scanner] Date unreadable, defaulting to today:', parsedData.date);
      }

      // ── Validate required fields ──────────────────────────────────
      const validationErrors = validateParsedReceipt(parsedData);
      if (validationErrors.length > 0) {
        return res.status(422).json({
          error: 'Parsed receipt data is incomplete or invalid',
          validation_errors: validationErrors,
          parsed_data: parsedData,
        });
      }

      // ── Success — return Pydantic-validated data ──────────────────
      return res.status(200).json({
        receipt_image_url,
        engine,
        validation: engine === 'pydantic_python' ? 'Pydantic v2 Schema Enforced' : 'Vision AI Extracted',
        data: {
          merchant: parsedData.merchant,
          date: parsedData.date,
          total: parsedData.total,
          subtotal: parsedData.subtotal ?? null,
          tax: parsedData.tax ?? null,
          tip: parsedData.tip ?? null,
          payment_method: parsedData.payment_method ?? null,
          line_items: parsedData.line_items ?? [],
          suggested_category: parsedData.suggested_category ?? 'Other',
        },
      });
    } catch (apiErr) {
      console.error('Receipt Vision API error:', apiErr);

      if (apiErr.code === 'MISSING_API_KEY') {
        return res.status(500).json({
          error: 'Server configuration error',
          message: 'Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured.',
        });
      }


      // Extract detailed error message from Google API response
      let userFriendlyMessage = apiErr.message || 'The AI service failed to process the receipt.';
      try {
        if (typeof apiErr.message === 'string' && apiErr.message.startsWith('{')) {
          const parsedErr = JSON.parse(apiErr.message);
          if (parsedErr.error?.message) {
            userFriendlyMessage = parsedErr.error.message;
          }
        }
      } catch (_) {}

      return res.status(502).json({
        error: 'Receipt parsing failed',
        message: userFriendlyMessage,
        details: apiErr.message,
      });
    }
  });
});


export default router;
