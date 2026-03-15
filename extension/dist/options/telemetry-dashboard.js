import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Telemetry Dashboard Component
 * Shows extraction statistics and recent failures for debugging
 */
import { useState, useEffect } from 'react';
import { getMetrics, getPendingEvents, getTelemetrySettings, setTelemetrySettings, syncEvents, resetTelemetry } from '../shared/telemetry';
export const TelemetryDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [recentFailures, setRecentFailures] = useState([]);
    const [settings, setSettings] = useState(null);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
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
        }
        catch (error) {
            console.error('Failed to load telemetry data:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const calculateStats = (metrics) => {
        let totalAttempts = 0;
        let totalSuccesses = 0;
        let totalConfirmations = 0;
        let totalEdits = 0;
        let totalDuplicates = 0;
        const domainBreakdown = [];
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
        }
        else {
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
        return (_jsx("div", { className: "telemetry-dashboard loading", children: _jsx("div", { className: "loading-spinner", children: "Loading telemetry data..." }) }));
    }
    if (!settings?.enabled) {
        return (_jsx("div", { className: "telemetry-dashboard disabled", children: _jsxs("div", { className: "disabled-notice", children: [_jsx("h3", { children: "\uD83D\uDCCA Telemetry is Disabled" }), _jsx("p", { children: "Telemetry helps us improve extraction accuracy by tracking success rates and failures." }), _jsx("p", { children: "We never collect personal data like company names or job titles - only aggregated metrics." }), _jsx("button", { onClick: handleToggleEnabled, className: "btn-primary", children: "Enable Telemetry" })] }) }));
    }
    return (_jsxs("div", { className: "telemetry-dashboard", children: [_jsxs("header", { className: "dashboard-header", children: [_jsx("h2", { children: "\uD83D\uDCCA Telemetry Dashboard" }), _jsxs("div", { className: "header-actions", children: [_jsx("button", { onClick: handleSync, className: "btn-secondary", children: "\uD83D\uDD04 Sync Now" }), _jsx("button", { onClick: loadData, className: "btn-secondary", children: "\uD83D\uDD04 Refresh" })] })] }), syncStatus && (_jsx("div", { className: `sync-status ${syncStatus.type}`, children: syncStatus.message })), _jsxs("nav", { className: "dashboard-tabs", children: [_jsx("button", { className: activeTab === 'overview' ? 'active' : '', onClick: () => setActiveTab('overview'), children: "Overview" }), _jsx("button", { className: activeTab === 'domains' ? 'active' : '', onClick: () => setActiveTab('domains'), children: "By Domain" }), _jsxs("button", { className: activeTab === 'failures' ? 'active' : '', onClick: () => setActiveTab('failures'), children: ["Recent Failures (", recentFailures.length, ")"] }), _jsx("button", { className: activeTab === 'settings' ? 'active' : '', onClick: () => setActiveTab('settings'), children: "Settings" })] }), _jsxs("div", { className: "dashboard-content", children: [activeTab === 'overview' && stats && (_jsx(OverviewTab, { stats: stats, metrics: metrics })), activeTab === 'domains' && stats && (_jsx(DomainsTab, { domainBreakdown: stats.domainBreakdown })), activeTab === 'failures' && (_jsx(FailuresTab, { failures: recentFailures })), activeTab === 'settings' && settings && (_jsx(SettingsTab, { settings: settings, onToggleEnabled: handleToggleEnabled, onToggleDebugInfo: handleToggleDebugInfo, onReset: handleReset }))] })] }));
};
// Sub-components
const OverviewTab = ({ stats, metrics }) => (_jsxs("div", { className: "tab-content overview-tab", children: [_jsxs("div", { className: "stats-grid", children: [_jsx(StatCard, { title: "Extraction Success Rate", value: `${stats.overallSuccessRate}%`, subtitle: `${stats.totalExtractions} total extractions`, trend: stats.overallSuccessRate >= 80 ? 'good' : stats.overallSuccessRate >= 60 ? 'warning' : 'bad' }), _jsx(StatCard, { title: "Confirm Rate", value: `${stats.confirmRate}%`, subtitle: "User didn't cancel", trend: stats.confirmRate >= 80 ? 'good' : stats.confirmRate >= 60 ? 'warning' : 'bad' }), _jsx(StatCard, { title: "Edit Before Save", value: `${stats.editBeforeSaveRate}%`, subtitle: "Lower is better (measures quality)", trend: stats.editBeforeSaveRate <= 20 ? 'good' : stats.editBeforeSaveRate <= 40 ? 'warning' : 'bad', invertTrend: true }), _jsx(StatCard, { title: "Duplicate Detection", value: `${stats.duplicateRate}%`, subtitle: "Already saved jobs", trend: "neutral" })] }), _jsxs("div", { className: "section", children: [_jsx("h3", { children: "Top Domains" }), _jsx("div", { className: "top-domains", children: stats.domainBreakdown.slice(0, 5).map(domain => (_jsxs("div", { className: "domain-row", children: [_jsx("span", { className: "domain-name", children: domain.domain }), _jsx("div", { className: "domain-bar", children: _jsx("div", { className: "domain-bar-fill", style: { width: `${domain.successRate}%` } }) }), _jsxs("span", { className: "domain-rate", children: [domain.successRate, "%"] })] }, domain.domain))) })] }), _jsxs("div", { className: "section", children: [_jsx("h3", { children: "Daily Activity" }), _jsx(DailyActivityChart, { dailyStats: metrics.daily_stats })] }), metrics.last_sync && (_jsxs("div", { className: "last-sync", children: ["Last synced: ", new Date(metrics.last_sync).toLocaleString()] }))] }));
const DomainsTab = ({ domainBreakdown }) => (_jsx("div", { className: "tab-content domains-tab", children: _jsxs("table", { className: "domains-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Domain" }), _jsx("th", { children: "Attempts" }), _jsx("th", { children: "Success Rate" }), _jsx("th", { children: "Edit Rate" }), _jsx("th", { children: "Avg Confidence" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: domainBreakdown.map(domain => (_jsxs("tr", { children: [_jsx("td", { children: domain.domain }), _jsx("td", { children: domain.attempts }), _jsx("td", { children: _jsxs("span", { className: `rate ${domain.successRate >= 80 ? 'good' : domain.successRate >= 60 ? 'warning' : 'bad'}`, children: [domain.successRate, "%"] }) }), _jsx("td", { children: _jsxs("span", { className: `rate ${domain.editRate <= 20 ? 'good' : domain.editRate <= 40 ? 'warning' : 'bad'}`, children: [domain.editRate, "%"] }) }), _jsxs("td", { children: [domain.avgConfidence, "%"] }), _jsx("td", { children: domain.successRate >= 85 ? (_jsx("span", { className: "badge good", children: "\u2713 Excellent" })) : domain.successRate >= 70 ? (_jsx("span", { className: "badge warning", children: "~ Good" })) : domain.attempts > 5 ? (_jsx("span", { className: "badge bad", children: "\u26A0 Needs Attention" })) : (_jsx("span", { className: "badge neutral", children: "New" })) })] }, domain.domain))) })] }) }));
const FailuresTab = ({ failures }) => (_jsx("div", { className: "tab-content failures-tab", children: failures.length === 0 ? (_jsx("div", { className: "no-failures", children: "\uD83C\uDF89 No recent failures! All extractions are working smoothly." })) : (_jsx("div", { className: "failures-list", children: failures.map((failure, index) => (_jsxs("div", { className: "failure-card", children: [_jsxs("div", { className: "failure-header", children: [_jsx("span", { className: "failure-domain", children: failure.domain }), _jsx("span", { className: "failure-adapter", children: failure.adapter }), _jsx("span", { className: "failure-time", children: new Date(failure.timestamp).toLocaleString() })] }), failure.error && (_jsx("div", { className: "failure-error", children: failure.error })), _jsxs("div", { className: "failure-meta", children: ["Duration: ", failure.duration_ms, "ms"] })] }, index))) })) }));
const SettingsTab = ({ settings, onToggleEnabled, onToggleDebugInfo, onReset }) => (_jsxs("div", { className: "tab-content settings-tab", children: [_jsxs("div", { className: "settings-section", children: [_jsx("h3", { children: "Privacy Settings" }), _jsxs("div", { className: "setting-row", children: [_jsxs("label", { className: "toggle", children: [_jsx("input", { type: "checkbox", checked: settings.enabled, onChange: onToggleEnabled }), _jsx("span", { className: "toggle-slider" }), _jsx("span", { className: "toggle-label", children: "Enable Telemetry" })] }), _jsx("p", { className: "setting-description", children: "When enabled, we collect anonymous metrics about extraction success rates to improve the extension." })] }), _jsxs("div", { className: "setting-row", children: [_jsxs("label", { className: "toggle", children: [_jsx("input", { type: "checkbox", checked: settings.include_debug_info, onChange: onToggleDebugInfo }), _jsx("span", { className: "toggle-slider" }), _jsx("span", { className: "toggle-label", children: "Include Debug Info" })] }), _jsx("p", { className: "setting-description", children: "Include sanitized error messages to help diagnose extraction failures." })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("h3", { children: "Data Management" }), _jsxs("div", { className: "setting-row", children: [_jsx("button", { onClick: onReset, className: "btn-danger", children: "\uD83D\uDDD1\uFE0F Reset All Telemetry Data" }), _jsx("p", { className: "setting-description", children: "This will delete all locally stored telemetry events and metrics. This action cannot be undone." })] })] }), _jsxs("div", { className: "settings-section privacy-info", children: [_jsx("h3", { children: "\uD83D\uDD12 Privacy Information" }), _jsxs("ul", { children: [_jsxs("li", { children: ["We ", _jsx("strong", { children: "never" }), " collect personal data like company names, job titles, or your identity"] }), _jsx("li", { children: "Domain names are generalized (e.g., \"company.greenhouse.io\" \u2192 \"*.greenhouse.io\")" }), _jsx("li", { children: "All data is aggregated and anonymized" }), _jsx("li", { children: "You can opt out at any time" }), _jsx("li", { children: "Data is stored locally and synced periodically" })] })] })] }));
const StatCard = ({ title, value, subtitle, trend, invertTrend }) => {
    const effectiveTrend = invertTrend
        ? (trend === 'good' ? 'bad' : trend === 'bad' ? 'good' : trend)
        : trend;
    return (_jsxs("div", { className: `stat-card ${effectiveTrend}`, children: [_jsx("div", { className: "stat-value", children: value }), _jsx("div", { className: "stat-title", children: title }), _jsx("div", { className: "stat-subtitle", children: subtitle })] }));
};
const DailyActivityChart = ({ dailyStats }) => {
    const sortedDays = Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14); // Last 14 days
    const maxAttempts = Math.max(...sortedDays.map(([, stats]) => stats.attempts), 1);
    return (_jsx("div", { className: "daily-chart", children: sortedDays.map(([date, stats]) => {
            const successRate = stats.attempts > 0 ? (stats.successes / stats.attempts) * 100 : 0;
            const barHeight = (stats.attempts / maxAttempts) * 100;
            return (_jsxs("div", { className: "chart-bar-wrapper", children: [_jsx("div", { className: "chart-bar-container", children: _jsx("div", { className: "chart-bar", style: { height: `${barHeight}%` }, title: `${date}: ${stats.attempts} attempts, ${Math.round(successRate)}% success`, children: _jsx("div", { className: "chart-bar-success", style: { height: `${successRate}%` } }) }) }), _jsx("div", { className: "chart-label", children: date.slice(5) })] }, date));
        }) }));
};
export default TelemetryDashboard;
//# sourceMappingURL=telemetry-dashboard.js.map