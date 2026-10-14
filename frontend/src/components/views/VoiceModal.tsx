import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Bot, Globe, Radio } from 'lucide-react';
import { api } from '../../services/api';
import { playSweetFemaleVoice, stopSweetVoice } from '../../utils/speechVoiceHelper';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ isOpen, onClose, currentModel }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-US' | 'ur-PK' | 'bho-IN'>('hi-IN');
  const [autoSend, setAutoSend] = useState(true);
  const recognitionRef = useRef<any>(null);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const stopSpeaking = () => {
    stopSweetVoice();
    setIsSpeaking(false);
  };

  /**
   * Speak Text in a SWEET, MELODIOUS FEMALE VOICE ("Manmohak Girls Voice"):
   * Uses sweet acoustics (pitch 1.12, rate 0.94) with top natural Hindi/English female voices.
   */
  const speakText = (text: string) => {
    stopSpeaking();
    setIsSpeaking(true);
    playSweetFemaleVoice(text, {
      lang: voiceLang,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const handleSubmitVoice = async (queryText?: string) => {
    const text = (queryText || transcript).trim();
    if (!text || processing) return;

    setProcessing(true);
    stopListening();
    try {
      const res = await api.sendMessage({
        message: text,
        provider: currentModel
      });

      setAssistantReply(res.response);
      speakText(res.response);
    } catch (e: any) {
      setAssistantReply(`Error: ${e.message || 'Speech query failed'}`);
    } finally {
      setProcessing(false);
    }
  };

  const startListening = () => {
    stopSpeaking();
    setTranscript('');
    setAssistantReply('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Auto ends when user stops talking
        recognition.interimResults = true;
        recognition.lang = voiceLang === 'bho-IN' ? 'hi-IN' : voiceLang;

        let captured = '';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              captured += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const text = (captured || interim).trim();
          if (text) setTranscript(text);
        };

        recognition.onend = () => {
          setIsListening(false);
          // AUTO-PUSH: When user finishes speaking, push immediately!
          const finalText = captured.trim() || transcript.trim();
          if (autoSend && finalText) {
            handleSubmitVoice(finalText);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition event:', e?.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn('Recognition start exception', e);
        setIsListening(false);
      }
    } else {
      // Fallback simulation for unsupported browsers
      const sampleText = voiceLang === 'hi-IN'
        ? 'Prachi AI, aasmaan neela kyu dikhta hai?'
        : voiceLang === 'bho-IN'
        ? 'Kaisan baani?'
        : voiceLang === 'ur-PK'
        ? 'Adaab, aap kaun hain?'
        : 'What is quantum computing and how does it work?';
      setTranscript(sampleText);
      setTimeout(() => {
        handleSubmitVoice(sampleText);
      }, 1200);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickVoicePrompts = voiceLang === 'hi-IN'
    ? [
        'Tum kaun ho aur kya kar sakti ho?',
        'Calculate 1250 * 18 + 450',
        'Mausam kaisa hai?',
        'Photosynthesis kya hai?'
      ]
    : voiceLang === 'bho-IN'
    ? [
        'Kaisan baani?',
        'Raur kaun haeen?',
        'Calculate 100 * 25',
        'Kaise ba?'
      ]
    : voiceLang === 'ur-PK'
    ? [
        'Adaab, aapka mizaaj kaisa hai?',
        'Aap kaun hain?',
        'Calculate 450 * 10',
        'Shukriya'
      ]
    : [
        'What is quantum computing?',
        'Calculate 450 * 12 + 600',
        'What is the stock price of TSLA?',
        'Give me a productivity routine'
      ];

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '540px', textAlign: 'center', padding: '32px 28px' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid var(--border-active)', borderRadius: '20px', fontSize: '0.74rem', color: 'var(--text-accent)' }}>
            <Radio size={12} style={{ animation: isListening ? 'pulse 1s infinite' : 'none' }} />
            <span>Interactive Voice Agent (Girls Voice)</span>
          </div>
        </div>

        {/* Multi-Language Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Globe size={12} />
            <span>Lang:</span>
          </span>
          <button
            type="button"
            className={`chat-lang-pill ${voiceLang === 'hi-IN' ? 'active' : ''}`}
            onClick={() => { setVoiceLang('hi-IN'); stopListening(); }}
          >
            हिंदी / Hinglish
          </button>
          <button
            type="button"
            className={`chat-lang-pill ${voiceLang === 'en-US' ? 'active' : ''}`}
            onClick={() => { setVoiceLang('en-US'); stopListening(); }}
          >
            English
          </button>
          <button
            type="button"
            className={`chat-lang-pill ${voiceLang === 'ur-PK' ? 'active' : ''}`}
            onClick={() => { setVoiceLang('ur-PK'); stopListening(); }}
          >
            اردو (Urdu)
          </button>
          <button
            type="button"
            className={`chat-lang-pill ${voiceLang === 'bho-IN' ? 'active' : ''}`}
            onClick={() => { setVoiceLang('bho-IN'); stopListening(); }}
          >
            भोजपुरी (Bhojpuri)
          </button>
        </div>

        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>
          Prachi Voice Assistant
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Speak in Hindi, English, Urdu, or Bhojpuri. Speech automatically sends on silence!
        </p>

        {/* Glowing Animated Prachi AI Voice Sphere */}
        <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
          <div
            style={{
              width: isListening || isSpeaking ? '90px' : '76px',
              height: isListening || isSpeaking ? '90px' : '76px',
              borderRadius: '50%',
              background: isListening
                ? 'radial-gradient(circle, #ec4899 0%, #8b5cf6 60%, #3b82f6 100%)'
                : isSpeaking
                ? 'radial-gradient(circle, #06b6d4 0%, #6366f1 60%, #a855f7 100%)'
                : 'radial-gradient(circle, #6366f1 0%, #4338ca 70%, #1e1b4b 100%)',
              boxShadow: isListening
                ? '0 0 35px rgba(236, 72, 153, 0.6), 0 0 70px rgba(139, 92, 246, 0.4)'
                : isSpeaking
                ? '0 0 35px rgba(6, 182, 212, 0.6), 0 0 70px rgba(99, 102, 241, 0.4)'
                : '0 0 20px rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              animation: isListening || isSpeaking ? 'floatSoft 2s ease-in-out infinite' : 'none'
            }}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? 'Click to stop listening' : 'Click to start speaking'}
          >
            {isListening ? (
              <MicOff size={32} color="#ffffff" />
            ) : isSpeaking ? (
              <Volume2 size={32} color="#ffffff" />
            ) : (
              <Mic size={30} color="#ffffff" />
            )}
          </div>
        </div>

        {/* Status text */}
        <div style={{ fontSize: '0.84rem', color: isListening ? '#f43f5e' : isSpeaking ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: 600, marginBottom: '16px' }}>
          {isListening ? '🎙️ Listening to you... speak now' : isSpeaking ? '🔊 Prachi AI is speaking...' : processing ? '🧠 Processing cognitive response...' : 'Push button below or click the glowing orb to speak'}
        </div>

        {/* Transcript Box */}
        {transcript && (
          <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '14px', fontSize: '0.88rem', textAlign: 'left' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginBottom: '4px', fontWeight: 700 }}>YOU SAID:</span>
            "{transcript}"
          </div>
        )}

        {/* Assistant Reply Box */}
        {assistantReply && (
          <div style={{ padding: '14px 16px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '10px', border: '1px solid var(--border-active)', marginBottom: '18px', textAlign: 'left', fontSize: '0.86rem', maxHeight: '160px', overflowY: 'auto' }}>
            <span style={{ color: 'var(--accent-indigo)', fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>PRACHI AI:</span>
            {assistantReply}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {isListening ? (
            <button className="btn btn-outline-danger" onClick={stopListening}>
              <MicOff size={16} />
              <span>Stop Listening</span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={startListening} disabled={processing}>
              <Mic size={16} />
              <span>{processing ? 'Thinking...' : 'Push to Talk'}</span>
            </button>
          )}

          {transcript && !isListening && (
            <button className="btn btn-secondary" onClick={() => handleSubmitVoice()} disabled={processing}>
              <Sparkles size={16} />
              <span>Submit Query</span>
            </button>
          )}

          {isSpeaking && (
            <button className="btn btn-secondary" onClick={stopSpeaking}>
              <VolumeX size={16} />
              <span>Mute Voice</span>
            </button>
          )}
        </div>

        {/* Quick Voice Suggestions */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
            OR TRY ASKING ONE OF THESE BY VOICE:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {quickVoicePrompts.map((p, idx) => (
              <button
                key={idx}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                onClick={() => {
                  setTranscript(p);
                  handleSubmitVoice(p);
                }}
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
