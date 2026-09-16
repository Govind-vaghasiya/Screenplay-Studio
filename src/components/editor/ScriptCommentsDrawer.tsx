import { useState } from 'react';
import {
  IconX,
  IconMessageSquare,
  IconPlus,
  IconTrash,
  IconCheck,
} from '@/components/common/Icons';
import { Button } from '@/components/common/Button';
import './ScriptCommentsDrawer.css';

export interface ScriptComment {
  id: string;
  author: string;
  role: 'Director' | 'Writer' | 'DP' | 'Producer' | 'Script Supervisor';
  sceneTag: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

interface ScriptCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sceneList: Array<{ sceneNumber: number; text: string }>;
  comments: ScriptComment[];
  onAddComment: (comment: Omit<ScriptComment, 'id' | 'createdAt' | 'resolved'>) => void;
  onToggleResolve: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function ScriptCommentsDrawer({
  isOpen,
  onClose,
  sceneList,
  comments,
  onAddComment,
  onToggleResolve,
  onDeleteComment,
}: ScriptCommentsDrawerProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [newText, setNewText] = useState('');
  const [newRole, setNewRole] = useState<ScriptComment['role']>('Director');
  const [newSceneTag, setNewSceneTag] = useState('General');
  const [authorName, setAuthorName] = useState('Director');

  const filteredComments = comments.filter((c) => {
    if (activeFilter === 'active') return !c.resolved;
    if (activeFilter === 'resolved') return c.resolved;
    return true;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    onAddComment({
      author: authorName || 'Filmmaker',
      role: newRole,
      sceneTag: newSceneTag,
      text: newText.trim(),
    });

    setNewText('');
  };

  const handleExportNotes = () => {
    const textLines = [
      '==================================================',
      '        SCREENPLAY STUDIO — PRODUCTION NOTES       ',
      '==================================================\n',
      ...comments.map((c, i) => {
        return `[#${i + 1}] ${c.sceneTag.toUpperCase()} | ${c.role.toUpperCase()} (${c.author}) - ${c.resolved ? '[RESOLVED]' : '[ACTIVE]'}\nDate: ${new Date(c.createdAt).toLocaleDateString()}\nNote: ${c.text}\n--------------------------------------------------`;
      }),
    ];

    const blob = new Blob([textLines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Screenplay_Production_Notes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div
        className={`comments-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      <aside className={`comments-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="comments-header">
          <div className="comments-header-title">
            <IconMessageSquare size={16} color="var(--color-accent-400)" />
            <span>Script Notes & Annotations</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {comments.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportNotes}>
                Export Notes
              </Button>
            )}
            <button className="comments-close-btn" onClick={onClose} title="Close drawer">
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="comments-filter-tabs">
          <button
            className={`comments-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({comments.length})
          </button>
          <button
            className={`comments-tab ${activeFilter === 'active' ? 'active' : ''}`}
            onClick={() => setActiveFilter('active')}
          >
            Active ({comments.filter((c) => !c.resolved).length})
          </button>
          <button
            className={`comments-tab ${activeFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setActiveFilter('resolved')}
          >
            Resolved ({comments.filter((c) => c.resolved).length})
          </button>
        </div>

        {/* Comments List */}
        <div className="comments-list">
          {filteredComments.length === 0 ? (
            <div className="comment-empty-state">
              <IconMessageSquare size={32} />
              <p>No script notes yet.</p>
              <span>Add director notes, DP camera ideas, or rewrite feedback below.</span>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`comment-card ${comment.resolved ? 'resolved' : ''}`}
              >
                <div className="comment-card-top">
                  <div className="comment-author-info">
                    <span className="comment-author-name">{comment.author}</span>
                    <span className="comment-role-badge">{comment.role}</span>
                  </div>
                  <span className="comment-scene-tag">{comment.sceneTag}</span>
                </div>

                <div className="comment-text">{comment.text}</div>

                <div className="comment-card-footer">
                  <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                  <div className="comment-actions">
                    <button
                      className="comment-action-btn"
                      onClick={() => onToggleResolve(comment.id)}
                      title={comment.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                    >
                      <IconCheck size={12} color={comment.resolved ? '#10b981' : 'currentColor'} />
                      <span>{comment.resolved ? 'Resolved' : 'Resolve'}</span>
                    </button>
                    <button
                      className="comment-action-btn delete"
                      onClick={() => onDeleteComment(comment.id)}
                      title="Delete Note"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Comment Input Form */}
        <form className="comments-input-section" onSubmit={handleAdd}>
          <div className="comments-input-row">
            <select
              value={newRole}
              onChange={(e) => {
                setNewRole(e.target.value as ScriptComment['role']);
                setAuthorName(e.target.value);
              }}
              className="comment-role-select"
              title="Department / Role"
            >
              <option value="Director">Director</option>
              <option value="Writer">Writer</option>
              <option value="DP">DP (Cinematographer)</option>
              <option value="Producer">Producer</option>
              <option value="Script Supervisor">Script Supervisor</option>
            </select>

            <select
              value={newSceneTag}
              onChange={(e) => setNewSceneTag(e.target.value)}
              className="comment-scene-select"
              title="Associate Scene"
            >
              <option value="General">General Script</option>
              {sceneList.map((sc) => (
                <option key={sc.sceneNumber} value={`Scene ${sc.sceneNumber}`}>
                  Scene {sc.sceneNumber}: {sc.text.substring(0, 18)}...
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Type a production note or camera note (e.g. 'Use 35mm handheld for intimate close-up')..."
            className="comment-textarea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAdd(e);
              }
            }}
          />

          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<IconPlus size={14} />}
            disabled={!newText.trim()}
          >
            Add Note
          </Button>
        </form>
      </aside>
    </>
  );
}
