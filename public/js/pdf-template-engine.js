/**
 * PDF Template Engine
 * Renders PDF templates with dynamic data
 */

class PDFTemplateEngine {
    constructor(config = {}) {
        this.config = config;
        this.templates = {};
        this.partials = {};
        this.helpers = this.initHelpers();
    }

    /**
     * Initialize template helpers
     * @private
     */
    initHelpers() {
        return {
            formatDate: PDFUtils.formatDate,
            formatNumber: PDFUtils.formatNumber,
            formatPercentage: PDFUtils.formatPercentage,
            formatLargeNumber: PDFUtils.formatLargeNumber,
            truncate: PDFUtils.truncate,
            escapeHTML: PDFUtils.escapeHTML
        };
    }

    /**
     * Register a template
     * @param {string} name - Template name
     * @param {string} template - Template HTML string
     */
    registerTemplate(name, template) {
        this.templates[name] = template;
    }

    /**
     * Register a partial template
     * @param {string} name - Partial name
     * @param {string} partial - Partial HTML string
     */
    registerPartial(name, partial) {
        this.partials[name] = partial;
    }

    /**
     * Render a template with data
     * @param {string} templateName - Name of template to render
     * @param {Object} data - Data to inject into template
     * @returns {string} Rendered HTML
     */
    render(templateName, data) {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template "${templateName}" not found`);
        }

        return this.compile(template, data);
    }

    /**
     * Compile a template string with data
     * @param {string} template - Template string
     * @param {Object} data - Data object
     * @returns {string} Compiled HTML
     */
    compile(template, data) {
        let compiled = template;

        // Replace partials
        compiled = this.replacePartials(compiled, data);

        // Replace variables {{ variable }}
        compiled = this.replaceVariables(compiled, data);

        // Process conditionals {{#if condition}}...{{/if}}
        compiled = this.replaceConditionals(compiled, data);

        // Process loops {{#each items}}...{{/each}}
        compiled = this.replaceLoops(compiled, data);

        // Process helpers {{helper value}}
        compiled = this.replaceHelpers(compiled, data);

        return compiled;
    }

    /**
     * Replace partial templates
     * @private
     */
    replacePartials(template, data) {
        const partialRegex = /\{\{>\s*(\w+)\s*\}\}/g;
        return template.replace(partialRegex, (match, partialName) => {
            const partial = this.partials[partialName];
            if (!partial) {
                console.warn(`Partial "${partialName}" not found`);
                return '';
            }
            return this.compile(partial, data);
        });
    }

    /**
     * Replace variables in template
     * @private
     */
    replaceVariables(template, data) {
        const variableRegex = /\{\{\s*([^#\/\s>][^\}]*?)\s*\}\}/g;
        return template.replace(variableRegex, (match, path) => {
            const value = this.getNestedValue(data, path.trim());
            return value !== undefined ? value : '';
        });
    }

    /**
     * Replace conditional blocks
     * @private
     */
    replaceConditionals(template, data) {
        const ifRegex = /\{\{#if\s+([^\}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

        return template.replace(ifRegex, (match, condition, trueBlock, falseBlock) => {
            const value = this.getNestedValue(data, condition.trim());
            const isTrue = this.isTruthy(value);

            if (isTrue) {
                return this.compile(trueBlock, data);
            } else if (falseBlock) {
                return this.compile(falseBlock, data);
            }
            return '';
        });
    }

    /**
     * Replace loop blocks
     * @private
     */
    replaceLoops(template, data) {
        const eachRegex = /\{\{#each\s+([^\}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

        return template.replace(eachRegex, (match, arrayPath, loopTemplate) => {
            const array = this.getNestedValue(data, arrayPath.trim());

            if (!Array.isArray(array) || array.length === 0) {
                return '';
            }

            return array.map((item, index) => {
                const loopData = {
                    ...data,
                    this: item,
                    index,
                    first: index === 0,
                    last: index === array.length - 1
                };
                return this.compile(loopTemplate, loopData);
            }).join('');
        });
    }

    /**
     * Replace helper functions
     * @private
     */
    replaceHelpers(template, data) {
        const helperRegex = /\{\{(\w+)\s+([^\}]+)\}\}/g;

        return template.replace(helperRegex, (match, helperName, args) => {
            const helper = this.helpers[helperName];
            if (!helper) {
                return match;
            }

            const argValues = args.split(/\s+/).map(arg => {
                // If arg is quoted string, return the string
                if (/^["'].*["']$/.test(arg)) {
                    return arg.slice(1, -1);
                }
                // Otherwise, treat as variable path
                return this.getNestedValue(data, arg);
            });

            try {
                return helper(...argValues);
            } catch (error) {
                console.error(`Helper "${helperName}" error:`, error);
                return '';
            }
        });
    }

    /**
     * Get nested value from object by path
     * @private
     */
    getNestedValue(obj, path) {
        if (!path) return undefined;

        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value === null || value === undefined) {
                return undefined;
            }
            value = value[key];
        }

        return value;
    }

    /**
     * Check if value is truthy
     * @private
     */
    isTruthy(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return !!value;
    }

    /**
     * Create standard IoT report template
     * @returns {string} Template HTML
     */
    static createIoTSummaryTemplate() {
        return `
        <div class="pdf-container pdf-layout-{{layout}}">
            <div class="pdf-page">
                <!-- Header -->
                <header class="pdf-header">
                    {{#if logoUrl}}
                    <img src="{{logoUrl}}" alt="Logo" class="pdf-header-logo">
                    {{/if}}
                    <div class="pdf-header-content">
                        <h1 class="pdf-header-title">{{reportTitle}}</h1>
                        <p class="pdf-header-subtitle">{{reportSubtitle}}</p>
                    </div>
                </header>

                <main class="pdf-content">
                    <section class="pdf-section">
                        <div class="pdf-metadata">
                            <div class="pdf-metadata-item">
                                <span class="pdf-metadata-label">Reporting Period</span>
                                <span class="pdf-metadata-value">{{period}}</span>
                            </div>
                            <div class="pdf-metadata-item">
                                <span class="pdf-metadata-label">Last Updated</span>
                                <span class="pdf-metadata-value">{{lastUpdated}}</span>
                            </div>
                            <div class="pdf-metadata-item">
                                <span class="pdf-metadata-label">Sensors Monitored</span>
                                <span class="pdf-metadata-value">{{sensorCoverage}}</span>
                            </div>
                            <div class="pdf-metadata-item">
                                <span class="pdf-metadata-label">Locations</span>
                                <span class="pdf-metadata-value">{{locationCoverage}}</span>
                            </div>
                        </div>
                    </section>

                    {{#if showSummary}}
                    <section class="pdf-section">
                        <div class="pdf-card pdf-card-highlight">
                            <div class="pdf-card-header">Executive Summary</div>
                            <div class="pdf-card-body">
                                <p>{{summary}}</p>
                            </div>
                        </div>
                    </section>
                    {{/if}}

                    {{#if metrics}}
                    <section class="pdf-section">
                        <h2 class="pdf-h2">Key Metrics</h2>
                        <div class="pdf-grid pdf-grid-4">
                            {{#each metrics}}
                            <div class="pdf-metric">
                                <div class="pdf-metric-label">{{this.label}}</div>
                                <div class="pdf-metric-value">
                                    {{formatNumber this.value this.decimals this.unit}}
                                </div>
                                {{#if this.change}}
                                <div class="pdf-metric-change {{#if this.changePositive}}pdf-metric-change-positive{{else}}pdf-metric-change-negative{{/if}}">
                                    {{this.change}}
                                </div>
                                {{/if}}
                            </div>
                            {{/each}}
                        </div>
                    </section>
                    {{/if}}

                    {{#if insights}}
                    <section class="pdf-section">
                        <h2 class="pdf-h2">Operational Insights</h2>
                        <div class="pdf-grid pdf-grid-2">
                            {{#each insights}}
                            <div class="pdf-card">
                                <div class="pdf-card-header">{{this.title}}</div>
                                <div class="pdf-card-body">
                                    <p>{{this.detail}}</p>
                                </div>
                            </div>
                            {{/each}}
                        </div>
                    </section>
                    {{/if}}

                    {{#if sensors}}
                    <section class="pdf-section">
                        <h2 class="pdf-h2">Sensor Status</h2>
                        <div class="pdf-card">
                            <div class="pdf-card-body">
                                <table class="pdf-table pdf-table-striped pdf-table-compact">
                                    <thead>
                                        <tr>
                                            <th>Sensor</th>
                                            <th>Type</th>
                                            <th>Location</th>
                                            <th>Reading</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {{#each sensors}}
                                        <tr>
                                            <td>{{this.name}}</td>
                                            <td>{{this.type}}</td>
                                            <td>{{this.location}}</td>
                                            <td>{{formatNumber this.value 1 this.unit}}</td>
                                            <td>
                                                <span class="pdf-status pdf-status-{{this.statusClass}}">
                                                    <span class="pdf-status-dot"></span>
                                                    {{this.status}}
                                                </span>
                                            </td>
                                        </tr>
                                        {{/each}}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                    {{/if}}

                    {{#if alerts}}
                    <section class="pdf-section">
                        <h2 class="pdf-h2">Active Alerts</h2>
                        {{#each alerts}}
                        <div class="pdf-info-box pdf-info-box-{{this.severity}}">
                            <strong>{{this.label}}</strong> — {{this.description}}
                        </div>
                        {{/each}}
                    </section>
                    {{/if}}

                    <section class="pdf-section">
                        <h2 class="pdf-h2">Trend Preview</h2>
                        <div class="pdf-chart-container">
                            <div class="pdf-chart-title">7-Day Performance</div>
                            <div class="pdf-chart-placeholder">
                                Chart rendering with live data in full report
                            </div>
                        </div>
                    </section>
                </main>

                <!-- Footer -->
                <footer class="pdf-footer">
                    <div class="pdf-footer-content">
                        <div class="pdf-footer-left">{{footerText}}</div>
                        <div class="pdf-footer-right">{{formatDate date 'datetime'}}</div>
                    </div>
                </footer>
            </div>
        </div>
        `;
    }

    /**
     * Create sensor detailed report template
     * @returns {string} Template HTML
     */
    static createSensorDetailedTemplate() {
        return `
        <div class="pdf-container pdf-layout-{{layout}}">
            <div class="pdf-page">
                <!-- Header -->
                <header class="pdf-header">
                    {{#if logoUrl}}
                    <img src="{{logoUrl}}" alt="Logo" class="pdf-header-logo">
                    {{/if}}
                    <div class="pdf-header-content">
                        <h1 class="pdf-header-title">Sensor Detailed Report</h1>
                        <p class="pdf-header-subtitle">{{sensorName}} ({{sensorType}})</p>
                    </div>
                </header>

                <!-- Footer -->
                <footer class="pdf-footer">
                    <div class="pdf-footer-content">
                        <div class="pdf-footer-left">{{footerText}}</div>
                        <div class="pdf-footer-right">{{formatDate date 'datetime'}}</div>
                    </div>
                </footer>
            </div>
        </div>
        `;
    }
}

// Export template engine
window.PDFTemplateEngine = PDFTemplateEngine;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFTemplateEngine;
}
