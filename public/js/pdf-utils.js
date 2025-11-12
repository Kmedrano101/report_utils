/**
 * PDF Utilities Module
 * Common utility functions for PDF generation and manipulation
 */

const PDFUtils = {
    /**
     * Format date to readable string
     * @param {Date|string} date - Date to format
     * @param {string} format - Format type ('short', 'long', 'iso')
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'long') {
        const d = date instanceof Date ? date : new Date(date);

        switch (format) {
            case 'short':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'iso':
                return d.toISOString().split('T')[0];
            case 'datetime':
                return d.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            default:
                return d.toLocaleDateString();
        }
    },

    /**
     * Format number with units
     * @param {number} value - Number to format
     * @param {number} decimals - Number of decimal places
     * @param {string} unit - Unit suffix
     * @returns {string} Formatted number
     */
    formatNumber(value, decimals = 2, unit = '') {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        const formatted = Number(value).toFixed(decimals);
        return unit ? `${formatted} ${unit}` : formatted;
    },

    /**
     * Format large numbers with suffixes (K, M, B)
     * @param {number} value - Number to format
     * @returns {string} Formatted number
     */
    formatLargeNumber(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        const absValue = Math.abs(value);
        if (absValue >= 1e9) {
            return (value / 1e9).toFixed(2) + 'B';
        } else if (absValue >= 1e6) {
            return (value / 1e6).toFixed(2) + 'M';
        } else if (absValue >= 1e3) {
            return (value / 1e3).toFixed(2) + 'K';
        }
        return value.toFixed(2);
    },

    /**
     * Format percentage
     * @param {number} value - Value to format (0-100 or 0-1)
     * @param {boolean} isDecimal - Whether value is decimal (0-1)
     * @returns {string} Formatted percentage
     */
    formatPercentage(value, isDecimal = false) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        const percent = isDecimal ? value * 100 : value;
        return `${percent.toFixed(2)}%`;
    },

    /**
     * Calculate percentage change
     * @param {number} oldValue - Previous value
     * @param {number} newValue - Current value
     * @returns {Object} Change amount and percentage
     */
    calculateChange(oldValue, newValue) {
        if (!oldValue || oldValue === 0) {
            return { amount: newValue, percentage: 100, isIncrease: newValue > 0 };
        }

        const amount = newValue - oldValue;
        const percentage = (amount / oldValue) * 100;

        return {
            amount,
            percentage: Math.abs(percentage),
            isIncrease: amount > 0,
            formatted: `${amount > 0 ? '+' : ''}${percentage.toFixed(2)}%`
        };
    },

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Sanitize HTML content
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },

    /**
     * Escape special characters for HTML
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Convert data to CSV format
     * @param {Array} data - Array of objects
     * @param {Array} headers - Column headers
     * @returns {string} CSV string
     */
    toCSV(data, headers = null) {
        if (!data || data.length === 0) return '';

        const cols = headers || Object.keys(data[0]);
        const csvHeaders = cols.join(',');

        const csvRows = data.map(row => {
            return cols.map(col => {
                const value = row[col];
                // Escape commas and quotes
                return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                    ? `"${value.replace(/"/g, '""')}"`
                    : value;
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    },

    /**
     * Calculate statistics for a dataset
     * @param {Array<number>} data - Array of numbers
     * @returns {Object} Statistical measures
     */
    calculateStats(data) {
        if (!data || data.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, sum: 0 };
        }

        const sorted = [...data].sort((a, b) => a - b);
        const sum = data.reduce((acc, val) => acc + val, 0);
        const mean = sum / data.length;
        const median = data.length % 2 === 0
            ? (sorted[data.length / 2 - 1] + sorted[data.length / 2]) / 2
            : sorted[Math.floor(data.length / 2)];

        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean,
            median,
            sum,
            count: data.length
        };
    },

    /**
     * Group data by a key
     * @param {Array} data - Array of objects
     * @param {string} key - Key to group by
     * @returns {Object} Grouped data
     */
    groupBy(data, key) {
        return data.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    },

    /**
     * Sort array of objects by key
     * @param {Array} data - Array to sort
     * @param {string} key - Key to sort by
     * @param {string} order - 'asc' or 'desc'
     * @returns {Array} Sorted array
     */
    sortBy(data, key, order = 'asc') {
        return [...data].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    },

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @param {string} suffix - Suffix to add (default: '...')
     * @returns {string} Truncated text
     */
    truncate(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    },

    /**
     * Convert RGB to Hex color
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {string} Hex color code
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    /**
     * Convert Hex to RGB color
     * @param {string} hex - Hex color code
     * @returns {Object} RGB values
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    /**
     * Lighten a color
     * @param {string} hex - Hex color code
     * @param {number} percent - Percentage to lighten (0-100)
     * @returns {string} Lightened hex color
     */
    lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const amount = Math.round(2.55 * percent);
        const r = Math.min(255, rgb.r + amount);
        const g = Math.min(255, rgb.g + amount);
        const b = Math.min(255, rgb.b + amount);

        return this.rgbToHex(r, g, b);
    },

    /**
     * Darken a color
     * @param {string} hex - Hex color code
     * @param {number} percent - Percentage to darken (0-100)
     * @returns {string} Darkened hex color
     */
    darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;

        const amount = Math.round(2.55 * percent);
        const r = Math.max(0, rgb.r - amount);
        const g = Math.max(0, rgb.g - amount);
        const b = Math.max(0, rgb.b - amount);

        return this.rgbToHex(r, g, b);
    },

    /**
     * Download content as file
     * @param {string} content - File content
     * @param {string} filename - Name of file
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
        }
        return clonedObj;
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Export utilities
window.PDFUtils = PDFUtils;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFUtils;
}
