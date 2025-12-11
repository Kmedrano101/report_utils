/**
 * PDF Generation Service
 * Handles PDF generation from HTML/SVG using Puppeteer
 */

import puppeteer from 'puppeteer';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PdfGenerationService {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Puppeteer browser instance
   */
  async initialize() {
    if (this.isInitialized && this.browser) {
      return this.browser;
    }

    try {
      const launchOptions = {
        headless: config.puppeteer.headless,
        args: config.puppeteer.args
      };

      // Use custom executable path if provided
      if (config.puppeteer.executablePath) {
        launchOptions.executablePath = config.puppeteer.executablePath;
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.isInitialized = true;

      logger.info('Puppeteer browser initialized', {
        headless: config.puppeteer.headless,
        version: await this.browser.version()
      });

      // Handle browser disconnect
      this.browser.on('disconnected', () => {
        logger.warn('Puppeteer browser disconnected');
        this.isInitialized = false;
        this.browser = null;
      });

      return this.browser;
    } catch (error) {
      logger.error('Failed to initialize Puppeteer', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate PDF from HTML content
   * @param {string} htmlContent - HTML content to convert
   * @param {Object} options - PDF generation options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePdfFromHtml(htmlContent, options = {}) {
    const startTime = Date.now();

    try {
      // Ensure browser is initialized
      if (!this.browser || !this.isInitialized) {
        await this.initialize();
      }

      // Create new page
      const page = await this.browser.newPage();

      try {
        // Set viewport for consistent rendering
        await page.setViewport({
          width: 1200,
          height: 1600,
          deviceScaleFactor: 2
        });

        // Set content and wait for rendering
        await page.setContent(htmlContent, {
          waitUntil: ['load', 'networkidle0'],
          timeout: config.puppeteer.timeout
        });

        // Wait for render-complete marker (similar to maps-are-loaded in treeads-report)
        try {
          await page.waitForSelector('#render-complete', {
            timeout: options.renderTimeout || 20000 // Increased to 20000ms to handle large date ranges with many data points
          });
          logger.debug('Render complete marker detected');
        } catch (err) {
          logger.warn('Render complete marker not found, proceeding anyway', { timeout: options.renderTimeout || 20000 });
        }

        // Additional wait for dynamic content
        await page.evaluateHandle('document.fonts.ready');

        // Generate PDF
        const pdfOptions = {
          format: options.format || 'A4',
          landscape: options.landscape || false,
          printBackground: true,
          preferCSSPageSize: true,
          margin: options.margin || {
            top: '0mm',
            right: '0mm',
            bottom: '0mm',
            left: '0mm'
          },
          ...options.pdfOptions
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        const duration = Date.now() - startTime;
        const sizeKB = (pdfBuffer.length / 1024).toFixed(2);

        logger.info('PDF generated successfully', {
          duration: `${duration}ms`,
          size: `${sizeKB} KB`,
          pages: options.format || 'A4'
        });

        // Check if PDF size exceeds limit
        if (pdfBuffer.length > config.report.maxSizeBytes) {
          logger.warn('Generated PDF exceeds size limit', {
            size: `${sizeKB} KB`,
            limit: `${config.report.maxSizeMB} MB`
          });
        }

        return pdfBuffer;
      } finally {
        // Always close the page
        await page.close();
      }
    } catch (error) {
      logger.error('PDF generation failed', {
        error: error.message,
        duration: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }

  /**
   * Generate PDF and save to file
   * @param {string} htmlContent - HTML content
   * @param {string} outputPath - Output file path
   * @param {Object} options - PDF options
   * @returns {Promise<Object>} File info
   */
  async generateAndSavePdf(htmlContent, outputPath, options = {}) {
    try {
      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // Generate PDF
      const pdfBuffer = await this.generatePdfFromHtml(htmlContent, options);

      // Save to file
      await writeFile(outputPath, pdfBuffer);

      const sizeKB = (pdfBuffer.length / 1024).toFixed(2);

      logger.info('PDF saved to file', {
        path: outputPath,
        size: `${sizeKB} KB`
      });

      return {
        path: outputPath,
        size: pdfBuffer.length,
        sizeKB: parseFloat(sizeKB)
      };
    } catch (error) {
      logger.error('Failed to save PDF', {
        error: error.message,
        outputPath
      });
      throw error;
    }
  }

  /**
   * Take screenshot of HTML content
   * @param {string} htmlContent - HTML content
   * @param {Object} options - Screenshot options
   * @returns {Promise<Buffer>} Screenshot buffer
   */
  async generateScreenshot(htmlContent, options = {}) {
    try {
      if (!this.browser || !this.isInitialized) {
        await this.initialize();
      }

      const page = await this.browser.newPage();

      try {
        await page.setViewport({
          width: options.width || 1200,
          height: options.height || 1600,
          deviceScaleFactor: 2
        });

        await page.setContent(htmlContent, {
          waitUntil: ['load', 'networkidle0'],
          timeout: config.puppeteer.timeout
        });

        const screenshot = await page.screenshot({
          type: options.type || 'png',
          fullPage: options.fullPage !== false
        });

        logger.debug('Screenshot generated', {
          type: options.type || 'png',
          size: `${(screenshot.length / 1024).toFixed(2)} KB`
        });

        return screenshot;
      } finally {
        await page.close();
      }
    } catch (error) {
      logger.error('Screenshot generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get browser health status
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      if (!this.browser || !this.isInitialized) {
        return {
          healthy: false,
          message: 'Browser not initialized'
        };
      }

      const version = await this.browser.version();

      return {
        healthy: true,
        initialized: this.isInitialized,
        version,
        pages: (await this.browser.pages()).length
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Close browser and cleanup
   */
  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.isInitialized = false;
        this.browser = null;
        logger.info('Puppeteer browser closed');
      } catch (error) {
        logger.error('Error closing browser', { error: error.message });
      }
    }
  }

  /**
   * Restart browser instance
   */
  async restart() {
    logger.info('Restarting Puppeteer browser');
    await this.close();
    await this.initialize();
  }
}

export default new PdfGenerationService();
