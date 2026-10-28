import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';
import { answerQuestion } from './rag.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MAX_QUESTION_LENGTH = 500;

export function createApp({ client, store, config, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // so rate limiting sees the real client IP behind a proxy/CDN
  app.use(express.json({ limit: '10kb' }));

  // CORS: only your own site(s) may call the API from a browser
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && config.allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(express.static(publicDir));
  app.get('/health', (_req, res) => res.json({ ok: true, chunks: store.items.length }));

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many questions. Please wait a minute and try again.' },
  });

  app.post('/chat', limiter, async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question) return res.status(400).json({ error: 'Please type a question.' });
    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` });
    }

    try {
      const result = await answerQuestion(question, { client, store, config });
      return res.json(result);
    } catch (err) {
      logger.error?.(`Chat error: ${err.message}`);
      return res.status(503).json({
        error: 'The assistant is unavailable right now.',
        bookingUrl: config.bookingUrl || undefined,
      });
    }
  });

  return app;
}
