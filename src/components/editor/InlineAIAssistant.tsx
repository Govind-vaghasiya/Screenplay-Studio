// Interactive Floating Inline AI Assistant & Prompt Enhancer for Screenplay Editor
import { useState, useEffect, useRef } from 'react';
import {
  IconSparkles,
  IconCheck,
  IconX,
  IconRefreshCw,
  IconArrowRight,
  IconZap,
} from '@/components/common/Icons';
import {
  enhancePromptAI,
  executeInlineAIAssistant,
  getAIKeys,
} from '@/services/aiService';
import type { AIProvider } from '@/types';
import './InlineAIAssistant.css';

interface InlineAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  selectedText: string;
  scriptContext: string;
  onReplaceSelection: (fountainText: string) => void;
  onInsertBelow: (fountainText: string) => void;
  onInsertAbove: (fountainText: string) => void;
}

const QUICK_PROMPTS = [
  { label: '✨ Punch up Dialogue', prompt: 'Punch up this dialogue with witty, razor-sharp subtext and distinct character voice' },
  { label: '🎭 Deepen Subtext', prompt: 'Rewrite with heavy subtext, hidden motives, meaningful pauses, and unspoken tension' },
  { label: '🔥 Intensify Action', prompt: 'Intensify the action with rapid present-tense visual beats, sensory cues, and high stakes' },
  { label: '✂️ Make Lean & Fast', prompt: 'Tighten and trim unnecessary words, making the pacing brisk, cinematic, and punchy' },
  { label: '⚡ Continue Next Beat', prompt: 'Write the next dramatic screenplay beat that naturally escalates this scene' },
  { label: '🌐 Translate to Hindi', prompt: 'Adapt the spoken dialogue into natural, authentic conversational Hindi / Hinglish' },
];

export function InlineAIAssistant({
  isOpen,
  onClose,
  position,
  selectedText,
  scriptContext,
  onReplaceSelection,
  onInsertBelow,
  onInsertAbove,
}: InlineAIAssistantProps) {
  const [instruction, setInstruction] = useState('');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select provider with key or default to gemini
  useEffect(() => {
    if (isOpen) {
      const keys = getAIKeys();
      if (keys.gemini) setProvider('gemini');
      else if (keys.openai) setProvider('openai');
      else if (keys.anthropic) setProvider('anthropic');
      else setProvider('gemini');

      setInstruction('');
      setGeneratedText(null);
      setErrorMsg(null);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, selectedText]);

  // Handle ESC key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate clamped coordinates so popover stays on screen
  const popoverWidth = 460;
  const popoverHeight = generatedText ? 420 : 250;
  const clampedX = Math.max(16, Math.min(position.x - 20, window.innerWidth - popoverWidth - 24));
  const clampedY = Math.max(70, Math.min(position.y + 12, window.innerHeight - popoverHeight - 24));

  // "✨ Enhance Prompt" (Bolt.ai style prompt enhancer)
  const handleEnhancePrompt = async () => {
    if (!instruction.trim()) return;
    setIsEnhancing(true);
    setErrorMsg(null);
    try {
      const enhanced = await enhancePromptAI(provider, instruction, selectedText || scriptContext.slice(-300));
      setInstruction(enhanced);
    } catch (err: any) {
      console.warn('Enhance prompt failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Generate / Execute AI
  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || instruction;
    if (!promptToUse.trim()) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const result = await executeInlineAIAssistant(
        provider,
        promptToUse.trim(),
        selectedText,
        scriptContext
      );
      setGeneratedText(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate AI screenplay response.');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasSelection = selectedText && selectedText.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="inline-ai-popover"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
      }}
    >
      {/* Clean Header Bar */}
      <div className="inline-ai-header">
        <div className="inline-ai-title">
          <IconSparkles size={15} className="sparkle-icon" />
          <span>Screenplay AI Assistant</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            className="inline-ai-provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            title="AI Model Engine"
          >
            <option value="gemini">Gemini 2.5 Flash</option>
            <option value="openai">OpenAI GPT-4o</option>
            <option value="anthropic">Claude 3.5 Sonnet</option>
          </select>

          <button className="inline-ai-close-btn" onClick={onClose} title="Close (Esc)">
            <IconX size={13} />
          </button>
        </div>
      </div>

      {/* Main Input with Bolt-style Enhance Button */}
      <div className="inline-ai-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="inline-ai-input"
          placeholder={
            hasSelection
              ? 'Instruct AI: e.g. "Make dialogue sarcastic", "Add stutter", "Intensify action"...'
              : 'Write next beat: e.g. "Maya finds hidden transmitter", "Dr. Vance enters"...'
          }
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          disabled={isGenerating}
        />

        {/* Bolt-style Enhance Prompt Button */}
        <button
          type="button"
          className={`inline-ai-enhance-btn ${isEnhancing ? 'enhancing' : ''}`}
          onClick={handleEnhancePrompt}
          disabled={!instruction.trim() || isEnhancing || isGenerating}
          title="Enhance your prompt with professional screenwriting directives"
        >
          <IconZap size={12} />
          <span>{isEnhancing ? 'Enhancing...' : 'Enhance'}</span>
        </button>

        {/* Generate Submit Button */}
        <button
          type="button"
          className="inline-ai-submit-btn"
          onClick={() => handleGenerate()}
          disabled={!instruction.trim() || isGenerating}
          title="Generate with AI (Enter)"
        >
          {isGenerating ? (
            <IconRefreshCw size={13} className="spin-icon" />
          ) : (
            <IconArrowRight size={14} />
          )}
        </button>
      </div>

      {/* Quick Prompt Chips */}
      {!generatedText && !isGenerating && (
        <div className="inline-ai-chips-row">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              className="inline-ai-chip"
              onClick={() => {
                setInstruction(qp.prompt);
                handleGenerate(qp.prompt);
              }}
              title={qp.prompt}
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="inline-ai-error">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generating Loader */}
      {isGenerating && (
        <div className="inline-ai-loading">
          <IconSparkles size={18} className="pulse-ai-icon" />
          <span>Writing cinematic screenplay with {provider.toUpperCase()}...</span>
        </div>
      )}

      {/* Generated Result Preview & Actions */}
      {generatedText && !isGenerating && (
        <div className="inline-ai-result-panel">
          <div className="result-header">
            <span className="result-title">Generated Screenplay Text:</span>
            <button
              className="result-retry-btn"
              onClick={() => handleGenerate()}
              title="Regenerate with same prompt"
            >
              <IconRefreshCw size={11} />
              <span>Regenerate</span>
            </button>
          </div>

          <pre className="result-fountain-box">{generatedText}</pre>

          <div className="result-actions-row">
            {hasSelection ? (
              <button
                className="result-action-btn primary"
                onClick={() => {
                  onReplaceSelection(generatedText);
                  onClose();
                }}
              >
                <IconCheck size={13} />
                <span>Replace Selection</span>
              </button>
            ) : (
              <button
                className="result-action-btn primary"
                onClick={() => {
                  onInsertBelow(generatedText);
                  onClose();
                }}
              >
                <IconCheck size={13} />
                <span>Insert at Cursor</span>
              </button>
            )}

            {hasSelection && (
              <button
                className="result-action-btn secondary"
                onClick={() => {
                  onInsertBelow(generatedText);
                  onClose();
                }}
                title="Keep original text and insert new text below"
              >
                <span>Insert Below</span>
              </button>
            )}

            <button
              className="result-action-btn secondary"
              onClick={() => {
                onInsertAbove(generatedText);
                onClose();
              }}
              title="Insert new text above"
            >
              <span>Insert Above</span>
            </button>

            <button className="result-action-btn ghost" onClick={onClose}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
