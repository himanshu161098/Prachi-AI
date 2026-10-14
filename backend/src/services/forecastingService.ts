import { db } from '../database';

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ForecastRequest {
  userId: string;
  metricName: string;
  historicalData?: TimeSeriesPoint[];
  presetDataset?: 'revenue' | 'users' | 'server_load' | 'support_tickets';
  horizonSteps?: number;
  modelType?: 'linear_trend' | 'exponential_smoothing' | 'moving_average' | 'polynomial_regression' | 'weighted_moving_average';
  smoothingFactor?: number; // alpha for exponential smoothing (0 to 1)
}

export interface ForecastPoint {
  date: string;
  forecast: number;
  lowerBound: number; // 95% Confidence Interval Lower
  upperBound: number; // 95% Confidence Interval Upper
  uncertaintyScore: number; // 0 to 1
}

export interface ModelMetrics {
  mse: number; // Mean Squared Error
  rmse: number; // Root Mean Squared Error
  mae: number; // Mean Absolute Error
  r2: number; // Coefficient of Determination (0 to 1)
  standardError: number;
}

export interface ForecastResult {
  modelId: string;
  modelName: string;
  modelType: string;
  version: string;
  targetMetric: string;
  history: TimeSeriesPoint[];
  forecast: ForecastPoint[];
  metrics: ModelMetrics;
  disclaimer: string;
  provenance: {
    datasetSize: number;
    generatedAt: string;
    algorithm: string;
  };
}

export class ForecastingService {
  static getPresetData(preset: 'revenue' | 'users' | 'server_load' | 'support_tickets'): TimeSeriesPoint[] {
    const now = new Date('2026-09-01T00:00:00Z');
    const points: TimeSeriesPoint[] = [];

    switch (preset) {
      case 'revenue': { // 12 monthly points in $ thousands
        const base = 45;
        const trend = [45, 52, 50, 58, 64, 61, 70, 78, 82, 89, 95, 104];
        for (let i = 0; i < 12; i++) {
          const d = new Date(now);
          d.setMonth(d.getMonth() - (11 - i));
          points.push({
            date: d.toISOString().split('T')[0].substring(0, 7),
            value: trend[i]
          });
        }
        break;
      }
      case 'users': { // Daily active users over 14 days
        const base = 1200;
        for (let i = 0; i < 14; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - (13 - i));
          const dayGrowth = base + i * 45 + Math.round(Math.sin(i) * 30);
          points.push({
            date: d.toISOString().split('T')[0],
            value: dayGrowth
          });
        }
        break;
      }
      case 'server_load': { // Hourly CPU % utilization over 24 hours
        for (let i = 0; i < 24; i++) {
          const d = new Date(now);
          d.setHours(d.getHours() - (23 - i));
          const hour = d.getHours();
          // Diurnal cycle
          const cycle = Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 25;
          const cpu = Math.max(15, Math.min(95, Math.round(45 + cycle + (Math.sin(i * 3) * 8))));
          points.push({
            date: d.toISOString().substring(11, 16),
            value: cpu
          });
        }
        break;
      }
      case 'support_tickets': { // Weekly tickets
        const weekly = [120, 115, 130, 125, 140, 135, 150, 160, 155, 170];
        for (let i = 0; i < 10; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - (9 - i) * 7);
          points.push({
            date: d.toISOString().split('T')[0],
            value: weekly[i]
          });
        }
        break;
      }
    }
    return points;
  }

  static runForecast(req: ForecastRequest): ForecastResult {
    let history: TimeSeriesPoint[] = [];

    if (req.historicalData && req.historicalData.length >= 3) {
      history = req.historicalData;
    } else {
      history = this.getPresetData(req.presetDataset || 'revenue');
    }

    const n = history.length;
    const horizon = req.horizonSteps || 6;
    const modelType = req.modelType || 'linear_trend';
    const values = history.map(h => h.value);

    // Compute basic statistics
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    let sumXY = 0;
    let sumXX = 0;
    let sumX3 = 0;
    let sumX4 = 0;
    let sumX2Y = 0;

    for (let i = 0; i < n; i++) {
      const i2 = i * i;
      sumXY += i * values[i];
      sumXX += i2;
      sumX3 += i2 * i;
      sumX4 += i2 * i2;
      sumX2Y += i2 * values[i];
    }

    // Linear Regression Coefficients
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    // Polynomial Regression (Quadratic y = a + b*x + c*x^2)
    const m00 = n, m01 = sumX, m02 = sumXX;
    const m10 = sumX, m11 = sumXX, m12 = sumX3;
    const m20 = sumXX, m21 = sumX3, m22 = sumX4;
    const det = m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20) || 1;
    const detA = sumY * (m11 * m22 - m12 * m21) - m01 * (sumXY * m22 - m12 * sumX2Y) + m02 * (sumXY * m21 - m11 * sumX2Y);
    const detB = m00 * (sumXY * m22 - m12 * sumX2Y) - sumY * (m10 * m22 - m12 * m20) + m02 * (m10 * sumX2Y - sumXY * m20);
    const detC = m00 * (m11 * sumX2Y - sumXY * m21) - m01 * (m10 * sumX2Y - sumXY * m20) + sumY * (m10 * m21 - m11 * m20);
    const polyA = detA / det;
    const polyB = detB / det;
    const polyC = detC / det;

    // Calculate fitted values & Residuals
    const fitted: number[] = [];
    let ssTotal = 0;
    let ssResidual = 0;
    let absErrorSum = 0;
    const meanY = sumY / n;

    for (let i = 0; i < n; i++) {
      let fitVal = 0;
      if (modelType === 'linear_trend') {
        fitVal = intercept + slope * i;
      } else if (modelType === 'exponential_smoothing') {
        const alpha = req.smoothingFactor || 0.3;
        fitVal = i === 0 ? values[0] : alpha * values[i - 1] + (1 - alpha) * fitted[i - 1];
      } else if (modelType === 'polynomial_regression') {
        fitVal = polyA + polyB * i + polyC * (i * i);
      } else if (modelType === 'weighted_moving_average') {
        const win = Math.min(3, i + 1);
        let wSum = 0;
        let valSum = 0;
        for (let k = 0; k < win; k++) {
          const w = k + 1;
          wSum += w;
          valSum += values[i - win + 1 + k] * w;
        }
        fitVal = valSum / (wSum || 1);
      } else { // moving average
        const win = 3;
        const start = Math.max(0, i - win);
        const slice = values.slice(start, i || 1);
        fitVal = slice.reduce((a, b) => a + b, 0) / slice.length;
      }
      fitted.push(fitVal);
      const res = values[i] - fitVal;
      ssResidual += res * res;
      ssTotal += (values[i] - meanY) * (values[i] - meanY);
      absErrorSum += Math.abs(res);
    }

    const mse = ssResidual / n;
    const rmse = Math.sqrt(mse);
    const mae = absErrorSum / n;
    const r2 = Math.max(0, Math.min(1, 1 - (ssResidual / (ssTotal || 1))));
    const standardError = rmse;

    // Generate Forecast Points with Uncertainty Bounds (95% CI: ~1.96 * SE * sqrt(1 + 1/n + ...))
    const forecast: ForecastPoint[] = [];
    const lastDate = new Date(history[n - 1].date.length === 7 ? `${history[n - 1].date}-01` : history[n - 1].date);
    const isMonthly = history[0].date.length === 7;
    const isHourly = history[0].date.length === 5;

    for (let step = 1; step <= horizon; step++) {
      const futureIndex = n - 1 + step;
      let val = 0;

      if (modelType === 'linear_trend') {
        val = intercept + slope * futureIndex;
      } else if (modelType === 'exponential_smoothing') {
        // Flat trend with smoothed level
        const lastSmoothed = fitted[n - 1];
        val = lastSmoothed + slope * step * 0.5;
      } else if (modelType === 'polynomial_regression') {
        val = polyA + polyB * futureIndex + polyC * (futureIndex * futureIndex);
      } else if (modelType === 'weighted_moving_average') {
        const win = Math.min(4, n);
        let wSum = 0;
        let valSum = 0;
        for (let k = 0; k < win; k++) {
          const w = k + 1;
          wSum += w;
          valSum += values[n - win + k] * w;
        }
        val = (valSum / (wSum || 1)) + slope * (step * 0.35);
      } else { // Moving average extrapolation
        const win = Math.min(4, n);
        const recent = values.slice(-win);
        val = recent.reduce((a, b) => a + b, 0) / win + slope * (step * 0.3);
      }

      // Uncertainty increases further into the future
      const uncertaintyExpansion = 1 + (step * 0.15);
      const margin = 1.96 * standardError * uncertaintyExpansion;
      const lower = Math.max(0, Math.round((val - margin) * 100) / 100);
      const upper = Math.round((val + margin) * 100) / 100;
      const uncertaintyScore = Math.min(0.99, Math.round((0.15 + (step * 0.08)) * 100) / 100);

      let futureDateStr = '';
      if (isMonthly) {
        const d = new Date(lastDate);
        d.setMonth(d.getMonth() + step);
        futureDateStr = d.toISOString().split('T')[0].substring(0, 7);
      } else if (isHourly) {
        const h = (parseInt(history[n - 1].date.split(':')[0], 10) + step) % 24;
        futureDateStr = `${h.toString().padStart(2, '0')}:00`;
      } else {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + step);
        futureDateStr = d.toISOString().split('T')[0];
      }

      forecast.push({
        date: futureDateStr,
        forecast: Math.round(val * 100) / 100,
        lowerBound: lower,
        upperBound: upper,
        uncertaintyScore
      });
    }

    const modelId = `mdl-${Date.now()}`;
    const version = 'v1.4.2';

    // Persist Model Record in DB
    try {
      db.prepare(`
        INSERT INTO forecast_models (id, user_id, model_name, model_type, version, parameters_json, metrics_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        modelId,
        req.userId,
        `${req.metricName} Predictor`,
        modelType,
        version,
        JSON.stringify({ slope, intercept, horizon, datasetSize: n }),
        JSON.stringify({ mse, rmse, mae, r2, standardError })
      );

      db.prepare(`
        INSERT INTO forecast_predictions (id, user_id, model_id, target_metric, history_json, forecast_json, uncertainty_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `pred-${Date.now()}`,
        req.userId,
        modelId,
        req.metricName,
        JSON.stringify(history),
        JSON.stringify(forecast),
        JSON.stringify({ confidenceLevel: '95%', r2Score: r2 })
      );
    } catch (e) {
      console.error('[ForecastingService] Could not persist model metadata:', e);
    }

    return {
      modelId,
      modelName: `${req.metricName} Statistical Engine`,
      modelType,
      version,
      targetMetric: req.metricName,
      history,
      forecast,
      metrics: {
        mse: Math.round(mse * 100) / 100,
        rmse: Math.round(rmse * 100) / 100,
        mae: Math.round(mae * 100) / 100,
        r2: Math.round(r2 * 1000) / 1000,
        standardError: Math.round(standardError * 100) / 100
      },
      disclaimer: 'DISCLAIMER: All predictions are statistical estimates subject to model assumptions and variance. They should not be treated as deterministic guarantees of future events.',
      provenance: {
        datasetSize: n,
        generatedAt: new Date().toISOString(),
        algorithm: modelType === 'linear_trend' ? 'Ordinary Least Squares (OLS) Linear Trend' : modelType
      }
    };
  }
}
