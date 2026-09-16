// Slate screenplay editor helpers and auto-formatting state machine
import { Editor, Transforms, Element as SlateElement, Node } from 'slate';
import isHotkey from 'is-hotkey';
import type { ScreenplayElementType } from '@/types';

export function getActiveElementType(editor: Editor): ScreenplayElementType {
  const [match] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n),
  });

  return match ? ((match[0] as any).type as ScreenplayElementType) : 'action';
}

export function setElementType(editor: Editor, type: ScreenplayElementType) {
  Transforms.setNodes(
    editor,
    { type } as any,
    { match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) }
  );
}

export function isMarkActive(editor: Editor, format: string) {
  const marks = Editor.marks(editor) as any;
  return marks ? marks[format] === true : false;
}

export function toggleMark(editor: Editor, format: string) {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

/**
 * Handle screenwriting auto-formatting transitions on Enter and Tab
 */
export function handleScreenplayKeyDown(event: React.KeyboardEvent, editor: Editor) {
  const { selection } = editor;
  if (!selection) return;

  // Shortcuts: Cmd+B, Cmd+I, Cmd+U
  if (isHotkey('mod+b', event)) {
    event.preventDefault();
    toggleMark(editor, 'bold');
    return;
  }
  if (isHotkey('mod+i', event)) {
    event.preventDefault();
    toggleMark(editor, 'italic');
    return;
  }
  if (isHotkey('mod+u', event)) {
    event.preventDefault();
    toggleMark(editor, 'underline');
  }

  const currentType = getActiveElementType(editor);

  // Get current node text
  const [entry] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n),
  });
  const nodeText = entry ? Node.string(entry[0]).trim() : '';

  // 1. Handle TAB key
  if (event.key === 'Tab') {
    event.preventDefault();
    if (event.shiftKey) {
      // Shift+Tab -> convert back to Action
      setElementType(editor, 'action');
      return;
    }

    if (currentType === 'action') {
      // Action + Tab -> Character
      setElementType(editor, 'character');
    } else if (currentType === 'dialogue') {
      // Dialogue + Tab -> Parenthetical
      setElementType(editor, 'parenthetical');
    } else if (currentType === 'character') {
      // Character + Tab -> Dialogue
      setElementType(editor, 'dialogue');
    }
    return;
  }

  // 2. Handle ENTER key
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();

    // If on empty line:
    if (nodeText === '') {
      if (currentType === 'dialogue' || currentType === 'parenthetical') {
        // Empty Dialogue/Parenthetical + Enter -> switch to Action
        setElementType(editor, 'action');
        return;
      }
      if (currentType === 'action') {
        // Empty Action + Enter -> Scene Heading
        setElementType(editor, 'scene-heading');
        return;
      }
    }

    // Split node at cursor
    Transforms.splitNodes(editor, { always: true });

    // Determine target element type for the newly inserted block
    let nextType: ScreenplayElementType = 'action';

    switch (currentType) {
      case 'scene-heading':
        nextType = 'action';
        break;
      case 'action':
        nextType = 'action';
        break;
      case 'character':
        nextType = 'dialogue';
        break;
      case 'parenthetical':
        nextType = 'dialogue';
        break;
      case 'dialogue':
        nextType = 'dialogue';
        break;
      case 'transition':
        nextType = 'scene-heading';
        break;
      default:
        nextType = 'action';
    }

    Transforms.setNodes(
      editor,
      { type: nextType } as any,
      { match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) }
    );
  }
}
