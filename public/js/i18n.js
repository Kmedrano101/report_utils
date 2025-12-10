/**
 * Lightweight language manager for UI + API requests
 */
(function () {
    const DEFAULT_LANGUAGE = 'es';
    const SUPPORTED_LANGUAGES = ['es', 'en'];
    const STORAGE_KEY = 'reportUtils.language';
    const FLAG_MAP = {
        es: '🇪🇸',
        en: '🇬🇧'
    };

    const DOCUMENT_TITLE = {
        en: 'IoT Report Utils - Configuration',
        es: 'IoT Report Utils - Configuración'
    };

    const TEXT_TRANSLATIONS = {
        'Tidop IoT Report Utils': { en: 'Tidop IoT Report Utils', es: 'Tidop IoT Report Utils' },
        'IoT Report Generation': { en: 'IoT Report Generation', es: 'Generación de Informes IoT' },
        'Configuration & Management': { en: 'Configuration & Management', es: 'Configuración y gestión' },
        'Checking...': { en: 'Checking...', es: 'Verificando...' },
        'Refresh': { en: 'Refresh', es: 'Actualizar' },
        'Language': { en: 'Language', es: 'Idioma' },
        'Español': { en: 'Spanish (ES)', es: 'Español' },
        'English': { en: 'English', es: 'Inglés' },
        'Dashboard': { en: 'Dashboard', es: 'Panel' },
        'Database Config': { en: 'Database Config', es: 'Configuración BD' },
        'Reports': { en: 'Reports', es: 'Reportes' },
        'API Explorer': { en: 'API Explorer', es: 'Explorador API' },
        'System Health': { en: 'System Health', es: 'Salud del sistema' },
        'Status': { en: 'Status', es: 'Estado' },
        'Loading...': { en: 'Loading...', es: 'Cargando...' },
        'Uptime': { en: 'Uptime', es: 'Tiempo activo' },
        'Memory': { en: 'Memory', es: 'Memoria' },
        'Database': { en: 'Database', es: 'Base de datos' },
        'Connection': { en: 'Connection', es: 'Conexión' },
        'Pool': { en: 'Pool', es: 'Pool' },
        'Type': { en: 'Type', es: 'Tipo' },
        'TimescaleDB': { en: 'TimescaleDB', es: 'TimescaleDB' },
        'Generated': { en: 'Generated', es: 'Generados' },
        'Templates': { en: 'Templates', es: 'Plantillas' },
        'PDF Engine': { en: 'PDF Engine', es: 'Motor PDF' },
        'Prometheus': { en: 'Prometheus', es: 'Prometheus' },
        'Metrics': { en: 'Metrics', es: 'Métricas' },
        'Last Scrape': { en: 'Last Scrape', es: 'Última captura' },
        'VictoriaMetrics': { en: 'VictoriaMetrics', es: 'VictoriaMetrics' },
        'Query Engine': { en: 'Query Engine', es: 'Motor de consultas' },
        'MetricsQL': { en: 'MetricsQL', es: 'MetricsQL' },
        'Storage': { en: 'Storage', es: 'Almacenamiento' },
        'Quick Actions': { en: 'Quick Actions', es: 'Acciones rápidas' },
        'Generate Report': { en: 'Generate Report', es: 'Generar reporte' },
        'Configure Database': { en: 'Configure Database', es: 'Configurar base de datos' },
        'Database Configuration': { en: 'Database Configuration', es: 'Configuración de base de datos' },
        'Connection Profile': { en: 'Connection Profile', es: 'Perfil de conexión' },
        'Default (Built-in TimescaleDB)': { en: 'Default (Built-in TimescaleDB)', es: 'Predeterminado (TimescaleDB integrado)' },
        'Custom Configuration': { en: 'Custom Configuration', es: 'Configuración personalizada' },
        'Load': { en: 'Load', es: 'Cargar' },
        'Save': { en: 'Save', es: 'Guardar' },
        'Host': { en: 'Host', es: 'Host' },
        'Port': { en: 'Port', es: 'Puerto' },
        'Database Name': { en: 'Database Name', es: 'Nombre de la base de datos' },
        'Username': { en: 'Username', es: 'Usuario' },
        'Password': { en: 'Password', es: 'Contraseña' },
        'SSL Mode': { en: 'SSL Mode', es: 'Modo SSL' },
        'Disable': { en: 'Disable', es: 'Deshabilitar' },
        'Prefer': { en: 'Prefer', es: 'Preferir' },
        'Require': { en: 'Require', es: 'Requerir' },
        'Connection Pool Min': { en: 'Connection Pool Min', es: 'Mínimo del pool' },
        'Connection Pool Max': { en: 'Connection Pool Max', es: 'Máximo del pool' },
        'Test Connection': { en: 'Test Connection', es: 'Probar conexión' },
        'Apply Configuration': { en: 'Apply Configuration', es: 'Aplicar configuración' },
        'Schema Mapping': { en: 'Schema Mapping', es: 'Mapeo de esquema' },
        'Map your existing database schema to IoT Report Utils': {
            en: 'Map your existing database schema to IoT Report Utils',
            es: 'Mapea tu esquema actual de base de datos a IoT Report Utils'
        },
        'Sensors Table': { en: 'Sensors Table', es: 'Tabla de sensores' },
        'Readings Table': { en: 'Readings Table', es: 'Tabla de lecturas' },
        'Sensor Types Table': { en: 'Sensor Types Table', es: 'Tabla de tipos de sensor' },
        'Auto-Detect Schema': { en: 'Auto-Detect Schema', es: 'Detectar esquema automáticamente' },
        'Template Configuration': { en: 'Template Configuration', es: 'Configuración de plantilla' },
        'Report Title': { en: 'Report Title', es: 'Título del reporte' },
        'Main title displayed on report header': {
            en: 'Main title displayed on report header',
            es: 'Título principal mostrado en el encabezado del reporte'
        },
        'Report Subtitle': { en: 'Report Subtitle', es: 'Subtítulo del reporte' },
        'Subtitle displayed below the title': {
            en: 'Subtitle displayed below the title',
            es: 'Subtítulo mostrado debajo del título'
        },
        'Color Theme': { en: 'Color Theme', es: 'Tema de color' },
        'Professional Blue': { en: 'Professional Blue', es: 'Azul profesional' },
        'Corporate Green': { en: 'Corporate Green', es: 'Verde corporativo' },
        'Modern Purple': { en: 'Modern Purple', es: 'Morado moderno' },
        'Tech Orange': { en: 'Tech Orange', es: 'Naranja tecnológico' },
        'Monochrome': { en: 'Monochrome', es: 'Monocromático' },
        'Dark Mode': { en: 'Dark Mode', es: 'Modo oscuro' },
        'Controls header/footer palette': {
            en: 'Controls header/footer palette',
            es: 'Controla la paleta de encabezado y pie'
        },
        'Logo URL (optional)': { en: 'Logo URL (optional)', es: 'URL del logo (opcional)' },
        'Displayed inside the circular accent': {
            en: 'Displayed inside the circular accent',
            es: 'Se muestra dentro del acento circular'
        },
        'Preview Output': { en: 'Preview Output', es: 'Vista previa' },
        'PDF (accurate sizing)': { en: 'PDF (accurate sizing)', es: 'PDF (tamaño real)' },
        'SVG (quick layout)': { en: 'SVG (quick layout)', es: 'SVG (diseño rápido)' },
        'Switch between PDF or SVG preview': {
            en: 'Switch between PDF or SVG preview',
            es: 'Alterna entre vista previa PDF o SVG'
        },
        'Page Orientation': { en: 'Page Orientation', es: 'Orientación de página' },
        'Portrait (Vertical)': { en: 'Portrait (Vertical)', es: 'Vertical' },
        'Landscape (Horizontal)': { en: 'Landscape (Horizontal)', es: 'Horizontal' },
        'Page Size': { en: 'Page Size', es: 'Tamaño de página' },
        'A4 (210 x 297 mm)': { en: 'A4 (210 x 297 mm)', es: 'A4 (210 x 297 mm)' },
        'Letter (8.5 x 11 in)': { en: 'Letter (8.5 x 11 in)', es: 'Carta (8.5 x 11 in)' },
        'Legal (8.5 x 14 in)': { en: 'Legal (8.5 x 14 in)', es: 'Oficio (8.5 x 14 in)' },
        'Footer Text': { en: 'Footer Text', es: 'Texto del pie' },
        'Appears on the left side of footer': {
            en: 'Appears on the left side of footer',
            es: 'Aparece en el lado izquierdo del pie'
        },
        'SVG Template': { en: 'SVG Template', es: 'Plantilla SVG' },
        'Auto (match orientation)': { en: 'Auto (match orientation)', es: 'Auto (según la orientación)' },
        'Loading templates...': { en: 'Loading templates...', es: 'Cargando plantillas...' },
        'Templates are loaded automatically from the templates directory': {
            en: 'Templates are loaded automatically from the templates directory',
            es: 'Las plantillas se cargan automáticamente desde el directorio de plantillas'
        },
        'Preview Template': { en: 'Preview Template', es: 'Previsualizar plantilla' },
        'Save Configuration': { en: 'Save Configuration', es: 'Guardar configuración' },
        'Reset': { en: 'Reset', es: 'Restablecer' },
        'Report Type': { en: 'Report Type', es: 'Tipo de reporte' },
        'Test Template (report_test.svg)': {
            en: 'Test Template (report_test.svg)',
            es: 'Plantilla de prueba (report_test.svg)'
        },
        'IoT Summary Report': { en: 'IoT Summary Report', es: 'Reporte resumido IoT' },
        'Sensor Detailed Report': { en: 'Sensor Detailed Report', es: 'Reporte detallado de sensor' },
        'Building Report': { en: 'Building Report', es: 'Reporte por edificio' },
        'Output Format': { en: 'Output Format', es: 'Formato de salida' },
        'PDF': { en: 'PDF', es: 'PDF' },
        'HTML': { en: 'HTML', es: 'HTML' },
        'Start Date': { en: 'Start Date', es: 'Fecha de inicio' },
        'End Date': { en: 'End Date', es: 'Fecha de fin' },
        'Select Sensors (Optional)': { en: 'Select Sensors (Optional)', es: 'Selecciona sensores (opcional)' },
        'Generate & Download Report': { en: 'Generate & Download Report', es: 'Generar y descargar reporte' },
        'Generating report...': { en: 'Generating report...', es: 'Generando reporte...' },
        'Recent Reports': { en: 'Recent Reports', es: 'Reportes recientes' },
        'Endpoint': { en: 'Endpoint', es: 'Endpoint' },
        'GET /health - Health Check': { en: 'GET /health - Health Check', es: 'GET /health - Verificar estado' },
        'GET /api/sensors - List Sensors': { en: 'GET /api/sensors - List Sensors', es: 'GET /api/sensors - Listar sensores' },
        'GET /api/kpis - List KPIs': { en: 'GET /api/kpis - List KPIs', es: 'GET /api/kpis - Listar KPIs' },
        'GET /api/reports/templates - List Templates': {
            en: 'GET /api/reports/templates - List Templates',
            es: 'GET /api/reports/templates - Listar plantillas'
        },
        'cURL Command': { en: 'cURL Command', es: 'Comando cURL' },
        'Copy': { en: 'Copy', es: 'Copiar' },
        'Test Endpoint': { en: 'Test Endpoint', es: 'Probar endpoint' },
        'Response': { en: 'Response', es: 'Respuesta' },
        'Click \"Test Endpoint\" to see response': {
            en: 'Click \"Test Endpoint\" to see response',
            es: 'Haz clic en \"Probar endpoint\" para ver la respuesta'
        },
        'Tidop IoT Report Utils v1.0.0 - Built with ❤️ for IoT Analytics': {
            en: 'Tidop IoT Report Utils v1.0.0 - Built with ❤️ for IoT Analytics',
            es: 'Tidop IoT Report Utils v1.0.0 - Creado con ❤️ para analítica IoT'
        },
        'Saludable': { en: 'Healthy', es: 'Saludable' },
        'Conectado': { en: 'Connected', es: 'Conectado' },
        // New collapsible sections
        'Template Settings': { en: 'Template Settings', es: 'Configuración de plantilla' },
        'Settings': { en: 'Settings', es: 'Configuración' },
        'Refresh Health Status': { en: 'Refresh Health Status', es: 'Actualizar estado del sistema' },
        'Database Source': { en: 'Database Source', es: 'Fuente de base de datos' },
        'Local TimescaleDB': { en: 'Local TimescaleDB', es: 'TimescaleDB local' },
        'External VictoriaMetrics': { en: 'External VictoriaMetrics', es: 'VictoriaMetrics externa' },
        'Selected:': { en: 'Selected:', es: 'Seleccionado:' },
        'PostgreSQL with TimescaleDB extension': { en: 'PostgreSQL with TimescaleDB extension', es: 'PostgreSQL con extensión TimescaleDB' },
        'Time-series database (MetricsQL)': { en: 'Time-series database (MetricsQL)', es: 'Base de datos de series temporales (MetricsQL)' },
        'Local TimescaleDB Configuration': { en: 'Local TimescaleDB Configuration', es: 'Configuración de TimescaleDB local' },
        'Configure connection to local PostgreSQL/TimescaleDB instance': {
            en: 'Configure connection to local PostgreSQL/TimescaleDB instance',
            es: 'Configurar conexión a instancia local de PostgreSQL/TimescaleDB'
        },
        'External VictoriaMetrics Configuration': { en: 'External VictoriaMetrics Configuration', es: 'Configuración de VictoriaMetrics externa' },
        'Configure connection to external VictoriaMetrics time-series database': {
            en: 'Configure connection to external VictoriaMetrics time-series database',
            es: 'Configurar conexión a base de datos de series temporales VictoriaMetrics externa'
        },
        'API Endpoint URL': { en: 'API Endpoint URL', es: 'URL del endpoint API' },
        'Full URL to VictoriaMetrics API endpoint': { en: 'Full URL to VictoriaMetrics API endpoint', es: 'URL completa del endpoint API de VictoriaMetrics' },
        'Default Source': { en: 'Default Source', es: 'Fuente predeterminada' },
        'Local Instance': { en: 'Local Instance', es: 'Instancia local' },
        'External API': { en: 'External API', es: 'API externa' },
        'Which source to use by default': { en: 'Which source to use by default', es: 'Qué fuente usar por defecto' },
        'Authorization Token (Basic Auth)': { en: 'Authorization Token (Basic Auth)', es: 'Token de autorización (Basic Auth)' },
        'Enter Base64 encoded token': { en: 'Enter Base64 encoded token', es: 'Ingrese token codificado en Base64' },
        'Base64 encoded credentials for Basic Authentication': {
            en: 'Base64 encoded credentials for Basic Authentication',
            es: 'Credenciales codificadas en Base64 para autenticación básica'
        },
        'Query Timeout (ms)': { en: 'Query Timeout (ms)', es: 'Tiempo de espera de consulta (ms)' },
        'Max Retries': { en: 'Max Retries', es: 'Reintentos máximos' },
        'SSL Verification': { en: 'SSL Verification', es: 'Verificación SSL' },
        'Enabled': { en: 'Enabled', es: 'Habilitado' },
        'Disabled': { en: 'Disabled', es: 'Deshabilitado' },
        'VictoriaMetrics Endpoints': { en: 'VictoriaMetrics Endpoints', es: 'Endpoints de VictoriaMetrics' },
        'Instant queries': { en: 'Instant queries', es: 'Consultas instantáneas' },
        'Range queries': { en: 'Range queries', es: 'Consultas por rango' },
        'List metrics': { en: 'List metrics', es: 'Listar métricas' },
        'IoT Sensor Summary Report': { en: 'IoT Sensor Summary Report', es: 'Reporte resumido de sensores IoT' },
        'Real-time monitoring and analytics': { en: 'Real-time monitoring and analytics', es: 'Monitoreo y análisis en tiempo real' },
        'Madison - IoT Report': { en: 'Madison - IoT Report', es: 'Madison - Reporte IoT' },
        'Temperature Analysis': { en: 'Temperature Analysis', es: 'Análisis de temperatura' },
        'Power Consumption Analysis': { en: 'Power Consumption Analysis', es: 'Análisis de consumo energético' },
        'Sound Levels Analysis': { en: 'Sound Levels Analysis', es: 'Análisis de niveles de sonido' }
    };

    const KEY_TRANSLATIONS = {
        'status.online': { en: 'Online', es: 'En línea' },
        'status.offline': { en: 'Offline', es: 'Desconectado' },
        'status.unhealthy': { en: 'Unhealthy', es: 'No saludable' },
        'status.healthy': { en: 'Healthy', es: 'Saludable' },
        'status.initializing': { en: 'Initializing', es: 'Inicializando' },
        'status.connected': { en: 'Connected', es: 'Conectado' },
        'status.disconnected': { en: 'Disconnected', es: 'Desconectado' },
        'status.ready': { en: 'Ready', es: 'Listo' },
        'status.initializingPdf': { en: 'Initializing', es: 'Inicializando' },
        'status.loading': { en: 'Loading...', es: 'Cargando...' },
        'notification.copied': { en: 'Copied to clipboard!', es: '¡Copiado al portapapeles!' },
        'notification.reportSuccess': { en: 'Report downloaded successfully!', es: '¡Reporte descargado correctamente!' },
        'notification.reportOpened': { en: 'Report opened in new window', es: 'Reporte abierto en una nueva ventana' },
        'notification.errorPrefix': { en: 'Error:', es: 'Error:' },
        'metrics': { en: 'metrics', es: 'métricas' }
    };

    function findTextNodes(matchText) {
        if (!matchText || typeof document === 'undefined') return [];
        const nodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node?.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    const tag = parent.nodeName;
                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );
        while (walker.nextNode()) {
            const value = walker.currentNode.textContent.trim();
            if (value === matchText) {
                nodes.push(walker.currentNode);
            }
        }
        return nodes;
    }

    const LanguageManager = {
        current: DEFAULT_LANGUAGE,
        selector: null,
        flagElement: null,
        listeners: new Set(),
        textNodeCache: new Map(),
        cachedStaticNodes: false,

        init() {
            const stored = this.getStoredLanguage();
            const browserLanguage = this.detectBrowserLanguage();
            this.current = stored || browserLanguage || DEFAULT_LANGUAGE;
            this.updateDocumentLanguage();
            this.cacheStaticTextNodes();
            this.applyTranslations();
            this.syncUI();
            return this.current;
        },

        bindSelector(element, flagElement) {
            if (!element) {
                return;
            }
            this.selector = element;
            this.flagElement = flagElement || null;
            this.selector.value = this.current;
            this.updateFlagIcon();
            this.selector.addEventListener('change', (event) => {
                this.setLanguage(event.target.value);
            });
        },

        cacheStaticTextNodes() {
            if (this.cachedStaticNodes || typeof document === 'undefined') {
                return;
            }
            Object.keys(TEXT_TRANSLATIONS).forEach(original => {
                if (!this.textNodeCache.has(original)) {
                    const nodes = findTextNodes(original);
                    if (nodes.length) {
                        this.textNodeCache.set(original, nodes);
                    }
                }
            });
            this.cachedStaticNodes = true;
        },

        applyTranslations() {
            if (typeof document !== 'undefined') {
                document.title = DOCUMENT_TITLE[this.current] || DOCUMENT_TITLE[DEFAULT_LANGUAGE];
            }

            this.textNodeCache.forEach((nodes, original) => {
                const translation = this.getTextTranslation(original);
                nodes.forEach(node => {
                    node.textContent = translation;
                });
            });
        },

        getTextTranslation(original) {
            const entry = TEXT_TRANSLATIONS[original];
            if (!entry) return original;
            return entry[this.current] || entry[DEFAULT_LANGUAGE] || original;
        },

        getLanguage() {
            return this.current;
        },

        setLanguage(lang) {
            const normalized = this.normalizeLanguage(lang) || DEFAULT_LANGUAGE;
            if (normalized === this.current) {
                this.syncUI();
                return normalized;
            }
            this.current = normalized;
            this.saveLanguage(normalized);
            this.updateDocumentLanguage();
            this.applyTranslations();
            this.syncUI();
            this.notifyChange();
            return normalized;
        },

        normalizeLanguage(value) {
            if (!value || typeof value !== 'string') return null;
            const lower = value.toLowerCase();
            return SUPPORTED_LANGUAGES.find(code => lower === code || lower.startsWith(`${code}-`)) || null;
        },

        detectBrowserLanguage() {
            if (typeof navigator === 'undefined') return null;
            return this.normalizeLanguage(navigator.language || (navigator.languages ? navigator.languages[0] : null));
        },

        updateDocumentLanguage() {
            if (typeof document === 'undefined') return;
            document.documentElement.setAttribute('lang', this.current);
            document.documentElement.dataset.language = this.current;
        },

        updateFlagIcon() {
            if (this.flagElement) {
                this.flagElement.textContent = FLAG_MAP[this.current] || '';
            }
        },

        syncUI() {
            if (this.selector) {
                this.selector.value = this.current;
            }
            this.updateFlagIcon();
        },

        getStoredLanguage() {
            try {
                return this.normalizeLanguage(localStorage.getItem(STORAGE_KEY));
            } catch (error) {
                return null;
            }
        },

        saveLanguage(lang) {
            try {
                localStorage.setItem(STORAGE_KEY, lang);
            } catch (error) {
                // Ignore storage errors (e.g., private mode)
            }
        },

        onChange(listener) {
            if (typeof listener === 'function') {
                this.listeners.add(listener);
            }
            return () => this.listeners.delete(listener);
        },

        notifyChange() {
            this.listeners.forEach(listener => {
                try {
                    listener(this.current);
                } catch (error) {
                    console.error('Language change listener error:', error);
                }
            });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('languagechange', {
                    detail: { language: this.current }
                }));
            }
        },

        t(key, fallback = '') {
            const entry = KEY_TRANSLATIONS[key];
            if (!entry) return fallback || key;
            return entry[this.current] || entry[DEFAULT_LANGUAGE] || fallback || key;
        },

        applyLanguageToRequest(options = {}) {
            const headers = new Headers(options.headers || {});
            headers.set('Accept-Language', this.current || DEFAULT_LANGUAGE);
            return {
                ...options,
                headers
            };
        }
    };

    window.LanguageManager = LanguageManager;
})();
