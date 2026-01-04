import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface LLMResponse {
  content: string;
  model: string;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly ollamaHost = 'http://127.0.0.1:11434'; // Use IPv4 explicitly
  private readonly model = 'llama3.2:latest'; // Using smaller, faster model (3.2B vs 8.0B)
  private readonly httpClient = axios.create({
    baseURL: this.ollamaHost,
    timeout: 120000, // 120 seconds (2 minutes) for LLM processing
  });

  constructor() {
    this.logger.log(`LLM Service initialized with model: ${this.model}`);
  }

  /**
   * Generate a response from the LLM
   */
  async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    try {
      this.logger.debug(`Generating LLM response for prompt: ${prompt.substring(0, 100)}...`);

      // Build the full prompt with system prompt if provided
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`;
      }

      const startTime = Date.now();

      const response = await this.httpClient.post('/api/generate', {
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 500, // Limit response length for faster generation
        },
      });

      const duration = Date.now() - startTime;
      this.logger.debug(`LLM response generated successfully in ${duration}ms`);

      return {
        content: response.data.response,
        model: this.model,
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.logger.error(`LLM request timeout after ${error.config?.timeout}ms`);
        throw new Error('LLM request timed out. Please try again or use a smaller/faster model.');
      }
      this.logger.error(`Error generating LLM response: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate a structured JSON response from the LLM
   */
  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    try {
      const fullSystemPrompt = `${systemPrompt || ''}\n\nIMPORTANT: You MUST respond with ONLY valid JSON.
- Use double quotes for all strings and property names
- Do not include any explanatory text before or after the JSON
- Do not use markdown code blocks
- Ensure all JSON is properly formatted
- Example: {"key": "value", "number": 123}`;

      const response = await this.generate(prompt, fullSystemPrompt);

      // Clean up the response - remove markdown code blocks if present
      let jsonString = response.content.trim();

      this.logger.debug(`Raw LLM response: ${jsonString.substring(0, 200)}...`);

      // Remove markdown code blocks
      jsonString = jsonString.replace(/```json\n?/gi, '');
      jsonString = jsonString.replace(/```\n?/g, '');

      // Remove any text before the first { or [
      const jsonStart = Math.min(
        jsonString.indexOf('{') !== -1 ? jsonString.indexOf('{') : Infinity,
        jsonString.indexOf('[') !== -1 ? jsonString.indexOf('[') : Infinity,
      );

      if (jsonStart !== Infinity && jsonStart > 0) {
        jsonString = jsonString.substring(jsonStart);
      }

      // Remove any text after the last } or ]
      const jsonEnd = Math.max(
        jsonString.lastIndexOf('}'),
        jsonString.lastIndexOf(']'),
      );

      if (jsonEnd !== -1 && jsonEnd < jsonString.length - 1) {
        jsonString = jsonString.substring(0, jsonEnd + 1);
      }

      jsonString = jsonString.trim();

      this.logger.debug(`Cleaned JSON string: ${jsonString.substring(0, 200)}...`);

      const parsed = JSON.parse(jsonString);
      return parsed as T;
    } catch (error) {
      this.logger.error(`Error parsing JSON from LLM: ${error.message}`);
      this.logger.error(`Raw response: ${error.stack}`);
      throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
    }
  }

  /**
   * Check if Ollama is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      this.logger.debug('Checking Ollama health...');

      const response = await this.httpClient.get('/api/tags');

      this.logger.debug(`Ollama is healthy. Available models: ${response.data.models?.length || 0}`);
      return true;
    } catch (error) {
      this.logger.warn(`Ollama health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Alias for checkHealth for backward compatibility
   */
  async healthCheck(): Promise<boolean> {
    return this.checkHealth();
  }
}

