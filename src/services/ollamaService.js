/**
 * Ollama Service
 * Client for interacting with Ollama API (Llama 3.1 8B and Qwen2.5-Coder 7B)
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';

class OllamaService {
  constructor() {
    this.baseUrl = config.ollama.host;
    this.enabled = config.ollama.enabled;
  }

  /**
   * Check if Ollama service is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    if (!this.enabled) {
      logger.warn('Ollama is disabled in configuration');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        logger.warn('Ollama service not responding', { status: response.status });
        return false;
      }

      const data = await response.json();
      logger.info('Ollama service available', { models: data.models?.length || 0 });
      return true;
    } catch (error) {
      logger.warn('Failed to connect to Ollama', { error: error.message });
      return false;
    }
  }

  /**
   * List available models
   * @returns {Promise<Array>}
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error('Failed to list Ollama models', { error: error.message });
      throw error;
    }
  }

  /**
   * Pull a model from Ollama registry
   * @param {string} modelName - Model name (e.g., 'llama3.1:8b', 'qwen2.5-coder:7b')
   * @returns {Promise<void>}
   */
  async pullModel(modelName) {
    try {
      logger.info(`Pulling Ollama model: ${modelName}`);

      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream response for progress (optional)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const progress = JSON.parse(line);
            if (progress.status) {
              logger.debug(`Pull progress: ${progress.status}`, {
                completed: progress.completed,
                total: progress.total
              });
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }

      logger.info(`Model pulled successfully: ${modelName}`);
    } catch (error) {
      logger.error(`Failed to pull model ${modelName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Generate completion using Ollama
   * @param {string} model - Model name
   * @param {string} prompt - Prompt text
   * @param {Object} options - Generation options
   * @returns {Promise<Object>}
   */
  async generate(model, prompt, options = {}) {
    const startTime = Date.now();

    try {
      logger.debug(`Generating with ${model}`, {
        promptLength: prompt.length,
        options
      });

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.1,
            top_p: options.top_p || 0.9,
            top_k: options.top_k || 40,
            num_predict: options.max_tokens || 2048,
            ...options
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      logger.info(`Generation completed`, {
        model,
        duration: `${duration}ms`,
        responseLength: data.response?.length || 0
      });

      return {
        response: data.response,
        model: data.model,
        done: data.done,
        context: data.context,
        total_duration: data.total_duration,
        load_duration: data.load_duration,
        prompt_eval_count: data.prompt_eval_count,
        eval_count: data.eval_count
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Generation failed`, {
        model,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Generate with chat format
   * @param {string} model - Model name
   * @param {Array} messages - Array of {role, content} messages
   * @param {Object} options - Generation options
   * @returns {Promise<Object>}
   */
  async chat(model, messages, options = {}) {
    const startTime = Date.now();

    try {
      logger.debug(`Chat generation with ${model}`, {
        messageCount: messages.length,
        options
      });

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: options.temperature || 0.1,
            top_p: options.top_p || 0.9,
            ...options
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      logger.info(`Chat completed`, {
        model,
        duration: `${duration}ms`,
        responseLength: data.message?.content?.length || 0
      });

      return {
        message: data.message,
        model: data.model,
        done: data.done,
        total_duration: data.total_duration,
        prompt_eval_count: data.prompt_eval_count,
        eval_count: data.eval_count
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Chat generation failed`, {
        model,
        error: error.message,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Health check for Ollama service
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      const available = await this.isAvailable();

      if (!available) {
        return {
          healthy: false,
          enabled: this.enabled,
          message: this.enabled ? 'Service not responding' : 'Service disabled'
        };
      }

      const models = await this.listModels();

      return {
        healthy: true,
        enabled: this.enabled,
        url: this.baseUrl,
        models: models.map(m => m.name),
        modelCount: models.length
      };
    } catch (error) {
      return {
        healthy: false,
        enabled: this.enabled,
        error: error.message
      };
    }
  }
}

export default new OllamaService();
