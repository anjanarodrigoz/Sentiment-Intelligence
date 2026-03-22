import { useState, useEffect } from 'react';
import { Zap, Brain, CircleCheck, CircleX, ChevronDown } from 'lucide-react';
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

  // Determine the current unified selected value
  const selectedAiId = analysisMethod === 'llm' 
    ? `local:${llmModel}` 
    : analysisMethod === 'cloud' 
      ? `cloud:${cloudProvider}`
      : '';

  const handleAiModelSelect = (val: string) => {
    if (val.startsWith('local:')) {
      setAnalysisMethod('llm');
      setLlmModel(val.replace('local:', ''));
    } else if (val.startsWith('cloud:')) {
      setAnalysisMethod('cloud');
      setCloudProvider(val.replace('cloud:', '') as any);
    }
  };

  const handleAiModeActivate = () => {
    // If the user clicks "AI Model", default to cloud if no local models exist, otherwise use whatever is currently saved
    if (analysisMethod !== 'llm' && analysisMethod !== 'cloud') {
      if (ollamaRunning && availableModels.length > 0) {
        setAnalysisMethod('llm');
      } else {
        setAnalysisMethod('cloud');
      }
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Analysis Method</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
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
          <span className="text-xs text-text-secondary">Fast, basic client-side lexical scoring</span>
        </button>

        {/* AI Model option */}
        <button
          onClick={handleAiModeActivate}
          className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 text-left transition-colors ${
            analysisMethod === 'llm' || analysisMethod === 'cloud'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Brain className={`w-4 h-4 ${(analysisMethod === 'llm' || analysisMethod === 'cloud') ? 'text-primary' : 'text-text-secondary'}`} />
            <span className={`text-sm font-medium ${(analysisMethod === 'llm' || analysisMethod === 'cloud') ? 'text-primary' : 'text-text-primary'}`}>
              AI Model (Advanced)
            </span>
          </div>
          <span className="text-xs text-text-secondary">Deep reasoning via Cloud or Local models</span>
        </button>
      </div>

      {/* AI Model selection details */}
      <div className="mt-4 max-w-md">
        {(analysisMethod === 'llm' || analysisMethod === 'cloud') && (
          <div className="flex flex-col gap-3 border border-border p-3 rounded-lg bg-gray-50/50">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-text-primary w-20">Select Model:</label>
              <div className="relative flex-1">
                <select
                  value={selectedAiId}
                  onChange={(e) => handleAiModelSelect(e.target.value)}
                  className="w-full text-xs appearance-none bg-white border border-border rounded-md pl-2 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <optgroup label="Cloud Providers">
                    <option value="cloud:openai">OpenAI (gpt-4o-mini)</option>
                    <option value="cloud:gemini">Google Gemini (gemini-2.5-flash)</option>
                    <option value="cloud:anthropic">Anthropic (claude-3-5-haiku)</option>
                  </optgroup>
                  
                  {ollamaRunning && availableModels.length > 0 ? (
                    <optgroup label="Local Models (Ollama)">
                      {availableModels.map((m) => (
                        <option key={`local:${m}`} value={`local:${m}`}>
                          {m} (Local)
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <optgroup label="Local Models">
                      <option disabled>Ollama not running or no models found</option>
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* API Key only required for cloud providers */}
            {analysisMethod === 'cloud' && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-text-primary w-20">API Key:</label>
                <input
                  type="password"
                  value={cloudApiKey}
                  onChange={(e) => setCloudApiKey(e.target.value)}
                  placeholder={`Enter ${cloudProvider === 'openai' ? 'OpenAI' : cloudProvider === 'gemini' ? 'Gemini' : 'Anthropic'} API Key...`}
                  className="flex-1 text-xs bg-white border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
            
            {/* Status indicators */}
            {analysisMethod === 'llm' && ollamaRunning && (
              <div className="flex items-center gap-1.5 mt-1 ml-24">
                <CircleCheck className="w-3.5 h-3.5 text-sentiment-positive" />
                <span className="text-xs text-sentiment-positive">Connected to local instance</span>
              </div>
            )}
            
            {!checking && !ollamaRunning && analysisMethod === 'llm' && (
              <div className="flex items-center gap-1.5 mt-1 ml-24">
                <CircleX className="w-3.5 h-3.5 text-sentiment-negative" />
                <span className="text-xs text-sentiment-negative">
                  Connection Failed
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
