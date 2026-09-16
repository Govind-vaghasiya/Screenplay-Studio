// Import Script or Story Modal — Multi-format Drag-and-Drop, Paste & AI Conversion
import { useState, useRef, useEffect, useMemo, useId } from 'react';
import type { Descendant } from 'slate';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import {
  IconUpload,
  IconFileText,
  IconSparkles,
  IconTrash,
  IconFilm,
  IconUser,
} from '@/components/common/Icons';
import {
  parseFountainToSlate,
  parseFDXToSlate,
  parsePlainTextStoryToSlate,
  extractTextFromFile,
  analyzeScreenplayNodes,
  isTranscriptionOrStory,
  convertStoryOrTranscriptToFountain,
  cleanTranscriptionText,
  type ScreenplayMetadata,
} from '@/services/scriptImportService';
import { convertStoryToScreenplayAI, getAIKeys } from '@/services/aiService';
import { useNotificationStore } from '@/stores/notificationStore';
import './ImportScriptModal.css';

interface ImportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (result: {
    title: string;
    genre: string;
    logline: string;
    nodes: Descendant[];
    targetMode?: 'replace' | 'append';
  }) => void;
  mode?: 'create-project' | 'editor-import';
}

const SAMPLE_FOUNTAIN = `Title: Neon Horizon
Author: Alex Morgan
Genre: Cyberpunk Thriller
Logline: A rogue hacker in Neo-Tokyo uncovers a neural frequency that can alter human memory.

EXT. NEO-TOKYO - INDUSTRIAL DISTRICT - NIGHT

Acid rain slicks the chrome alleys. Holographic billboards project shimmering blue cybernetic eyes over the smog.

KAI (20s), drenched in a high-collar synth-leather trench, sprints across a steam vent.

KAI
(into comm-link)
Echo, I have the memory core. Security is five seconds behind me.

ECHO (V.O.)
Take the maintenance conduit under array four! Do not let them breach the firewall.

A spotlight PIERCES the downpour. ENFORCER DRONES descend from the high-rise girders with humming stun-cannons.

SMASH CUT TO:`;

const SAMPLE_STORY_PROSE = `The storm battered the glass observation dome on Kepler-186f. 

Elena stared at the sensor array. Her heart was racing. "Marcus, look at the telemetry readings," she whispered, pointing at the amber monitor.

Marcus put down his thermal mug. "What are you seeing? Is it another solar flare?"

"No," Elena replied, shaking her head. "It's an encrypted harmonic pulse. It is repeating in prime numbers."

Before Marcus could answer, the red emergency beacon flashed to life, bathing the entire control room in crimson light.`;

const SAMPLE_AUDIO_TRANSCRIPT = `00;00;02;01 - 00;00;17;29
Speaker 1
एक कहानी ऐसी भी: अनजानी दस्तक।

00;00;18;02 - 00;00;52;11
Speaker 1
पवन अपनी पढ़ाई खत्म करके अपने पीजी रूम में बड़ी ही गहरी नींद में सो रहा था। कमरे में टेबल फैन और उसके हल्के खर्राटों की आवाज थी।

00;00;52;13 - 00;00;58;02
Speaker 1
पवन ने नींद में ही कहा, पंखा खराब हो गया क्या?

00;01;08;16 - 00;01;30;07
Speaker 1
टेबल फैन अचानक स्विंग मोड पर घूमने लगा। बाथरूम के अंदर से कांच के टूटने की जोर की आवाज आई।

00;01;30;10 - 00;02;13;15
Speaker 1
पवन ने उठकर पूछा, अरे क्या टूटा? कमरे में लाइट जलाई तो गुल्लक टूटा हुआ पड़ा था। तभी दरवाजे पर दस्तक हुई। विक्की खड़ा था जिसने कहा, भाई कमरे का पंखा खराब हो गया है, क्या तेरे कमरे में सो जाऊं?`;

export function ImportScriptModal({
  isOpen,
  onClose,
  onImport,
  mode = 'create-project',
}: ImportScriptModalProps) {
  const { addNotification } = useNotificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const [activeTab, setActiveTab] = useState<'file' | 'paste' | 'ai'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  // Raw inputs
  const [pasteText, setPasteText] = useState('');
  const [aiStoryText, setAiStoryText] = useState('');
  const [aiTone, setAiTone] = useState('Sci-Fi Thriller');
  const [isConvertingAI, setIsConvertingAI] = useState(false);

  // Parsed outputs & metadata
  const [parsedNodes, setParsedNodes] = useState<Descendant[]>([]);
  const [metadata, setMetadata] = useState<ScreenplayMetadata>({
    title: '',
    genre: 'Drama',
    logline: '',
  });
  const [editorTargetMode, setEditorTargetMode] = useState<'replace' | 'append'>('replace');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setParsedNodes([]);
      setLoadedFileName(null);
      setPasteText('');
      setAiStoryText('');
      setMetadata({ title: '', genre: 'Drama', logline: '' });
    }
  }, [isOpen]);

  // Real-time stats calculation
  const stats = useMemo(() => {
    if (!parsedNodes || parsedNodes.length === 0) return null;
    return analyzeScreenplayNodes(parsedNodes);
  }, [parsedNodes]);

  // Handle File Upload
  const handleProcessFile = async (file: File) => {
    try {
      const { text, detectedType, filename } = await extractTextFromFile(file);
      setLoadedFileName(filename);

      let nodes: Descendant[] = [];
      let meta: ScreenplayMetadata = {};

      if (detectedType === 'fdx') {
        const result = parseFDXToSlate(text);
        nodes = result.nodes;
        meta = result.metadata;
      } else if (detectedType === 'json') {
        try {
          nodes = JSON.parse(text);
          meta = { title: filename.replace(/\.json$/i, '') };
        } catch {
          nodes = parsePlainTextStoryToSlate(text);
        }
      } else {
        // Fountain or TXT or PDF text
        const result = parseFountainToSlate(text);
        nodes = result.nodes;
        meta = result.metadata;
      }

      setParsedNodes(nodes);
      setMetadata((prev) => ({
        ...prev,
        title: meta.title || filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        genre: meta.genre || prev.genre || 'Drama',
        logline: meta.logline || prev.logline || '',
      }));

      addNotification({
        type: 'success',
        message: `Parsed "${filename}" into ${nodes.length} screenplay elements!`,
      });
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'Failed to parse file.' });
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Paste / Direct Text
  const handleParsePastedText = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setParsedNodes([]);
      return;
    }

    // Detect if Fountain / Script format or Plain Story prose
    const isFountainCandidate =
      /^(INT\.|EXT\.|I\/E\.|Title:|>\s)/m.test(text) ||
      /\n[A-Z\s]{3,25}\n/.test(text);

    let nodes: Descendant[];
    let meta: ScreenplayMetadata = {};

    if (isFountainCandidate) {
      const result = parseFountainToSlate(text);
      nodes = result.nodes;
      meta = result.metadata;
    } else {
      nodes = parsePlainTextStoryToSlate(text);
    }

    setParsedNodes(nodes);
    if (meta.title) {
      setMetadata((prev) => ({
        ...prev,
        title: meta.title || prev.title,
        genre: meta.genre || prev.genre,
        logline: meta.logline || prev.logline,
      }));
    }
  };

  // Handle Quick Offline Transcript Formatting
  const handleQuickFormatTranscript = (textToFormat?: string) => {
    const text = textToFormat || pasteText || aiStoryText;
    if (!text.trim()) return;

    const fountainScript = convertStoryOrTranscriptToFountain(text);
    const { nodes, metadata: meta } = parseFountainToSlate(fountainScript);
    setParsedNodes(nodes);

    if (meta.title) {
      setMetadata((prev) => ({
        ...prev,
        title: meta.title || prev.title,
        genre: meta.genre || prev.genre,
        logline: meta.logline || prev.logline,
      }));
    }

    addNotification({
      type: 'success',
      message: `Quick formatted ${nodes.length} screenplay blocks from transcript!`,
    });
  };

  // Handle AI Story-to-Screenplay Conversion
  const handleConvertStoryAI = async (textOverride?: string) => {
    const text = textOverride || aiStoryText || pasteText;
    if (!text.trim()) {
      addNotification({ type: 'warning', message: 'Please enter a story, synopsis, or outline.' });
      return;
    }

    try {
      setIsConvertingAI(true);
      const keys = getAIKeys();
      const activeProvider = keys.gemini ? 'gemini' : keys.openai ? 'openai' : keys.anthropic ? 'anthropic' : 'gemini';

      const fountainOutput = await convertStoryToScreenplayAI(activeProvider, text, {
        tone: aiTone,
      });

      const { nodes, metadata: aiMeta } = parseFountainToSlate(fountainOutput);
      setParsedNodes(nodes);

      setMetadata((prev) => ({
        ...prev,
        title: aiMeta.title || prev.title || 'Adapted Story Scene',
        genre: aiMeta.genre || aiTone,
        logline: cleanTranscriptionText(text).slice(0, 140) + '...',
      }));

      addNotification({
        type: 'success',
        message: `AI converted story into ${nodes.length} screenplay blocks!`,
      });
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'AI conversion failed.' });
    } finally {
      setIsConvertingAI(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (parsedNodes.length === 0) {
      addNotification({ type: 'warning', message: 'Please upload or enter screenplay content first.' });
      return;
    }

    const finalTitle = metadata.title?.trim() || loadedFileName?.replace(/\.[^/.]+$/, '') || 'Imported Screenplay';
    const finalGenre = metadata.genre?.trim() || 'Drama';
    const finalLogline = metadata.logline?.trim() || '';

    onImport({
      title: finalTitle,
      genre: finalGenre,
      logline: finalLogline,
      nodes: parsedNodes,
      targetMode: editorTargetMode,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create-project' ? 'Import Script or Story' : 'Import Into Screenplay'}
      size="xl"
    >
      <div className="import-modal">
        {/* Navigation Tabs */}
        <div className="import-tabs">
          <button
            className={`import-tab-btn ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            <IconUpload size={16} />
            <span>Upload File</span>
          </button>
          <button
            className={`import-tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
            onClick={() => setActiveTab('paste')}
          >
            <IconFileText size={16} />
            <span>Paste Text / Story</span>
          </button>
          <button
            className={`import-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <IconSparkles size={16} />
            <span>AI Story Converter</span>
          </button>
        </div>

        {/* Main Grid: Input Column & Screenplay Preview Column */}
        <div className="import-grid">
          {/* Left Column: Input Options */}
          <div className="import-input-panel">
            {activeTab === 'file' && (
              <>
                <input
                  type="file"
                  id={fileInputId}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".fountain,.fdx,.txt,.json,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                />

                {!loadedFileName ? (
                  <label
                    htmlFor={fileInputId}
                    className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="import-dropzone-icon">
                      <IconUpload size={24} />
                    </div>
                    <div className="import-dropzone-title">Click to upload or drag & drop</div>
                    <div className="import-dropzone-subtitle">
                      Supports industry standard and plain text screenplay formats
                    </div>
                    <div className="import-format-pills">
                      <span className="import-format-pill">.FOUNTAIN</span>
                      <span className="import-format-pill">.FDX (Final Draft)</span>
                      <span className="import-format-pill">.TXT (Plain Text)</span>
                      <span className="import-format-pill">.PDF</span>
                      <span className="import-format-pill">.JSON</span>
                    </div>
                  </label>
                ) : (
                  <div className="import-file-badge">
                    <div className="import-file-badge-info">
                      <IconFileText size={20} color="var(--color-accent-400)" />
                      <div>
                        <div className="import-file-badge-name">{loadedFileName}</div>
                        <span className="import-file-badge-type">
                          {loadedFileName.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      className="icon-action-btn danger"
                      onClick={() => {
                        setLoadedFileName(null);
                        setParsedNodes([]);
                      }}
                      title="Remove file"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'paste' && (
              <div className="import-textarea-container">
                <div className="import-sample-chips">
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Quick Samples:
                  </span>
                  <button
                    className="import-sample-chip"
                    onClick={() => handleParsePastedText(SAMPLE_FOUNTAIN)}
                  >
                    Fountain Script
                  </button>
                  <button
                    className="import-sample-chip"
                    onClick={() => handleParsePastedText(SAMPLE_STORY_PROSE)}
                  >
                    Story Prose
                  </button>
                  <button
                    className="import-sample-chip"
                    onClick={() => handleParsePastedText(SAMPLE_AUDIO_TRANSCRIPT)}
                  >
                    🎙️ Audio Story / Transcript
                  </button>
                </div>

                {isTranscriptionOrStory(pasteText) && (
                  <div className="import-transcript-alert">
                    <div className="import-transcript-alert-info">
                      <IconSparkles size={18} color="var(--color-accent-400)" />
                      <div>
                        <strong>Audio Story / Transcription Detected</strong>
                        <p>Automatically adapt spoken timestamps & narrative into structured Hollywood screenplay scenes.</p>
                      </div>
                    </div>
                    <div className="import-transcript-alert-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<IconSparkles size={14} />}
                        onClick={() => handleConvertStoryAI(pasteText)}
                        loading={isConvertingAI}
                      >
                        Convert with AI
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickFormatTranscript(pasteText)}
                      >
                        Quick Format (Offline)
                      </Button>
                    </div>
                  </div>
                )}

                <textarea
                  className="import-textarea"
                  placeholder="Paste your screenplay, audio podcast transcription, story treatment, dialogue, or novel excerpt here..."
                  value={pasteText}
                  onChange={(e) => handleParsePastedText(e.target.value)}
                />
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="import-ai-options">
                <div className="form-field">
                  <label className="form-label">Adaptation Tone & Genre</label>
                  <select
                    className="import-tone-select"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                  >
                    <option value="Sci-Fi Thriller">Sci-Fi Thriller</option>
                    <option value="Dramatic & Character-Driven">Dramatic & Character-Driven</option>
                    <option value="Action & High-Stakes">Action & High-Stakes</option>
                    <option value="Dark Neo-Noir Crime">Dark Neo-Noir Crime</option>
                    <option value="Comedy & Witty Banter">Comedy & Witty Banter</option>
                    <option value="Horror & Atmospheric Suspense">Horror & Atmospheric Suspense</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Your Story / Outline / Chapter</label>
                  <textarea
                    className="import-textarea"
                    placeholder="Paste your novel chapter, rough outline, treatment, or synopsis here. The AI will convert it into Hollywood formatted screenplay scenes..."
                    value={aiStoryText}
                    onChange={(e) => setAiStoryText(e.target.value)}
                  />
                </div>

                <Button
                  variant="primary"
                  icon={<IconSparkles size={16} />}
                  onClick={() => handleConvertStoryAI()}
                  loading={isConvertingAI}
                  disabled={!aiStoryText.trim()}
                >
                  Convert Story to Screenplay (AI)
                </Button>
              </div>
            )}

            {/* Target Options when in Editor mode */}
            {mode === 'editor-import' && (
              <div className="form-field" style={{ marginTop: 'var(--space-2)' }}>
                <label className="form-label">Import Action</label>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editor-mode"
                      checked={editorTargetMode === 'replace'}
                      onChange={() => setEditorTargetMode('replace')}
                    />
                    Replace Current Script
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editor-mode"
                      checked={editorTargetMode === 'append'}
                      onChange={() => setEditorTargetMode('append')}
                    />
                    Append to End of Script
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Screenplay Preview & Stats */}
          <div className="import-preview-panel">
            <div className="import-preview-header">
              <span className="import-preview-title">Screenplay Preview</span>
              {stats && (
                <span style={{ fontSize: '11px', color: 'var(--color-accent-400)', fontWeight: 600 }}>
                  ✓ {parsedNodes.length} Formatted Elements
                </span>
              )}
            </div>

            {/* Stats Bar */}
            {stats && (
              <div className="import-stats-bar">
                <div className="import-stat-badge">
                  <IconFilm size={12} />
                  <span>Scenes:</span>
                  <span className="import-stat-value">{stats.totalScenes}</span>
                </div>
                <div className="import-stat-badge">
                  <IconUser size={12} />
                  <span>Characters:</span>
                  <span className="import-stat-value">{stats.totalCharacters}</span>
                </div>
                <div className="import-stat-badge">
                  <IconFileText size={12} />
                  <span>Dialogue:</span>
                  <span className="import-stat-value">{stats.totalDialogueLines}</span>
                </div>
                <div className="import-stat-badge">
                  <span>Est. Pages:</span>
                  <span className="import-stat-value">{stats.estimatedPages}</span>
                </div>
              </div>
            )}

            {/* Screenplay Paper Canvas */}
            <div className="import-paper-preview">
              {parsedNodes.length === 0 ? (
                <div className="import-paper-empty">
                  Upload a file, paste text, or use AI to generate formatted scenes for live preview...
                </div>
              ) : (
                parsedNodes.map((node: any, idx) => {
                  const type = node.type || 'action';
                  const text = (node.children || []).map((c: any) => c.text || '').join('');
                  return (
                    <div key={idx} className={`import-preview-block ${type}`}>
                      {text}
                    </div>
                  );
                })
              )}
            </div>

            {/* Characters Bar */}
            {stats && stats.characterList.length > 0 && (
              <div className="import-characters-row">
                <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Cast:
                </span>
                {stats.characterList.slice(0, 5).map((char) => (
                  <span key={char.name} className="import-char-pill">
                    {char.name} ({char.lineCount})
                  </span>
                ))}
                {stats.characterList.length > 5 && (
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                    +{stats.characterList.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Project Details Fields (Only when creating a new project from Dashboard) */}
        {mode === 'create-project' && (
          <div className="import-project-fields">
            <div className="form-field">
              <label className="form-label" htmlFor="import-project-title">Project Title *</label>
              <input
                id="import-project-title"
                type="text"
                className="form-input"
                placeholder="e.g., Neon Horizon"
                value={metadata.title}
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="import-project-genre">Genre</label>
              <input
                id="import-project-genre"
                type="text"
                className="form-input"
                placeholder="e.g., Sci-Fi, Thriller"
                value={metadata.genre}
                onChange={(e) => setMetadata({ ...metadata, genre: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="import-footer-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<IconUpload size={16} />}
            onClick={handleConfirmImport}
            disabled={parsedNodes.length === 0}
          >
            {mode === 'create-project' ? 'Create Project from Script' : 'Import to Editor'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
