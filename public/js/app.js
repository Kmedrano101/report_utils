/**
 * IoT Report Utils - Web UI Application
 */

const API_BASE = window.location.origin;
const LanguageManager = window.LanguageManager || null;

const t = (key, fallback = '') => {
    if (LanguageManager?.t) {
        return LanguageManager.t(key, fallback);
    }
    return fallback || key;
};

// Translation helper for text content (uses TEXT_TRANSLATIONS)
const translateText = (text) => {
    if (LanguageManager?.getTextTranslation) {
        return LanguageManager.getTextTranslation(text);
    }
    return text;
};

function languageFetch(url, options = {}) {
    if (LanguageManager && typeof LanguageManager.applyLanguageToRequest === 'function') {
        return fetch(url, LanguageManager.applyLanguageToRequest(options));
    }
    return fetch(url, options);
}

async function languageFetchJSON(url, options = {}) {
    const response = await languageFetch(url, options);
    return response.json();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    console.log('Initializing IoT Report Utils UI...');

    if (LanguageManager?.init) {
        LanguageManager.init();
        LanguageManager.bindSelector(
            document.getElementById('languageSelector'),
            document.getElementById('languageFlag')
        );
    }

    // Set default dates
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    document.getElementById('reportStartDate').valueAsDate = lastWeek;
    document.getElementById('reportEndDate').valueAsDate = today;

    // Load initial data for reports-first layout
    await checkHealth();
    await loadTemplates();
    await loadRecentReports();
    await loadSensors(); // Load sensors for the checkboxes
    initTheme();
    loadPDFConfig();
    initDatabaseSource();

    // Set up automatic health check refresh every 30 seconds
    setInterval(async () => {
        await checkHealth();
    }, 30000);

    // Listen for language changes to update dynamic content
    if (LanguageManager) {
        LanguageManager.onChange((newLang) => {
            console.log('Language changed to:', newLang);
            // Refresh health status to update dynamic text
            checkHealth();
            // Update database source labels without changing selection
            updateDatabaseSourceLabels();
            // Update report title/subtitle when language changes
            updateReportTitleFromType();
        });
    }

    // Add event listener to report type dropdown to update title/subtitle
    const reportTypeSelect = document.getElementById('reportType');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', updateReportTitleFromType);
        // Set initial values
        updateReportTitleFromType();
    }
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
        const response = await languageFetch(`${API_BASE}/health`);
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

    // Check which database source is selected
    const dbSourceToggle = document.getElementById('dbSourceToggle');
    const isExternalVM = dbSourceToggle?.checked || false;

    if (data.success) {
        // Determine overall health based on selected source
        let isHealthy = true;
        let statusMessage = t('status.online', 'Online');

        if (isExternalVM && data.victoriaMetrics) {
            // When VictoriaMetrics is selected, show its status in header
            isHealthy = data.victoriaMetrics.healthy;
            if (isHealthy) {
                statusMessage = `${t('status.online', 'En línea')} - VM (${data.victoriaMetrics.metricCount || 0} ${t('metrics', 'métricas')})`;
            } else {
                statusMessage = `${t('status.offline', 'Desconectado')} - VictoriaMetrics`;
            }
        } else if (data.database) {
            // When TimescaleDB is selected, show its status in header
            isHealthy = data.database.healthy;
            if (isHealthy) {
                statusMessage = `${t('status.online', 'En línea')} - TimescaleDB`;
            } else {
                statusMessage = `${t('status.offline', 'Desconectado')} - TimescaleDB`;
            }
        }

        // Update header status
        if (isHealthy) {
            statusDot.className = 'status-dot status-healthy';
            statusText.className = 'text-sm font-medium text-green-600 dark:text-green-400';
        } else {
            statusDot.className = 'status-dot status-unhealthy';
            statusText.className = 'text-sm font-medium text-red-600 dark:text-red-400';
        }
        statusText.textContent = statusMessage;

        // Update health details
        document.getElementById('health-status').textContent = isHealthy ? t('status.healthy', 'Healthy') : t('status.unhealthy', 'Unhealthy');
        document.getElementById('health-uptime').textContent = formatUptime(data.uptime);
        document.getElementById('health-memory').textContent = `${data.memory?.used || 0} / ${data.memory?.total || 0} MB`;

        // Update database status based on selected source
        if (isExternalVM && data.victoriaMetrics) {
            // Show VictoriaMetrics status
            document.getElementById('db-status').textContent = data.victoriaMetrics.healthy
                ? t('status.connected', 'Connected')
                : t('status.disconnected', 'Disconnected');
            document.getElementById('db-pool').textContent = `${data.victoriaMetrics.metricCount || 0} metrics`;
            document.getElementById('db-type').textContent = 'VictoriaMetrics';
        } else if (data.database) {
            // Show TimescaleDB status
            document.getElementById('db-status').textContent = data.database.healthy
                ? t('status.connected', 'Connected')
                : t('status.disconnected', 'Disconnected');
            document.getElementById('db-pool').textContent = `${data.database.poolIdle || 0} / ${data.database.poolTotal || 0}`;
            document.getElementById('db-type').textContent = 'TimescaleDB';
        }

        // Update PDF service status
        if (data.pdfService) {
            document.getElementById('pdf-status').textContent = data.pdfService.initialized
                ? t('status.ready', 'Ready')
                : t('status.initializing', 'Initializing');
        }
    } else {
        statusDot.className = 'status-dot status-unhealthy';
        statusText.textContent = t('status.offline', 'Offline');
        statusText.className = 'text-sm font-medium text-red-600';

        document.getElementById('health-status').textContent = t('status.unhealthy', 'Unhealthy');
    }
}

function formatUptime(seconds) {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// Update report title and subtitle based on selected report type
function updateReportTitleFromType() {
    const reportType = document.getElementById('reportType')?.value;
    const pdfTitleInput = document.getElementById('pdfTitle');
    const pdfSubtitleInput = document.getElementById('pdfSubtitle');

    if (!reportType || !pdfTitleInput || !pdfSubtitleInput) return;

    // Get current language
    const currentLang = LanguageManager?.getLanguage?.() || 'es';

    // Define report titles based on report type (matching templateLocalization.js)
    const reportTitles = {
        'hotspots-coldzones': {
            en: 'Temperature Analysis and Comfort',
            es: 'Análisis de Temperatura y Confort'
        },
        'power-consumption': {
            en: 'Power Consumption Analysis',
            es: 'Análisis de Consumo Energético'
        },
        'sound-analysis': {
            en: 'Sound Levels and Noise Pollution',
            es: 'Niveles de Sonido y Contaminación Acústica'
        }
    };

    // Building information with coordinates (subtitle is always the same)
    const buildingSubtitle = 'Madison MK, C. de Enrique Cubero, 9, 47014 Valladolid';

    // Get the appropriate title for the report type and language
    const reportConfig = reportTitles[reportType];
    if (reportConfig) {
        const title = reportConfig[currentLang] || reportConfig['es'];
        pdfTitleInput.value = title;
        pdfSubtitleInput.value = buildingSubtitle;

        // Also update the PDF config if it exists
        if (window.pdfConfig) {
            window.pdfConfig.updateConfig({
                reportTitle: title,
                reportSubtitle: buildingSubtitle
            });
        }
    }
}

// Dashboard
async function loadDashboard() {
    try {
        // Load report count
        const reports = await languageFetchJSON(`${API_BASE}/api/reports/history?limit=10`);
        document.getElementById('report-count').textContent = reports.data?.length || 0;

        // Load templates
        const templates = await languageFetchJSON(`${API_BASE}/api/reports/templates`);
        document.getElementById('template-count').textContent = templates.data?.length || 0;
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// External Services Status
async function checkExternalServices() {
    // VictoriaMetrics UI sections removed - keeping function for compatibility
    console.log('External services check - VictoriaMetrics UI removed');
}

// VictoriaMetrics functions removed - UI sections no longer present
// The backend API at /api/metrics/* is still available for programmatic access

// Show notification helper
function showNotification(type, title, message) {
    const bgColor = type === 'success' ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900';
    const borderColor = type === 'success' ? 'border-green-500' : 'border-red-500';
    const textColor = type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${bgColor} border-l-4 ${borderColor} p-4 rounded shadow-lg max-w-md z-50 animate-fade-in`;
    notification.innerHTML = `
        <div class="flex items-start">
            <i class="fas ${icon} ${textColor} text-xl mr-3 mt-1"></i>
            <div class="flex-1">
                <h4 class="${textColor} font-bold mb-1">${title}</h4>
                <p class="${textColor} text-sm">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="${textColor} ml-3">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Load available SVG templates
async function loadTemplates() {
    try {
        const response = await languageFetch(`${API_BASE}/api/reports/templates`);
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
        const response = await languageFetch(`${API_BASE}/api/sensors`);
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

// Load external services config (VictoriaMetrics/Prometheus UI removed)
function loadExternalServicesConfig() {
    // UI elements removed - keeping function for compatibility
    console.log('External services config - UI sections removed');
}

async function loadProfile() {
    const profile = document.getElementById('dbProfile').value;

    if (profile === 'default') {
        loadCurrentConfig();
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

    const config = {
        profile: profile,
        host: document.getElementById('dbHost').value,
        port: parseInt(document.getElementById('dbPort').value) || 5432,
        database: document.getElementById('dbName').value,
        user: document.getElementById('dbUser').value,
        password: document.getElementById('dbPassword').value,
        ssl: document.getElementById('dbSSL').value,
        poolMin: parseInt(document.getElementById('dbPoolMin').value) || 2,
        poolMax: parseInt(document.getElementById('dbPoolMax').value) || 10
    };

    // Save to localStorage
    localStorage.setItem('dbConfig', JSON.stringify(config));

    // Also save to file if API supports it
    try {
        const response = await languageFetch(`${API_BASE}/api/config/database`, {
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
        const response = await languageFetch(`${API_BASE}/api/config/test-connection`, {
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
    try {
        // Get values from local database form
        const config = {
            host: document.getElementById('dbHost').value,
            port: parseInt(document.getElementById('dbPort').value) || 5432,
            database: document.getElementById('dbName').value,
            user: document.getElementById('dbUser').value,
            password: document.getElementById('dbPassword').value,
            poolMin: parseInt(document.getElementById('dbPoolMin').value) || 2,
            poolMax: parseInt(document.getElementById('dbPoolMax').value) || 10
        };

        // Validate required fields
        if (!config.host || !config.database || !config.user) {
            showNotification('error', 'Configuration Error', 'Please fill in all required fields: Host, Database, and User');
            return;
        }

        // Save to backend .env file
        const response = await languageFetch(`${API_BASE}/api/config/database-env`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.success) {
            // Also save to localStorage
            await saveProfile();

            // Refresh dashboard to show updated status
            await checkHealth();

            if (data.connected) {
                showNotification('success', 'Configuration Applied',
                    `Database configuration saved and connection successful!<br>` +
                    `Host: ${config.host}<br>` +
                    `Database: ${config.database}<br>` +
                    `Status: Connected`);
            } else {
                showNotification('warning', 'Configuration Saved',
                    `Database configuration saved to .env file, but connection failed:<br>` +
                    `${data.connectionError || 'Unknown error'}<br><br>` +
                    `Please verify the settings and try again.`);
            }
        } else {
            showNotification('error', 'Configuration Failed', data.error || 'Failed to save configuration');
        }
    } catch (error) {
        showNotification('error', 'Configuration Error', error.message);
    }
}


// Schema mapping section removed from UI
// Function kept for compatibility but no longer used
async function detectSchema() {
    console.log('Schema mapping UI removed - function deprecated');
}

// Database Source Toggle Functions
function updateDatabaseSourceLabels() {
    const toggle = document.getElementById('dbSourceToggle');
    if (!toggle) return;

    const isExternal = toggle.checked;
    const selectedSource = document.getElementById('selectedDbSource');
    const sourceType = document.getElementById('dbSourceType');

    if (isExternal) {
        selectedSource.textContent = translateText('External VictoriaMetrics');
        sourceType.textContent = translateText('Time-series database (MetricsQL)');
    } else {
        selectedSource.textContent = translateText('Local TimescaleDB');
        sourceType.textContent = translateText('PostgreSQL with TimescaleDB extension');
    }
}

function toggleDatabaseSource() {
    const toggle = document.getElementById('dbSourceToggle');
    const isExternal = toggle.checked;

    const localForm = document.getElementById('localDbForm');
    const externalForm = document.getElementById('externalDbForm');
    const selectedSource = document.getElementById('selectedDbSource');
    const sourceType = document.getElementById('dbSourceType');
    const statusDot = document.querySelector('#dbSourceStatus .status-dot');

    if (isExternal) {
        // Show VictoriaMetrics form
        localForm.classList.add('hidden');
        externalForm.classList.remove('hidden');
        selectedSource.textContent = translateText('External VictoriaMetrics');
        sourceType.textContent = translateText('Time-series database (MetricsQL)');
        statusDot.classList.remove('bg-green-500');
        statusDot.classList.add('bg-indigo-500');

        // Load saved VictoriaMetrics config
        loadVMConfig();
    } else {
        // Show TimescaleDB form
        localForm.classList.remove('hidden');
        externalForm.classList.add('hidden');
        selectedSource.textContent = translateText('Local TimescaleDB');
        sourceType.textContent = translateText('PostgreSQL with TimescaleDB extension');
        statusDot.classList.remove('bg-indigo-500');
        statusDot.classList.add('bg-green-500');

        // Load current DB config
        loadCurrentConfig();
    }

    // Save preference
    localStorage.setItem('preferredDbSource', isExternal ? 'external' : 'local');

    // Refresh dashboard to show correct database info
    checkHealth();
}

// Load VictoriaMetrics Configuration
function loadVMConfig() {
    const savedConfig = localStorage.getItem('vmConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            document.getElementById('vmUrl').value = config.url || '';
            document.getElementById('vmToken').value = config.token || '';
            document.getElementById('vmDefaultSource').value = config.defaultSource || 'external';
            document.getElementById('vmTimeout').value = config.timeout || 30000;
            document.getElementById('vmRetries').value = config.retries || 3;
            document.getElementById('vmSSL').value = config.sslVerify !== false ? 'true' : 'false';
        } catch (error) {
            console.error('Failed to load VM config:', error);
        }
    } else {
        // Load from environment if available
        document.getElementById('vmUrl').value = 'https://api.iot.tidop.es/v1/vm';
        document.getElementById('vmDefaultSource').value = 'external';
    }
}

// Save VictoriaMetrics Configuration
async function saveVMConfig() {
    const config = {
        url: document.getElementById('vmUrl').value,
        token: document.getElementById('vmToken').value,
        defaultSource: document.getElementById('vmDefaultSource').value,
        timeout: parseInt(document.getElementById('vmTimeout').value) || 30000,
        retries: parseInt(document.getElementById('vmRetries').value) || 3,
        sslVerify: document.getElementById('vmSSL').value === 'true'
    };

    // Validate URL
    if (!config.url) {
        showNotification('error', 'Configuration Error', 'API Endpoint URL is required');
        return;
    }

    // Save to localStorage
    localStorage.setItem('vmConfig', JSON.stringify(config));

    // Save to backend and test connection
    try {
        const response = await languageFetch(`${API_BASE}/api/config/victoriametrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        // Refresh dashboard to show updated status
        await checkHealth();

        if (data.success && data.connected) {
            showNotification('success', 'Configuration Applied',
                `VictoriaMetrics configuration saved and connection successful!<br>` +
                `URL: ${config.url}<br>` +
                `Status: Connected`);
        } else if (data.success) {
            showNotification('warning', 'Configuration Saved',
                `VictoriaMetrics configuration saved to .env file, but connection failed:<br>` +
                `${data.connectionError || 'Unknown error'}<br><br>` +
                `Please verify the settings and try again.`);
        } else {
            showNotification('warning', 'Configuration Saved Locally',
                'Configuration saved to browser storage. Backend update not available.');
        }
    } catch (error) {
        showNotification('warning', 'Configuration Saved Locally',
            'Configuration saved to browser storage. Backend connection unavailable.');
    }
}

// Test VictoriaMetrics Connection
async function testVMConnection() {
    const resultDiv = document.getElementById('vmConnectionResult');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = '<div class="flex items-center space-x-3 text-blue-600 dark:text-blue-400"><i class="fas fa-spinner fa-spin"></i><span>Testing connection...</span></div>';

    const url = document.getElementById('vmUrl').value;
    const token = document.getElementById('vmToken').value;

    if (!url) {
        resultDiv.innerHTML = '<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-200"><i class="fas fa-times-circle mr-2"></i>Please enter API Endpoint URL</div>';
        return;
    }

    try {
        // Test directly from frontend
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Basic ${token}`;
        }

        // Use a simple query to test the connection
        const response = await fetch(`${url}/query`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                query: 'iot_sensor_reading',
                time: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // VictoriaMetrics external API returns {status: "OK", result: [...]}
        if (data.status === 'OK' || data.status === 'success') {
            const metricCount = data.result ? data.result.length : 0;
            resultDiv.innerHTML = `
                <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <div class="flex items-center space-x-2 text-green-800 dark:text-green-200 mb-2">
                        <i class="fas fa-check-circle text-xl"></i>
                        <span class="font-semibold">Connection Successful!</span>
                    </div>
                    <div class="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <div>✓ Endpoint: ${url}</div>
                        <div>✓ Status: ${data.status}</div>
                        <div>✓ Time Series Found: ${metricCount}</div>
                        <div>✓ Query Engine: MetricsQL Active</div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-200">
                    <div class="flex items-center space-x-2 mb-2">
                        <i class="fas fa-times-circle text-xl"></i>
                        <span class="font-semibold">Connection Failed</span>
                    </div>
                    <div class="text-sm">Status: ${data.status || 'Unknown'}</div>
                    <div class="text-sm">${data.error || 'Unable to connect to VictoriaMetrics'}</div>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-200">
                <div class="flex items-center space-x-2 mb-2">
                    <i class="fas fa-exclamation-circle text-xl"></i>
                    <span class="font-semibold">Connection Error</span>
                </div>
                <div class="text-sm">${error.message}</div>
            </div>
        `;
    }
}

// Toggle VictoriaMetrics token visibility
function toggleVmTokenVisibility() {
    const input = document.getElementById('vmToken');
    const icon = document.getElementById('vmTokenIcon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Initialize database source on page load
function initDatabaseSource() {
    const preferredSource = localStorage.getItem('preferredDbSource');
    const toggle = document.getElementById('dbSourceToggle');

    if (!toggle) return;

    // Default to external VictoriaMetrics if no preference is saved
    if (!preferredSource || preferredSource === 'external') {
        toggle.checked = true;
        toggleDatabaseSource();
    } else {
        // User explicitly chose local
        toggle.checked = false;
        toggleDatabaseSource();
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

        if (reportType === 'hotspots-coldzones') {
            url += 'hotspots-coldzones';

            // Get all configuration values from template settings
            const config = window.pdfConfig.getConfig();
            body.headerTitle = config.reportTitle || document.getElementById('pdfTitle')?.value || 'Hotspots and Cold Zones';
            body.headerSubtitle = config.reportSubtitle || document.getElementById('pdfSubtitle')?.value || 'Temperature Analysis Report';
            body.footerText = config.footer?.text || document.getElementById('pdfFooterText')?.value || 'Madison - IoT Report';
            body.logoUrl = '/images/logo_madison.png';
            body.theme = config.theme || document.getElementById('pdfTheme')?.value || 'professional-blue';
            body.layout = config.layout || document.getElementById('pdfLayout')?.value || 'landscape';
            body.pageSize = config.pageSize || document.getElementById('pdfPageSize')?.value || 'a4';
            body.source = 'external'; // Always use external VictoriaMetrics

        } else if (reportType === 'power-consumption') {
            url += 'power-consumption';

            // Get all configuration values from template settings
            const config = window.pdfConfig.getConfig();
            body.headerTitle = config.reportTitle || document.getElementById('pdfTitle')?.value || 'Power Consumption Analysis';
            body.headerSubtitle = config.reportSubtitle || document.getElementById('pdfSubtitle')?.value || 'Energy Monitoring Report';
            body.footerText = config.footer?.text || document.getElementById('pdfFooterText')?.value || 'Madison - IoT Report';
            body.logoUrl = '/images/logo_madison.png';
            body.theme = config.theme || document.getElementById('pdfTheme')?.value || 'professional-blue';
            body.layout = config.layout || document.getElementById('pdfLayout')?.value || 'landscape';
            body.pageSize = config.pageSize || document.getElementById('pdfPageSize')?.value || 'a4';
            body.source = 'external'; // Always use external VictoriaMetrics

        } else if (reportType === 'sound-analysis') {
            url += 'sound-analysis';

            // Get all configuration values from template settings
            const config = window.pdfConfig.getConfig();
            body.headerTitle = config.reportTitle || document.getElementById('pdfTitle')?.value || 'Sound Levels - Noise Pollution Analysis';
            body.headerSubtitle = config.reportSubtitle || document.getElementById('pdfSubtitle')?.value || 'Environmental Noise Monitoring Report';
            body.footerText = config.footer?.text || document.getElementById('pdfFooterText')?.value || 'Madison - IoT Report';
            body.logoUrl = '/images/logo_madison.png';
            body.theme = config.theme || document.getElementById('pdfTheme')?.value || 'professional-blue';
            body.layout = config.layout || document.getElementById('pdfLayout')?.value || 'landscape';
            body.pageSize = config.pageSize || document.getElementById('pdfPageSize')?.value || 'a4';
            body.source = 'external'; // Always use external VictoriaMetrics

        } else if (reportType === 'test-template') {
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

        body.language = LanguageManager?.getLanguage?.() || 'es';

        const response = await languageFetch(url, {
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
                showNotification(t('notification.reportSuccess', 'Report downloaded successfully!'), 'success');
            } else {
                const html = await response.text();
                const newWindow = window.open();
                newWindow.document.write(html);
                showNotification(t('notification.reportOpened', 'Report opened in new window'), 'success');
            }

            // Reload recent reports
            await loadRecentReports();
        } else {
            const error = await response.json();
            showNotification(`Failed to generate report: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Report generation error:', error);
        const prefix = t('notification.errorPrefix', 'Error:');
        showNotification(`${prefix} ${error.message}`, 'error');
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
        const response = await languageFetch(`${API_BASE}/api/reports/history?limit=10`);
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
    const lang = LanguageManager?.getLanguage?.() || 'es';
    document.getElementById('curlCommand').textContent = `curl -H "Accept-Language: ${lang}" ${API_BASE}${endpoint}`;
}

async function testEndpoint() {
    const endpoint = document.getElementById('apiEndpoint').value;
    const responseDiv = document.getElementById('apiResponse');

    responseDiv.textContent = t('status.loading', 'Loading...');

    try {
        const response = await languageFetch(`${API_BASE}${endpoint}`);
        const data = await response.json();
        responseDiv.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        const prefix = t('notification.errorPrefix', 'Error:');
        responseDiv.textContent = `${prefix} ${error.message}`;
    }
}

function copyCurl() {
    const command = document.getElementById('curlCommand').textContent;
    navigator.clipboard.writeText(command).then(() => {
        showNotification(t('notification.copied', 'Copied to clipboard!'), 'success');
    });
}

window.addEventListener('languagechange', () => {
    updateApiExample();
    checkHealth(); // Refresh health status to apply new translations
});

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
        logoUrl: resolveAssetUrl('/images/logo_madison.png'),
        theme: document.getElementById('pdfTheme').value || config.theme || 'professional-blue',
        layout: document.getElementById('pdfLayout').value || config.layout || 'portrait',
        pageSize: document.getElementById('pdfPageSize').value || config.pageSize || 'a4',
        format: mode
    };

    try {
        payload.language = LanguageManager?.getLanguage?.() || 'es';

        const endpoint = mode === 'svg'
            ? `${API_BASE}/api/reports/layout-preview`
            : `${API_BASE}/api/reports/final-template`;
        const response = await languageFetch(endpoint, {
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
                const previewLang = LanguageManager?.getLanguage?.() || 'es';
                const centeredHtml = `
<!DOCTYPE html>
<html lang="${previewLang}">
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
            enabled: true,
            url: '/images/logo_madison.png'
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

        body.language = LanguageManager?.getLanguage?.() || 'es';

        const response = await languageFetch(apiUrl, {
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
        const prefix = t('notification.errorPrefix', 'Error:');
        showNotification(`${prefix} ${error.message}`, 'error');
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

// Settings Drawer Toggle
function toggleSettingsDrawer() {
    const drawer = document.getElementById('settings-drawer');
    const overlay = document.getElementById('settings-overlay');

    if (drawer.classList.contains('translate-x-full')) {
        // Open drawer
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
    } else {
        // Close drawer
        drawer.classList.remove('translate-x-0');
        drawer.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    }
}

// Template Settings Toggle
function toggleTemplateSettings() {
    const content = document.getElementById('template-settings-content');
    const icon = document.getElementById('template-toggle-icon');

    if (content.classList.contains('hidden')) {
        // Open
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        // Close
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

// Database Settings Toggle
function toggleDatabaseSettings() {
    const content = document.getElementById('database-settings-content');
    const icon = document.getElementById('database-toggle-icon');

    if (content.classList.contains('hidden')) {
        // Open
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');

        // Load database configuration data
        loadExternalServicesConfig();
        loadCurrentConfig();
    } else {
        // Close
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

// API Settings Toggle
function toggleAPISettings() {
    const content = document.getElementById('api-settings-content');
    const icon = document.getElementById('api-toggle-icon');

    if (content.classList.contains('hidden')) {
        // Open
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        // Close
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}
