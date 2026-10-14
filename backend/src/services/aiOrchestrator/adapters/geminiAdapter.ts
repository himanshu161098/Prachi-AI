import { AIProviderAdapter, ChatMessage, ChatOptions, ChatResult, ToolCall, ArtifactOutput, ClientAction } from './types';
import { config } from '../../../config';
import { LocalHeuristicAdapter } from './localHeuristicAdapter';
import { ToolService } from '../../toolService';

export class GeminiAdapter implements AIProviderAdapter {
  id = 'gemini';
  name = 'Prachi AI Cognitive Core (Autonomous Deep Model)';
  private fallback = new LocalHeuristicAdapter();

  isAvailable(): boolean {
    return Boolean(config.ai.geminiApiKey && config.ai.geminiApiKey.length > 5);
  }

  async generateResponse(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    if (!this.isAvailable()) {
      const result = await this.fallback.generateResponse(messages, options);
      return {
        ...result,
        text: result.text,
        modelUsed: 'prachi-cognitive-core'
      };
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
        "- NEVER give generic canned templates like 'Regarding X: Please let me know if you would like a direct calculation...'.",
        "- ALWAYS give accurate, authentic, direct, and complete answers to ANY question asked—whether it is General Knowledge (e.g. 'who is the prime minister of india'), Current Affairs, Science, History, Coding, Mathematics, Technology, or Daily Life Advice.",
        "- When the user asks 'who is the prime minister of india', immediately state that Narendra Modi is the Prime Minister of India, in your sweet and knowledgeable conversational tone.",
        "- When writing code, explanations, or plans, provide complete, clean, production-ready markdown solutions directly.",
        "- NATIVE TOOLS (Invoke them automatically when requested):",
        "  - Calling: When the user asks to call someone ('Rahul ko call karo', 'Papa ko phone lagao', 'call Mummy'), ALWAYS invoke `call_contact` with contactName.",
        "  - Messaging: When the user asks to send a WhatsApp or SMS ('Rahul ko message bhejo ki...', 'Papa ko WhatsApp karo...'), ALWAYS invoke `send_message` with contactName, message, and platform ('whatsapp' | 'sms').",
        "  - Apps & Media: When the user asks to open an app, website, or play songs/videos on YouTube/Spotify ('open youtube and play song', 'spotify kholo', 'amazon par earphones search karo'), ALWAYS invoke `open_application` with appName, query, and action ('play' | 'search' | 'open').",
        "  - Other Tools: calculator, web_search, weather_lookup, task_scheduler, code_runner, currency_converter, stock_quote_lookup, save_contact, list_contacts.",
        "- Do NOT call `save_memory` unless the user explicitly tells you to remember personal details (e.g. 'remember that my name is...').",
        options.userName ? `The user's name is ${options.userName}. Address them warmly and respectfully as your close friend.` : '',
        options.userMemories && options.userMemories.length > 0
          ? `User Personal Memories & Preferences:\n${options.userMemories.map(m => `- ${m}`).join('\n')}`
          : '',
        options.ragContext && options.ragContext.length > 0
          ? `Relevant Document Knowledge Context:\n${options.ragContext.map(c => `[Source: ${c.sourceTitle}]\n${c.chunkText}`).join('\n\n')}`
          : ''
      ].filter(Boolean).join('\n\n');

      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      // Candidate models in verified priority order: fastest, most capable, and active
      const candidateModels = Array.from(new Set([
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-3-flash-preview',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash'
      ].filter(Boolean))) as string[];

      // Prepare registered tool schemas for native Gemini function calling
      const registeredTools = ToolService.getRegisteredTools();
      const functionDeclarations = registeredTools.map(t => {
        const properties: Record<string, any> = {};
        for (const [key, param] of Object.entries(t.parameters || {})) {
          const p = param as any;
          properties[key] = {
            type: p.type === 'number' ? 'NUMBER' : 'STRING',
            description: p.description || ''
          };
          if (p.enum) {
            properties[key].enum = p.enum;
          }
        }
        const description = t.name === 'save_memory'
          ? "ONLY call when user explicitly says 'remember this' or 'save my preference'. Do NOT call for regular questions or coding tasks."
          : t.description;
        return {
          name: t.name,
          description,
          parameters: {
            type: 'OBJECT',
            properties,
            required: []
          }
        };
      });

      let lastError: any = null;
      let finalData: any = null;
      let modelUsed = '';

      for (const modelName of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.ai.geminiApiKey}`;

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 35000);

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents,
              tools: [{ function_declarations: functionDeclarations }],
              generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 4096,
              }
            }),
            signal: controller.signal
          });
          clearTimeout(timeout);

          if (res.ok) {
            finalData = await res.json();
            modelUsed = modelName;
            break;
          } else {
            const errText = await res.text();
            console.warn(`[GeminiAdapter] Model ${modelName} returned status ${res.status}: ${errText.slice(0, 150)}`);
            lastError = errText;
          }
        } catch (e: any) {
          lastError = e?.message || e;
        }
      }

      if (!finalData) {
        console.warn('[GeminiAdapter] All Gemini models failed or key issue, using local fallback:', lastError);
        const fallbackRes = await this.fallback.generateResponse(messages, options);
        return {
          ...fallbackRes,
          text: fallbackRes.text,
          modelUsed: 'gemini-fallback'
        };
      }

      const candidate = finalData.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const textParts = parts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text);
      let generatedText = textParts.join('\n\n').trim();

      const toolCalls: ToolCall[] = [];
      for (const p of parts) {
        if (p.functionCall) {
          toolCalls.push({
            id: p.functionCall.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: p.functionCall.name,
            arguments: p.functionCall.args || {}
          });
        }
      }

      // If Gemini called a tool without text, provide a clean task status
      if (!generatedText && toolCalls.length > 0) {
        const names = toolCalls.map(t => t.name).join(', ');
        generatedText = `Executing requested action via **${names}**...`;
      }

      // Detect and create interactive workspace artifacts (code, html, svg, markdown)
      let artifact: ArtifactOutput | undefined;
      const codeMatch = generatedText.match(/```([a-zA-Z0-9_\-]+)?(?::([^\n]+))?\n([\s\S]{100,}?)```/);
      if (codeMatch) {
        const lang = (codeMatch[1] || 'code').toLowerCase();
        const title = codeMatch[2]?.trim() || (lang === 'html' ? 'Interactive Web Application' : `${lang.toUpperCase()} Implementation`);
        const content = codeMatch[3]?.trim();
        let artType: ArtifactOutput['type'] = 'code';
        if (lang === 'markdown' || lang === 'md') artType = 'markdown';
        else if (lang === 'json') artType = 'json';
        else if (lang === 'svg') artType = 'svg';

        artifact = {
          title,
          type: artType,
          content
        };
      }

      // Detect client actions (e.g. open application / website)
      let clientAction: ClientAction | undefined;
      const openAppTool = toolCalls.find(tc => tc.name === 'open_application');
      if (openAppTool) {
        const resolution = await ToolService.resolveApplicationActionAsync({
          appName: openAppTool.arguments?.appName,
          query: openAppTool.arguments?.query,
          action: openAppTool.arguments?.action,
          targetUrl: openAppTool.arguments?.targetUrl
        });
        clientAction = {
          type: 'open_url',
          target: resolution.target,
          appName: resolution.appName,
          action: resolution.action,
          query: resolution.query,
          displayTitle: resolution.displayTitle,
          videoId: resolution.videoId,
          embedUrl: resolution.embedUrl
        };
      }

      return {
        text: generatedText || 'Task processed successfully.',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        citations: options.ragContext,
        artifact,
        clientAction,
        modelUsed,
        tokensUsed: {
          prompt: finalData.usageMetadata?.promptTokenCount || 0,
          completion: finalData.usageMetadata?.candidatesTokenCount || 0,
          total: finalData.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (err: any) {
      console.error('[GeminiAdapter] Error calling Gemini:', err);
      return this.fallback.generateResponse(messages, options);
    }
  }
}
