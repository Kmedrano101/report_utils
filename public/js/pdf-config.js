/**
 * PDF Configuration Module
 * Manages PDF template configurations, themes, and user preferences
 */

class PDFConfig {
    constructor() {
        this.defaultConfig = {
            reportTitle: 'IoT Sensor Summary Report',
            reportSubtitle: 'Real-time monitoring and analytics',
            theme: 'professional-blue',
            layout: 'portrait',
            pageSize: 'a4',
            templateName: 'auto',
            previewMode: 'pdf',
            orientation: 'vertical',
            margins: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
            },
            header: {
                enabled: true,
                style: 'standard',
                showLogo: true,
                showDate: true,
                showPageNumber: true
            },
            footer: {
                enabled: true,
                style: 'standard',
                showCompany: true,
                showPageNumber: true,
                text: 'Madison - IoT Report'
            },
            logo: {
                enabled: false,
                url: '/images/logo.png',
                position: 'left'
            },
            typography: {
                fontFamily: 'system-ui',
                baseFontSize: 16,
                headingFontWeight: 'bold'
            },
            colors: {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#0ea5e9',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444'
            }
        };

        this.themes = {
            'professional-blue': {
                name: 'Professional Blue',
                description: 'Classic blue theme for corporate reports',
                colors: {
                    primary: '#2563eb',
                    secondary: '#64748b',
                    accent: '#0ea5e9'
                }
            },
            'corporate-green': {
                name: 'Corporate Green',
                description: 'Green theme for environmental reports',
                colors: {
                    primary: '#059669',
                    secondary: '#6b7280',
                    accent: '#10b981'
                }
            },
            'modern-purple': {
                name: 'Modern Purple',
                description: 'Contemporary purple theme',
                colors: {
                    primary: '#7c3aed',
                    secondary: '#64748b',
                    accent: '#8b5cf6'
                }
            },
            'tech-orange': {
                name: 'Tech Orange',
                description: 'Energetic orange theme for tech reports',
                colors: {
                    primary: '#ea580c',
                    secondary: '#64748b',
                    accent: '#f97316'
                }
            },
            'monochrome': {
                name: 'Monochrome',
                description: 'Black and white minimalist theme',
                colors: {
                    primary: '#18181b',
                    secondary: '#71717a',
                    accent: '#27272a'
                }
            },
            'dark': {
                name: 'Dark Mode',
                description: 'Dark theme for reduced eye strain',
                colors: {
                    primary: '#3b82f6',
                    secondary: '#94a3b8',
                    accent: '#0ea5e9'
                }
            }
        };

        this.presets = {
            'iot-summary': {
                name: 'IoT Summary Report',
                description: 'Standard IoT summary with metrics and charts',
                layout: 'portrait',
                sections: ['cover', 'executive-summary', 'metrics', 'sensors', 'charts', 'footer']
            },
            'sensor-detailed': {
                name: 'Sensor Detailed Report',
                description: 'Detailed analysis of individual sensors',
                layout: 'portrait',
                sections: ['cover', 'sensor-info', 'readings-table', 'trends', 'statistics', 'footer']
            },
            'building-landscape': {
                name: 'Building Report (Landscape)',
                description: 'Wide-format building overview',
                layout: 'landscape',
                sections: ['header', 'building-overview', 'floor-metrics', 'energy-charts', 'footer']
            },
            'executive-summary': {
                name: 'Executive Summary',
                description: 'High-level overview with key metrics',
                layout: 'portrait',
                sections: ['cover', 'key-metrics', 'summary-text', 'recommendations']
            },
            'technical-detailed': {
                name: 'Technical Report',
                description: 'Comprehensive technical analysis',
                layout: 'portrait',
                sections: ['cover', 'toc', 'introduction', 'methodology', 'data', 'analysis', 'conclusions', 'appendix']
            }
        };
    }

    /**
     * Get the current configuration
     * @returns {Object} Current PDF configuration
     */
    getConfig() {
        const savedConfig = this.loadFromStorage();
        return { ...this.defaultConfig, ...savedConfig };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - Configuration updates
     */
    updateConfig(newConfig) {
        const currentConfig = this.getConfig();
        const updatedConfig = this.deepMerge(currentConfig, newConfig);
        this.saveToStorage(updatedConfig);
        return updatedConfig;
    }

    /**
     * Apply a theme
     * @param {string} themeName - Name of the theme to apply
     */
    applyTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`Theme "${themeName}" not found`);
            return false;
        }

        const theme = this.themes[themeName];
        return this.updateConfig({
            theme: themeName,
            colors: theme.colors
        });
    }

    /**
     * Apply a preset template
     * @param {string} presetName - Name of the preset to apply
     */
    applyPreset(presetName) {
        if (!this.presets[presetName]) {
            console.error(`Preset "${presetName}" not found`);
            return false;
        }

        const preset = this.presets[presetName];
        return this.updateConfig({
            layout: preset.layout,
            sections: preset.sections
        });
    }

    /**
     * Get all available themes
     * @returns {Object} Available themes
     */
    getThemes() {
        return this.themes;
    }

    /**
     * Get all available presets
     * @returns {Object} Available presets
     */
    getPresets() {
        return this.presets;
    }

    /**
     * Reset to default configuration
     */
    resetToDefault() {
        localStorage.removeItem('pdfConfig');
        return this.defaultConfig;
    }

    /**
     * Export configuration as JSON
     * @returns {string} JSON string of configuration
     */
    exportConfig() {
        const config = this.getConfig();
        return JSON.stringify(config, null, 2);
    }

    /**
     * Import configuration from JSON
     * @param {string} jsonConfig - JSON string of configuration
     */
    importConfig(jsonConfig) {
        try {
            const config = JSON.parse(jsonConfig);
            this.saveToStorage(config);
            return config;
        } catch (error) {
            console.error('Failed to import configuration:', error);
            return false;
        }
    }

    /**
     * Save configuration to localStorage
     * @private
     */
    saveToStorage(config) {
        try {
            localStorage.setItem('pdfConfig', JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            return false;
        }
    }

    /**
     * Load configuration from localStorage
     * @private
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('pdfConfig');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load configuration:', error);
            return {};
        }
    }

    /**
     * Deep merge two objects
     * @private
     */
    deepMerge(target, source) {
        const output = { ...target };

        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }

        return output;
    }

    /**
     * Check if value is an object
     * @private
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Validate configuration
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        // Validate theme
        if (config.theme && !this.themes[config.theme]) {
            errors.push(`Invalid theme: ${config.theme}`);
        }

        // Validate layout
        if (config.layout && !['portrait', 'landscape'].includes(config.layout)) {
            errors.push(`Invalid layout: ${config.layout}`);
        }

        // Validate page size
        if (config.pageSize && !['a4', 'letter', 'legal'].includes(config.pageSize)) {
            warnings.push(`Unsupported page size: ${config.pageSize}`);
        }

        // Validate margins
        if (config.margins) {
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                if (config.margins[side] < 0 || config.margins[side] > 50) {
                    errors.push(`Invalid margin for ${side}: ${config.margins[side]}`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get CSS variables for current theme
     * @returns {Object} CSS custom properties
     */
    getCSSVariables() {
        const config = this.getConfig();
        return {
            '--pdf-primary': config.colors.primary,
            '--pdf-secondary': config.colors.secondary,
            '--pdf-accent': config.colors.accent,
            '--pdf-success': config.colors.success,
            '--pdf-warning': config.colors.warning,
            '--pdf-danger': config.colors.danger
        };
    }

    /**
     * Apply configuration to a DOM element
     * @param {HTMLElement} element - Element to apply config to
     */
    applyToElement(element) {
        const config = this.getConfig();
        const cssVars = this.getCSSVariables();

        // Apply theme class
        element.setAttribute('data-pdf-theme', config.theme);
        element.classList.add(`pdf-layout-${config.layout}`);

        // Apply CSS variables
        Object.entries(cssVars).forEach(([property, value]) => {
            element.style.setProperty(property, value);
        });

        return element;
    }
}

// Create global instance
window.pdfConfig = new PDFConfig();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFConfig;
}
