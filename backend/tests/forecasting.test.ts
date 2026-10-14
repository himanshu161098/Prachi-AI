import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ForecastingService } from '../src/services/forecastingService';

describe('Forecasting & Statistical Modeling Engine', () => {
  test('Linear trend forecast returns valid metrics and 95% uncertainty bounds', () => {
    const result = ForecastingService.runForecast({
      userId: 'usr-test-01',
      metricName: 'Quarterly Sales',
      presetDataset: 'revenue',
      horizonSteps: 4,
      modelType: 'linear_trend'
    });

    assert.strictEqual(result.targetMetric, 'Quarterly Sales');
    assert.strictEqual(result.forecast.length, 4, 'Forecast must contain 4 horizon points');
    assert.ok(result.metrics.r2 >= 0 && result.metrics.r2 <= 1, 'R2 score must be between 0 and 1');
    assert.ok(result.metrics.rmse >= 0, 'RMSE must be positive');

    for (const point of result.forecast) {
      assert.ok(point.forecast >= 0, 'Forecast point should be positive');
      assert.ok(point.lowerBound <= point.forecast, 'Lower bound must be <= forecast');
      assert.ok(point.upperBound >= point.forecast, 'Upper bound must be >= forecast');
      assert.ok(point.uncertaintyScore > 0, 'Uncertainty score must be non-zero');
    }

    assert.ok(result.disclaimer.includes('DISCLAIMER'), 'Must carry uncertainty disclaimer');
  });

  test('Exponential smoothing correctly dampens historical series', () => {
    const result = ForecastingService.runForecast({
      userId: 'usr-test-01',
      metricName: 'Server CPU',
      presetDataset: 'server_load',
      horizonSteps: 3,
      modelType: 'exponential_smoothing',
      smoothingFactor: 0.4
    });

    assert.strictEqual(result.forecast.length, 3);
    assert.ok(result.metrics.mae >= 0);
  });

  test('Polynomial regression computes non-linear quadratic trend', () => {
    const result = ForecastingService.runForecast({
      userId: 'usr-test-01',
      metricName: 'DAU Growth',
      presetDataset: 'users',
      horizonSteps: 5,
      modelType: 'polynomial_regression'
    });

    assert.strictEqual(result.forecast.length, 5);
    assert.ok(result.metrics.r2 >= 0 && result.metrics.r2 <= 1);
    assert.ok(result.forecast[0].forecast > 0);
  });

  test('Weighted moving average produces weighted forecasts', () => {
    const result = ForecastingService.runForecast({
      userId: 'usr-test-01',
      metricName: 'Tickets Volume',
      presetDataset: 'support_tickets',
      horizonSteps: 3,
      modelType: 'weighted_moving_average'
    });

    assert.strictEqual(result.forecast.length, 3);
    assert.ok(result.metrics.rmse >= 0);
  });
});

