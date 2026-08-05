import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const uploadMemory = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

const router = express.Router();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Cache the agent ID so we don't recreate it every time
let cachedAgentId = null;

const RECEIPT_AGENT_PROMPT = `You are a friendly receipt recording assistant for the MyVault personal finance app. Your job is to listen to the user describe their purchases and extract the key details.

When the user tells you about a purchase, extract:
1. WHAT they bought or WHERE they bought it (the merchant/store name or description)
2. HOW MUCH they spent (the dollar amount)
3. WHEN they bought it (the date - if they don't specify, assume today)

After the user describes a purchase, confirm back to them by saying something like:
"Got it! I'll add [amount] for [description] on [date] to your dashboard."

If the user's input is unclear, ask a brief clarifying question. Keep your responses short and conversational.

Examples:
- User: "I spent $10 on Taco Bell" → Confirm: Taco Bell, $10, today
- User: "Twenty bucks at Walmart yesterday" → Confirm: Walmart, $20, yesterday
- User: "Paid my internet bill, $59.99" → Confirm: Internet Bill, $59.99, today

Be natural and helpful. If the user wants to add multiple purchases, handle them one at a time.`;

/**
 * POST /api/voice/create-agent
 * Creates (or returns cached) an ElevenLabs Conversational AI agent
 */
router.post('/create-agent', async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'ELEVENLABS_API_KEY is not configured.',
    });
  }

  // Return cached agent if we already created one
  if (cachedAgentId) {
    return res.json({ agentId: cachedAgentId });
  }

  try {
    const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

    const agent = await elevenlabs.conversationalAi.agents.create({
      name: 'MyVault Receipt Assistant',
      conversationConfig: {
        agent: {
          prompt: {
            prompt: RECEIPT_AGENT_PROMPT,
          },
        },
      },
    });

    cachedAgentId = agent.agent_id;

    return res.json({
      agentId: agent.agent_id,
      message: 'ElevenLabs conversational agent created successfully',
    });
  } catch (err) {
    console.error('ElevenLabs agent creation error:', err);
    return res.status(502).json({
      error: 'Failed to create voice agent',
      message: err.message,
    });
  }
});

/**
 * GET /api/voice/agent-id
 * Returns the cached agent ID if available
 */
router.get('/agent-id', (req, res) => {
  if (cachedAgentId) {
    return res.json({ agentId: cachedAgentId });
  }
  return res.status(404).json({ error: 'No agent created yet' });
});

/**
 * POST /api/voice/speak
 * Converts text to spoken audio using ElevenLabs Text-to-Speech API
 */
router.post('/speak', async (req, res) => {
  const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'ELEVENLABS_API_KEY is not configured on backend.',
    });
  }

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (err) {
    console.error('ElevenLabs TTS error:', err);
    return res.status(502).json({
      error: 'Failed to generate speech audio',
      message: err.message,
    });
  }
});

/**
 * POST /api/voice/transcribe
 * Transcribes recorded microphone audio using Gemini 2.5 Flash AI
 */
router.post('/transcribe', uploadMemory.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const apiKey = process.env.RECEIPT_SCANNER_API_KEY
      || process.env.GEMINI_API_KEY
      || process.env.VITE_RECEIPT_SCANNER_API_KEY
      || process.env.VITE_MANAGER_API_KEY
      || process.env.VITE_ASSISTANT_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'No Gemini API key configured for audio transcription' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Audio = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/webm';

    const prompt = `Listen carefully to this spoken receipt audio recording.
Extract what the user bought, the total amount spent, and the date of purchase.
Return ONLY valid JSON (no markdown formatting) in this exact structure:
{
  "transcript": "Exact spoken text",
  "merchant": "Merchant or Store Name or Description",
  "amount": 0.00,
  "date": "YYYY-MM-DD"
}

If the year/date is not mentioned, use today's date (${new Date().toISOString().split('T')[0]}).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
    });

    const rawText = response.text?.trim() || '';
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const data = JSON.parse(cleaned);

    return res.json({
      success: true,
      transcript: data.transcript || '',
      merchant: data.merchant || 'Spoken Purchase',
      amount: Number(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
    });
  } catch (err) {
    console.error('Audio transcription error:', err);
    return res.status(502).json({
      error: 'Failed to transcribe audio',
      message: err.message,
    });
  }
});

export default router;


