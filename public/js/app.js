/**
 * IoT Report Utils - Web UI Application
 */

const API_BASE = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    console.log('Initializing IoT Report Utils UI...');

    // Set default dates
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    document.getElementById('reportStartDate').valueAsDate = lastWeek;
    document.getElementById('reportEndDate').valueAsDate = today;

    // Load initial data
    await checkHealth();
    await loadDashboard();
    await checkExternalServices();
    await loadTemplates();
    initTheme();
    loadPDFConfig();
}

// Tab Management
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('[id^="tab-"]').forEach(tab => {
        tab.classList.remove('tab-active');
        tab.classList.add('tab-inactive');
    });
    document.getElementById(`tab-${tabName}`).classList.remove('tab-inactive');
    document.getElementById(`tab-${tabName}`).classList.add('tab-active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`content-${tabName}`).classList.remove('hidden');

    // Load tab-specific data
    if (tabName === 'reports') {
        loadRecentReports();
        loadSensors(); // Load sensors for the checkboxes
    } else if (tabName === 'database') {
        loadExternalServicesConfig();
        loadCurrentConfig();
    }
}

// Health Check
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();

        updateHealthUI(data);
        return data.success;
    } catch (error) {
        console.error('Health check failed:', error);
        updateHealthUI({ success: false, error: error.message });
        return false;
    }
}

function updateHealthUI(data) {
    const statusDot = document.getElementById('systemStatus');
    const statusText = document.getElementById('systemStatusText');

    if (data.success) {
        statusDot.className = 'status-dot status-healthy';
        statusText.textContent = 'Online';
        statusText.className = 'text-sm font-medium text-green-600 dark:text-green-400';

        // Update health details
        document.getElementById('health-status').textContent = 'Healthy';
        document.getElementById('health-uptime').textContent = formatUptime(data.uptime);
        document.getElementById('health-memory').textContent = `${data.memory?.used || 0} / ${data.memory?.total || 0} MB`;

        // Update database status
        if (data.database) {
            document.getElementById('db-status').textContent = data.database.healthy ? 'Connected' : 'Disconnected';
            document.getElementById('db-pool').textContent = `${data.database.poolIdle || 0} / ${data.database.poolTotal || 0}`;
        }

        // Update PDF service status
        if (data.pdfService) {
            document.getElementById('pdf-status').textContent = data.pdfService.initialized ? 'Ready' : 'Initializing';
        }
    } else {
        statusDot.className = 'status-dot status-unhealthy';
        statusText.textContent = 'Offline';
        statusText.className = 'text-sm font-medium text-red-600';

        document.getElementById('health-status').textContent = 'Unhealthy';
    }
}

function formatUptime(seconds) {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// Dashboard
async function loadDashboard() {
    try {
        // Load report count
        const reports = await fetch(`${API_BASE}/api/reports/history?limit=10`).then(r => r.json());
        document.getElementById('report-count').textContent = reports.data?.length || 0;

        // Load templates
        const templates = await fetch(`${API_BASE}/api/reports/templates`).then(r => r.json());
        document.getElementById('template-count').textContent = templates.data?.length || 0;
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// External Services Status
async function checkExternalServices() {
    await checkPrometheus();
    await checkVictoriaMetrics();
}

// Check Prometheus status
async function checkPrometheus() {
    try {
        const prometheusUrl = localStorage.getItem('prometheusUrl') || 'http://localhost:9090';
        const response = await fetch(`${prometheusUrl}/api/v1/status/config`, {
            method: 'GET',
            mode: 'cors'
        }).catch(() => null);

        if (response && response.ok) {
            document.getElementById('prometheus-status').innerHTML =
                '<span class="text-green-600">✓ Connected</span>';

            // Get metrics count
            const metricsResponse = await fetch(`${prometheusUrl}/api/v1/label/__name__/values`).catch(() => null);
            if (metricsResponse && metricsResponse.ok) {
                const metricsData = await metricsResponse.json();
                const count = metricsData.data ? metricsData.data.length : 0;
                document.getElementById('prometheus-metrics').textContent = count;
            } else {
                document.getElementById('prometheus-metrics').textContent = 'N/A';
            }

            document.getElementById('prometheus-scrape').textContent = new Date().toLocaleTimeString();
        } else {
            document.getElementById('prometheus-status').innerHTML =
                '<span class="text-yellow-600">⚠ Not configured</span>';
            document.getElementById('prometheus-metrics').textContent = '-';
            document.getElementById('prometheus-scrape').textContent = '-';
        }
    } catch (error) {
        console.error('Failed to check Prometheus:', error);
        document.getElementById('prometheus-status').innerHTML =
            '<span class="text-red-600">✗ Disconnected</span>';
        document.getElementById('prometheus-metrics').textContent = '-';
        document.getElementById('prometheus-scrape').textContent = '-';
    }
}

// Check VictoriaMetrics status
async function checkVictoriaMetrics() {
    try {
        const victoriaUrl = localStorage.getItem('victoriaUrl') || 'http://localhost:8428';
        const response = await fetch(`${victoriaUrl}/api/v1/status/tsdb`, {
            method: 'GET',
            mode: 'cors'
        }).catch(() => null);

        if (response && response.ok) {
            const data = await response.json();
            document.getElementById('victoria-status').innerHTML =
                '<span class="text-green-600">✓ Connected</span>';

            // Get storage info
            if (data.data && data.data.seriesCountByMetricName) {
                const totalSeries = Object.values(data.data.seriesCountByMetricName).reduce((a, b) => a + b, 0);
                document.getElementById('victoria-storage').textContent = `${totalSeries.toLocaleString()} series`;
            } else {
                document.getElementById('victoria-storage').textContent = 'Active';
            }
        } else {
            document.getElementById('victoria-status').innerHTML =
                '<span class="text-yellow-600">⚠ Not configured</span>';
            document.getElementById('victoria-storage').textContent = '-';
        }
    } catch (error) {
        console.error('Failed to check VictoriaMetrics:', error);
        document.getElementById('victoria-status').innerHTML =
            '<span class="text-red-600">✗ Disconnected</span>';
        document.getElementById('victoria-storage').textContent = '-';
    }
}

// Load available SVG templates
async function loadTemplates() {
    try {
        const response = await fetch(`${API_BASE}/api/reports/templates`);
        const data = await response.json();

        if (data.success && data.data) {
            const select = document.getElementById('pdfTemplateName');
            if (!select) return;

            // Clear existing options (except 'auto')
            select.innerHTML = '<option value="auto">Auto (match orientation)</option>';

            // Add templates from the API
            data.data.forEach(template => {
                const option = document.createElement('option');
                option.value = template.filename;
                option.textContent = `${template.description} (${template.filename})`;
                select.appendChild(option);
            });

            console.log(`Loaded ${data.data.length} SVG templates`);
        }
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

// Sensors (for report generation)
async function loadSensors() {
    try {
        const response = await fetch(`${API_BASE}/api/sensors`);
        const data = await response.json();

        if (data.success) {
            updateSensorCheckboxes(data.data);
        }
    } catch (error) {
        console.error('Failed to load sensors:', error);
    }
}

function updateSensorCheckboxes(sensors) {
    const container = document.getElementById('sensorCheckboxes');
    if (!sensors || sensors.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No sensors available</p>';
        return;
    }

    container.innerHTML = sensors.map(sensor => `
        <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="${sensor.sensor_code}" class="sensor-checkbox rounded text-blue-600">
            <span class="text-sm">${sensor.name}</span>
        </label>
    `).join('');
}

// Database Configuration
function loadCurrentConfig() {
    // Prefer saved profile when available
    const saved = localStorage.getItem('dbConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            document.getElementById('dbHost').value = config.host || 'localhost';
            document.getElementById('dbPort').value = config.port || '5433';
            document.getElementById('dbName').value = config.database || 'madison_iot';
            document.getElementById('dbUser').value = config.user || 'postgres';
            document.getElementById('dbPassword').value = config.password || 'postgres';
            document.getElementById('dbPoolMin').value = config.poolMin || '2';
            document.getElementById('dbPoolMax').value = config.poolMax || '10';
            loadExternalServicesConfig();
            return;
        } catch (error) {
            console.warn('Failed to parse saved DB config', error);
        }
    }

    // Fall back to Madison test database defaults
    document.getElementById('dbHost').value = 'localhost';
    document.getElementById('dbPort').value = '5433';
    document.getElementById('dbName').value = 'madison_iot';
    document.getElementById('dbUser').value = 'postgres';
    if (document.getElementById('dbPassword')) {
        document.getElementById('dbPassword').value = 'postgres';
    }
    document.getElementById('dbPoolMin').value = '2';
    document.getElementById('dbPoolMax').value = '10';

    // Load external services config
    loadExternalServicesConfig();
}

// Load Prometheus/VictoriaMetrics URLs from localStorage
function loadExternalServicesConfig() {
    const prometheusUrl = localStorage.getItem('prometheusUrl') || 'http://localhost:9090';
    const victoriaUrl = localStorage.getItem('victoriaUrl') || 'http://localhost:8428';

    const prometheusInput = document.getElementById('prometheusUrl');
    const victoriaInput = document.getElementById('victoriaUrl');

    if (prometheusInput) prometheusInput.value = prometheusUrl;
    if (victoriaInput) victoriaInput.value = victoriaUrl;
}

async function loadProfile() {
    const profile = document.getElementById('dbProfile').value;

    if (profile === 'default') {
        loadCurrentConfig();
    } else if (profile === 'prometheus') {
        // Load Prometheus/VictoriaMetrics config
        const prometheusUrl = localStorage.getItem('prometheusUrl') || 'http://localhost:9090';
        const victoriaUrl = localStorage.getItem('victoriaUrl') || 'http://localhost:8428';

        document.getElementById('prometheusUrl').value = prometheusUrl;
        document.getElementById('victoriaUrl').value = victoriaUrl;

        showNotification('Prometheus/VictoriaMetrics profile loaded', 'success');
        return;
    } else if (profile === 'custom') {
        // Clear form for custom config
        document.getElementById('dbHost').value = '';
        document.getElementById('dbPort').value = '5432';
        document.getElementById('dbName').value = '';
        document.getElementById('dbUser').value = '';
        document.getElementById('dbPassword').value = '';
    }

    showNotification('Profile loaded', 'success');
}

async function saveProfile() {
    const profile = document.getElementById('dbProfile').value;

    // Save Prometheus/VictoriaMetrics URLs
    const prometheusUrl = document.getElementById('prometheusUrl').value;
    const victoriaUrl = document.getElementById('victoriaUrl').value;
    if (prometheusUrl) localStorage.setItem('prometheusUrl', prometheusUrl);
    if (victoriaUrl) localStorage.setItem('victoriaUrl', victoriaUrl);

    const config = {
        profile: profile,
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value) || 5432,
        database: document.getElementById('dbName').value,
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value,
        ssl: document.getElementById('dbSSL').value,
        poolMin: parseInt(document.getElementById('dbPoolMin').value) || 2,
        poolMax: parseInt(document.getElementById('dbPoolMax').value) || 10,
        prometheusUrl: prometheusUrl,
        victoriaUrl: victoriaUrl,
        schema: {
            sensors: document.getElementById('tableSensors')?.value || 'iot.sensors',
            readings: document.getElementById('tableReadings')?.value || 'iot.sensor_readings',
            sensorTypes: document.getElementById('tableSensorTypes')?.value || 'iot.sensor_types'
        }
    };

    // Save to localStorage
    localStorage.setItem('dbConfig', JSON.stringify(config));

    // Also save to file if API supports it
    try {
        const response = await fetch(`${API_BASE}/api/config/database`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showNotification('Configuration saved successfully', 'success');
        } else {
            showNotification('Configuration saved locally (restart required)', 'warning');
        }
    } catch (error) {
        // Fallback to local storage only
        showNotification('Configuration saved locally', 'success');
    }
}

async function testConnection() {
    const config = {
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value),
        database: document.getElementById('dbName').value,
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value
    };

    showNotification('Testing connection...', 'info');

    try {
        const response = await fetch(`${API_BASE}/api/config/test-connection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();
        const resultDiv = document.getElementById('connectionResult');
        resultDiv.classList.remove('hidden');

        if (data.success) {
            resultDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-md p-4">
                    <div class="flex">
                        <i class="fas fa-check-circle text-green-600 text-xl mr-3"></i>
                        <div>
                            <h4 class="text-green-800 font-medium">Connection Successful!</h4>
                            <p class="text-green-700 text-sm mt-1">${data.message || 'Connected to database successfully'}</p>
                        </div>
                    </div>
                </div>
            `;
            showNotification('Connection successful!', 'success');
        } else {
            resultDiv.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-md p-4">
                    <div class="flex">
                        <i class="fas fa-times-circle text-red-600 text-xl mr-3"></i>
                        <div>
                            <h4 class="text-red-800 font-medium">Connection Failed</h4>
                            <p class="text-red-700 text-sm mt-1">${data.error || 'Could not connect to database'}</p>
                        </div>
                    </div>
                </div>
            `;
            showNotification('Connection failed', 'error');
        }
    } catch (error) {
        const resultDiv = document.getElementById('connectionResult');
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div class="flex">
                    <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mr-3"></i>
                    <div>
                        <h4 class="text-yellow-800 font-medium">Test Unavailable</h4>
                        <p class="text-yellow-700 text-sm mt-1">Endpoint not available. Configuration can still be saved for manual testing.</p>
                    </div>
                </div>
            </div>
        `;
    }
}

async function applyConfig() {
    await saveProfile();
    // Refresh dashboard database status so the user sees the applied config
    await checkHealth();
    showNotification('Configuration applied and dashboard updated. Restart the service for changes to fully take effect.', 'success');
}


async function detectSchema() {
    showNotification('Auto-detecting schema...', 'info');

    try {
        const response = await fetch(`${API_BASE}/api/config/detect-schema`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host: document.getElementById('dbHost').value,
                port: parseInt(document.getElementById('dbPort').value),
                database: document.getElementById('dbName').value,
                user: document.getElementById('dbUser').value,
                password: document.getElementById('dbPassword').value
            })
        });

        const data = await response.json();

        if (data.success && data.schema) {
            document.getElementById('tableSensors').value = data.schema.sensors || 'iot.sensors';
            document.getElementById('tableReadings').value = data.schema.readings || 'iot.sensor_readings';
            document.getElementById('tableSensorTypes').value = data.schema.sensorTypes || 'iot.sensor_types';
            showNotification('Schema detected successfully!', 'success');
        } else {
            showNotification('Could not auto-detect schema. Using defaults.', 'warning');
        }
    } catch (error) {
        showNotification('Auto-detection not available. Please configure manually.', 'warning');
    }
}

// Report Generation
async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const format = document.getElementById('reportFormat').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }

    // Get selected sensors
    const selectedSensors = Array.from(document.querySelectorAll('.sensor-checkbox:checked'))
        .map(cb => cb.value);

    const progressDiv = document.getElementById('reportProgress');
    progressDiv.classList.remove('hidden');

    try {
        let url = `${API_BASE}/api/reports/`;
        let body = {
            startDate: startDate + 'T00:00:00Z',
            endDate: endDate + 'T23:59:59Z',
            format: format
        };

        if (reportType === 'test-template') {
            url += 'test-template';

            // Get configuration values
            const config = window.pdfConfig.getConfig();
            body.reportTitle = config.reportTitle || document.getElementById('pdfTitle')?.value || 'IoT Sensor Summary Report';
            body.reportSubtitle = config.reportSubtitle || document.getElementById('pdfSubtitle')?.value || 'Real-time monitoring and analytics';
            body.footerText = config.footer?.text || document.getElementById('pdfFooterText')?.value || 'Madison - IoT Report';
            body.layout = config.layout || document.getElementById('pdfLayout')?.value || 'portrait';
            body.pageSize = config.pageSize || document.getElementById('pdfPageSize')?.value || 'a4';
            const templateSelection = config.templateName || document.getElementById('pdfTemplateName')?.value || 'auto';
            body.templateName = templateSelection === 'auto' ? resolveTemplateName(body.layout) : templateSelection;

            if (selectedSensors.length > 0) {
                body.sensorIds = selectedSensors;
            }
        } else if (reportType === 'iot-summary') {
            url += 'iot-summary';
            if (selectedSensors.length > 0) {
                body.sensorIds = selectedSensors;
            }
        } else if (reportType === 'sensor-detailed') {
            url += 'sensor-detailed';
            if (selectedSensors.length > 0) {
                body.sensorId = selectedSensors[0];
            }
        } else if (reportType === 'building') {
            url += 'building';
            body.building = 'A'; // TODO: Add building selector
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            if (format === 'pdf') {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                const reportName = reportType === 'test-template' ? 'test-report' : 'iot-report';
                a.download = `${reportName}-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);
                showNotification('Report downloaded successfully!', 'success');
            } else {
                const html = await response.text();
                const newWindow = window.open();
                newWindow.document.write(html);
                showNotification('Report opened in new window', 'success');
            }

            // Reload recent reports
            await loadRecentReports();
        } else {
            const error = await response.json();
            showNotification(`Failed to generate report: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Report generation error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        progressDiv.classList.add('hidden');
    }
}

async function generateQuickReport() {
    showTab('reports');
    setTimeout(() => generateReport(), 500);
}

async function loadRecentReports() {
    try {
        const response = await fetch(`${API_BASE}/api/reports/history?limit=10`);
        const data = await response.json();

        const container = document.getElementById('recentReports');

        if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = data.data.map(report => `
                <div class="border rounded-lg p-4 hover:shadow-md transition">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">${report.report_name}</h4>
                            <p class="text-sm text-gray-500">${new Date(report.created_at).toLocaleString()}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-sm font-medium text-blue-600">${report.file_size_kb} KB</div>
                            <div class="text-xs text-gray-500">${report.generation_time_ms}ms</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500">No reports generated yet</p>';
        }
    } catch (error) {
        console.error('Failed to load recent reports:', error);
    }
}

// API Explorer
function updateApiExample() {
    const endpoint = document.getElementById('apiEndpoint').value;
    document.getElementById('curlCommand').textContent = `curl ${API_BASE}${endpoint}`;
}

async function testEndpoint() {
    const endpoint = document.getElementById('apiEndpoint').value;
    const responseDiv = document.getElementById('apiResponse');

    responseDiv.textContent = 'Loading...';

    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        const data = await response.json();
        responseDiv.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        responseDiv.textContent = `Error: ${error.message}`;
    }
}

function copyCurl() {
    const command = document.getElementById('curlCommand').textContent;
    navigator.clipboard.writeText(command).then(() => {
        showNotification('Copied to clipboard!', 'success');
    });
}

// Notifications
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Theme Toggle
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            themeToggleIcon.classList.remove('fa-sun');
            themeToggleIcon.classList.add('fa-moon');
        } else {
            document.documentElement.classList.remove('dark');
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }
    };

    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

// ==================== PDF Template Configuration ====================

/**
 * Load PDF configuration into UI
 */
function loadPDFConfig() {
    const config = window.pdfConfig.getConfig();

    document.getElementById('pdfTitle').value = config.reportTitle || 'IoT Sensor Summary Report';
    document.getElementById('pdfSubtitle').value = config.reportSubtitle || 'Real-time monitoring and analytics';
    document.getElementById('pdfTheme').value = config.theme || 'professional-blue';
    document.getElementById('pdfLayout').value = config.layout || 'portrait';
    document.getElementById('pdfPageSize').value = config.pageSize || 'a4';
    document.getElementById('pdfFooterText').value = config.footer?.text || 'Madison - IoT Report';
    document.getElementById('pdfLogoUrl').value = config.logo?.url || '';
    document.getElementById('pdfTemplateName').value = config.templateName || 'auto';
    document.getElementById('pdfPreviewMode').value = config.previewMode || 'pdf';
}

/**
 * Update PDF layout
 */
function updatePDFLayout() {
    const layout = document.getElementById('pdfLayout').value;
    window.pdfGenerator.updateConfig({ layout });
    showNotification(`Layout changed to ${layout}`, 'success');
}

/**
 * Update PDF page size
 */
function updatePDFPageSize() {
    const pageSize = document.getElementById('pdfPageSize').value;
    window.pdfGenerator.updateConfig({ pageSize });
    showNotification(`Page size changed to ${pageSize.toUpperCase()}`, 'success');
}

/**
 * Resolve template name based on user selection and layout fallback
 */
function resolveTemplateName(layout) {
    const selection = document.getElementById('pdfTemplateName')?.value || 'auto';
    if (selection === 'auto') {
        return (layout === 'landscape') ? 'template_horizontal.svg' : 'template_vertical.svg';
    }
    return selection;
}

/**
 * Preview template layout using SVG base design
 */
async function previewPDFTemplate() {
    const mode = document.getElementById('pdfPreviewMode').value || 'pdf';
    showNotification(`Generating ${mode.toUpperCase()} preview...`, 'info');

    const config = window.pdfConfig.getConfig();
    const payload = {
        headerTitle: document.getElementById('pdfTitle').value || config.reportTitle || 'IoT Report',
        headerSubtitle: document.getElementById('pdfSubtitle').value || config.reportSubtitle || 'Environmental Monitoring',
        footerText: document.getElementById('pdfFooterText').value || config.footer?.text || 'Madison - IoT Report Suite',
        logoUrl: resolveAssetUrl(document.getElementById('pdfLogoUrl').value || config.logo?.url || '/images/logo.png'),
        theme: document.getElementById('pdfTheme').value || config.theme || 'professional-blue',
        layout: document.getElementById('pdfLayout').value || config.layout || 'portrait',
        pageSize: document.getElementById('pdfPageSize').value || config.pageSize || 'a4',
        format: mode
    };

    try {
        const endpoint = mode === 'svg'
            ? `${API_BASE}/api/reports/layout-preview`
            : `${API_BASE}/api/reports/final-template`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            showNotification(`Preview failed: ${error.error || 'Unknown error'}`, 'error');
            return;
        }

        if (mode === 'svg') {
            const data = await response.json();
            if (data.success) {
                // Wrap the HTML with centering styles for better preview
                const centeredHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SVG Template Preview</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow: auto;
        }
        .preview-container {
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border-radius: 8px;
            overflow: hidden;
            max-width: 100%;
            max-height: 100%;
        }
        .preview-content {
            display: flex;
            justify-content: center;
            align-items: center;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-content">
            ${data.html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*?<\/html>/i, '')}
        </div>
    </div>
</body>
</html>
`;
                const previewWindow = window.open('', '_blank');
                previewWindow.document.write(centeredHtml);
                previewWindow.document.close();
                showNotification('SVG preview opened in new window', 'success');
            } else {
                showNotification(`Preview failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } else {
            const blob = await response.blob();
            const pdfUrl = window.URL.createObjectURL(blob);
            const previewWindow = window.open(pdfUrl, '_blank');

            if (previewWindow) {
                showNotification('PDF preview opened in new tab', 'success');
                setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 1500);
            } else {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = `template-preview-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(pdfUrl);
                showNotification('Preview downloaded (popup blocked)', 'warning');
            }
        }
    } catch (error) {
        console.error('Preview error:', error);
        showNotification(`Error generating preview: ${error.message}`, 'error');
    }
}

/**
 * Save PDF configuration
 */
function savePDFConfig() {
    const title = document.getElementById('pdfTitle').value;
    const subtitle = document.getElementById('pdfSubtitle').value;
    const theme = document.getElementById('pdfTheme').value;
    const layout = document.getElementById('pdfLayout').value;
    const pageSize = document.getElementById('pdfPageSize').value;
    const footerText = document.getElementById('pdfFooterText').value;
    const logoUrl = document.getElementById('pdfLogoUrl').value;
    const templateName = document.getElementById('pdfTemplateName').value;
    const previewMode = document.getElementById('pdfPreviewMode').value;

    window.pdfGenerator.updateConfig({
        reportTitle: title || 'IoT Sensor Summary Report',
        reportSubtitle: subtitle || 'Real-time monitoring and analytics',
        theme,
        layout,
        pageSize,
        footer: {
            text: footerText || 'Madison - IoT Report'
        },
        templateName,
        previewMode,
        logo: {
            enabled: !!logoUrl,
            url: logoUrl || '/images/logo.png'
        }
    });

    showNotification('PDF configuration saved successfully!', 'success');
}

/**
 * Reset PDF configuration to defaults
 */
function resetPDFConfig() {
    if (confirm('Are you sure you want to reset to default configuration?')) {
        window.pdfConfig.resetToDefault();
        loadPDFConfig();
        showNotification('Configuration reset to defaults', 'success');
    }
}

/**
 * Enhanced report generation with new PDF generator
 */
async function generateReportWithTemplate() {
    const reportType = document.getElementById('reportType').value;
    const format = document.getElementById('reportFormat').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }

    // Get selected sensors
    const selectedSensors = Array.from(document.querySelectorAll('.sensor-checkbox:checked'))
        .map(cb => cb.value);

    const progressDiv = document.getElementById('reportProgress');
    progressDiv.classList.remove('hidden');

    try {
        // Fetch data from API
        let apiUrl = `${API_BASE}/api/reports/${reportType}`;
        const body = {
            startDate: startDate + 'T00:00:00Z',
            endDate: endDate + 'T23:59:59Z',
            format: format
        };

        if (selectedSensors.length > 0) {
            body.sensorIds = selectedSensors;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const data = await response.json();

            // Use new PDF generator
            const result = await window.pdfGenerator.generate({
                template: reportType,
                data: data.data || data,
                format: format,
                filename: `report-${reportType}-${PDFUtils.formatDate(new Date(), 'iso')}.${format}`
            });

            if (result.success) {
                showNotification('Report generated successfully!', 'success');
                await loadRecentReports();
            } else {
                showNotification(`Failed to generate report: ${result.error}`, 'error');
            }
        } else {
            const error = await response.json();
            showNotification(`Failed to fetch data: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Report generation error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        progressDiv.classList.add('hidden');
    }
}
function resolveAssetUrl(path) {
    if (!path) return '';
    const trimmed = path.trim();
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
        return trimmed;
    }
    const origin = window.location.origin;
    if (trimmed.startsWith('/')) {
        return `${origin}${trimmed}`;
    }
    return `${origin}/${trimmed}`;
}
