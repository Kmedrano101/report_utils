/**
 * PDF Generator Module
 * Coordinates PDF generation using templates and configuration
 */

class PDFGenerator {
    constructor() {
        this.config = window.pdfConfig;
        this.templateEngine = new PDFTemplateEngine();
        this.initialized = false;

        this.init();
    }

    /**
     * Initialize PDF generator
     */
    init() {
        // Register default templates
        this.templateEngine.registerTemplate(
            'iot-summary',
            PDFTemplateEngine.createIoTSummaryTemplate()
        );
        this.templateEngine.registerTemplate(
            'sensor-detailed',
            PDFTemplateEngine.createSensorDetailedTemplate()
        );

        this.initialized = true;
    }

    /**
     * Generate PDF report
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generation result
     */
    async generate(options = {}) {
        if (!this.initialized) {
            throw new Error('PDF Generator not initialized');
        }

        const {
            template = 'iot-summary',
            data = {},
            filename = 'report.pdf',
            format = 'pdf',
            download = true
        } = options;
        const activeLanguage = window.LanguageManager?.getLanguage?.() || 'es';

        try {
            // Get current configuration
            const config = this.config.getConfig();

            // Merge config into data
            const logoUrl = config.logo?.enabled && config.logo.url
                ? (config.logo.url.startsWith('http') ? config.logo.url : `${window.location.origin}${config.logo.url}`)
                : null;

            const templateData = {
                ...data,
                layout: config.layout,
                theme: config.theme,
                footerText: config.footer.text || 'Madison - IoT Report',
                logoUrl: logoUrl,
                date: new Date(),
                language: activeLanguage
            };

            // Render HTML from template
            const html = this.templateEngine.render(template, templateData);

            // Apply configuration styling
            const styledHTML = this.applyConfiguration(html, config);

            if (format === 'html') {
                // Return HTML directly
                if (download) {
                    this.downloadHTML(styledHTML, filename.replace('.pdf', '.html'));
                }
                return {
                    success: true,
                    format: 'html',
                    html: styledHTML
                };
            }

            // For PDF, send to backend API
            const pdfBlob = await this.generatePDFFromHTML(styledHTML, config, activeLanguage);

            if (download) {
                this.downloadPDF(pdfBlob, filename);
            }

            return {
                success: true,
                format: 'pdf',
                blob: pdfBlob,
                size: pdfBlob.size
            };

        } catch (error) {
            console.error('PDF generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Apply configuration to HTML
     * @private
     */
    applyConfiguration(html, config) {
        const cssVars = this.config.getCSSVariables();
        const htmlLang = window.LanguageManager?.getLanguage?.() || 'es';
        const origin = window.location.origin;

        const styleBlock = `
        <style>
            :root {
                ${Object.entries(cssVars).map(([key, value]) => `${key}: ${value};`).join('\n                ')}
            }
        </style>
        `;

        // Wrap HTML with full page structure using absolute URLs
        const fullHTML = `
        <!DOCTYPE html>
        <html lang="${htmlLang}" data-pdf-theme="${config.theme}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PDF Report</title>
            <link rel="stylesheet" href="${origin}/css/pdf-colors.css">
            <link rel="stylesheet" href="${origin}/css/pdf-layout.css">
            <link rel="stylesheet" href="${origin}/css/pdf-typography.css">
            <link rel="stylesheet" href="${origin}/css/pdf-components.css">
            ${styleBlock}
        </head>
        <body>
            ${html}
        </body>
        </html>
        `;

        return fullHTML;
    }

    /**
     * Generate PDF from HTML via backend API
     * @private
     */
    async generatePDFFromHTML(html, config, languageOverride) {
        const selectedLanguage = languageOverride || window.LanguageManager?.getLanguage?.() || 'es';
        const payload = {
            html,
            options: {
                format: config.pageSize || 'A4',
                landscape: config.layout === 'landscape',
                margin: config.margins || { top: 20, right: 20, bottom: 20, left: 20 }
            },
            language: selectedLanguage
        };

        let requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        };

        if (window.LanguageManager?.applyLanguageToRequest) {
            requestOptions = window.LanguageManager.applyLanguageToRequest(requestOptions);
        }

        const response = await fetch('/api/reports/generate-pdf', requestOptions);

        if (!response.ok) {
            throw new Error('PDF generation failed on server');
        }

        return await response.blob();
    }

    /**
     * Download PDF blob
     * @private
     */
    downloadPDF(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Download HTML
     * @private
     */
    downloadHTML(html, filename) {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Preview report in new window
     * @param {Object} options - Generation options
     */
    async preview(options = {}) {
        const result = await this.generate({
            ...options,
            format: 'html',
            download: false
        });

        if (result.success) {
            const previewWindow = window.open('', '_blank');
            previewWindow.document.write(result.html);
            previewWindow.document.close();
        }

        return result;
    }

    /**
     * Generate IoT summary report
     * @param {Object} data - Report data
     * @param {Object} options - Generation options
     */
    async generateIoTSummary(data, options = {}) {
        return this.generate({
            template: 'iot-summary',
            data,
            filename: `iot-summary-${PDFUtils.formatDate(new Date(), 'iso')}.pdf`,
            ...options
        });
    }

    /**
     * Generate sensor detailed report
     * @param {Object} data - Sensor data
     * @param {Object} options - Generation options
     */
    async generateSensorDetailed(data, options = {}) {
        return this.generate({
            template: 'sensor-detailed',
            data,
            filename: `sensor-${data.sensorCode}-${PDFUtils.formatDate(new Date(), 'iso')}.pdf`,
            ...options
        });
    }

    /**
     * Register custom template
     * @param {string} name - Template name
     * @param {string} template - Template HTML
     */
    registerTemplate(name, template) {
        this.templateEngine.registerTemplate(name, template);
    }

    /**
     * Register custom partial
     * @param {string} name - Partial name
     * @param {string} partial - Partial HTML
     */
    registerPartial(name, partial) {
        this.templateEngine.registerPartial(name, partial);
    }

    /**
     * Get template engine instance
     * @returns {PDFTemplateEngine}
     */
    getTemplateEngine() {
        return this.templateEngine;
    }

    /**
     * Get configuration instance
     * @returns {PDFConfig}
     */
    getConfig() {
        return this.config;
    }

    /**
     * Update configuration
     * @param {Object} newConfig - Configuration updates
     */
    updateConfig(newConfig) {
        return this.config.updateConfig(newConfig);
    }

    /**
     * Apply theme
     * @param {string} themeName - Theme name
     */
    applyTheme(themeName) {
        return this.config.applyTheme(themeName);
    }

    /**
     * Apply preset
     * @param {string} presetName - Preset name
     */
    applyPreset(presetName) {
        return this.config.applyPreset(presetName);
    }

    /**
     * Export current configuration
     * @returns {string} JSON configuration
     */
    exportConfig() {
        return this.config.exportConfig();
    }

    /**
     * Import configuration
     * @param {string} jsonConfig - JSON configuration string
     */
    importConfig(jsonConfig) {
        return this.config.importConfig(jsonConfig);
    }
}

// Create global instance
window.pdfGenerator = new PDFGenerator();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
