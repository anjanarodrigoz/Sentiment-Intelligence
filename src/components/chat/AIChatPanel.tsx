import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Key, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { sendChatMessage, type ChatMessage as ChatMsg } from '../../services/aiChat';
import ChatMessage from './ChatMessage';
import Button from '../ui/Button';

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  "What's the most common complaint?",
  'What are the top strengths?',
  'How do customers feel about the fit?',
  'Summarize the overall sentiment.',
];

export default function AIChatPanel({ open, onClose }: AIChatPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { analyses, aggregateAnalysis } = useAppStore();

  const activeAnalyses = aggregateAnalysis ? [aggregateAnalysis] : analyses;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || !apiKey) return;

    const newMessages: ChatMsg[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await sendChatMessage(newMessages, activeAnalyses, apiKey);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl border-l border-border z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* API Key setup */}
      {showKeyInput && (
        <div className="p-4 bg-blue-50 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Anthropic API Key</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button
              size="sm"
              disabled={!apiKey}
              onClick={() => setShowKeyInput(false)}
            >
              Save
            </Button>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Key is stored in memory only — never saved to disk.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-text-secondary mb-4">
              Ask questions about your analysis data
            </p>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={!apiKey || loading}
                  className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-text-secondary text-sm p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Thinking...
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={apiKey ? 'Ask about the analysis...' : 'Enter API key first'}
            disabled={!apiKey || loading}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50"
          />
          <Button
            size="sm"
            disabled={!input.trim() || !apiKey || loading}
            onClick={() => handleSend()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!apiKey && (
          <button
            onClick={() => setShowKeyInput(true)}
            className="text-xs text-primary mt-1 hover:underline"
          >
            Configure API key
          </button>
        )}
      </div>
    </div>
  );
}
