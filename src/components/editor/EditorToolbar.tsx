// Screenplay Editor Toolbar
import { Editor, Transforms } from 'slate';
import type { ScreenplayElementType } from '@/types';
import {
  setElementType,
  isMarkActive,
  toggleMark,
} from './editorUtils';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconSidebar,
} from '@/components/common/Icons';

interface EditorToolbarProps {
  editor: Editor;
  activeType: ScreenplayElementType;
  isSaving: boolean;
  lastSaved: Date | null;
  sceneCount: number;
  wordCount: number;
  pageCount: number;
  showNavigator: boolean;
  onToggleNavigator: () => void;
  showSceneNumbers?: boolean;
  onToggleSceneNumbers?: () => void;
}

export function EditorToolbar({
  editor,
  activeType,
  isSaving,
  lastSaved,
  sceneCount,
  wordCount,
  pageCount,
  showNavigator,
  onToggleNavigator,
  showSceneNumbers = false,
  onToggleSceneNumbers,
}: EditorToolbarProps) {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setElementType(editor, e.target.value as ScreenplayElementType);
  };

  const insertSceneHeading = (prefix: 'INT.' | 'EXT.') => {
    Transforms.insertNodes(editor, {
      type: 'scene-heading',
      children: [{ text: `${prefix} ` }],
    } as any);
  };

  return (
    <div className="editor-toolbar">
      {/* Left controls */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${showNavigator ? 'active' : ''}`}
          onClick={onToggleNavigator}
          title="Toggle Scene Navigator"
        >
          <IconSidebar size={16} />
        </button>

        <div className="toolbar-divider" />

        <select
          className="toolbar-select"
          value={activeType}
          onChange={handleTypeChange}
          aria-label="Screenplay element type"
        >
          <option value="scene-heading">Scene Heading</option>
          <option value="action">Action</option>
          <option value="character">Character</option>
          <option value="parenthetical">Parenthetical</option>
          <option value="dialogue">Dialogue</option>
          <option value="transition">Transition</option>
          <option value="shot">Shot</option>
          <option value="centered">Centered</option>
        </select>

        <div className="toolbar-divider" />

        <button
          className={`toolbar-btn ${isMarkActive(editor, 'bold') ? 'active' : ''}`}
          onClick={() => toggleMark(editor, 'bold')}
          title="Bold (Cmd+B)"
        >
          <IconBold size={15} />
        </button>
        <button
          className={`toolbar-btn ${isMarkActive(editor, 'italic') ? 'active' : ''}`}
          onClick={() => toggleMark(editor, 'italic')}
          title="Italic (Cmd+I)"
        >
          <IconItalic size={15} />
        </button>
        <button
          className={`toolbar-btn ${isMarkActive(editor, 'underline') ? 'active' : ''}`}
          onClick={() => toggleMark(editor, 'underline')}
          title="Underline (Cmd+U)"
        >
          <IconUnderline size={15} />
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn"
          onClick={() => insertSceneHeading('INT.')}
          title="Insert INT. Heading"
        >
          + INT.
        </button>
        <button
          className="toolbar-btn"
          onClick={() => insertSceneHeading('EXT.')}
          title="Insert EXT. Heading"
        >
          + EXT.
        </button>

        {onToggleSceneNumbers && (
          <button
            className={`toolbar-btn ${showSceneNumbers ? 'active' : ''}`}
            onClick={onToggleSceneNumbers}
            title={showSceneNumbers ? 'Hide Scene Numbers on Page' : 'Show Scene Numbers on Page'}
          >
            # Numbers
          </button>
        )}
      </div>

      {/* Right stats and save indicator */}
      <div className="toolbar-group">
        <div className="toolbar-stats">
          <span>{sceneCount} Scenes</span>
          <span>•</span>
          <span>{pageCount} Page{pageCount !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{wordCount} Words</span>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-save-badge">
          <span className={`toolbar-save-dot ${isSaving ? 'saving' : ''}`} />
          <span>
            {isSaving
              ? 'Saving...'
              : lastSaved
              ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Saved'}
          </span>
        </div>
      </div>
    </div>
  );
}
