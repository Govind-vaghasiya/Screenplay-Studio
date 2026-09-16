// Scene Navigator sidebar with scene reordering, sub-scene numbering (2A, 2B), and quick jumping
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  IconSearch,
  IconChevronUp,
  IconChevronDown,
  IconPlus,
  IconEdit,
  IconCheck,
  IconX,
} from '@/components/common/Icons';

export interface SceneItem {
  index: number;
  sceneNumber: string; // e.g. "1", "2A", "2B", "3"
  text: string;
  path: number[];
  lineCount?: number;
}

interface SceneNavigatorProps {
  scenes: SceneItem[];
  collapsed: boolean;
  onSelectScene: (scene: SceneItem) => void;
  onMoveSceneUp?: (sceneIndex: number) => void;
  onMoveSceneDown?: (sceneIndex: number) => void;
  onUpdateSceneNumber?: (sceneIndex: number, newNumber: string) => void;
  onAddSubScene?: (sceneIndex: number) => void;
  onRenumberAll?: () => void;
  activeSceneIndex?: number;
}

export function SceneNavigator({
  scenes,
  collapsed,
  onSelectScene,
  onMoveSceneUp,
  onMoveSceneDown,
  onUpdateSceneNumber,
  onAddSubScene,
  onRenumberAll,
  activeSceneIndex = 0,
}: SceneNavigatorProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);
  const [editNumberValue, setEditNumberValue] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Filter scenes by scene heading text or scene number
  const filteredScenes = useMemo(() => {
    if (!filterQuery.trim()) return scenes;
    const q = filterQuery.toLowerCase().trim();
    return scenes.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        s.sceneNumber.toLowerCase().includes(q) ||
        `scene ${s.sceneNumber}`.toLowerCase().includes(q)
    );
  }, [scenes, filterQuery]);

  // Auto-scroll active scene into view in sidebar
  useEffect(() => {
    if (activeSceneIndex === undefined || activeSceneIndex < 0) return;
    const activeEl = listRef.current?.querySelector(`[data-scene-idx="${activeSceneIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSceneIndex]);

  const handleStartEditNumber = (e: React.MouseEvent, sceneIndex: number, currentNumber: string) => {
    e.stopPropagation();
    setEditingSceneIdx(sceneIndex);
    setEditNumberValue(currentNumber);
  };

  const handleSaveEditNumber = (e: React.MouseEvent | React.KeyboardEvent, sceneIndex: number) => {
    e.stopPropagation();
    if (editNumberValue.trim() && onUpdateSceneNumber) {
      onUpdateSceneNumber(sceneIndex, editNumberValue.trim());
    }
    setEditingSceneIdx(null);
  };

  const handleCancelEditNumber = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setEditingSceneIdx(null);
  };

  if (collapsed) return null;

  return (
    <aside className="scene-navigator">
      <div className="scene-navigator-header">
        <div className="scene-nav-header-title">
          <span>Scenes ({scenes.length})</span>
          {onRenumberAll && scenes.length > 1 && (
            <button
              className="cat-chip"
              style={{ fontSize: '10.5px', padding: '2px 7px', marginLeft: 'auto', background: 'rgba(255,255,255,0.06)' }}
              onClick={onRenumberAll}
              title="Renumber all scenes sequentially (1, 2, 3...)"
            >
              Renumber All
            </button>
          )}
        </div>
        <div className="scene-nav-search-wrap">
          <IconSearch size={13} className="scene-nav-search-icon" />
          <input
            type="text"
            className="scene-nav-search-input"
            placeholder="Filter scenes..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="scene-navigator-list" ref={listRef}>
        {scenes.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            No scene headings yet. Type INT. or EXT. to create a scene.
          </div>
        ) : filteredScenes.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            No matching scenes found for "{filterQuery}".
          </div>
        ) : (
          filteredScenes.map((scene, listIdx) => {
            const isFirst = listIdx === 0;
            const isLast = listIdx === scenes.length - 1;
            const isEditing = editingSceneIdx === listIdx;
            const isActive = activeSceneIndex === listIdx || activeSceneIndex === scene.index;

            return (
              <div
                key={`${scene.index}-${scene.sceneNumber}-${listIdx}`}
                data-scene-idx={listIdx}
                className={`scene-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectScene(scene)}
              >
                {/* Scene Item Top Bar: Scene # & Controls */}
                <div className="scene-nav-item-top" onClick={(e) => e.stopPropagation()}>
                  <div className="scene-nav-item-num-wrap">
                    {isEditing ? (
                      <div className="scene-nav-edit-badge" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          className="scene-nav-num-input"
                          value={editNumberValue}
                          onChange={(e) => setEditNumberValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditNumber(e, listIdx);
                            if (e.key === 'Escape') handleCancelEditNumber(e);
                          }}
                          autoFocus
                        />
                        <button
                          className="scene-nav-btn-icon save"
                          onClick={(e) => handleSaveEditNumber(e, listIdx)}
                          title="Save Scene Number"
                        >
                          <IconCheck size={12} />
                        </button>
                        <button
                          className="scene-nav-btn-icon cancel"
                          onClick={handleCancelEditNumber}
                          title="Cancel"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="scene-nav-item-num"
                        onClick={(e) => handleStartEditNumber(e, listIdx, scene.sceneNumber)}
                        title="Click to rename scene number (e.g. 2A, 2B)"
                      >
                        <span>SCENE {scene.sceneNumber}</span>
                        <IconEdit size={10} className="scene-nav-edit-icon" />
                      </div>
                    )}
                  </div>

                  {/* Reorder and Sub-scene actions */}
                  <div className="scene-nav-item-actions">
                    <button
                      className="scene-nav-btn-icon"
                      disabled={isFirst}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSceneUp?.(listIdx);
                      }}
                      title="Move Scene Up"
                    >
                      <IconChevronUp size={13} />
                    </button>
                    <button
                      className="scene-nav-btn-icon"
                      disabled={isLast}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSceneDown?.(listIdx);
                      }}
                      title="Move Scene Down"
                    >
                      <IconChevronDown size={13} />
                    </button>
                    <button
                      className="scene-nav-btn-sub"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSubScene?.(listIdx);
                      }}
                      title={`Add Sub-Scene (e.g. ${scene.sceneNumber}A, ${scene.sceneNumber}B)`}
                    >
                      <IconPlus size={10} />
                      <span>Sub</span>
                    </button>
                  </div>
                </div>

                {/* Scene Title */}
                <span className="scene-nav-item-title" title={scene.text}>
                  {scene.text || 'UNTITLED SCENE'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
