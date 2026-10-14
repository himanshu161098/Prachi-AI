import { AIProviderAdapter, ChatMessage, ChatOptions, ChatResult } from './types';
import { config } from '../../../config';
import { LocalHeuristicAdapter } from './localHeuristicAdapter';

export class ClaudeAdapter implements AIProviderAdapter {
  id = 'claude';
  name = 'Anthropic Claude (3.5 Sonnet / Haiku)';
  private fallback = new LocalHeuristicAdapter();

  isAvailable(): boolean {
    return Boolean(config.ai.claudeApiKey && config.ai.claudeApiKey.length > 5);
  }

  async generateResponse(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    if (!this.isAvailable()) {
      const res = await this.fallback.generateResponse(messages, options);
      return {
        ...res,
        text: `[Anthropic API key not configured — using Prachi Local Heuristic Engine]\n\n${res.text}`,
        modelUsed: 'claude-fallback-local'
      };
    }

    try {
      const systemPrompt = "You are Prachi AI, an empathetic, highly intelligent, multimodal virtual personal assistant.";
      const model = options.model || 'claude-3-5-sonnet-20241022';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.ai.claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          max_tokens: options.maxTokens || 2048,
          messages: messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!res.ok) {
        return this.fallback.generateResponse(messages, options);
      }

      const data: any = await res.json();
      const textBlock = data.content?.[0]?.text || '';

      return {
        text: textBlock,
        citations: options.ragContext,
        modelUsed: model,
        tokensUsed: {
          prompt: data.usage?.input_tokens || 0,
          completion: data.usage?.output_tokens || 0,
          total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (err) {
      console.error('[ClaudeAdapter] Error:', err);
      return this.fallback.generateResponse(messages, options);
    }
  }
}
