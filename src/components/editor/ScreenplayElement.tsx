// Slate custom element & leaf renderers for Screenplay formatting
import type { RenderElementProps, RenderLeafProps } from 'slate-react';
import './ScreenplayEditor.css';

interface ScreenplayElementProps extends RenderElementProps {
  isModified?: boolean;
  sceneNumber?: string;
  showSceneNumbers?: boolean;
}

export function ScreenplayElement({
  attributes,
  children,
  element,
  isModified,
  sceneNumber,
  showSceneNumbers = false,
}: ScreenplayElementProps) {
  const type = (element as any).type || 'action';

  // Asterisk for locked revision changes
  const asterisk = isModified ? (
    <span className="screenplay-revision-asterisk" title="Modified line in locked revision" contentEditable={false}>
      *
    </span>
  ) : null;

  switch (type) {
    case 'scene-heading':
      return (
        <div {...attributes} className="screenplay-block screenplay-scene-heading" data-type="scene-heading">
          {showSceneNumbers && sceneNumber && (
            <span
              className="screenplay-scene-number left"
              contentEditable={false}
              aria-hidden="true"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {sceneNumber}
            </span>
          )}
          {children}
          {showSceneNumbers && sceneNumber && (
            <span
              className="screenplay-scene-number right"
              contentEditable={false}
              aria-hidden="true"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {sceneNumber}
            </span>
          )}
          {asterisk}
        </div>
      );
    case 'character':
      return (
        <div {...attributes} className="screenplay-block screenplay-character" data-type="character">
          {children}
          {asterisk}
        </div>
      );
    case 'parenthetical':
      return (
        <div {...attributes} className="screenplay-block screenplay-parenthetical" data-type="parenthetical">
          {children}
          {asterisk}
        </div>
      );
    case 'dialogue':
      return (
        <div {...attributes} className="screenplay-block screenplay-dialogue" data-type="dialogue">
          {children}
          {asterisk}
        </div>
      );
    case 'transition':
      return (
        <div {...attributes} className="screenplay-block screenplay-transition" data-type="transition">
          {children}
          {asterisk}
        </div>
      );
    case 'shot':
      return (
        <div {...attributes} className="screenplay-block screenplay-shot" data-type="shot">
          {children}
          {asterisk}
        </div>
      );
    case 'centered':
      return (
        <div {...attributes} className="screenplay-block screenplay-centered" data-type="centered">
          {children}
          {asterisk}
        </div>
      );
    case 'action':
    default:
      return (
        <div {...attributes} className="screenplay-block screenplay-action" data-type="action">
          {children}
          {asterisk}
        </div>
      );
  }
}

export function ScreenplayLeaf({ attributes, children, leaf }: RenderLeafProps) {
  let el = children;

  if ((leaf as any).bold) {
    el = <strong>{el}</strong>;
  }
  if ((leaf as any).italic) {
    el = <em>{el}</em>;
  }
  if ((leaf as any).underline) {
    el = <u>{el}</u>;
  }

  return <span {...attributes}>{el}</span>;
}
