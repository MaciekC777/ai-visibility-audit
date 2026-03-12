import './config/env'; // validate env on startup
import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors';
import auditsRouter from './routes/audits';
import authRouter from './routes/auth';
import stripeRouter from './routes/stripe';
import { logger } from './utils/logger';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(corsMiddleware);

// Stripe webhook needs raw body
app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Routes
app.use('/audits', auditsRouter);
app.use('/auth', authRouter);
app.use('/stripe', stripeRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(env.PORT) || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
