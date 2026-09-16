import { useState, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { IconSparkles, IconX, IconLoader } from '@/components/common/Icons';
import {
  generateSceneFromPrompt,
  continueWritingScript,
  rewriteSelection,
  getAIKeys,
} from '@/services/aiService';
import type { AIProvider } from '@/types';
import './AIAssistantDrawer.css';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFountain: (fountainText: string) => void;
  scriptContext: string;
  selectedText?: string;
}

export function AIAssistantDrawer({
  isOpen,
  onClose,
  onInsertFountain,
  scriptContext,
  selectedText = '',
}: AIAssistantDrawerProps) {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [activeTab, setActiveTab] = useState<'scene' | 'continue' | 'rewrite'>('scene');
  const [prompt, setPrompt] = useState('');
  const [rewriteInstruction, setRewriteInstruction] = useState('Make dialogue more dramatic & tense');
  const [customRewriteText, setCustomRewriteText] = useState(selectedText);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync selectedText whenever it changes
  useEffect(() => {
    if (selectedText) {
      setCustomRewriteText(selectedText);
    }
  }, [selectedText]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      let result = '';
      if (activeTab === 'scene') {
        const p = prompt.trim() || 'A tense, unexpected revelation in the observatory.';
        result = await generateSceneFromPrompt(provider, p, scriptContext.slice(-1200));
      } else if (activeTab === 'continue') {
        result = await continueWritingScript(provider, scriptContext.slice(-1500));
      } else if (activeTab === 'rewrite') {
        const textToRewrite = customRewriteText.trim() || selectedText.trim() || scriptContext.slice(-400);
        if (!textToRewrite) {
          setErrorMsg('Please select text or type dialogue to rewrite.');
          setIsGenerating(false);
          return;
        }
        result = await rewriteSelection(provider, textToRewrite, rewriteInstruction);
      }
      setGeneratedResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Generation error. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!generatedResult) return;
    onInsertFountain(generatedResult);
    onClose();
  };

  const keys = getAIKeys();
  const hasKey = Boolean(keys[provider]);

  return (
    <div className="ai-drawer-overlay">
      <div className="ai-drawer">
        {/* Header */}
        <div className="ai-drawer-header">
          <div className="ai-drawer-title">
            <IconSparkles size={20} color="var(--color-accent-400)" />
            <h3>AI Screenwriting Co-Pilot</h3>
          </div>
          <button className="ai-close-btn" onClick={onClose} title="Close AI Assistant">
            <IconX size={18} />
          </button>
        </div>

        {/* Provider Selector */}
        <div className="ai-provider-select-bar">
          <span className="provider-label">Provider:</span>
          {(['gemini', 'openai', 'anthropic'] as AIProvider[]).map((p) => (
            <button
              key={p}
              className={`provider-chip ${provider === p ? 'active' : ''}`}
              onClick={() => setProvider(p)}
            >
              {p === 'gemini' ? 'Gemini 2.5' : p === 'openai' ? 'GPT-4o' : 'Claude 3.5'}
            </button>
          ))}
        </div>

        {!hasKey && (
          <div className="ai-key-warning" style={{ color: '#fbbf24', fontSize: '11px', padding: '6px 10px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '4px', margin: '4px 16px' }}>
            ⚡ <strong>Smart Hollywood Engine Active</strong> (Add your BYO-Key in Settings for custom live API calls).
          </div>
        )}

        {/* Action Tabs */}
        <div className="ai-tabs-bar">
          <button
            className={`ai-tab ${activeTab === 'scene' ? 'active' : ''}`}
            onClick={() => setActiveTab('scene')}
          >
            ✨ Generate Scene
          </button>
          <button
            className={`ai-tab ${activeTab === 'continue' ? 'active' : ''}`}
            onClick={() => setActiveTab('continue')}
          >
            ✒️ Continue Script
          </button>
          <button
            className={`ai-tab ${activeTab === 'rewrite' ? 'active' : ''}`}
            onClick={() => setActiveTab('rewrite')}
          >
            ✍️ Rewrite Selection
          </button>
        </div>

        {/* Tab Controls */}
        <div className="ai-controls-body">
          {activeTab === 'scene' && (
            <div>
              <label className="input-label">Scene Prompt / Beat Outline:</label>
              <textarea
                className="ai-textarea"
                rows={3}
                placeholder="e.g. Maya and Aris decode the second transmission while power grid fails..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          )}

          {activeTab === 'continue' && (
            <p className="ai-hint">
              AI analyzes the preceding screenplay pages and auto-generates the next dramatic scene transition with continuous character voices.
            </p>
          )}

          {activeTab === 'rewrite' && (
            <div>
              <label className="input-label">Rewrite Goal:</label>
              <select
                className="ai-select"
                value={rewriteInstruction}
                onChange={(e) => setRewriteInstruction(e.target.value)}
              >
                <option value="Make dialogue more dramatic & tense">Make dialogue more dramatic & tense</option>
                <option value="Make action descriptions more concise and visual">Make action descriptions concise & visual</option>
                <option value="Add noir tone and subtext">Add noir tone and subtext</option>
                <option value="Fix pacing and rhythm">Fix pacing & rhythm</option>
              </select>

              <label className="input-label" style={{ marginTop: '8px' }}>
                Text to Rewrite:
              </label>
              <textarea
                className="ai-textarea"
                rows={3}
                placeholder="Select text in editor or type/paste here..."
                value={customRewriteText}
                onChange={(e) => setCustomRewriteText(e.target.value)}
              />
            </div>
          )}

          {errorMsg && <div className="ai-error">{errorMsg}</div>}

          <Button
            variant="primary"
            icon={isGenerating ? <IconLoader size={16} /> : <IconSparkles size={16} />}
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ width: '100%', marginTop: 'var(--space-3)' }}
          >
            {isGenerating ? 'Composing Screenplay...' : 'Generate with AI'}
          </Button>
        </div>

        {/* Generated Result Preview */}
        {generatedResult && (
          <div className="ai-result-preview">
            <div className="result-header">
              <span>Generated Fountain Preview:</span>
            </div>
            <pre className="result-code">{generatedResult}</pre>
            <div className="result-actions">
              <Button variant="ghost" size="sm" onClick={() => setGeneratedResult('')}>
                Discard
              </Button>
              <Button variant="primary" size="sm" onClick={handleInsert}>
                Insert Into Screenplay
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
