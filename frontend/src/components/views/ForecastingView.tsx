import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Sliders, AlertTriangle, ShieldCheck, Download, Sparkles, Layers, Activity, PieChart, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../../services/api';
import { ForecastResult } from '../../types';

export const ForecastingView: React.FC = () => {
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('revenue');
  const [modelType, setModelType] = useState<string>('linear_trend');
  const [horizon, setHorizon] = useState<number>(6);
  const [smoothingFactor, setSmoothingFactor] = useState<number>(0.3);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Machine Learning Intelligence State (Module 8)
  const [anomalyResult, setAnomalyResult] = useState<any>(null);
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(2.0);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  const [clusteringResult, setClusteringResult] = useState<any>(null);
  const [kClusters, setKClusters] = useState<number>(3);
  const [clusteringLoading, setClusteringLoading] = useState(false);

  const runForecast = async (preset = selectedPreset, mType = modelType, h = horizon) => {
    setLoading(true);
    try {
      const res = await api.runForecast({
        presetDataset: preset,
        modelType: mType as any,
        horizonSteps: h,
        smoothingFactor
      });
      setResult(res);
    } catch (e: any) {
      alert(e.message || 'Forecast calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const loadPresetsAndInitialForecast = async () => {
    try {
      const pRes = await api.getForecastPresets();
      setPresets(pRes.presets || []);
      runForecast('revenue', 'linear_trend', 6);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadPresetsAndInitialForecast();
  }, []);

  const handleRunAnomalyDetection = async () => {
    if (!result || !result.history) return;
    setAnomalyLoading(true);
    try {
      const values = result.history.map(h => h.value);
      const res = await api.detectAnomalies(values, anomalyThreshold);
      setAnomalyResult(res);
    } catch (e: any) {
      alert(`Anomaly detection failed: ${e.message || 'Unknown error'}`);
    } finally {
      setAnomalyLoading(false);
    }
  };

  const handleRunClustering = async () => {
    if (!result || !result.history) return;
    setClusteringLoading(true);
    try {
      const values = result.history.map(h => h.value);
      const res = await api.clusterSegments(values, kClusters);
      setClusteringResult(res);
    } catch (e: any) {
      alert(`Clustering failed: ${e.message || 'Unknown error'}`);
    } finally {
      setClusteringLoading(false);
    }
  };

  // SVG Chart Calculation
  const renderChart = () => {
    if (!result) return null;

    const allPoints = [
      ...result.history.map(h => ({ date: h.date, val: h.value, isForecast: false, lower: h.value, upper: h.value })),
      ...result.forecast.map(f => ({ date: f.date, val: f.forecast, isForecast: true, lower: f.lowerBound, upper: f.upperBound }))
    ];

    const width = 760;
    const height = 300;
    const padding = 45;

    const minVal = Math.min(...allPoints.map(p => p.lower)) * 0.9;
    const maxVal = Math.max(...allPoints.map(p => p.upper)) * 1.1;

    const getX = (idx: number) => padding + (idx * (width - 2 * padding)) / (allPoints.length - 1 || 1);
    const getY = (val: number) => height - padding - ((val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding);

    // Historical Line path
    const historyPoints = allPoints.filter(p => !p.isForecast);
    const historyPath = historyPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.val)}`).join(' ');

    // Forecast Line path (connected to last historical point)
    const lastHistIdx = historyPoints.length - 1;
    const forecastPath = [
      `M ${getX(lastHistIdx)} ${getY(historyPoints[lastHistIdx].val)}`,
      ...result.forecast.map((f, idx) => `L ${getX(lastHistIdx + 1 + idx)} ${getY(f.forecast)}`)
    ].join(' ');

    // Uncertainty Area polygon
    const upperPoints = result.forecast.map((f, idx) => `${getX(lastHistIdx + 1 + idx)},${getY(f.upperBound)}`);
    const lowerPoints = [...result.forecast].reverse().map((f, idx) => {
      const actualIdx = result.forecast.length - 1 - idx;
      return `${getX(lastHistIdx + 1 + actualIdx)},${getY(f.lowerBound)}`;
    });
    const uncertaintyArea = `${getX(lastHistIdx)},${getY(historyPoints[lastHistIdx].val)} ${upperPoints.join(' ')} ${lowerPoints.join(' ')} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = height - padding - ratio * (height - 2 * padding);
          const valLabel = Math.round(minVal + ratio * (maxVal - minVal));
          return (
            <g key={idx}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" />
              <text x={padding - 8} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{valLabel}</text>
            </g>
          );
        })}

        {/* Uncertainty 95% Confidence Interval Area */}
        <polygon points={uncertaintyArea} fill="rgba(99, 102, 241, 0.15)" stroke="rgba(99, 102, 241, 0.3)" strokeDasharray="2 2" />

        {/* Historical Line */}
        <path d={historyPath} fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />

        {/* Historical Dots */}
        {historyPoints.map((p, idx) => (
          <circle key={idx} cx={getX(idx)} cy={getY(p.val)} r="4" fill="var(--accent-cyan)" />
        ))}

        {/* Forecast Line */}
        <path d={forecastPath} fill="none" stroke="var(--accent-indigo)" strokeWidth="3" strokeDasharray="5 5" strokeLinecap="round" />

        {/* Forecast Dots */}
        {result.forecast.map((f, idx) => {
          const cx = getX(lastHistIdx + 1 + idx);
          const cy = getY(f.forecast);
          return (
            <g key={idx}>
              <circle cx={cx} cy={cy} r="4" fill="var(--accent-indigo)" />
              <text x={cx} y={cy - 10} fill="var(--text-accent)" fontSize="10" fontWeight="600" textAnchor="middle">
                {f.forecast}
              </text>
            </g>
          );
        })}

        {/* Date Labels on X Axis */}
        {allPoints.map((p, idx) => {
          if (idx % 2 !== 0 && idx !== allPoints.length - 1) return null;
          return (
            <text key={idx} x={getX(idx)} y={height - 15} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
              {p.date}
            </text>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
          <TrendingUp size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>ML & Statistical Time-Series Forecasting</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Predict trends, resource capacity, and metrics with explicit 95% confidence intervals and rigorous model validation.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="glass-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Target Dataset Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => { setSelectedPreset(e.target.value); runForecast(e.target.value, modelType, horizon); }}
              className="input-control"
            >
              <option value="revenue">Monthly Revenue ($K)</option>
              <option value="users">Daily Active Users (DAU)</option>
              <option value="server_load">Cluster CPU Utilization (%)</option>
              <option value="support_tickets">Customer Inquiries</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Model Architecture
            </label>
            <select
              value={modelType}
              onChange={(e) => { setModelType(e.target.value); runForecast(selectedPreset, e.target.value, horizon); }}
              className="input-control"
            >
              <option value="linear_trend">Linear Regression Trend (OLS)</option>
              <option value="polynomial_regression">Polynomial Quadratic Fit (Non-Linear)</option>
              <option value="exponential_smoothing">Exponential Smoothing (Holt-Trend)</option>
              <option value="weighted_moving_average">Weighted Moving Average (WMA)</option>
              <option value="moving_average">Rolling Simple Moving Average</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Horizon Steps</span>
              <span style={{ color: 'var(--accent-indigo)' }}>+{horizon} steps</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              value={horizon}
              onChange={(e) => { setHorizon(Number(e.target.value)); runForecast(selectedPreset, modelType, Number(e.target.value)); }}
              style={{ width: '100%', accentColor: 'var(--accent-indigo)' }}
            />
          </div>

          <button className="btn btn-primary" onClick={() => runForecast()} disabled={loading}>
            <Sparkles size={16} />
            <span>{loading ? 'Recalculating...' : 'Recalculate'}</span>
          </button>
        </div>
      </div>

      {/* Chart & Metrics */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Visual Chart */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{result.modelName}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Algorithm: {result.provenance.algorithm} • Model Version: {result.version}
                </span>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--accent-cyan)' }} />
                  <span>Historical Data</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--accent-indigo)', borderTop: '1px dashed' }} />
                  <span>Forecast Projection</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '10px', backgroundColor: 'rgba(99, 102, 241, 0.25)' }} />
                  <span>95% Confidence Interval</span>
                </div>
              </div>
            </div>

            {/* SVG Render */}
            <div style={{ padding: '10px 0' }}>
              {renderChart()}
            </div>
          </div>

          {/* Evaluation Metrics Cards */}
          <div className="grid-4">
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>R² Goodness of Fit</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {result.metrics.r2}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Variance explained by model</div>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>RMSE (Root Mean Sq Error)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>
                {result.metrics.rmse}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Prediction standard deviation</div>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>MAE (Mean Absolute Error)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {result.metrics.mae}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Average absolute deviation</div>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Standard Error</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                ±{result.metrics.standardError}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>95% CI margin factor</div>
            </div>
          </div>

          {/* Uncertainty Disclaimer Banner (Mandatory PRD Section 9) */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.82rem',
            color: 'var(--accent-amber)'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{result.disclaimer}</span>
          </div>

          {/* Machine Learning & Statistical Intelligence (Module 8) */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)' }}>
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Machine Learning & Statistical Intelligence</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Advanced statistical anomaly detection (Z-Score + IQR) & Unsupervised 1D K-Means clustering.
                  </span>
                </div>
              </div>
            </div>

            <div className="grid-2">
              {/* Anomaly Detection Sub-panel */}
              <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={16} style={{ color: 'var(--accent-rose)' }} />
                    <span>Outlier & Anomaly Detection</span>
                  </h4>
                  <span className="badge badge-rose">Z-Score & IQR</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    Z-Threshold: <strong>{anomalyThreshold.toFixed(1)}σ</strong>
                  </label>
                  <input
                    type="range"
                    min="1.2"
                    max="3.5"
                    step="0.1"
                    value={anomalyThreshold}
                    onChange={(e) => setAnomalyThreshold(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-rose)' }}
                  />
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={handleRunAnomalyDetection}
                  disabled={anomalyLoading}
                  style={{ width: '100%', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                >
                  <ShieldAlert size={15} style={{ color: 'var(--accent-rose)' }} />
                  <span>{anomalyLoading ? 'Detecting Anomalies...' : 'Run Statistical Anomaly Detection'}</span>
                </button>

                {anomalyResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Mean: {anomalyResult.stats?.mean}</span>
                      <span>StdDev: {anomalyResult.stats?.stdDev}</span>
                      <span>IQR: {anomalyResult.stats?.iqr}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: anomalyResult.anomalyCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {anomalyResult.anomalyCount} anomalies flagged among {anomalyResult.totalRecords} records.
                    </div>

                    {anomalyResult.anomalies?.length > 0 ? (
                      <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {anomalyResult.anomalies.map((an: any, idx: number) => (
                          <div key={idx} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', fontSize: '0.76rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Index #{an.index} (Val: <strong>{an.value}</strong>)</span>
                            <span style={{ color: 'var(--accent-rose)' }}>Z: {an.zScore}σ • {an.reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                        No data points exceed {anomalyThreshold}σ variance bounds.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* K-Means Clustering Sub-panel */}
              <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PieChart size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Unsupervised 1D K-Means</span>
                  </h4>
                  <span className="badge badge-cyan">k = {kClusters}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    Clusters (k): <strong>{kClusters}</strong>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="5"
                    step="1"
                    value={kClusters}
                    onChange={(e) => setKClusters(parseInt(e.target.value, 10))}
                    style={{ flex: 1, accentColor: 'var(--accent-cyan)' }}
                  />
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={handleRunClustering}
                  disabled={clusteringLoading}
                  style={{ width: '100%', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                >
                  <Sparkles size={15} style={{ color: 'var(--accent-cyan)' }} />
                  <span>{clusteringLoading ? 'Clustering...' : 'Run 1D K-Means Clustering'}</span>
                </button>

                {clusteringResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Total Variance: <strong>{clusteringResult.variance}</strong> • Iterations: <strong>{clusteringResult.iterations}</strong>
                    </div>

                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {clusteringResult.clusters?.map((c: any) => (
                        <div key={c.clusterIndex} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.2)', fontSize: '0.76rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Cluster #{c.clusterIndex + 1} (Centroid: <strong>{c.centroid}</strong>)</span>
                          <span style={{ color: 'var(--accent-cyan)' }}>{c.memberCount} items ({Math.min(...c.memberValues)} - {Math.max(...c.memberValues)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
