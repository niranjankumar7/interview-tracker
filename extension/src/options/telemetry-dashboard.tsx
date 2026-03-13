/**
 * Telemetry Dashboard Component
 * Shows extraction statistics and recent failures for debugging
 */

import React, { useState, useEffect } from 'react';
import {
  getMetrics,
  getPendingEvents,
  getTelemetrySettings,
  setTelemetrySettings,
  syncEvents,
  resetTelemetry,
  type TelemetryMetrics,
  type TelemetryEvent,
  type TelemetrySettings,
  type DomainMetrics
} from '../shared/telemetry';

interface DashboardStats {
  overallSuccessRate: number;
  confirmRate: number;
  editBeforeSaveRate: number;
  duplicateRate: number;
  totalExtractions: number;
  domainBreakdown: Array<{
    domain: string;
    successRate: number;
    editRate: number;
    attempts: number;
    avgConfidence: number;
  }>;
}

export const TelemetryDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [recentFailures, setRecentFailures] = useState<TelemetryEvent[]>([]);
  const [settings, setSettings] = useState<TelemetrySettings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'failures' | 'settings'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsData, eventsData, settingsData] = await Promise.all([
        getMetrics(),
        getPendingEvents(),
        getTelemetrySettings()
      ]);

      setMetrics(metricsData);
      setSettings(settingsData);

      // Filter recent failures
      const failures = eventsData
        .filter(e => e.event === 'extraction_failure')
        .slice(-20)
        .reverse();
      setRecentFailures(failures);

      // Calculate stats
      setStats(calculateStats(metricsData));
    } catch (error) {
      console.error('Failed to load telemetry data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (metrics: TelemetryMetrics): DashboardStats => {
    let totalAttempts = 0;
    let totalSuccesses = 0;
    let totalConfirmations = 0;
    let totalEdits = 0;
    let totalDuplicates = 0;

    const domainBreakdown: DashboardStats['domainBreakdown'] = [];

    for (const [domain, data] of Object.entries(metrics.domains)) {
      totalAttempts += data.attempts;
      totalSuccesses += data.successes;
      totalConfirmations += data.confirmations;
      totalEdits += data.edits;
      totalDuplicates += data.duplicates;

      domainBreakdown.push({
        domain,
        successRate: data.attempts > 0 ? Math.round((data.successes / data.attempts) * 100) : 0,
        editRate: data.confirmations > 0 ? Math.round((data.edits / data.confirmations) * 100) : 0,
        attempts: data.attempts,
        avgConfidence: Math.round(data.avg_confidence * 100)
      });
    }

    // Sort by attempts (most active first)
    domainBreakdown.sort((a, b) => b.attempts - a.attempts);

    return {
      overallSuccessRate: totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0,
      confirmRate: totalConfirmations > 0 
        ? Math.round(((totalConfirmations - totalEdits) / totalConfirmations) * 100) 
        : 0,
      editBeforeSaveRate: totalConfirmations > 0 
        ? Math.round((totalEdits / totalConfirmations) * 100) 
        : 0,
      duplicateRate: totalAttempts > 0 
        ? Math.round((totalDuplicates / totalAttempts) * 100) 
        : 0,
      totalExtractions: totalAttempts,
      domainBreakdown
    };
  };

  const handleSync = async () => {
    setSyncStatus({ message: 'Syncing...', type: 'info' });
    const result = await syncEvents();
    if (result.success) {
      setSyncStatus({ message: 'Sync completed successfully!', type: 'success' });
      await loadData();
    } else {
      setSyncStatus({ message: `Sync failed: ${result.error}`, type: 'error' });
    }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all telemetry data? This cannot be undone.')) {
      await resetTelemetry();
      await loadData();
      setSyncStatus({ message: 'Telemetry data reset', type: 'success' });
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleToggleEnabled = async () => {
    if (settings) {
      const newSettings = { ...settings, enabled: !settings.enabled };
      await setTelemetrySettings({ enabled: !settings.enabled });
      setSettings(newSettings);
    }
  };

  const handleToggleDebugInfo = async () => {
    if (settings) {
      const newSettings = { ...settings, include_debug_info: !settings.include_debug_info };
      await setTelemetrySettings({ include_debug_info: !settings.include_debug_info });
      setSettings(newSettings);
    }
  };

  if (isLoading) {
    return (
      <div className="telemetry-dashboard loading">
        <div className="loading-spinner">Loading telemetry data...</div>
      </div>
    );
  }

  if (!settings?.enabled) {
    return (
      <div className="telemetry-dashboard disabled">
        <div className="disabled-notice">
          <h3>📊 Telemetry is Disabled</h3>
          <p>Telemetry helps us improve extraction accuracy by tracking success rates and failures.</p>
          <p>We never collect personal data like company names or job titles - only aggregated metrics.</p>
          <button onClick={handleToggleEnabled} className="btn-primary">
            Enable Telemetry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="telemetry-dashboard">
      <header className="dashboard-header">
        <h2>📊 Telemetry Dashboard</h2>
        <div className="header-actions">
          <button onClick={handleSync} className="btn-secondary">
            🔄 Sync Now
          </button>
          <button onClick={loadData} className="btn-secondary">
            🔄 Refresh
          </button>
        </div>
      </header>

      {syncStatus && (
        <div className={`sync-status ${syncStatus.type}`}>
          {syncStatus.message}
        </div>
      )}

      <nav className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'domains' ? 'active' : ''}
          onClick={() => setActiveTab('domains')}
        >
          By Domain
        </button>
        <button 
          className={activeTab === 'failures' ? 'active' : ''}
          onClick={() => setActiveTab('failures')}
        >
          Recent Failures ({recentFailures.length})
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'overview' && stats && (
          <OverviewTab stats={stats} metrics={metrics!} />
        )}
        {activeTab === 'domains' && stats && (
          <DomainsTab domainBreakdown={stats.domainBreakdown} />
        )}
        {activeTab === 'failures' && (
          <FailuresTab failures={recentFailures} />
        )}
        {activeTab === 'settings' && settings && (
          <SettingsTab 
            settings={settings}
            onToggleEnabled={handleToggleEnabled}
            onToggleDebugInfo={handleToggleDebugInfo}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

// Sub-components

const OverviewTab: React.FC<{ stats: DashboardStats; metrics: TelemetryMetrics }> = ({ stats, metrics }) => (
  <div className="tab-content overview-tab">
    <div className="stats-grid">
      <StatCard
        title="Extraction Success Rate"
        value={`${stats.overallSuccessRate}%`}
        subtitle={`${stats.totalExtractions} total extractions`}
        trend={stats.overallSuccessRate >= 80 ? 'good' : stats.overallSuccessRate >= 60 ? 'warning' : 'bad'}
      />
      <StatCard
        title="Confirm Rate"
        value={`${stats.confirmRate}%`}
        subtitle="User didn't cancel"
        trend={stats.confirmRate >= 80 ? 'good' : stats.confirmRate >= 60 ? 'warning' : 'bad'}
      />
      <StatCard
        title="Edit Before Save"
        value={`${stats.editBeforeSaveRate}%`}
        subtitle="Lower is better (measures quality)"
        trend={stats.editBeforeSaveRate <= 20 ? 'good' : stats.editBeforeSaveRate <= 40 ? 'warning' : 'bad'}
        invertTrend
      />
      <StatCard
        title="Duplicate Detection"
        value={`${stats.duplicateRate}%`}
        subtitle="Already saved jobs"
        trend="neutral"
      />
    </div>

    <div className="section">
      <h3>Top Domains</h3>
      <div className="top-domains">
        {stats.domainBreakdown.slice(0, 5).map(domain => (
          <div key={domain.domain} className="domain-row">
            <span className="domain-name">{domain.domain}</span>
            <div className="domain-bar">
              <div 
                className="domain-bar-fill"
                style={{ width: `${domain.successRate}%` }}
              />
            </div>
            <span className="domain-rate">{domain.successRate}%</span>
          </div>
        ))}
      </div>
    </div>

    <div className="section">
      <h3>Daily Activity</h3>
      <DailyActivityChart dailyStats={metrics.daily_stats} />
    </div>

    {metrics.last_sync && (
      <div className="last-sync">
        Last synced: {new Date(metrics.last_sync).toLocaleString()}
      </div>
    )}
  </div>
);

const DomainsTab: React.FC<{ domainBreakdown: DashboardStats['domainBreakdown'] }> = ({ domainBreakdown }) => (
  <div className="tab-content domains-tab">
    <table className="domains-table">
      <thead>
        <tr>
          <th>Domain</th>
          <th>Attempts</th>
          <th>Success Rate</th>
          <th>Edit Rate</th>
          <th>Avg Confidence</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {domainBreakdown.map(domain => (
          <tr key={domain.domain}>
            <td>{domain.domain}</td>
            <td>{domain.attempts}</td>
            <td>
              <span className={`rate ${domain.successRate >= 80 ? 'good' : domain.successRate >= 60 ? 'warning' : 'bad'}`}>
                {domain.successRate}%
              </span>
            </td>
            <td>
              <span className={`rate ${domain.editRate <= 20 ? 'good' : domain.editRate <= 40 ? 'warning' : 'bad'}`}>
                {domain.editRate}%
              </span>
            </td>
            <td>{domain.avgConfidence}%</td>
            <td>
              {domain.successRate >= 85 ? (
                <span className="badge good">✓ Excellent</span>
              ) : domain.successRate >= 70 ? (
                <span className="badge warning">~ Good</span>
              ) : domain.attempts > 5 ? (
                <span className="badge bad">⚠ Needs Attention</span>
              ) : (
                <span className="badge neutral">New</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const FailuresTab: React.FC<{ failures: TelemetryEvent[] }> = ({ failures }) => (
  <div className="tab-content failures-tab">
    {failures.length === 0 ? (
      <div className="no-failures">
        🎉 No recent failures! All extractions are working smoothly.
      </div>
    ) : (
      <div className="failures-list">
        {failures.map((failure, index) => (
          <div key={index} className="failure-card">
            <div className="failure-header">
              <span className="failure-domain">{failure.domain}</span>
              <span className="failure-adapter">{failure.adapter}</span>
              <span className="failure-time">
                {new Date(failure.timestamp).toLocaleString()}
              </span>
            </div>
            {failure.error && (
              <div className="failure-error">{failure.error}</div>
            )}
            <div className="failure-meta">
              Duration: {failure.duration_ms}ms
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const SettingsTab: React.FC<{
  settings: TelemetrySettings;
  onToggleEnabled: () => void;
  onToggleDebugInfo: () => void;
  onReset: () => void;
}> = ({ settings, onToggleEnabled, onToggleDebugInfo, onReset }) => (
  <div className="tab-content settings-tab">
    <div className="settings-section">
      <h3>Privacy Settings</h3>
      
      <div className="setting-row">
        <label className="toggle">
          <input 
            type="checkbox" 
            checked={settings.enabled}
            onChange={onToggleEnabled}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Enable Telemetry</span>
        </label>
        <p className="setting-description">
          When enabled, we collect anonymous metrics about extraction success rates to improve the extension.
        </p>
      </div>

      <div className="setting-row">
        <label className="toggle">
          <input 
            type="checkbox" 
            checked={settings.include_debug_info}
            onChange={onToggleDebugInfo}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Include Debug Info</span>
        </label>
        <p className="setting-description">
          Include sanitized error messages to help diagnose extraction failures.
        </p>
      </div>
    </div>

    <div className="settings-section">
      <h3>Data Management</h3>
      
      <div className="setting-row">
        <button onClick={onReset} className="btn-danger">
          🗑️ Reset All Telemetry Data
        </button>
        <p className="setting-description">
          This will delete all locally stored telemetry events and metrics. This action cannot be undone.
        </p>
      </div>
    </div>

    <div className="settings-section privacy-info">
      <h3>🔒 Privacy Information</h3>
      <ul>
        <li>We <strong>never</strong> collect personal data like company names, job titles, or your identity</li>
        <li>Domain names are generalized (e.g., "company.greenhouse.io" → "*.greenhouse.io")</li>
        <li>All data is aggregated and anonymized</li>
        <li>You can opt out at any time</li>
        <li>Data is stored locally and synced periodically</li>
      </ul>
    </div>
  </div>
);

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  trend: 'good' | 'warning' | 'bad' | 'neutral';
  invertTrend?: boolean;
}> = ({ title, value, subtitle, trend, invertTrend }) => {
  const effectiveTrend = invertTrend 
    ? (trend === 'good' ? 'bad' : trend === 'bad' ? 'good' : trend)
    : trend;
  
  return (
    <div className={`stat-card ${effectiveTrend}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
};

const DailyActivityChart: React.FC<{ dailyStats: Record<string, { attempts: number; successes: number }> }> = ({ dailyStats }) => {
  const sortedDays = Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14); // Last 14 days

  const maxAttempts = Math.max(...sortedDays.map(([, stats]) => stats.attempts), 1);

  return (
    <div className="daily-chart">
      {sortedDays.map(([date, stats]) => {
        const successRate = stats.attempts > 0 ? (stats.successes / stats.attempts) * 100 : 0;
        const barHeight = (stats.attempts / maxAttempts) * 100;
        
        return (
          <div key={date} className="chart-bar-wrapper">
            <div className="chart-bar-container">
              <div 
                className="chart-bar"
                style={{ height: `${barHeight}%` }}
                title={`${date}: ${stats.attempts} attempts, ${Math.round(successRate)}% success`}
              >
                <div 
                  className="chart-bar-success"
                  style={{ height: `${successRate}%` }}
                />
              </div>
            </div>
            <div className="chart-label">{date.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default TelemetryDashboard;
