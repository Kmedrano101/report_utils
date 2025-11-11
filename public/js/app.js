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
    await loadSensors();
    await loadDashboard();
    initTheme();
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
    } else if (tabName === 'database') {
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

// Sensors
async function loadSensors() {
    try {
        const response = await fetch(`${API_BASE}/api/sensors`);
        const data = await response.json();

        if (data.success) {
            updateSensorsGrid(data.data);
            updateSensorCheckboxes(data.data);
        }
    } catch (error) {
        console.error('Failed to load sensors:', error);
    }
}

function updateSensorsGrid(sensors) {
    const grid = document.getElementById('sensorsGrid');
    if (!sensors || sensors.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 col-span-3">No sensors configured</p>';
        return;
    }

    grid.innerHTML = sensors.slice(0, 6).map(sensor => `
        <div class="border rounded-lg p-4 hover:shadow-md transition">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-900">${sensor.name}</span>
                <span class="status-dot ${sensor.is_active ? 'status-healthy' : 'status-unhealthy'}"></span>
            </div>
            <div class="text-xs text-gray-500 mb-2">${sensor.sensor_type} (${sensor.unit})</div>
            <div class="text-lg font-bold text-blue-600">${sensor.latest_value || 'N/A'}</div>
            <div class="text-xs text-gray-400">${sensor.location || 'Unknown'}</div>
        </div>
    `).join('');
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
    // Load from environment or default values
    document.getElementById('dbHost').value = 'timescaledb';
    document.getElementById('dbPort').value = '5432';
    document.getElementById('dbName').value = 'iot_reports';
    document.getElementById('dbUser').value = 'postgres';
    document.getElementById('dbPoolMin').value = '2';
    document.getElementById('dbPoolMax').value = '10';
}

async function loadProfile() {
    const profile = document.getElementById('dbProfile').value;

    if (profile === 'default') {
        loadCurrentConfig();
    } else if (profile === 'external') {
        // Clear form for external config
        document.getElementById('dbHost').value = '';
        document.getElementById('dbPort').value = '5432';
        document.getElementById('dbName').value = '';
        document.getElementById('dbUser').value = '';
        document.getElementById('dbPassword').value = '';
    }

    showNotification('Profile loaded', 'success');
}

async function saveProfile() {
    const config = {
        profile: document.getElementById('dbProfile').value,
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value),
        database: document.getElementById('dbName').value,
        user: document.getElementById('dbUser').value,
        ssl: document.getElementById('dbSSL').value,
        poolMin: parseInt(document.getElementById('dbPoolMin').value),
        poolMax: parseInt(document.getElementById('dbPoolMax').value),
        schema: {
            sensors: document.getElementById('tableSensors').value || 'iot.sensors',
            readings: document.getElementById('tableReadings').value || 'iot.sensor_readings',
            sensorTypes: document.getElementById('tableSensorTypes').value || 'iot.sensor_types'
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
    showNotification('Configuration applied. Restart the service for changes to take effect.', 'info');
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

        if (reportType === 'iot-summary') {
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
                a.download = `iot-report-${new Date().toISOString().split('T')[0]}.pdf`;
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

// Add fade-in animation style
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.3s ease-out; }
`;
document.head.appendChild(style);

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
