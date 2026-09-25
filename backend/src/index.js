import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import enquiriesRouter from './routes/enquiries.js';
import applicationsRouter from './routes/applications.js';
import jobsRouter from './routes/jobs.js';
import servicesRouter from './routes/services.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGINS = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // allow same-origin/non-browser requests (no Origin header) and any
      // origin explicitly listed in FRONTEND_ORIGINS
      if (!origin || ORIGINS.length === 0 || ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json({ limit: '1mb' }));

// Rate-limit public write endpoints against spam/abuse
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this device. Please try again later.' },
});
app.use(['/api/enquiries', '/api/applications'], (req, res, next) => {
  if (req.method === 'POST') return publicFormLimiter(req, res, next);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/enquiries', enquiriesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin', authRouter);

// central error handler (e.g. CORS rejection)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Eagle Eye Security API listening on port ${PORT}`);
});
