import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/authRoutes';
import { chatRouter } from './routes/chatRoutes';
import { memoryRouter } from './routes/memoryRoutes';
import { ragRouter } from './routes/ragRoutes';
import { visionRouter } from './routes/visionRoutes';
import { forecastRouter } from './routes/forecastRoutes';
import { toolRouter } from './routes/toolRoutes';
import { taskRouter } from './routes/taskRoutes';
import { artifactRouter } from './routes/artifactRoutes';
import { adminRouter } from './routes/adminRoutes';
import { voiceRouter } from './routes/voiceRoutes';
import { contactRouter } from './routes/contactRoutes';
import { omniBrainRouter } from './routes/omniBrainRoutes';
import { agentRouter } from './routes/agentRoutes';

export const app = express();

// Trust first proxy (needed for correct IP in rate limiter behind reverse proxy)
app.set('trust proxy', 1);

// Security Headers Middleware (CSP, HSTS, X-Frame-Options, etc.)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  // Content Security Policy — blocks inline scripts and unauthorized resource loading
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.resend.com https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// CORS — Environment-aware origin restriction
const envAllowed = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];
if (process.env.CLIENT_URL) {
  envAllowed.push(process.env.CLIENT_URL.trim());
}

const PRODUCTION_ORIGINS = [
  'https://himanshu-portfolio.vercel.app',
  ...envAllowed
];
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const ALLOWED_ORIGINS = (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_CORS !== 'true')
  ? PRODUCTION_ORIGINS
  : Array.from(new Set([...PRODUCTION_ORIGINS, ...DEV_ORIGINS]));

app.use(cors({
  origin: (origin, callback) => {
    // In production, reject requests with no origin header to prevent non-browser abuse
    if (process.env.NODE_ENV === 'production' && !origin) {
      callback(null, false);
      return;
    }
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  maxAge: 600 // Cache preflight for 10 minutes
}));

// Body size limits — 2MB for JSON, 5MB for URL-encoded (prevents memory exhaustion DoS)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(rateLimiter);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/memories', memoryRouter);
app.use('/api/rag', ragRouter);
app.use('/api/vision', visionRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/ml', forecastRouter); // V2 Contract alias
app.use('/api/tools', toolRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/artifacts', artifactRouter);
app.use('/api/admin', adminRouter);
app.use('/api/voice', voiceRouter); // V2 Voice STT/TTS Contract
app.use('/api/contacts', contactRouter);
app.use('/api/brain', omniBrainRouter); // Updated Prachi AI OmniCognitive LangGraph Brain
app.use('/api/agents', agentRouter); // Module 4 Specialized Agents & Multi-Step Task Automation

// Root health probe
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Prachi AI Platform', time: new Date().toISOString() });
});

// Serve frontend static build if available
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler — does NOT reflect the URL back to prevent endpoint enumeration
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'NotFound', message: 'The requested resource was not found.' });
});

// Centralized error handler
app.use(errorHandler);

