import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import receiptsRouter from './routes/receipts.js';
import voiceRouter from './routes/voice.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded receipt images as static files
app.use('/uploads', express.static(path.join(PROJECT_ROOT, 'uploads')));

// Routes
app.use('/api/receipts', receiptsRouter);
app.use('/api/voice', voiceRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`MyVault backend server listening on http://localhost:${PORT}`);
});
