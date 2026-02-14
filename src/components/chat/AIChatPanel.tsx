import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Key, Sparkles, Brain, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { sendChatMessage, type ChatMessage as ChatMsg } from '../../services/aiChat';
import { sendLlmChatMessage } from '../../services/llmChat';
import { checkLlmStatus } from '../../services/llmAnalyzer';
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
  const [chatProvider, setChatProvider] = useState<'claude' | 'llm'>('claude');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [ollamaRunning, setOllamaRunning] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { analyses, aggregateAnalysis } = useAppStore();

  const activeAnalyses = aggregateAnalysis ? [aggregateAnalysis] : analyses;

  // Check Ollama status on mount
  useEffect(() => {
    checkLlmStatus().then((status) => {
      setOllamaRunning(status.running);
      setOllamaModels(status.models);
      if (status.running && status.models.length > 0) {
        setSelectedModel(status.models[0]);
      }
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const isReady = chatProvider === 'llm' ? ollamaRunning : !!apiKey;

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || !isReady) return;

    const newMessages: ChatMsg[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');
    setStreamingContent('');

    try {
      if (chatProvider === 'llm') {
        let accumulated = '';
        const fullResponse = await sendLlmChatMessage(
          newMessages,
          activeAnalyses,
          selectedModel,
          (token) => {
            accumulated += token;
            setStreamingContent(accumulated);
          }
        );
        setStreamingContent('');
        setMessages([...newMessages, { role: 'assistant', content: fullResponse }]);
      } else {
        const response = await sendChatMessage(newMessages, activeAnalyses, apiKey);
        setMessages([...newMessages, { role: 'assistant', content: response }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
      setStreamingContent('');
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

      {/* Provider toggle */}
      <div className="px-4 py-2 border-b border-border bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={() => setChatProvider('claude')}
            className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-colors ${
              chatProvider === 'claude'
                ? 'bg-primary text-white'
                : 'bg-white text-text-secondary border border-border hover:bg-gray-100'
            }`}
          >
            Claude API
          </button>
          <button
            onClick={() => ollamaRunning && setChatProvider('llm')}
            disabled={!ollamaRunning}
            className={`flex-1 text-xs py-1.5 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
              chatProvider === 'llm'
                ? 'bg-primary text-white'
                : !ollamaRunning
                  ? 'bg-gray-100 text-text-secondary/50 cursor-not-allowed'
                  : 'bg-white text-text-secondary border border-border hover:bg-gray-100'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Local LLM
          </button>
        </div>

        {/* LLM model selector */}
        {chatProvider === 'llm' && ollamaModels.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-text-secondary">Model:</span>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-xs appearance-none bg-white border border-border rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ollamaModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* API Key setup (Claude only) */}
      {chatProvider === 'claude' && showKeyInput && (
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
        {messages.length === 0 && !streamingContent && (
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
                  disabled={!isReady || loading}
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
        {streamingContent && (
          <ChatMessage role="assistant" content={streamingContent} />
        )}
        {loading && !streamingContent && (
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
            placeholder={
              isReady
                ? 'Ask about the analysis...'
                : chatProvider === 'claude'
                  ? 'Enter API key first'
                  : 'Ollama not running'
            }
            disabled={!isReady || loading}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50"
          />
          <Button
            size="sm"
            disabled={!input.trim() || !isReady || loading}
            onClick={() => handleSend()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {chatProvider === 'claude' && !apiKey && (
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
