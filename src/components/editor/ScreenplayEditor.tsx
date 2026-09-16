// Screenplay Slate Editor with auto-formatting, scene navigation, reordering & sub-scene numbering
import { useState, useMemo, useCallback, useEffect } from 'react';
import { createEditor, Node, Transforms, Editor, Element } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { ScreenplayElement, ScreenplayLeaf } from './ScreenplayElement';
import { EditorToolbar } from './EditorToolbar';
import { SceneNavigator, type SceneItem } from './SceneNavigator';
import { InlineAIAssistant } from './InlineAIAssistant';
import {
  handleScreenplayKeyDown,
  getActiveElementType,
} from './editorUtils';
import {
  getModifiedLineIndices,
  type RevisionBaseline,
} from '@/services/revisionService';
import {
  extractScenesFromNodes,
  resolveSceneNumbers,
  getNextSubSceneNumber,
  getActiveSceneFromSelection,
  renumberAllScenesSequentially,
} from '@/services/sceneService';
import { parseFountainToSlate } from '@/services/scriptImportService';
import type { ScreenplayElementType } from '@/types';
import './ScreenplayEditor.css';

interface ScreenplayEditorProps {
  initialValue: Descendant[];
  onSave?: (value: Descendant[]) => void;
  onSelectionChange?: (text: string) => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  isLocked?: boolean;
  baseline?: RevisionBaseline | null;
}

export function ScreenplayEditor({
  initialValue,
  onSave,
  onSelectionChange,
  isSaving = false,
  lastSaved = null,
  isLocked = false,
  baseline = null,
}: ScreenplayEditorProps) {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>(initialValue);
  const [activeType, setActiveType] = useState<ScreenplayElementType>('action');
  const [showNavigator, setShowNavigator] = useState(true);
  const [showSceneNumbers, setShowSceneNumbers] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // Inline Floating AI Assistant State
  const [inlineAiState, setInlineAiState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    selectedText: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    selectedText: '',
  });

  // Sync if initialValue changes externally (e.g. AI insertion, template switch)
  useEffect(() => {
    if (initialValue && initialValue.length > 0) {
      setValue(initialValue);
      if (editor.children !== initialValue) {
        editor.children = initialValue;
        editor.onChange();
      }
    }
  }, [initialValue, editor]);

  // Extract scenes from blocks with industry-standard numbering
  const scenes: SceneItem[] = useMemo(() => {
    const extracted = extractScenesFromNodes(value);
    return extracted.map((sc) => ({
      index: sc.index,
      sceneNumber: sc.sceneNumber,
      text: sc.heading,
      path: sc.path,
      lineCount: sc.lineCount,
    }));
  }, [value]);

  // Pre-calculated resolved scene numbers map (lineIndex -> sceneNumber string)
  const resolvedSceneNumbers = useMemo(() => {
    return resolveSceneNumbers(value);
  }, [value]);

  // Calculate stats (words, pages)
  const stats = useMemo(() => {
    let words = 0;
    let lines = 0;

    value.forEach((node) => {
      const text = Node.string(node);
      const nodeWords = text.trim() ? text.trim().split(/\s+/).length : 0;
      words += nodeWords;
      lines += Math.max(1, Math.ceil(text.length / 60));
    });

    const pages = Math.max(1, Math.ceil(lines / 54));
    return { words, pages };
  }, [value]);

  // Plaintext of script for AI context
  const scriptPlaintext = useMemo(() => {
    return value
      .map((node) => Node.string(node))
      .filter(Boolean)
      .join('\n');
  }, [value]);

  // Compute modified lines compared to baseline
  const modifiedIndices = useMemo(() => {
    return isLocked ? getModifiedLineIndices(value, baseline) : new Set<number>();
  }, [value, isLocked, baseline]);

  const renderElement = useCallback(
    (props: any) => {
      let isModified = false;
      let sceneNumber: string | undefined = undefined;

      try {
        const path = ReactEditor.findPath(editor, props.element);
        const lineIndex = path[0];
        isModified = modifiedIndices.has(lineIndex);

        if ((props.element as any).type === 'scene-heading') {
          sceneNumber = resolvedSceneNumbers.get(lineIndex) || undefined;
        }
      } catch {
        // Fallback during concurrent edits/unmount
      }

      return (
        <ScreenplayElement
          {...props}
          isModified={isModified}
          sceneNumber={sceneNumber}
          showSceneNumbers={showSceneNumbers || isLocked}
        />
      );
    },
    [editor, modifiedIndices, resolvedSceneNumbers, showSceneNumbers, isLocked]
  );

  const renderLeaf = useCallback((props: any) => <ScreenplayLeaf {...props} />, []);

  // Update active scene selection whenever cursor moves
  const updateActiveSceneFromCursor = useCallback(() => {
    try {
      const { selection } = editor;
      if (selection) {
        const activeIdx = getActiveSceneFromSelection(
          selection.focus.path,
          extractScenesFromNodes(editor.children)
        );
        setActiveSceneIndex(activeIdx);
      }
    } catch {
      // ignore
    }
  }, [editor]);

  const handleChange = (newValue: Descendant[]) => {
    setValue(newValue);

    // Update active element type for toolbar
    const current = getActiveElementType(editor);
    setActiveType(current);

    // Update active scene from cursor
    updateActiveSceneFromCursor();

    // Track active selection
    try {
      const { selection } = editor;
      if (selection) {
        const selectedStr = Editor.string(editor, selection);
        if (selectedStr && selectedStr.trim().length > 0) {
          onSelectionChange?.(selectedStr.trim());
        }
      }
    } catch {
      // ignore
    }

    // Trigger auto-save
    if (onSave) {
      onSave(newValue);
    }
  };

  const handleSelectScene = (scene: SceneItem) => {
    try {
      Transforms.select(editor, {
        anchor: { path: scene.path.concat(0), offset: 0 },
        focus: { path: scene.path.concat(0), offset: 0 },
      });
      ReactEditor.focus(editor);

      const sceneIndexInList = scenes.findIndex((s) => s.index === scene.index);
      if (sceneIndexInList !== -1) {
        setActiveSceneIndex(sceneIndexInList);
      }

      // Scroll canvas smoothly to the scene heading element
      const domNode = ReactEditor.toDOMNode(editor, editor.children[scene.index]);
      if (domNode) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err) {
      console.warn('Could not select scene path:', err);
    }
  };

  /**
   * Move Scene Up: swaps current scene slice with previous scene slice
   */
  const handleMoveSceneUp = (sceneIdx: number) => {
    if (sceneIdx <= 0 || sceneIdx >= scenes.length) return;

    const prevScene = scenes[sceneIdx - 1];
    const curScene = scenes[sceneIdx];
    const nextScene = scenes[sceneIdx + 1];

    const prevStart = prevScene.index;
    const curStart = curScene.index;
    const curEnd = (nextScene ? nextScene.index : value.length) - 1;

    const beforeNodes = value.slice(0, prevStart);
    const prevNodes = value.slice(prevStart, curStart);
    const curNodes = value.slice(curStart, curEnd + 1);
    const afterNodes = value.slice(curEnd + 1);

    const newChildren: Descendant[] = [...beforeNodes, ...curNodes, ...prevNodes, ...afterNodes];

    editor.children = newChildren;
    editor.onChange();
    handleChange(newChildren);

    // Select the moved scene
    setTimeout(() => {
      try {
        const newScenePos = prevStart;
        Transforms.select(editor, {
          anchor: { path: [newScenePos, 0], offset: 0 },
          focus: { path: [newScenePos, 0], offset: 0 },
        });
        ReactEditor.focus(editor);
        setActiveSceneIndex(sceneIdx - 1);
        const domNode = ReactEditor.toDOMNode(editor, editor.children[newScenePos]);
        if (domNode) {
          domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {
        // ignore
      }
    }, 50);
  };

  /**
   * Move Scene Down: swaps current scene slice with next scene slice
   */
  const handleMoveSceneDown = (sceneIdx: number) => {
    if (sceneIdx < 0 || sceneIdx >= scenes.length - 1) return;

    const curScene = scenes[sceneIdx];
    const nextScene = scenes[sceneIdx + 1];
    const afterNextScene = scenes[sceneIdx + 2];

    const curStart = curScene.index;
    const nextStart = nextScene.index;
    const nextEnd = (afterNextScene ? afterNextScene.index : value.length) - 1;

    const beforeNodes = value.slice(0, curStart);
    const curNodes = value.slice(curStart, nextStart);
    const nextNodes = value.slice(nextStart, nextEnd + 1);
    const afterNodes = value.slice(nextEnd + 1);

    const newChildren: Descendant[] = [...beforeNodes, ...nextNodes, ...curNodes, ...afterNodes];

    editor.children = newChildren;
    editor.onChange();
    handleChange(newChildren);

    // Select the moved scene
    setTimeout(() => {
      try {
        const newScenePos = curStart + nextNodes.length;
        Transforms.select(editor, {
          anchor: { path: [newScenePos, 0], offset: 0 },
          focus: { path: [newScenePos, 0], offset: 0 },
        });
        ReactEditor.focus(editor);
        setActiveSceneIndex(sceneIdx + 1);
        const domNode = ReactEditor.toDOMNode(editor, editor.children[newScenePos]);
        if (domNode) {
          domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {
        // ignore
      }
    }, 50);
  };

  /**
   * Updates custom scene number for a specific scene (e.g. 2A, 2B, 3, etc.)
   */
  const handleUpdateSceneNumber = (sceneIdx: number, newNumber: string) => {
    const scene = scenes[sceneIdx];
    if (!scene) return;

    const newChildren = [...(editor.children as any[])];
    newChildren[scene.index] = {
      ...newChildren[scene.index],
      sceneNumber: newNumber.trim().toUpperCase(),
    };

    editor.children = newChildren;
    editor.onChange();
    handleChange(newChildren);
  };

  /**
   * Adds a sub-scene (e.g. Scene 2A, 2B) right after the selected scene
   */
  const handleAddSubScene = (sceneIdx: number) => {
    const scene = scenes[sceneIdx];
    if (!scene) return;

    const nextScene = scenes[sceneIdx + 1];
    const insertIndex = nextScene ? nextScene.index : editor.children.length;
    
    // Existing numbers to prevent collisions
    const existingNums = scenes.map((s) => s.sceneNumber);
    const subNumber = getNextSubSceneNumber(scene.sceneNumber, existingNums);

    const newHeadingNode = {
      type: 'scene-heading',
      sceneNumber: subNumber,
      children: [{ text: `${scene.text || 'INT. SCENE'} - PART ${subNumber}` }],
    };
    const newActionNode = {
      type: 'action',
      children: [{ text: '' }],
    };

    const newChildren = [
      ...editor.children.slice(0, insertIndex),
      newHeadingNode as any,
      newActionNode as any,
      ...editor.children.slice(insertIndex),
    ];

    editor.children = newChildren;
    editor.onChange();
    handleChange(newChildren);

    setTimeout(() => {
      try {
        Transforms.select(editor, {
          anchor: { path: [insertIndex, 0], offset: 0 },
          focus: { path: [insertIndex, 0], offset: 0 },
        });
        ReactEditor.focus(editor);
        setActiveSceneIndex(sceneIdx + 1);
        const domNode = ReactEditor.toDOMNode(editor, editor.children[insertIndex]);
        if (domNode) {
          domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {
        // ignore
      }
    }, 50);
  };

  /**
   * Resets and renumbers all scenes sequentially (1, 2, 3...)
   */
  const handleRenumberAll = () => {
    const renumbered = renumberAllScenesSequentially(editor.children);
    editor.children = renumbered;
    editor.onChange();
    handleChange(renumbered);
  };

  const handleCaptureSelection = () => {
    updateActiveSceneFromCursor();
    try {
      const { selection } = editor;
      if (selection) {
        const selectedStr = Editor.string(editor, selection);
        if (selectedStr && selectedStr.trim().length > 0) {
          onSelectionChange?.(selectedStr.trim());
        }
      }
    } catch {
      // ignore
    }
  };

  // Right Click Context Menu Handler to trigger Inline AI Assistant
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const clientX = e.clientX;
    const clientY = e.clientY;

    let selected = '';
    try {
      if (editor.selection) {
        selected = Editor.string(editor, editor.selection).trim();
      }
      // If no text was highlighted, grab current line text
      if (!selected) {
        const [match] = Editor.nodes(editor, {
          match: (n) => !Editor.isEditor(n) && Element.isElement(n),
          mode: 'lowest',
        });
        if (match) {
          selected = Node.string(match[0]).trim();
        }
      }
    } catch {
      // ignore
    }

    setInlineAiState({
      isOpen: true,
      position: { x: clientX, y: clientY },
      selectedText: selected,
    });
  };

  // Keyboard shortcut Cmd+K or Ctrl+K to trigger Inline AI
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        let selected = '';
        try {
          if (editor.selection) {
            selected = Editor.string(editor, editor.selection).trim();
          }
        } catch {
          // ignore
        }
        setInlineAiState({
          isOpen: true,
          position: { x: window.innerWidth / 2 - 240, y: window.innerHeight / 4 },
          selectedText: selected,
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editor]);

  // AI Replace Selection
  const handleReplaceSelection = (fountainText: string) => {
    try {
      const { nodes } = parseFountainToSlate(fountainText);
      const nodesToInsert =
        nodes && nodes.length > 0
          ? nodes
          : [{ type: 'action', children: [{ text: fountainText }] } as any];

      if (editor.selection) {
        Transforms.delete(editor);
        Transforms.insertNodes(editor, nodesToInsert);
      } else {
        const [match] = Editor.nodes(editor, {
          match: (n) => !Editor.isEditor(n) && Element.isElement(n),
          mode: 'lowest',
        });
        if (match) {
          const [, path] = match;
          Transforms.removeNodes(editor, { at: path });
          Transforms.insertNodes(editor, nodesToInsert, { at: path });
        } else {
          Transforms.insertNodes(editor, nodesToInsert);
        }
      }
      ReactEditor.focus(editor);
    } catch (err) {
      console.error('Failed to replace selection with AI text:', err);
    }
  };

  // AI Insert Below
  const handleInsertBelow = (fountainText: string) => {
    try {
      const { nodes } = parseFountainToSlate(fountainText);
      const nodesToInsert =
        nodes && nodes.length > 0
          ? nodes
          : [{ type: 'action', children: [{ text: fountainText }] } as any];

      let targetIndex = editor.children.length;
      if (editor.selection) {
        targetIndex = editor.selection.focus.path[0] + 1;
      }

      Transforms.insertNodes(editor, nodesToInsert, { at: [targetIndex] });
      ReactEditor.focus(editor);
    } catch (err) {
      console.error('Failed to insert AI text below:', err);
    }
  };

  // AI Insert Above
  const handleInsertAbove = (fountainText: string) => {
    try {
      const { nodes } = parseFountainToSlate(fountainText);
      const nodesToInsert =
        nodes && nodes.length > 0
          ? nodes
          : [{ type: 'action', children: [{ text: fountainText }] } as any];

      let targetIndex = 0;
      if (editor.selection) {
        targetIndex = editor.selection.focus.path[0];
      }

      Transforms.insertNodes(editor, nodesToInsert, { at: [targetIndex] });
      ReactEditor.focus(editor);
    } catch (err) {
      console.error('Failed to insert AI text above:', err);
    }
  };

  return (
    <div className="screenplay-editor-wrapper">
      <EditorToolbar
        editor={editor}
        activeType={activeType}
        isSaving={isSaving}
        lastSaved={lastSaved}
        sceneCount={scenes.length}
        wordCount={stats.words}
        pageCount={stats.pages}
        showNavigator={showNavigator}
        onToggleNavigator={() => setShowNavigator((prev) => !prev)}
        showSceneNumbers={showSceneNumbers || isLocked}
        onToggleSceneNumbers={() => setShowSceneNumbers((prev) => !prev)}
      />

      <div className="editor-workspace">
        <SceneNavigator
          scenes={scenes}
          collapsed={!showNavigator}
          activeSceneIndex={activeSceneIndex}
          onSelectScene={handleSelectScene}
          onMoveSceneUp={handleMoveSceneUp}
          onMoveSceneDown={handleMoveSceneDown}
          onUpdateSceneNumber={handleUpdateSceneNumber}
          onAddSubScene={handleAddSubScene}
          onRenumberAll={handleRenumberAll}
        />

        <div
          className="screenplay-canvas-container"
          id="screenplay-canvas-container"
          onContextMenu={handleContextMenu}
        >
          <Slate editor={editor} initialValue={value} onChange={handleChange}>
            <Editable
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              placeholder="INT. SCENE - DAY..."
              spellCheck
              autoFocus
              onMouseUp={handleCaptureSelection}
              onKeyUp={handleCaptureSelection}
              onKeyDown={(e) => handleScreenplayKeyDown(e, editor)}
              className="screenplay-page"
            />
          </Slate>
        </div>
      </div>

      {/* Floating Inline AI Assistant Popover */}
      <InlineAIAssistant
        isOpen={inlineAiState.isOpen}
        onClose={() => setInlineAiState((prev) => ({ ...prev, isOpen: false }))}
        position={inlineAiState.position}
        selectedText={inlineAiState.selectedText}
        scriptContext={scriptPlaintext}
        onReplaceSelection={handleReplaceSelection}
        onInsertBelow={handleInsertBelow}
        onInsertAbove={handleInsertAbove}
      />
    </div>
  );
}


