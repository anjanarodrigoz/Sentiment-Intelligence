import { useState, useEffect } from 'react';
import { Zap, Brain, CircleCheck, CircleX, ChevronDown, Cloud } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { checkLlmStatus } from '../../services/llmAnalyzer';

export default function AnalysisMethodSelector() {
  const { 
    analysisMethod, 
    llmModel, 
    setAnalysisMethod, 
    setLlmModel,
    cloudProvider,
    cloudApiKey,
    setCloudProvider,
    setCloudApiKey
  } = useAppStore();
  const [ollamaRunning, setOllamaRunning] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);

    checkLlmStatus().then((status) => {
      if (cancelled) return;
      setOllamaRunning(status.running);
      setAvailableModels(status.models);
      if (!status.running && analysisMethod === 'llm') {
        setAnalysisMethod('vader');
      }
      setChecking(false);
    });

    return () => { cancelled = true; };
  }, [analysisMethod, setAnalysisMethod]);

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Analysis Method</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
        {/* VADER option */}
        <button
          onClick={() => setAnalysisMethod('vader')}
          className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 text-left transition-colors ${
            analysisMethod === 'vader'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${analysisMethod === 'vader' ? 'text-primary' : 'text-text-secondary'}`} />
            <span className={`text-sm font-medium ${analysisMethod === 'vader' ? 'text-primary' : 'text-text-primary'}`}>
              VADER
            </span>
          </div>
          <span className="text-xs text-text-secondary">Fast, client-side analysis</span>
        </button>

        {/* LLM option */}
        <button
          onClick={() => ollamaRunning && setAnalysisMethod('llm')}
          disabled={!ollamaRunning}
          className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 text-left transition-colors ${
            analysisMethod === 'llm'
              ? 'border-primary bg-primary/5'
              : !ollamaRunning
                ? 'border-border opacity-50 cursor-not-allowed'
                : 'border-border hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Brain className={`w-4 h-4 ${analysisMethod === 'llm' ? 'text-primary' : 'text-text-secondary'}`} />
            <span className={`text-sm font-medium ${analysisMethod === 'llm' ? 'text-primary' : 'text-text-primary'}`}>
              Local LLM
            </span>
          </div>
          <span className="text-xs text-text-secondary">Smarter, via Ollama</span>
        </button>

        {/* Cloud LLM option */}
        <button
          onClick={() => setAnalysisMethod('cloud')}
          className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 text-left transition-colors ${
            analysisMethod === 'cloud'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cloud className={`w-4 h-4 ${analysisMethod === 'cloud' ? 'text-primary' : 'text-text-secondary'}`} />
            <span className={`text-sm font-medium ${analysisMethod === 'cloud' ? 'text-primary' : 'text-text-primary'}`}>
              Cloud API
            </span>
          </div>
          <span className="text-xs text-text-secondary">OpenAI, Gemini, etc.</span>
        </button>
      </div>

      {/* LLM details when selected or status info */}
      <div className="mt-4 max-w-md">
        {analysisMethod === 'llm' && ollamaRunning && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CircleCheck className="w-3.5 h-3.5 text-sentiment-positive" />
              <span className="text-xs text-sentiment-positive">Connected</span>
            </div>
            {availableModels.length > 0 && (
              <div className="relative">
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="text-xs appearance-none bg-white border border-border rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            )}
          </div>
        )}

        {analysisMethod === 'cloud' && (
          <div className="flex flex-col gap-3 border border-border p-3 rounded-lg bg-gray-50/50">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-primary w-20">Provider:</label>
              <div className="relative flex-1">
                <select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value as any)}
                  className="w-full text-xs appearance-none bg-white border border-border rounded-md pl-2 pr-6 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="openai">OpenAI (gpt-4o-mini)</option>
                  <option value="gemini">Google Gemini (gemini-2.5-flash)</option>
                  <option value="anthropic">Anthropic (claude-3-5-haiku)</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-primary w-20">API Key:</label>
              <input
                type="password"
                value={cloudApiKey}
                onChange={(e) => setCloudApiKey(e.target.value)}
                placeholder={`Enter your ${cloudProvider} API Key...`}
                className="flex-1 text-xs bg-white border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {!checking && !ollamaRunning && analysisMethod !== 'cloud' && (
          <div className="flex items-center gap-1.5">
            <CircleX className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-xs text-text-secondary">
              Ollama not running — install and start with <code className="bg-gray-100 px-1 rounded">ollama serve</code>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
