import { AIProviderAdapter, ChatMessage, ChatOptions, ChatResult } from './types';
import { config } from '../../../config';
import { LocalHeuristicAdapter } from './localHeuristicAdapter';

export class OpenAIAdapter implements AIProviderAdapter {
  id = 'openai';
  name = 'OpenAI (GPT-4o / GPT-4o-mini)';
  private fallback = new LocalHeuristicAdapter();

  isAvailable(): boolean {
    return Boolean(config.ai.openaiApiKey && config.ai.openaiApiKey.length > 5);
  }

  async generateResponse(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    if (!this.isAvailable()) {
      const res = await this.fallback.generateResponse(messages, options);
      return {
        ...res,
        text: `[OpenAI API key not configured — using Prachi Local Heuristic Engine]\n\n${res.text}`,
        modelUsed: 'openai-fallback-local'
      };
    }

    try {
      const systemPrompt = [
        "You are Prachi AI, an empathetic, highly intelligent, multimodal virtual personal assistant.",
        options.userMemories && options.userMemories.length > 0
          ? `User Memories:\n${options.userMemories.map(m => `- ${m}`).join('\n')}`
          : ''
      ].filter(Boolean).join('\n\n');

      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const model = options.model || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.openaiApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: options.temperature ?? 0.7,
        })
      });

      if (!res.ok) {
        return this.fallback.generateResponse(messages, options);
      }

      const data: any = await res.json();
      const choice = data.choices?.[0];

      return {
        text: choice?.message?.content || '',
        citations: options.ragContext,
        modelUsed: model,
        tokensUsed: {
          prompt: data.usage?.prompt_tokens || 0,
          completion: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0
        }
      };
    } catch (err) {
      console.error('[OpenAIAdapter] Error:', err);
      return this.fallback.generateResponse(messages, options);
    }
  }
}
