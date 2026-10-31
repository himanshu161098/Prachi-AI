import { AIProviderAdapter, ChatMessage, ChatOptions, ChatResult, ToolCall } from './types';
import { config } from '../../../config';
import { db } from '../../../database';
import { LocalHeuristicAdapter } from './localHeuristicAdapter';

export class OpenAIAdapter implements AIProviderAdapter {
  id = 'openai';
  name = 'OpenAI (GPT-4o / GPT-4o-mini / o1-mini)';
  private fallback = new LocalHeuristicAdapter();

  isAvailable(): boolean {
    return Boolean(config.ai.openaiApiKey && config.ai.openaiApiKey.trim().length > 5);
  }

  async generateResponse(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    if (!this.isAvailable()) {
      const res = await this.fallback.generateResponse(messages, options);
      return {
        ...res,
        text: res.text,
        modelUsed: 'openai-fallback-local'
      };
    }

    // Determine target model based on options, mode, or config default
    let targetModel = options.model || config.ai.defaultOpenAIModel || 'gpt-4o-mini';
    if (!options.model) {
      const lastMsg = (messages[messages.length - 1]?.content || '').toLowerCase();
      if (lastMsg.includes('code') || lastMsg.includes('python') || lastMsg.includes('algorithm') || lastMsg.includes('debug')) {
        targetModel = 'gpt-4o';
      } else if (lastMsg.includes('reason') || lastMsg.includes('prove') || lastMsg.includes('solve step by step')) {
        targetModel = 'gpt-4o';
      }
    }

    try {
      const systemInstruction = [
        "You are Prachi (प्राची) — a warm, highly intelligent, loyal, and cheerful close friend (best friend / bestie).",
        "YOUR CORE PERSONALITY & HOW TO TALK:",
        "- Talk naturally, affectionately, and supportively—exactly like a real, understanding close friend who genuinely cares about the user.",
        "- Communicate fluently in the user's preferred language (Hindi, Hinglish, English, Urdu, Bhojpuri, etc.) matching their tone and vibe.",
        "- When speaking in Hindi or Hinglish, speak like a sweet, supportive friend: e.g. 'Arre dost!', 'Bilkul!', 'Haan main samajh gayi! 😊', 'Yeh raha answer...', 'Batao aur kya help karu?'. Use cheerful, expressive emojis (😊, ✨, 🌸, 💡).",
        "- When speaking in English, be warm, articulate, friendly, and engaging.",
        "- NEVER sound cold, robotic, bureaucratic, or mechanical.",
        "- ALWAYS give accurate, authentic, direct, and complete answers to ANY question asked—whether it is General Knowledge, Coding, Mathematics, Technology, Current Affairs, or Daily Life Advice.",
        "- When writing code, explanations, or plans, provide complete, clean, production-ready markdown solutions directly.",
        options.userName ? `The user's name is ${options.userName}. Address them warmly and respectfully as your close friend.` : '',
        options.userMemories && options.userMemories.length > 0
          ? `User Personal Memories & Preferences:\n${options.userMemories.map(m => `- ${m}`).join('\n')}`
          : '',
        options.ragContext && options.ragContext.length > 0
          ? `Relevant Document Knowledge Context:\n${options.ragContext.map(c => `[Source: ${c.sourceTitle}]\n${c.chunkText}`).join('\n\n')}`
          : ''
      ].filter(Boolean).join('\n\n');

      const formattedMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemInstruction },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
          content: m.content
        }))
      ];

      // Define OpenAI Function Tools for Native Tool Calling
      const tools = [
        {
          type: 'function',
          function: {
            name: 'call_contact',
            description: 'Call a phone contact by name or phone number',
            parameters: {
              type: 'object',
              properties: {
                contactName: { type: 'string', description: 'Name of contact or phone number to call' }
              },
              required: ['contactName']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'send_message',
            description: 'Send a WhatsApp message or SMS to a contact',
            parameters: {
              type: 'object',
              properties: {
                contactName: { type: 'string', description: 'Name or number of the recipient' },
                message: { type: 'string', description: 'The text message to send' },
                platform: { type: 'string', enum: ['whatsapp', 'sms'], description: 'Platform to send via' }
              },
              required: ['contactName', 'message']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'open_application',
            description: 'Open a local desktop application or web media (YouTube, Spotify, Amazon, Calculator, Notepad, etc.)',
            parameters: {
              type: 'object',
              properties: {
                appName: { type: 'string', description: 'Application or website name' },
                query: { type: 'string', description: 'Search term or song title if playing media' },
                action: { type: 'string', enum: ['open', 'play', 'search'], description: 'Action to perform' }
              },
              required: ['appName']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'calculator',
            description: 'Perform mathematical calculation or arithmetic expression evaluation',
            parameters: {
              type: 'object',
              properties: {
                expression: { type: 'string', description: 'Math expression e.g. (150 * 18) / 100' }
              },
              required: ['expression']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'weather_lookup',
            description: 'Get current weather and temperature for a city',
            parameters: {
              type: 'object',
              properties: {
                city: { type: 'string', description: 'City or location name' }
              },
              required: ['city']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'currency_converter',
            description: 'Convert currency amount from one currency to another',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number', description: 'Amount to convert' },
                fromCurrency: { type: 'string', description: '3-letter currency code e.g. USD' },
                toCurrency: { type: 'string', description: '3-letter currency code e.g. INR' }
              },
              required: ['amount', 'fromCurrency', 'toCurrency']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search the web for real-time information or facts',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' }
              },
              required: ['query']
            }
          }
        }
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.openaiApiKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          temperature: targetModel.startsWith('o1') ? 1 : (options.temperature ?? 0.7),
          tools: targetModel.startsWith('o1') ? undefined : tools,
          tool_choice: 'auto'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[OpenAIAdapter] HTTP ${res.status} response from OpenAI. Falling back to local cognitive engine.`);
        const fallbackRes = await this.fallback.generateResponse(messages, options);
        return {
          ...fallbackRes,
          modelUsed: `openai-fallback-http-${res.status}`
        };
      }

      const data: any = await res.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      // Parse tool calls if returned by OpenAI
      const parsedToolCalls: ToolCall[] = [];
      if (message?.tool_calls && Array.isArray(message.tool_calls)) {
        for (const tc of message.tool_calls) {
          if (tc.type === 'function' && tc.function) {
            try {
              const args = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments;
              parsedToolCalls.push({
                id: tc.id || `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: tc.function.name,
                arguments: args
              });
            } catch {
              // Parse error ignored
            }
          }
        }
      }

      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || 0;

      // Calculate estimated cost in USD
      const costUsd = this.calculateCost(targetModel, promptTokens, completionTokens);

      // Persist token telemetry into token_usage_logs table
      try {
        const logId = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO token_usage_logs (id, user_id, provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, created_at)
          VALUES (?, ?, 'openai', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(logId, options.userId || 'anonymous', targetModel, promptTokens, completionTokens, totalTokens, costUsd);
      } catch (logErr) {
        // Telemetry logging non-fatal
      }

      return {
        text: message?.content || (parsedToolCalls.length > 0 ? `Executing requested action: ${parsedToolCalls.map(t => t.name).join(', ')}...` : ''),
        toolCalls: parsedToolCalls.length > 0 ? parsedToolCalls : undefined,
        citations: options.ragContext,
        modelUsed: `openai/${targetModel}`,
        tokensUsed: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        }
      };
    } catch (err: any) {
      console.error('[OpenAIAdapter] Error:', err.message || err);
      const fallbackRes = await this.fallback.generateResponse(messages, options);
      return {
        ...fallbackRes,
        modelUsed: 'openai-fallback-error'
      };
    }
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    let promptRatePerM = 0.15;
    let compRatePerM = 0.60;
    if (model.includes('gpt-4o') && !model.includes('mini')) {
      promptRatePerM = 2.50;
      compRatePerM = 10.00;
    } else if (model.includes('o1')) {
      promptRatePerM = 3.00;
      compRatePerM = 12.00;
    }
    return (promptTokens * promptRatePerM + completionTokens * compRatePerM) / 1000000;
  }
}
