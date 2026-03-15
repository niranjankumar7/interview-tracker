/**
 * Options page entry point
 * Renders the Telemetry Dashboard
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TelemetryDashboard } from './telemetry-dashboard';
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(React.createElement('div', { className: 'options-page' }, React.createElement('header', { className: 'page-header' }, React.createElement('h1', null, 'Interview Tracker'), React.createElement('p', null, 'Extension Settings & Telemetry Dashboard')), React.createElement(TelemetryDashboard)));
}
//# sourceMappingURL=options.js.map