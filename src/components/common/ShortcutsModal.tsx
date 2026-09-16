// Keyboard Shortcuts Cheat Sheet Modal
import { useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import './ShortcutsModal.css';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Global Cmd + / listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts Reference">
      <div className="shortcuts-container">
        {/* Element Types */}
        <div className="shortcut-section">
          <h4 className="shortcut-section-heading">Screenplay Elements</h4>
          <div className="shortcut-grid">
            <div className="shortcut-row">
              <span className="shortcut-desc">Scene Heading</span>
              <kbd className="shortcut-key">Cmd + 1</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Action</span>
              <kbd className="shortcut-key">Cmd + 2</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Character</span>
              <kbd className="shortcut-key">Cmd + 3</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Parenthetical</span>
              <kbd className="shortcut-key">Cmd + 4</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Dialogue</span>
              <kbd className="shortcut-key">Cmd + 5</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Transition</span>
              <kbd className="shortcut-key">Cmd + 6</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Shot</span>
              <kbd className="shortcut-key">Cmd + 7</kbd>
            </div>
          </div>
        </div>

        {/* Auto-Formatting State Machine */}
        <div className="shortcut-section">
          <h4 className="shortcut-section-heading">Smart Auto-Formatting Transitions</h4>
          <div className="shortcut-grid">
            <div className="shortcut-row">
              <span className="shortcut-desc">Character $\rightarrow$ Enter</span>
              <span className="shortcut-val">Dialogue</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Action (empty) $\rightarrow$ Tab</span>
              <span className="shortcut-val">Character</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Dialogue $\rightarrow$ Tab</span>
              <span className="shortcut-val">Parenthetical</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Parenthetical $\rightarrow$ Enter</span>
              <span className="shortcut-val">Dialogue</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Transition $\rightarrow$ Enter</span>
              <span className="shortcut-val">Scene Heading</span>
            </div>
          </div>
        </div>

        {/* Formatting & Controls */}
        <div className="shortcut-section">
          <h4 className="shortcut-section-heading">Formatting & Actions</h4>
          <div className="shortcut-grid">
            <div className="shortcut-row">
              <span className="shortcut-desc">Bold Text</span>
              <kbd className="shortcut-key">Cmd + B</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Italic Text</span>
              <kbd className="shortcut-key">Cmd + I</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Underline Text</span>
              <kbd className="shortcut-key">Cmd + U</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Manual Cloud Save</span>
              <kbd className="shortcut-key">Cmd + S</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Toggle Shortcuts Cheat Sheet</span>
              <kbd className="shortcut-key">Cmd + /</kbd>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
