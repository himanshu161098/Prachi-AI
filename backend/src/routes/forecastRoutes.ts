import { Router, Response } from 'express';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { ForecastingService } from '../services/forecastingService';
import { AuditService } from '../services/auditService';

export const forecastRouter = Router();

// Get preset datasets
forecastRouter.get('/presets', (req, res) => {
  res.json({
    presets: [
      { id: 'revenue', name: 'Monthly Enterprise Revenue ($K)', frequency: 'monthly', description: '12-month recurring revenue trend' },
      { id: 'users', name: 'Daily Active Users (DAU)', frequency: 'daily', description: '14-day user cohort engagement' },
      { id: 'server_load', name: 'Cloud Cluster CPU Utilization (%)', frequency: 'hourly', description: '24-hour diurnal compute load' },
      { id: 'support_tickets', name: 'Support Inquiries & Tickets', frequency: 'weekly', description: '10-week customer assistance volume' },
    ]
  });
});

// Run forecast
forecastRouter.post('/predict', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const { metricName, presetDataset, historicalData, horizonSteps, modelType, smoothingFactor } = req.body;

  if (!metricName && !presetDataset) {
    res.status(400).json({ error: 'BadRequest', message: 'metricName or presetDataset required' });
    return;
  }

  try {
    const result = ForecastingService.runForecast({
      userId: req.user!.id,
      metricName: metricName || (presetDataset ? presetDataset.toUpperCase() : 'Custom Metric'),
      presetDataset,
      historicalData,
      horizonSteps: horizonSteps ? parseInt(horizonSteps, 10) : 6,
      modelType: modelType || 'linear_trend',
      smoothingFactor: smoothingFactor ? parseFloat(smoothingFactor) : 0.3
    });

    AuditService.log({
      userId: req.user!.id,
      action: 'FORECAST_RUN',
      resource: result.modelId,
      details: { modelType: result.modelType, r2: result.metrics.r2 }
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'ForecastError', message: err.message || 'Error generating forecast' });
  }
});

// List user's saved forecast models
forecastRouter.get('/models', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const models = db.prepare(`
    SELECT * FROM forecast_models
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user!.id);

  res.json({ models });
});
