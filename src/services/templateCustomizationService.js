/**
 * Template Customization Service
 * Handles template uploads, customization, and storage
 */

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TemplateCustomizationService {
  constructor() {
    this.uploadDir = join(__dirname, '../../uploads/templates');
    this.configPath = join(__dirname, '../../config/template-customizations.json');
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedExtensions = ['.svg', '.SVG'];
    this.customizations = new Map();
  }

  /**
   * Initialize service and create directories
   */
  async initialize() {
    try {
      // Create upload directory
      if (!existsSync(this.uploadDir)) {
        await mkdir(this.uploadDir, { recursive: true });
      }

      // Create config directory
      const configDir = dirname(this.configPath);
      if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
      }

      // Load existing customizations
      await this.loadCustomizations();

      logger.info('Template customization service initialized');
    } catch (error) {
      logger.error('Failed to initialize template service', { error: error.message });
      throw error;
    }
  }

  /**
   * Load customizations from file
   */
  async loadCustomizations() {
    try {
      if (existsSync(this.configPath)) {
        const data = await readFile(this.configPath, 'utf-8');
        const configs = JSON.parse(data);

        for (const [name, config] of Object.entries(configs)) {
          this.customizations.set(name, config);
        }

        logger.info('Template customizations loaded', {
          count: this.customizations.size
        });
      }
    } catch (error) {
      logger.error('Failed to load customizations', { error: error.message });
    }
  }

  /**
   * Save customizations to file
   */
  async saveCustomizations() {
    try {
      const configObj = {};
      for (const [name, config] of this.customizations) {
        configObj[name] = config;
      }

      await writeFile(this.configPath, JSON.stringify(configObj, null, 2));
      logger.debug('Template customizations saved');
    } catch (error) {
      logger.error('Failed to save customizations', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Uploaded file object
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];

    // Check file exists
    if (!file || !file.buffer) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file extension
    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      errors.push(`Invalid file type. Allowed: ${this.allowedExtensions.join(', ')}`);
    }

    // Validate SVG content
    if (file.buffer) {
      const content = file.buffer.toString('utf-8');
      if (!content.includes('<svg') || !content.includes('</svg>')) {
        errors.push('Invalid SVG file format');
      }

      // Check for potentially dangerous content
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i, // onclick, onload, etc.
        /<iframe/i,
        /<embed/i,
        /<object/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
          errors.push('SVG contains potentially unsafe content');
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Upload and save SVG file
   * @param {Object} file - Uploaded file
   * @param {string} type - 'header' or 'footer'
   * @param {string} templateName - Template name
   * @returns {Promise<Object>} Upload result
   */
  async uploadSvg(file, type, templateName = 'default') {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Generate filename
      const timestamp = Date.now();
      const filename = `${templateName}-${type}-${timestamp}.svg`;
      const filepath = join(this.uploadDir, filename);

      // Save file
      await writeFile(filepath, file.buffer);

      // Get file info
      const stats = {
        filename,
        filepath,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        type
      };

      logger.info('SVG file uploaded', { filename, type, size: file.size });

      return {
        success: true,
        file: stats
      };
    } catch (error) {
      logger.error('Failed to upload SVG', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save template customization
   * @param {string} name - Template name
   * @param {Object} customization - Customization settings
   */
  async saveCustomization(name, customization) {
    try {
      // Validate customization
      this.validateCustomization(customization);

      // Add metadata
      const config = {
        ...customization,
        name,
        updatedAt: new Date().toISOString(),
        version: (this.customizations.get(name)?.version || 0) + 1
      };

      // Save to map
      this.customizations.set(name, config);

      // Save to file
      await this.saveCustomizations();

      logger.info('Template customization saved', { name, version: config.version });

      return {
        success: true,
        message: 'Template customization saved',
        customization: config
      };
    } catch (error) {
      logger.error('Failed to save customization', { error: error.message });
      throw error;
    }
  }

  /**
   * Get template customization
   * @param {string} name - Template name
   * @returns {Object} Customization config
   */
  getCustomization(name) {
    return this.customizations.get(name) || this.getDefaultCustomization();
  }

  /**
   * List all customizations
   * @returns {Array} List of customizations
   */
  listCustomizations() {
    const list = [];
    for (const [name, config] of this.customizations) {
      list.push({
        name,
        version: config.version,
        updatedAt: config.updatedAt,
        hasHeader: !!config.header,
        hasFooter: !!config.footer
      });
    }
    return list;
  }

  /**
   * Delete customization
   * @param {string} name - Template name
   */
  async deleteCustomization(name) {
    if (!this.customizations.has(name)) {
      throw new Error(`Customization '${name}' not found`);
    }

    // Get config to delete files
    const config = this.customizations.get(name);

    // Delete uploaded files
    if (config.header?.uploadedFile) {
      try {
        await unlink(join(this.uploadDir, config.header.uploadedFile));
      } catch (err) {
        logger.warn('Failed to delete header file', { error: err.message });
      }
    }

    if (config.footer?.uploadedFile) {
      try {
        await unlink(join(this.uploadDir, config.footer.uploadedFile));
      } catch (err) {
        logger.warn('Failed to delete footer file', { error: err.message });
      }
    }

    // Remove from map
    this.customizations.delete(name);

    // Save changes
    await this.saveCustomizations();

    logger.info('Template customization deleted', { name });
  }

  /**
   * Get default customization
   * @returns {Object} Default config
   */
  getDefaultCustomization() {
    return {
      name: 'default',
      header: {
        backgroundColor: '#2563eb',
        textColor: '#ffffff',
        title: 'IoT Report',
        subtitle: 'Sensor Analytics',
        showDate: true,
        showLogo: true,
        height: 120
      },
      footer: {
        backgroundColor: '#ffffff',
        textColor: '#6b7280',
        text: 'Generated by IoT Report Utils',
        showTimestamp: true,
        showPageNumber: false,
        height: 60
      },
      colors: {
        primary: '#2563eb',
        secondary: '#10b981',
        accent: '#f59e0b',
        text: '#1a1a1a'
      }
    };
  }

  /**
   * Validate customization object
   * @private
   */
  validateCustomization(customization) {
    // Validate color formats
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;

    if (customization.header?.backgroundColor && !colorRegex.test(customization.header.backgroundColor)) {
      throw new Error('Invalid header background color format');
    }

    if (customization.header?.textColor && !colorRegex.test(customization.header.textColor)) {
      throw new Error('Invalid header text color format');
    }

    if (customization.footer?.backgroundColor && !colorRegex.test(customization.footer.backgroundColor)) {
      throw new Error('Invalid footer background color format');
    }

    if (customization.footer?.textColor && !colorRegex.test(customization.footer.textColor)) {
      throw new Error('Invalid footer text color format');
    }

    // Validate height ranges
    if (customization.header?.height && (customization.header.height < 60 || customization.header.height > 300)) {
      throw new Error('Header height must be between 60 and 300 pixels');
    }

    if (customization.footer?.height && (customization.footer.height < 40 || customization.footer.height > 200)) {
      throw new Error('Footer height must be between 40 and 200 pixels');
    }
  }

  /**
   * Apply customization to SVG template
   * @param {string} svgContent - Original SVG content
   * @param {Object} customization - Customization settings
   * @returns {string} Modified SVG
   */
  applyCustomization(svgContent, customization) {
    let result = svgContent;

    // Apply header customizations
    if (customization.header) {
      const header = customization.header;

      // Replace colors
      if (header.backgroundColor) {
        result = result.replace(/{{header_background_color}}/g, header.backgroundColor);
      }
      if (header.textColor) {
        result = result.replace(/{{header_text_color}}/g, header.textColor);
      }

      // Replace text
      if (header.title) {
        result = result.replace(/{{header_title}}/g, this.escapeXml(header.title));
      }
      if (header.subtitle) {
        result = result.replace(/{{header_subtitle}}/g, this.escapeXml(header.subtitle));
      }
    }

    // Apply footer customizations
    if (customization.footer) {
      const footer = customization.footer;

      if (footer.backgroundColor) {
        result = result.replace(/{{footer_background_color}}/g, footer.backgroundColor);
      }
      if (footer.textColor) {
        result = result.replace(/{{footer_text_color}}/g, footer.textColor);
      }
      if (footer.text) {
        result = result.replace(/{{footer_text}}/g, this.escapeXml(footer.text));
      }
    }

    // Apply color scheme
    if (customization.colors) {
      const colors = customization.colors;
      if (colors.primary) {
        result = result.replace(/{{color_primary}}/g, colors.primary);
      }
      if (colors.secondary) {
        result = result.replace(/{{color_secondary}}/g, colors.secondary);
      }
      if (colors.accent) {
        result = result.replace(/{{color_accent}}/g, colors.accent);
      }
    }

    return result;
  }

  /**
   * Escape XML special characters
   * @private
   */
  escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get uploaded SVG content
   * @param {string} filename - Uploaded file name
   * @returns {Promise<string>} SVG content
   */
  async getUploadedSvg(filename) {
    try {
      const filepath = join(this.uploadDir, filename);
      const content = await readFile(filepath, 'utf-8');
      return content;
    } catch (error) {
      logger.error('Failed to read uploaded SVG', { error: error.message, filename });
      throw error;
    }
  }
}

export default new TemplateCustomizationService();
