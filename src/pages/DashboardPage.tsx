// Dashboard page — project listing and creation with Firestore & real-time sync
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ImportScriptModal } from '@/components/editor/ImportScriptModal';
import { ScriptMetadataModal } from '@/components/editor/ScriptMetadataModal';
import {
  IconPlus,
  IconUpload,
  IconFolder,
  IconSearch,
  IconGrid,
  IconList,
  IconClock,
  IconFileText,
  IconTrash,
  IconEdit,
} from '@/components/common/Icons';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  type ProjectDoc,
  subscribeUserProjects,
  createProject,
  updateProjectMetadata,
  deleteProject,
  seedDemoProjectIfEmpty,
} from '@/services/firestoreService';
import type { Descendant } from 'slate';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDoc | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    writer: '',
    productionHouse: '',
    draftName: 'White Draft',
    version: 'v1.0',
    genre: '',
    logline: '',
  });
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Load and subscribe to projects
  useEffect(() => {
    if (!user?.uid) return;

    // Seed demo project if none exist yet
    seedDemoProjectIfEmpty(user.uid).then((initial) => {
      if (initial && initial.length > 0) {
        setProjects(initial);
      }
      setLoading(false);
    });

    // Subscribe to real-time updates
    const unsubscribe = subscribeUserProjects(user.uid, (updated) => {
      setProjects(updated);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid]);

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) {
      addNotification({ type: 'warning', message: 'Please enter a project title.' });
      return;
    }
    if (!user?.uid) {
      addNotification({ type: 'error', message: 'You must be signed in to create a project.' });
      return;
    }

    try {
      setIsCreating(true);
      const created = await createProject(user.uid, newProject);
      addNotification({ type: 'success', message: `Project "${created.title}" created!` });
      setShowCreateModal(false);
      setNewProject({
        title: '',
        writer: '',
        productionHouse: '',
        draftName: 'White Draft',
        version: 'v1.0',
        genre: '',
        logline: '',
      });
      // Immediately open the newly created project
      navigate(`/project/${created.id}/script/${created.defaultScriptId}`);
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'Failed to create project' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportProject = async (imported: {
    title: string;
    genre: string;
    logline: string;
    nodes: Descendant[];
  }) => {
    if (!user?.uid) {
      addNotification({ type: 'error', message: 'You must be signed in to import a project.' });
      return;
    }

    try {
      setIsCreating(true);
      const created = await createProject(
        user.uid,
        {
          title: imported.title,
          genre: imported.genre,
          logline: imported.logline,
        },
        imported.nodes
      );

      addNotification({
        type: 'success',
        message: `Project "${created.title}" successfully imported!`,
      });
      setShowImportModal(false);
      navigate(`/project/${created.id}/script/${created.defaultScriptId}`);
    } catch (err: any) {
      addNotification({ type: 'error', message: err?.message || 'Failed to import project.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, title: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteProject(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        addNotification({ type: 'info', message: `Project "${title}" deleted.` });
      } catch (err: any) {
        addNotification({ type: 'error', message: 'Failed to delete project.' });
      }
    }
  };

  const handleUpdateProjectMetadata = async (updated: Partial<ProjectDoc>) => {
    if (!editingProject) return;
    try {
      const updatedProj = await updateProjectMetadata(editingProject.id, updated);
      if (updatedProj) {
        setProjects((prev) =>
          prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
        );
      }
      addNotification({
        type: 'success',
        message: `Updated details for "${updated.title || editingProject.title}"!`,
      });
    } catch (err) {
      console.error('Failed to update project metadata:', err);
      addNotification({ type: 'error', message: 'Failed to update metadata.' });
    }
  };

  const handleOpenProject = (project: ProjectDoc) => {
    const scriptId = project.defaultScriptId || 'main';
    navigate(`/project/${project.id}/script/${scriptId}`);
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Welcome back, {user?.displayName?.split(' ')[0] ?? 'Writer'}
          </h1>
          <p className="dashboard-subtitle">Your screenwriting projects</p>
        </div>

        <div className="dashboard-header-actions">
          <Button
            variant="secondary"
            icon={<IconUpload size={16} />}
            onClick={() => setShowImportModal(true)}
          >
            Import Script
          </Button>
          <Button
            variant="primary"
            icon={<IconPlus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            New Project
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dashboard-toolbar">
        <div className="dashboard-search">
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Search projects by title, writer, or genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dashboard-search-input"
          />
        </div>

        <div className="dashboard-view-toggle">
          <button
            className={`dashboard-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <IconGrid size={16} />
          </button>
          <button
            className={`dashboard-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <IconList size={16} />
          </button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {loading ? (
        <div className="dashboard-empty">
          <p>Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="dashboard-empty">
          <IconFolder size={48} color="var(--color-text-tertiary)" />
          <h3>No projects found</h3>
          <p>Create a new screenplay project or import an existing script or story.</p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button
              variant="secondary"
              icon={<IconUpload size={16} />}
              onClick={() => setShowImportModal(true)}
            >
              Import Script / Story
            </Button>
            <Button
              variant="primary"
              icon={<IconPlus size={16} />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Project
            </Button>
          </div>
        </div>
      ) : (
        <div className={`dashboard-projects ${viewMode === 'list' ? 'dashboard-projects-list' : ''}`}>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => handleOpenProject(project)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOpenProject(project);
              }}
            >
              <div className="project-card-header">
                <div className="project-card-icon">
                  <IconFileText size={20} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span className="project-card-genre">{project.genre || 'Film'}</span>
                  <button
                    className="project-card-action-btn"
                    title="Edit script metadata & title page"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(project);
                    }}
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    className="project-card-delete-btn"
                    title="Delete project"
                    onClick={(e) => handleDeleteProject(e, project.id, project.title)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>

              <h3 className="project-card-title">{project.title}</h3>
              {project.writer ? (
                <p className="project-card-writer">by {project.writer}</p>
              ) : (
                <p className="project-card-writer" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  Click to set author / writer
                </p>
              )}

              <p className="project-card-logline">{project.logline || 'No logline provided.'}</p>

              <div className="project-card-footer">
                <span className="project-card-meta">
                  <IconFileText size={12} />
                  {project.draftName || 'White Draft'} ({project.version || 'v1.0'})
                </span>
                <span className="project-card-meta">
                  <IconClock size={12} />
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProject(project);
                    }}
                  >
                    Open Script →
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* New Project Card */}
          <button
            className="project-card project-card-new"
            onClick={() => setShowCreateModal(true)}
          >
            <IconPlus size={32} color="var(--color-text-tertiary)" />
            <span>New Project</span>
          </button>

          {/* Import Script Card */}
          <button
            className="project-card project-card-new project-card-import"
            onClick={() => setShowImportModal(true)}
          >
            <IconUpload size={32} color="var(--color-accent-400)" />
            <span>Import Script / Story</span>
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Screenplay Project"
        size="md"
      >
        <div className="create-project-form">
          <div className="form-field">
            <label className="form-label" htmlFor="project-title">
              Script / Project Title *
            </label>
            <input
              id="project-title"
              type="text"
              className="form-input"
              placeholder="e.g., The Last Signal"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-field">
              <label className="form-label" htmlFor="project-writer">
                Writer(s) / Author
              </label>
              <input
                id="project-writer"
                type="text"
                className="form-input"
                placeholder="e.g., Jane Doe, John Smith"
                value={newProject.writer}
                onChange={(e) => setNewProject({ ...newProject, writer: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="project-production">
                Production House / Studio
              </label>
              <input
                id="project-production"
                type="text"
                className="form-input"
                placeholder="e.g., A24 / Neon"
                value={newProject.productionHouse}
                onChange={(e) => setNewProject({ ...newProject, productionHouse: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-field">
              <label className="form-label" htmlFor="project-genre">
                Genre
              </label>
              <input
                id="project-genre"
                type="text"
                className="form-input"
                placeholder="e.g., Sci-Fi Thriller"
                value={newProject.genre}
                onChange={(e) => setNewProject({ ...newProject, genre: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="project-draft">
                Draft Name
              </label>
              <input
                id="project-draft"
                type="text"
                className="form-input"
                placeholder="e.g., First Draft"
                value={newProject.draftName}
                onChange={(e) => setNewProject({ ...newProject, draftName: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="project-version">
                Version
              </label>
              <input
                id="project-version"
                type="text"
                className="form-input"
                placeholder="e.g., v1.0"
                value={newProject.version}
                onChange={(e) => setNewProject({ ...newProject, version: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="project-logline">
              Logline / Synopsis
            </label>
            <textarea
              id="project-logline"
              className="form-input form-textarea"
              placeholder="A brief summary or pitch of your story..."
              rows={3}
              value={newProject.logline}
              onChange={(e) => setNewProject({ ...newProject, logline: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateProject} loading={isCreating}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Script Metadata & Title Page Modal */}
      <ScriptMetadataModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onSave={handleUpdateProjectMetadata}
      />

      {/* Import Script / Story Modal */}
      <ImportScriptModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportProject}
        mode="create-project"
      />
    </div>
  );
}
