import { AIProviderAdapter, ChatMessage, ChatOptions, ChatResult } from './types';
import { CognitiveBrain } from '../cognitiveBrain';

export class LocalHeuristicAdapter implements AIProviderAdapter {
  id = 'local_heuristic';
  name = 'Prachi Local Cognitive Engine (Offline/Fallback)';

  isAvailable(): boolean {
    return true; // Always ready
  }

  async generateResponse(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // Invoke Prachi AI's cognitive reasoning brain
    const brainOutput = await CognitiveBrain.reasonAsync(lastUserMsg, {
      history: messages,
      memories: options.userMemories,
      ragCitations: options.ragContext,
      userId: options.userId,
      userName: options.userName,
      attachment: options.attachment
    });

    const text = brainOutput.text;
    const toolCalls = brainOutput.toolCalls;
    const citations = options.ragContext;
    const artifact = brainOutput.artifact;
    const clientAction = brainOutput.clientAction;

    const estimatedTokens = Math.ceil((lastUserMsg.length + text.length) / 4);

    return {
      text,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      citations: citations && citations.length > 0 ? citations : undefined,
      artifact,
      clientAction,
      attachment: options.attachment,
      modelUsed: 'prachi-cognitive-brain-v2',
      tokensUsed: {
        prompt: Math.ceil(lastUserMsg.length / 4),
        completion: Math.ceil(text.length / 4),
        total: estimatedTokens
      }
    };
  }
}
