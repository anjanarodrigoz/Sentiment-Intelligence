import { useState, useEffect } from 'react';
import { Zap, Brain, CircleCheck, CircleX, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { checkLlmStatus } from '../../services/llmAnalyzer';

export default function AnalysisMethodSelector() {
  const { analysisMethod, llmModel, setAnalysisMethod, setLlmModel } = useAppStore();
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

      <div className="grid grid-cols-2 gap-3 max-w-md">
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
      </div>

      {/* LLM details when selected or status info */}
      <div className="mt-3 max-w-md">
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

        {!checking && !ollamaRunning && (
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
