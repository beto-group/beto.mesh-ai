import { Notice } from 'obsidian';
import { OllamaAPIHelper } from '../utils/OllamaAPIHelper';
import MeshAIPlugin from '../main';

export class OllamaProvider {
  private apiHelper: OllamaAPIHelper;
  private plugin: MeshAIPlugin;

  constructor(serverUrl: string, plugin: MeshAIPlugin) {
    this.apiHelper = new OllamaAPIHelper(serverUrl);
    this.plugin = plugin;
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.apiHelper.get('/api/tags');
      if (response.models && Array.isArray(response.models)) {
        return response.models.map((model: { name: string }) => model.name);
      } else {
        throw new Error('Unexpected response format from Ollama API');
      }
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      throw new Error('Failed to fetch Ollama models. Please ensure the Ollama server is running and the URL is correct.');
    }
  }

  async generateResponse(prompt: string, onUpdate?: (partial: string) => void): Promise<string> {
    const ollamaModels = this.plugin.settings.providerModels.ollama;
    const model = ollamaModels && ollamaModels.length > 0 ? ollamaModels[0] : 'llama2'; // Default to 'llama2' if no model is selected

    if (!model) {
      new Notice('No Ollama model has been selected. Using default model "llama2".');
    }

    let fullResponse = '';

    try {
      await this.apiHelper.postStream('/api/generate', {
        model: model,
        prompt: prompt,
        stream: true
      }, (chunk) => {
        if (chunk.response) {
          fullResponse += chunk.response;
          if (onUpdate) {
            onUpdate(chunk.response);
          }
        }
      });

      return fullResponse;
    } catch (error) {
      console.error(`Error generating response with model ${model}:`, error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}