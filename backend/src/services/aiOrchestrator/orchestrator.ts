import { db } from '../../database';
import { AIProviderAdapter, ChatMessage, ChatOptions, ChatResult, ToolCall, Citation } from './adapters/types';
import { LocalHeuristicAdapter } from './adapters/localHeuristicAdapter';
import { GeminiAdapter } from './adapters/geminiAdapter';
import { OpenAIAdapter } from './adapters/openAIAdapter';
import { ClaudeAdapter } from './adapters/claudeAdapter';
import { ToolService } from '../toolService';
import { RAGService } from '../ragService';
import { AuditService } from '../auditService';
import { config } from '../../config';

export class AIOrchestrator {
  private adapters: Map<string, AIProviderAdapter> = new Map();

  constructor() {
    const local = new LocalHeuristicAdapter();
    const gemini = new GeminiAdapter();
    const openai = new OpenAIAdapter();
    const claude = new ClaudeAdapter();

    this.adapters.set(local.id, local);
    this.adapters.set(gemini.id, gemini);
    this.adapters.set(openai.id, openai);
    this.adapters.set(claude.id, claude);
  }

  getAvailableProviders() {
    return Array.from(this.adapters.values()).map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      available: adapter.isAvailable(),
    }));
  }

  private resolveAdapter(preferredProvider?: string): AIProviderAdapter {
    const target = preferredProvider || config.ai.defaultProvider;
    if (target && this.adapters.has(target)) {
      const adapter = this.adapters.get(target)!;
      if (adapter.isAvailable()) {
        return adapter;
      }
    }

    // If Gemini is available, prioritize Gemini as default cloud model
    const gemini = this.adapters.get('gemini');
    if (gemini && gemini.isAvailable()) {
      return gemini;
    }

    // Default fallback is always local heuristic
    return this.adapters.get('local_heuristic')!;
  }

  async processChat(params: {
    userId: string;
    conversationId?: string;
    message: string;
    provider?: string;
    mode?: string;
    model?: string;
    enableMemory?: boolean;
    enableRAG?: boolean;
    attachment?: any;
  }): Promise<{
    conversationId: string;
    messageId: string;
    response: string;
    toolCalls?: ToolCall[];
    toolResults?: any[];
    citations?: Citation[];
    artifact?: any;
    clientAction?: any;
    attachment?: any;
    modelUsed: string;
  }> {
    const { userId, message, provider, mode = 'general', enableMemory = true, enableRAG = true } = params;

    // 1. Resolve or Create Conversation
    let convId = params.conversationId;
    if (!convId) {
      convId = `conv-${Date.now()}`;
      const title = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      db.prepare(`
        INSERT INTO conversations (id, user_id, title, mode)
        VALUES (?, ?, ?, ?)
      `).run(convId, userId, title, mode);
    }

    // 2. Persist User Message
    const userMsgId = `msg-usr-${Date.now()}`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, user_id, role, content, token_count)
      VALUES (?, ?, ?, 'user', ?, ?)
    `).run(userMsgId, convId, userId, message, Math.ceil(message.length / 4));

    // Update conversation timestamp for recent sorting
    db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convId);

    // 3. Fetch History (Retrieve recent 20 messages in chronological order)
    const historyRows = db.prepare(`
      SELECT role, content FROM (
        SELECT role, content, created_at FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      ) sub
      ORDER BY created_at ASC
    `).all(convId) as Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>;

    let chatMessages: ChatMessage[] = historyRows.map(r => ({
      role: r.role,
      content: r.content
    }));

    if (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].content !== message) {
      chatMessages.push({ role: 'user', content: message });
    }

    // 4. Retrieve User-Approved Memories (Tenant Isolated)
    let userMemories: string[] = [];
    if (enableMemory) {
      const memoryRows = db.prepare(`
        SELECT content, category FROM memories
        WHERE user_id = ? AND is_active = 1
        ORDER BY confidence DESC
        LIMIT 5
      `).all(userId) as Array<{ content: string; category: string }>;

      userMemories = memoryRows.map(m => `[${m.category.toUpperCase()}] ${m.content}`);
    }

    // 5. Retrieve RAG Document Context (Tenant Isolated)
    let ragCitations: Citation[] = [];
    if (enableRAG) {
      ragCitations = RAGService.retrieveContext(userId, message, 3);
    }

    // 6. Select Provider Adapter
    const adapter = this.resolveAdapter(provider);

    // Look up user's first name for personal greetings
    const userRow = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as { full_name?: string } | undefined;
    const userName = userRow?.full_name ? userRow.full_name.trim().split(' ')[0] : 'Friend';

    // 7. Generate Model Response
    const options: ChatOptions = {
      model: params.model,
      userMemories,
      ragContext: ragCitations,
      userId,
      userName,
      attachment: params.attachment
    };

    const chatResult = await adapter.generateResponse(chatMessages, options);

    // 8. Execute or Stage Tool Calls
    const toolResults: any[] = [];
    if (chatResult.toolCalls && chatResult.toolCalls.length > 0) {
      for (const call of chatResult.toolCalls) {
        const execRes = await ToolService.execute({
          toolName: call.name,
          arguments: call.arguments,
          userId,
          confirmed: false
        });
        toolResults.push(execRes);
        const action = execRes?.clientAction || execRes?.result?.clientAction;
        if (action) {
          chatResult.clientAction = action;
        }

        // If the tool was an application launch or media play, provide a warm natural response
        if (call.name === 'open_application' && action) {
          if (action.action === 'play') {
            chatResult.text = `Main aapke liye ${action.appName} open karke 1st song "${action.displayTitle || action.query}" direct play kar rahi hoon! 🎵 Enjoy kijiye!`;
          } else if (action.action === 'search') {
            chatResult.text = `Main ${action.appName} par "${action.query}" direct search karke navigate kar rahi hoon! 🔍`;
          }
        } else if (call.name === 'call_contact' && action) {
          chatResult.text = `Main aapke phone contacts se ${action.contactName} (${action.phone}) ko call connect kar rahi hoon! 📞`;
        } else if (call.name === 'send_message' && action) {
          chatResult.text = `Main aapke phone contacts se ${action.contactName} (${action.phone}) ko ${action.platform?.toUpperCase() || 'WHATSAPP'} message bhej rahi hoon:\n\n💬 "${action.messageText}"`;
        } else if (execRes?.result && (chatResult.text.startsWith('Executing requested action') || chatResult.text.startsWith('Running requested action'))) {
          const resObj = execRes.result;
          let summary = '';
          if (typeof resObj === 'object') {
            summary = Object.entries(resObj)
              .map(([k, v]) => `• **${k.replace(/_/g, ' ').toUpperCase()}:** ${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join('\n');
          } else {
            summary = String(resObj);
          }
          chatResult.text = `### Action Executed: ${call.name}\n\n${summary}`;
        }
      }
    }

    // 9. If an artifact was generated, persist it
    let savedArtifact: any = null;
    if (chatResult.artifact) {
      const artId = `art-${Date.now()}`;
      try {
        db.prepare(`
          INSERT INTO artifacts (id, user_id, title, type, content, version, tags_json)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(
          artId,
          userId,
          chatResult.artifact.title,
          chatResult.artifact.type,
          chatResult.artifact.content,
          JSON.stringify(['ai-generated', mode])
        );
        savedArtifact = { id: artId, ...chatResult.artifact, version: 1 };
      } catch (err) {
        console.error('[AIOrchestrator] Failed to save artifact:', err);
      }
    }

    // 10. Persist Assistant Message
    const assistantMsgId = `msg-asst-${Date.now()}`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, user_id, role, content, tool_calls_json, citations_json, token_count)
      VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?)
    `).run(
      assistantMsgId,
      convId,
      userId,
      chatResult.text,
      chatResult.toolCalls ? JSON.stringify(chatResult.toolCalls) : null,
      chatResult.citations ? JSON.stringify(chatResult.citations) : null,
      chatResult.tokensUsed.completion
    );

    // 11. Audit Log
    AuditService.log({
      userId,
      action: 'CHAT_COMPLETION',
      resource: convId,
      details: {
        provider: adapter.id,
        modelUsed: chatResult.modelUsed,
        toolCallsCount: chatResult.toolCalls?.length || 0,
        tokensTotal: chatResult.tokensUsed.total
      }
    });

    return {
      conversationId: convId,
      messageId: assistantMsgId,
      response: chatResult.text,
      toolCalls: chatResult.toolCalls,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      citations: chatResult.citations,
      artifact: savedArtifact,
      clientAction: chatResult.clientAction,
      attachment: params.attachment,
      modelUsed: chatResult.modelUsed
    };
  }
}
