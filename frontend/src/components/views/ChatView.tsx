import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Wrench,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Paperclip,
  Trash2,
  Plus,
  Clock,
  ExternalLink,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Play,
  Search,
  Phone,
  PhoneCall,
  MessageCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { Message, Conversation, Citation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { playSweetFemaleVoice, stopSweetVoice } from '../../utils/speechVoiceHelper';

interface ChatViewProps {
  currentModel: string;
  onNavigateToView: (view: any) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ currentModel, onNavigateToView }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('general');
  const [enableMemory, setEnableMemory] = useState(true);
  const [enableRAG, setEnableRAG] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'hi-IN' | 'en-US' | 'ur-PK' | 'bho-IN'>('hi-IN');
  const [showHistory, setShowHistory] = useState(true);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    dataUrl: string;
    content?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const loadConversations = async () => {
    if (!user) return;
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);
      if (res.conversations && res.conversations.length > 0 && !activeConvId) {
        setActiveConvId(res.conversations[0].id);
      }
    } catch (e) {
      console.warn('Failed to load conversations', e);
    }
  };

  const loadMessages = async (convId: string) => {
    if (!user || !convId) return;
    try {
      const res = await api.getMessages(convId);
      setMessages(res.messages || []);
    } catch (e) {
      console.warn('Failed to load messages', e);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
    setSelectedFile(null);
  };

  const handleSelectConv = (convId: string) => {
    if (activeConvId === convId) return;
    setActiveConvId(convId);
    loadMessages(convId);
  };

  const handleDeleteConv = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        handleNewChat();
      }
    } catch (err) {
      console.warn('Failed to delete conversation', err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm('Kya aap sachme apni saari chat history delete karna chahte hain? (Are you sure you want to delete all chat history? This cannot be undone.)')) {
      return;
    }
    try {
      await api.deleteAllConversations();
      setConversations([]);
      handleNewChat();
    } catch (err) {
      console.warn('Failed to delete all conversations', err);
    }
  };

  const handleClearCurrentChat = async () => {
    if (!confirm('Is conversation ke saare messages clear karna chahte hain? (Clear all messages in this conversation?)')) {
      return;
    }
    if (activeConvId) {
      try {
        await api.clearConversationMessages(activeConvId);
        setMessages([]);
      } catch (err) {
        console.warn('Failed to clear conversation messages', err);
      }
    } else {
      setMessages([]);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!msgId || msgId.startsWith('temp-')) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      return;
    }
    try {
      await api.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.warn('Failed to delete message', err);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      if (file.type.startsWith('text/') || /\.(csv|json|js|ts|tsx|jsx|py|html|css|md|txt)$/i.test(file.name)) {
        const textReader = new FileReader();
        textReader.onload = () => {
          setSelectedFile({
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            dataUrl,
            content: textReader.result as string
          });
        };
        textReader.readAsText(file);
      } else {
        setSelectedFile({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl
        });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (customText?: string, fromVoice: boolean = false) => {
    const textToSend = customText !== undefined ? customText : input;
    if ((!textToSend.trim() && !selectedFile) || loading) return;

    const attachmentPayload = selectedFile
      ? {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          dataUrl: selectedFile.dataUrl,
          content: selectedFile.content
        }
      : undefined;

    const userTempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId || '',
      user_id: user?.id || 'usr-demo-001',
      role: 'user',
      content: textToSend || (selectedFile ? `[Attached File: ${selectedFile.name}]` : ''),
      token_count: Math.ceil(textToSend.length / 4),
      created_at: new Date().toISOString(),
      attachment: attachmentPayload
    };

    setMessages((prev) => [...prev, userTempMsg]);
    if (!customText) setInput('');
    setSelectedFile(null);
    setLoading(true);

    try {
      const result = await api.sendMessage({
        message: textToSend,
        conversationId: activeConvId || undefined,
        provider: currentModel,
        mode,
        enableMemory,
        enableRAG,
        attachment: attachmentPayload
      });

      if (!activeConvId && result.conversationId) {
        setActiveConvId(result.conversationId);
        loadConversations();
      } else {
        loadConversations();
      }

      // Auto-launch client actions immediately (Phone Calls, WhatsApp/SMS Messages, URLs)
      if (result.clientAction && result.clientAction.target) {
        try {
          if (result.clientAction.type === 'call_contact') {
            window.location.href = result.clientAction.target;
          } else if (result.clientAction.type === 'send_message') {
            window.open(result.clientAction.target, '_blank');
          } else if (result.clientAction.type === 'open_url') {
            window.open(result.clientAction.target, '_blank');
          }
        } catch (e) {
          console.warn('Action launch error for clientAction', e);
        }
      }

      const asstMsg: Message & { artifact?: any; clientAction?: any } = {
        id: result.messageId,
        conversation_id: result.conversationId,
        user_id: user?.id || 'usr-demo-001',
        role: 'assistant',
        content: result.response,
        tool_calls_json: result.toolCalls ? JSON.stringify(result.toolCalls) : undefined,
        citations_json: result.citations ? JSON.stringify(result.citations) : undefined,
        artifact: result.artifact,
        clientAction: result.clientAction,
        token_count: 0,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, asstMsg]);

      // If voice assistant initiated, speak response in sweet melodious female voice automatically
      if (fromVoice && result.response) {
        setSpeakingMsgId(result.messageId);
        playSweetFemaleVoice(result.response, {
          lang: selectedLang,
          onStart: () => setSpeakingMsgId(result.messageId),
          onEnd: () => setSpeakingMsgId(null),
          onError: () => setSpeakingMsgId(null)
        });
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        conversation_id: activeConvId || '',
        user_id: user?.id || 'usr-demo-001',
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to connect with AI orchestrator.'}`,
        token_count: 0,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Voice Dictation with AUTOMATIC PUSH:
   * When user stops speaking, it automatically submits the query without manual click!
   */
  const startVoiceDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your current browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLang === 'bho-IN' ? 'hi-IN' : selectedLang;

    let capturedText = '';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          capturedText += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const live = (capturedText || interim).trim();
      if (live) setInput(live);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const textToPush = capturedText.trim() || input.trim();
      if (textToPush) {
        handleSend(textToPush, true);
      }
    };

    recognition.onerror = (e: any) => {
      console.warn('Speech recognition event:', e?.error);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  /**
   * Text-to-Speech Playback with SWEET, MELODIOUS FEMALE VOICE ("Manmohak Girls Voice"):
   * Uses sweet acoustics (pitch 1.12, rate 0.94) with top natural Hindi/English female voices.
   */
  const speakMessage = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopSweetVoice();
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(msgId);
    playSweetFemaleVoice(text, {
      lang: selectedLang,
      onStart: () => setSpeakingMsgId(msgId),
      onEnd: () => setSpeakingMsgId(null),
      onError: () => setSpeakingMsgId(null)
    });
  };

  return (
    <div className="chat-container">
      {/* 1. Left Sidebar: History & Recent Conversations */}
      <div className={`chat-history-sidebar ${showHistory ? 'open' : 'collapsed'}`}>
        <div className="chat-history-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
            <Clock size={16} style={{ color: 'var(--accent-indigo)' }} />
            <span>Recent Chats</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--accent-indigo)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px'
            }}
            onClick={handleNewChat}
            title="Start a new conversation"
          >
            <Plus size={13} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="chat-history-list">
          {conversations.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No past conversations yet. Start chatting with Prachi AI!
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConvId;
              const formattedTime = new Date(c.updated_at || c.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={c.id}
                  className={`chat-history-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectConv(c.id)}
                  title={c.title}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    <MessageSquare size={14} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '0.82rem'
                      }}
                    >
                      {c.title || 'Untitled Conversation'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formattedTime}</span>
                    <button
                      type="button"
                      className="chat-history-delete-btn"
                      onClick={(e) => handleDeleteConv(e, c.id)}
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {conversations.length > 0 && (
          <div className="chat-history-footer">
            <button
              type="button"
              className="chat-clear-all-btn"
              onClick={handleClearAllHistory}
              title="Delete all past conversation history"
            >
              <Trash2 size={13} />
              <span>Clear All History</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Chat Area */}
      <div className="chat-main-area">
        {/* Top Chat Bar */}
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
              onClick={() => setShowHistory((prev) => !prev)}
              title={showHistory ? 'Collapse History Sidebar' : 'Show Recent Chats'}
            >
              {showHistory ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mode:</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem'
                }}
              >
                <option value="general">🧠 General Conversational</option>
                <option value="research">🔍 In-depth Research</option>
                <option value="code">💻 Engineering & Code</option>
                <option value="vision">👁️ Multimodal & Vision</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableMemory}
                onChange={(e) => setEnableMemory(e.target.checked)}
              />
              <span>Memory Bank</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableRAG}
                onChange={(e) => setEnableRAG(e.target.checked)}
              />
              <span>RAG Knowledge</span>
            </label>

            {messages.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: 'var(--accent-rose)',
                  borderColor: 'rgba(244, 63, 94, 0.3)'
                }}
                onClick={handleClearCurrentChat}
                title="Clear messages in this chat"
              >
                <Trash2 size={12} />
                <span>Clear Chat</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Official Prachi AI Cognitive Core Stamp */}
            <div
              className="prachi-ai-header-stamp"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 14px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.16) 0%, rgba(99, 102, 241, 0.2) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.45)',
                borderRadius: '20px',
                boxShadow: '0 0 16px rgba(6, 182, 212, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
                userSelect: 'none'
              }}
              title="Prachi AI Cognitive Core v3.0 Active"
            >
              <img
                src="./assets/prachi-logo.png"
                alt="Prachi AI"
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)'
                }}
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  if (!el.src.includes('prachi-logo.svg')) {
                    el.src = './assets/prachi-logo.svg';
                  }
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.4px' }}>
                PRACHI <span style={{ color: '#38bdf8' }}>AI</span>
              </span>
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981'
                }}
                title="Online & Ready"
              />
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '520px', padding: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
                  padding: '6px',
                  overflow: 'hidden'
                }}
              >
                <img
                  src="./assets/prachi-logo.png"
                  alt="Prachi AI Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    if (!el.src.includes('prachi-logo.svg')) {
                      el.src = './assets/prachi-logo.svg';
                    }
                  }}
                />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
                Prachi AI Personal Assistant
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Ask questions, open applications (YouTube, Google, Spotify, Notepad, Calculator), attach documents & photos for analysis, or speak naturally with the voice assistant!
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleSend('open youtube')}
                >
                  ▶️ Open YouTube
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleSend('open calculator')}
                >
                  🔢 Open Calculator
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleSend('open notepad')}
                >
                  📝 Open Notepad
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleSend('open spotify')}
                >
                  🎵 Open Spotify
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleSend('Hii')}
                >
                  👋 Say Hi
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            let toolCalls: any[] = [];
            let citations: Citation[] = [];

            if (msg.tool_calls_json) {
              try {
                toolCalls = JSON.parse(msg.tool_calls_json);
              } catch (e) {}
            }
            if (msg.citations_json) {
              try {
                citations = JSON.parse(msg.citations_json);
              } catch (e) {}
            }

            return (
              <div key={msg.id} className={`message-bubble ${isUser ? 'message-user' : 'message-assistant'}`}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '0.75rem',
                    opacity: 0.8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isUser ? (
                      <User size={13} />
                    ) : (
                      <img
                        src="./assets/prachi-logo.png"
                        alt="Prachi AI"
                        style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'contain' }}
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          if (!el.src.includes('prachi-logo.svg')) {
                            el.src = './assets/prachi-logo.svg';
                          }
                        }}
                      />
                    )}
                    <span>{isUser ? user?.fullName || 'You' : 'Prachi AI'}</span>
                  </div>

                  <button
                    type="button"
                    className="msg-delete-btn"
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="Delete this message"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* User Attachment Display */}
                {msg.attachment && (
                  <div className="chat-attachment-bubble">
                    {msg.attachment.fileType?.startsWith('image/') ? (
                      <ImageIcon size={16} style={{ color: 'var(--accent-cyan)' }} />
                    ) : (
                      <FileText size={16} style={{ color: 'var(--accent-indigo)' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{msg.attachment.fileName}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                        {(msg.attachment.fileSize / 1024).toFixed(1)} KB • {msg.attachment.fileType}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message text */}
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.content}
                </div>

                {/* Client Action Launcher Card */}
                {(() => {
                  const appTool = toolCalls.find(tc => tc.name === 'open_application');
                  const fallbackResolution = appTool ? (() => {
                    const rawApp = String(appTool.arguments?.appName || '').toLowerCase();
                    const q = appTool.arguments?.query;
                    const act = (appTool.arguments?.action as 'play' | 'search' | 'open') || (q ? 'search' : 'open');
                    let target = appTool.arguments?.targetUrl;
                    if (!target) {
                      if (rawApp.includes('youtube')) {
                        target = q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://www.youtube.com';
                      } else if (rawApp.includes('spotify')) {
                        target = q ? `https://open.spotify.com/search/${encodeURIComponent(q)}` : 'https://open.spotify.com';
                      } else if (rawApp.includes('amazon')) {
                        target = q ? `https://www.amazon.in/s?k=${encodeURIComponent(q)}` : 'https://www.amazon.in';
                      } else if (rawApp.includes('google')) {
                        target = q ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : 'https://www.google.com';
                      } else {
                        target = appTool.arguments?.appName;
                      }
                    }
                    const appTitle = rawApp.includes('youtube') ? 'YouTube' :
                      rawApp.includes('spotify') ? 'Spotify' :
                      rawApp.includes('amazon') ? 'Amazon' :
                      rawApp.includes('google') ? 'Google' :
                      appTool.arguments?.appName || 'Application';

                    return {
                      type: target && target.startsWith('http') ? 'open_url' : 'open_app',
                      target,
                      appName: appTitle,
                      action: act,
                      query: q,
                      displayTitle: `${act === 'play' ? 'Playing' : act === 'search' ? 'Searching' : 'Opening'} ${appTitle}${q ? `: "${q}"` : ''}`
                    };
                  })() : null;

                  const action: any = msg.clientAction || fallbackResolution;
                  if (!action) return null;

                  if (action.type === 'call_contact') {
                    return (
                      <div
                        className="chat-client-action-card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          padding: '12px 16px',
                          margin: '10px 0',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10b981'
                          }}>
                            <PhoneCall size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              Calling {action.contactName}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {action.phone || 'Phone Contact'}
                            </div>
                          </div>
                        </div>
                        {action.target && (
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.82rem',
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                            }}
                            onClick={() => { window.location.href = action.target; }}
                          >
                            <Phone size={14} fill="#fff" />
                            <span>Call Now</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (action.type === 'send_message') {
                    const isWa = action.platform !== 'sms';
                    return (
                      <div
                        className="chat-client-action-card"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          padding: '14px 16px',
                          margin: '10px 0',
                          borderRadius: '12px',
                          background: isWa
                            ? 'linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(18, 140, 126, 0.05))'
                            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.05))',
                          border: `1px solid ${isWa ? 'rgba(37, 211, 102, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
                          boxShadow: `0 4px 12px ${isWa ? 'rgba(37, 211, 102, 0.08)' : 'rgba(59, 130, 246, 0.08)'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: isWa ? 'rgba(37, 211, 102, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isWa ? '#25d366' : '#3b82f6'
                            }}>
                              <MessageCircle size={20} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {isWa ? 'WhatsApp' : 'SMS'} to {action.contactName}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {action.phone || 'Phone Contact'}
                              </div>
                            </div>
                          </div>
                          {action.target && (
                            <button
                              className="btn btn-sm"
                              style={{
                                fontSize: '0.82rem',
                                padding: '8px 16px',
                                background: isWa
                                  ? 'linear-gradient(135deg, #25d366, #128c7e)'
                                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: '#fff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: isWa ? '0 2px 8px rgba(37, 211, 102, 0.3)' : '0 2px 8px rgba(59, 130, 246, 0.3)'
                              }}
                              onClick={() => window.open(action.target, '_blank')}
                            >
                              <MessageCircle size={14} />
                              <span>Open {isWa ? 'WhatsApp' : 'SMS'}</span>
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                        {action.messageText && (
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(0, 0, 0, 0.15)',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                            borderLeft: `3px solid ${isWa ? '#25d366' : '#3b82f6'}`
                          }}>
                            💬 "{action.messageText}"
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isPlay = action.action === 'play';
                  const isSearch = action.action === 'search';

                  return (
                    <div
                      className="chat-client-action-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        padding: '12px 14px',
                        margin: '10px 0',
                        borderRadius: '10px',
                        background: isPlay
                          ? 'rgba(236, 72, 153, 0.08)'
                          : isSearch
                          ? 'rgba(56, 189, 248, 0.08)'
                          : 'rgba(16, 185, 129, 0.08)',
                        border: `1px solid ${
                          isPlay
                            ? 'rgba(236, 72, 153, 0.3)'
                            : isSearch
                            ? 'rgba(56, 189, 248, 0.3)'
                            : 'rgba(16, 185, 129, 0.3)'
                        }`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                          {isPlay ? (
                            <Play size={16} style={{ color: '#ec4899', fill: '#ec4899' }} />
                          ) : isSearch ? (
                            <Search size={16} style={{ color: '#38bdf8' }} />
                          ) : (
                            <CheckCircle2 size={16} style={{ color: 'var(--accent-green, #10b981)' }} />
                          )}
                          <span>
                            {action.displayTitle || (
                              <>
                                Action: <strong>{action.appName}</strong>
                                {action.type === 'open_url' ? ' ready in browser' : ' desktop launched'}
                              </>
                            )}
                          </span>
                        </div>
                        {action.type === 'open_url' && action.target && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '0.78rem',
                              padding: '6px 12px',
                              background: isPlay
                                ? 'linear-gradient(135deg, #ec4899, #f43f5e)'
                                : isSearch
                                ? 'linear-gradient(135deg, #0284c7, #2563eb)'
                                : 'linear-gradient(135deg, #059669, #10b981)',
                              color: '#fff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              borderRadius: '6px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                            onClick={() => window.open(action.target, '_blank')}
                          >
                            {isPlay ? <Play size={12} fill="#fff" /> : isSearch ? <Search size={12} /> : null}
                            <span>
                              {isPlay
                                ? `Play on ${action.appName}`
                                : isSearch
                                ? `Search on ${action.appName}`
                                : `Open ${action.appName}`}
                            </span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>

                      {/* Embedded YouTube Track Player */}
                      {action.videoId && (
                        <div style={{ width: '100%', maxWidth: '480px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.3)', marginTop: '4px' }}>
                          <iframe
                            width="100%"
                            height="240"
                            src={`https://www.youtube.com/embed/${action.videoId}?autoplay=1`}
                            title={action.displayTitle || "Playing Track"}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ display: 'block', border: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Tool Execution Badges */}
                {toolCalls.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: 'var(--text-accent)'
                        }}
                      >
                        <Wrench size={13} />
                        <span>
                          Tool: <strong>{tc.name}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Citations */}
                {citations.length > 0 && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: 'rgba(6, 182, 212, 0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      borderRadius: '8px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)',
                        marginBottom: '4px'
                      }}
                    >
                      <FileText size={13} />
                      <span>Grounded Citations ({citations.length}):</span>
                    </div>
                    {citations.map((c, cIdx) => (
                      <div key={cIdx} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        • <strong>{c.sourceTitle}</strong>: "{c.chunkText.slice(0, 90)}..."
                      </div>
                    ))}
                  </div>
                )}

                {/* Generated Workspace Artifact Card */}
                {msg.artifact && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                      <FileCode size={16} style={{ color: 'var(--accent-indigo)' }} />
                      <span>
                        Workspace Artifact: <strong>{msg.artifact.title}</strong> ({msg.artifact.type})
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 10px',
                        background: 'var(--accent-indigo)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px'
                      }}
                      onClick={() => onNavigateToView('artifacts')}
                    >
                      View Artifact →
                    </button>
                  </div>
                )}

                {/* Text-to-Speech Playback Button for Assistant */}
                {!isUser && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.74rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        borderRadius: '6px',
                        borderColor: speakingMsgId === msg.id ? 'var(--accent-indigo)' : undefined,
                        color: speakingMsgId === msg.id ? 'var(--accent-indigo)' : undefined
                      }}
                      onClick={() => speakMessage(msg.id, msg.content)}
                      title={speakingMsgId === msg.id ? 'Mute speech' : 'Listen with Voice'}
                    >
                      {speakingMsgId === msg.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{speakingMsgId === msg.id ? 'Stop Speech' : 'Listen with Voice'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="message-bubble message-assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={15} style={{ animation: 'floatSoft 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Prachi AI is reasoning & executing command...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compact & Unique Input Bar Dock */}
        <div className="chat-input-wrapper">
          {/* Multi-language selection pills */}
          <div className="chat-lang-bar">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
              <span>🌐 Voice & Chat:</span>
            </span>
            <button
              type="button"
              className={`chat-lang-pill ${selectedLang === 'hi-IN' ? 'active' : ''}`}
              onClick={() => setSelectedLang('hi-IN')}
              title="Hindi & Hinglish support"
            >
              हिंदी / Hinglish
            </button>
            <button
              type="button"
              className={`chat-lang-pill ${selectedLang === 'en-US' ? 'active' : ''}`}
              onClick={() => setSelectedLang('en-US')}
              title="English support"
            >
              English
            </button>
            <button
              type="button"
              className={`chat-lang-pill ${selectedLang === 'ur-PK' ? 'active' : ''}`}
              onClick={() => setSelectedLang('ur-PK')}
              title="Urdu language support"
            >
              اردو (Urdu)
            </button>
            <button
              type="button"
              className={`chat-lang-pill ${selectedLang === 'bho-IN' ? 'active' : ''}`}
              onClick={() => setSelectedLang('bho-IN')}
              title="Bhojpuri language support"
            >
              भोजपुरी (Bhojpuri)
            </button>
          </div>

          {/* Attachment Preview Dock */}
          {selectedFile && (
            <div className="chat-attachment-preview-dock">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon size={15} style={{ color: 'var(--accent-cyan)' }} />
                ) : (
                  <FileText size={15} style={{ color: 'var(--accent-indigo)' }} />
                )}
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 500
                  }}
                >
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Remove attachment"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div className="chat-input-bar">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="*/*"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach documents, photos, CSV, code for analysis"
            >
              <Paperclip size={16} />
            </button>

            {/* Input Field */}
            <input
              type="text"
              className="chat-input-field"
              placeholder={
                isRecording
                  ? '🎙️ Sun rahi hoon... bolna khatam hote hi automatic send ho jayega!'
                  : selectedFile
                  ? `Attached "${selectedFile.name}". Ask questions or analyze...`
                  : 'Ask Prachi AI, open YouTube/Notepad/Calculator, attach files...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              disabled={loading}
            />

            {/* Send Button */}
            <button
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={loading || (!input.trim() && !selectedFile)}
              title="Send message (Enter)"
            >
              <Send size={15} />
            </button>

            {/* Voice Assistant Button */}
            <button
              className={`chat-voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={startVoiceDictation}
              title={
                isRecording
                  ? 'Recording voice... bolna khatam karte hi automatic push ho jayega!'
                  : 'Voice Assistant (Girls voice, speech auto-push enabled)'
              }
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
