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

export const app = express();

// Basic middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Centralized error handler
app.use(errorHandler);

