import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Descendant } from 'slate';
import { ScreenplayEditor } from '@/components/editor/ScreenplayEditor';
import { AIAssistantDrawer } from '@/components/editor/AIAssistantDrawer';
import { ShortcutsModal } from '@/components/common/ShortcutsModal';
import { ScriptCommentsDrawer, type ScriptComment } from '@/components/editor/ScriptCommentsDrawer';
import { ImportScriptModal } from '@/components/editor/ImportScriptModal';
import { ScriptMetadataModal } from '@/components/editor/ScriptMetadataModal';
import { Button } from '@/components/common/Button';
import {
  IconArrowLeft,
  IconDownload,
  IconUpload,
  IconFolder,
  IconCamera,
  IconSparkles,
  IconMessageSquare,
  IconEdit,
  IconInfo,
} from '@/components/common/Icons';
import {
  getScriptContent,
  saveScriptContent,
  getUserProjects,
  updateProjectMetadata,
  type ProjectDoc,
} from '@/services/firestoreService';
import { exportToPDF } from '@/services/pdfExportService';
import { downloadFDX } from '@/services/fdxExportService';
import {
  REVISION_DRAFT_COLORS,
  createRevisionBaseline,
  type RevisionBaseline,
} from '@/services/revisionService';
import type { RevisionColor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores/notificationStore';
import { TEMPLATE_SCREENPLAY_SLATE } from '@/utils/templateScreenplay';
import './ScriptEditorPage.css';

export function ScriptEditorPage() {
  const { projectId, scriptId } = useParams<{ projectId: string; scriptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotificationStore();

  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [content, setContent] = useState<Descendant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');

  // Script Comments State
  const [comments, setComments] = useState<ScriptComment[]>([
    {
      id: 'comment-1',
      author: 'Christopher Nolan (Director)',
      role: 'Director',
      sceneTag: 'Scene 1',
      text: 'Keep the opening wide shot on the radio array lingering for 4 seconds before cutting to Maya inside.',
      createdAt: new Date().toISOString(),
      resolved: false,
    },
    {
      id: 'comment-2',
      author: 'Hoyte van Hoytema (DP)',
      role: 'DP',
      sceneTag: 'Scene 2',
      text: 'Lighting key: cool amber neon on Maya face contrasted with cold CRT green phosphors.',
      createdAt: new Date().toISOString(),
      resolved: true,
    },
  ]);

  // Revision & Script Locking State
  const [revisionColor, setRevisionColor] = useState<RevisionColor>('White');
  const [isLocked, setIsLocked] = useState(false);
  const [baseline, setBaseline] = useState<RevisionBaseline | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global keyboard listener for shortcuts (Cmd + / or Ctrl + /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load project details and script content
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!projectId) return;

      try {
        // Fetch project info
        if (user?.uid) {
          const userProjects = await getUserProjects(user.uid);
          const found = userProjects.find((p) => p.id === projectId);
          if (found && isMounted) {
            setProject(found);
          }
        }

        // Fetch script content
        const targetScriptId = scriptId || 'default-script';
        const scriptData = await getScriptContent(projectId, targetScriptId);

        if (isMounted) {
          if (scriptData && scriptData.length > 0) {
            setContent(scriptData);
          } else {
            setContent(TEMPLATE_SCREENPLAY_SLATE);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load script:', err);
        if (isMounted) {
          setContent(TEMPLATE_SCREENPLAY_SLATE);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [projectId, scriptId, user?.uid]);

  // Debounced auto-save
  const handleEditorChange = useCallback(
    (newContent: Descendant[]) => {
      setContent(newContent);
      setIsSaving(true);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!projectId) return;
        try {
          const targetScriptId = scriptId || 'default-script';
          await saveScriptContent(projectId, targetScriptId, newContent);
          setLastSaved(new Date());
        } catch (err) {
          console.error('Auto-save failed:', err);
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    },
    [projectId, scriptId]
  );

  // Toggle Script Lock
  const handleToggleLock = () => {
    if (!content) return;
    if (!isLocked) {
      const newBaseline = createRevisionBaseline(content, revisionColor);
      setBaseline(newBaseline);
      setIsLocked(true);
      addNotification({
        type: 'warning',
        message: `Script Locked for Production! Scene numbers frozen on ${revisionColor} Draft.`,
      });
    } else {
      setIsLocked(false);
      setBaseline(null);
      addNotification({ type: 'info', message: 'Script Unlocked. Auto-renumbering active.' });
    }
  };

  // Update script / project metadata (title, writer, studio, email, draft, version, etc.)
  const handleUpdateMetadata = async (updated: Partial<ProjectDoc>) => {
    if (!projectId) return;
    try {
      const updatedProj = await updateProjectMetadata(projectId, updated);
      if (updatedProj) {
        setProject(updatedProj);
      }
      addNotification({
        type: 'success',
        message: `Updated script details for "${updated.title || project?.title}"!`,
      });
    } catch (err) {
      console.error('Failed to update project metadata:', err);
      addNotification({ type: 'error', message: 'Failed to update metadata.' });
    }
  };

  // Export handlers
  const handleExportPDF = () => {
    if (!content) return;
    exportToPDF(content, {
      title: project?.title || 'The Last Signal',
      author: project?.writer || user?.displayName || 'Screenplay Author',
      productionHouse: project?.productionHouse || '',
      draftName: project?.draftName || `${revisionColor} Production Draft`,
      version: project?.version || 'v1.0',
      email: project?.email || user?.email || '',
      phone: project?.phone || '',
      copyright: project?.copyright || '',
    });
    addNotification({ type: 'success', message: 'PDF ready for print / save!' });
  };

  const handleExportFDX = () => {
    if (!content) return;
    downloadFDX(content, project?.title || 'Screenplay');
    addNotification({ type: 'success', message: 'Final Draft (.fdx) file downloaded!' });
  };

  const handleExportFountain = () => {
    if (!content) return;
    const lines = content.map((node: any) => {
      const text = (node.children || []).map((c: any) => c.text).join('');
      if (node.type === 'scene-heading') return `\n${text}\n`;
      if (node.type === 'character') return `\n    ${text}`;
      if (node.type === 'parenthetical') return `    ${text}`;
      if (node.type === 'dialogue') return `  ${text}`;
      if (node.type === 'transition') return `\n        ${text}\n`;
      return text;
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.title || 'Screenplay'}.fountain`;
    link.click();
    URL.revokeObjectURL(url);
    addNotification({ type: 'success', message: 'Script exported as .fountain!' });
  };

  const handleImportScript = (result: {
    title: string;
    genre: string;
    logline: string;
    nodes: Descendant[];
    targetMode?: 'replace' | 'append';
  }) => {
    if (!content || result.nodes.length === 0) return;

    let updatedContent: Descendant[];
    if (result.targetMode === 'append') {
      updatedContent = [...content, ...result.nodes];
      addNotification({
        type: 'success',
        message: `Appended ${result.nodes.length} screenplay elements to script!`,
      });
    } else {
      updatedContent = result.nodes;
      addNotification({
        type: 'success',
        message: `Replaced script with ${result.nodes.length} imported elements!`,
      });
    }

    handleEditorChange(updatedContent);
  };

  // Robust Fountain-to-Slate state machine converter
  const parseFountainToSlate = (fountainText: string): Descendant[] => {
    // Strip markdown code fences if any
    const cleanText = fountainText
      .replace(/```[a-zA-Z]*\n?/g, '')
      .replace(/```/g, '')
      .trim();

    const rawLines = cleanText.split('\n');
    const nodes: Descendant[] = [];
    let prevType: string = 'action';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        prevType = 'action';
        continue;
      }

      // 1. Scene Heading (INT., EXT., I/E., INT/EXT)
      if (
        /^(INT\.|EXT\.|I\/E\.|INT\/EXT\.|INT\s|EXT\s)/i.test(trimmed) ||
        trimmed.startsWith('.')
      ) {
        nodes.push({ type: 'scene-heading', children: [{ text: trimmed.toUpperCase() }] } as any);
        prevType = 'scene-heading';
        continue;
      }

      // 2. Transition (e.g. CUT TO:, FADE OUT., SMASH CUT TO:)
      if (
        /^(CUT TO:|DISSOLVE TO:|SMASH CUT TO:|FADE OUT\.|FADE IN:|MATCH CUT TO:)/i.test(trimmed) ||
        (trimmed.endsWith('TO:') && trimmed === trimmed.toUpperCase())
      ) {
        nodes.push({ type: 'transition', children: [{ text: trimmed.toUpperCase() }] } as any);
        prevType = 'transition';
        continue;
      }

      // 3. Parenthetical e.g. (whispering)
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        nodes.push({ type: 'parenthetical', children: [{ text: trimmed }] } as any);
        prevType = 'parenthetical';
        continue;
      }

      // 4. Character Name (ALL CAPS, short, usually followed by dialogue or parenthetical)
      const isAllUpper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
      const isShort = trimmed.length < 38;

      if (isAllUpper && isShort && !trimmed.endsWith('.') && !trimmed.endsWith(':') && prevType !== 'character') {
        nodes.push({ type: 'character', children: [{ text: trimmed }] } as any);
        prevType = 'character';
        continue;
      }

      // 5. Dialogue (follows character or parenthetical)
      if (prevType === 'character' || prevType === 'parenthetical') {
        nodes.push({ type: 'dialogue', children: [{ text: trimmed }] } as any);
        prevType = 'dialogue';
        continue;
      }

      // 6. Action line
      nodes.push({ type: 'action', children: [{ text: trimmed }] } as any);
      prevType = 'action';
    }

    return nodes;
  };

  // Insert AI generated Fountain text into Slate screenplay
  const handleInsertAIContent = (fountainText: string) => {
    if (!content) return;
    const newNodes = parseFountainToSlate(fountainText);

    if (newNodes.length === 0) {
      addNotification({ type: 'warning', message: 'No valid scenes found to insert.' });
      return;
    }

    const updatedContent = [...content, ...newNodes];
    handleEditorChange(updatedContent);

    // Scroll canvas smoothly to the newly inserted scene
    setTimeout(() => {
      const container = document.getElementById('screenplay-canvas-container');
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }, 150);

    addNotification({ type: 'success', message: `Added ${newNodes.length} AI screenplay blocks to script!` });
  };

  // Convert current content to plaintext for AI context
  const scriptPlaintext = (content || [])
    .map((n: any) => (n.children || []).map((c: any) => c.text || '').join(''))
    .join('\n');

  // Extract scene headings for comments dropdown
  const sceneList = useMemo(() => {
    if (!content) return [];
    const list: Array<{ sceneNumber: number; text: string }> = [];
    let count = 1;
    content.forEach((node: any) => {
      if (node.type === 'scene-heading') {
        const text = (node.children || []).map((c: any) => c.text || '').join('').trim();
        list.push({ sceneNumber: count++, text });
      }
    });
    return list;
  }, [content]);

  // Comment Handlers
  const handleAddComment = (newComment: Omit<ScriptComment, 'id' | 'createdAt' | 'resolved'>) => {
    const comment: ScriptComment = {
      ...newComment,
      id: `comment-${Date.now()}`,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    setComments((prev) => [comment, ...prev]);
    addNotification({ type: 'success', message: 'Script note added!' });
  };

  const handleToggleResolveComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c))
    );
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    addNotification({ type: 'info', message: 'Script note removed' });
  };

  if (loading) {
    return (
      <div className="script-editor-loading">
        <div className="script-spinner" />
        <p>Opening screenplay workspace...</p>
      </div>
    );
  }

  const currentColorHex = REVISION_DRAFT_COLORS.find((c) => c.name === revisionColor)?.hex || '#ffffff';

  return (
    <div className="script-editor-page">
      {/* Top Header */}
      <header className="script-editor-header">
        <div className="script-header-left">
          <button
            className="script-back-btn"
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            <IconArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          <div className="script-title-info">
            <button
              className="script-title-btn"
              onClick={() => setShowMetadataModal(true)}
              title="Click to edit script name, writer, studio, draft & metadata"
            >
              <span className="script-main-title">
                {project?.title || 'The Last Signal'}
              </span>
              {project?.writer && (
                <span className="script-title-writer">
                  by {project.writer}
                </span>
              )}
              <IconEdit size={13} className="script-title-edit-icon" />
            </button>

            {/* Revision Draft Color Dropdown */}
            <select
              value={revisionColor}
              onChange={(e) => setRevisionColor(e.target.value as RevisionColor)}
              className="script-draft-badge-select"
              style={{
                borderColor: currentColorHex,
                color: revisionColor === 'White' ? 'var(--color-accent-400)' : currentColorHex,
              }}
              title="Change Script Draft Revision Color"
            >
              {REVISION_DRAFT_COLORS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} Draft
                </option>
              ))}
            </select>

            {/* Lock / Unlock Script Button */}
            <button
              className={`script-lock-toggle-btn ${isLocked ? 'locked' : ''}`}
              onClick={handleToggleLock}
              title={isLocked ? 'Script is Locked (Scene numbers frozen)' : 'Lock Script (Freeze scene numbers for production)'}
            >
              {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
            </button>
          </div>
        </div>

        <div className="script-header-right">
          {/* Script Details / Title Page Button */}
          <Button
            variant="ghost"
            size="sm"
            icon={<IconInfo size={14} />}
            onClick={() => setShowMetadataModal(true)}
            title="Edit script title page, writer, studio, and draft metadata"
          >
            Script Info
          </Button>

          {/* AI Co-Pilot Button */}
          <Button
            variant="primary"
            size="sm"
            icon={<IconSparkles size={14} />}
            onClick={() => setShowAIDrawer(true)}
          >
            AI Assistant
          </Button>

          {/* Production Notes / Comments Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<IconMessageSquare size={14} />}
            onClick={() => setShowCommentsDrawer(true)}
          >
            Notes ({comments.filter((c) => !c.resolved).length})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<IconFolder size={14} />}
            onClick={() => navigate(`/project/${projectId}/breakdown`)}
          >
            Breakdown Engine
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconCamera size={14} />}
            onClick={() => navigate(`/project/${projectId}/shots/scene-1`)}
          >
            Shot List
          </Button>

          {/* Import Script or Story Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<IconUpload size={14} />}
            onClick={() => setShowImportModal(true)}
          >
            Import
          </Button>

          {/* Export Actions */}
          <Button
            variant="secondary"
            size="sm"
            icon={<IconDownload size={14} />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportFDX}
          >
            Final Draft (.FDX)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportFountain}
          >
            .Fountain
          </Button>

          {/* Shortcuts Button */}
          <button
            className="shortcuts-trigger-btn"
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts Reference (Cmd+/)"
          >
            ?
          </button>
        </div>
      </header>

      {/* Screenplay Editor Canvas */}
      {content && (
        <ScreenplayEditor
          initialValue={content}
          onSave={handleEditorChange}
          onSelectionChange={setSelectedText}
          isSaving={isSaving}
          lastSaved={lastSaved}
          isLocked={isLocked}
          baseline={baseline}
        />
      )}

      {/* Script & Title Page Metadata Modal */}
      <ScriptMetadataModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        project={project}
        onSave={handleUpdateMetadata}
      />

      {/* Import Script or Story Modal */}
      <ImportScriptModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportScript}
        mode="editor-import"
      />

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={showAIDrawer}
        onClose={() => setShowAIDrawer(false)}
        onInsertFountain={handleInsertAIContent}
        scriptContext={scriptPlaintext}
        selectedText={selectedText}
      />

      {/* Script Production Notes & Annotations Drawer */}
      <ScriptCommentsDrawer
        isOpen={showCommentsDrawer}
        onClose={() => setShowCommentsDrawer(false)}
        sceneList={sceneList}
        comments={comments}
        onAddComment={handleAddComment}
        onToggleResolve={handleToggleResolveComment}
        onDeleteComment={handleDeleteComment}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
