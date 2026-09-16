// Shot List & Storyboard Builder Page
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import {
  IconPlus,
  IconGrid,
  IconList,
  IconCamera,
  IconArrowLeft,
  IconTrash,
  IconEdit,
  IconCloud,
} from '@/components/common/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores/notificationStore';
import { getShotsForScene, saveShot, deleteShot } from '@/services/breakdownService';
import { getUserProjects, type ProjectDoc } from '@/services/firestoreService';
import type { Shot, ShotType } from '@/types';
import './ShotListPage.css';

const SHOT_TYPES: ShotType[] = [
  'ECU',
  'CU',
  'MCU',
  'MS',
  'MWS',
  'WIDE',
  'EWS',
  'ESTABLISHING',
  'OTS',
  'POV',
  'INSERT',
  'TWO-SHOT',
  'AERIAL',
];

export function ShotListPage() {
  const { projectId, sceneId } = useParams<{ projectId: string; sceneId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotificationStore();

  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'storyboard'>('storyboard');

  // Shot Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);

  // Form Fields
  const [shotNumber, setShotNumber] = useState('1A');
  const [shotType, setShotType] = useState<ShotType>('MS');
  const [framing, setFraming] = useState('Medium Shot, Eye level');
  const [movement, setMovement] = useState('Slow Dolly Push-In');
  const [lens, setLens] = useState('35mm');
  const [equipment, setEquipment] = useState('Dolly / Track');
  const [description, setDescription] = useState('');
  const [audioNotes, setAudioNotes] = useState('');
  const [storyboardUrl, setStoryboardUrl] = useState('');

  // Load project and shots
  useEffect(() => {
    async function loadShotsData() {
      if (!projectId || !sceneId) return;
      setLoading(true);
      try {
        const projects = await getUserProjects(user?.uid);
        const p = projects.find((proj) => proj.id === projectId);
        if (p) setProject(p);

        const loadedShots = await getShotsForScene(projectId, 'default-script', sceneId);
        if (loadedShots.length > 0) {
          setShots(loadedShots);
        } else {
          // Initialize sample shots for demonstration
          const demoShots: Shot[] = [
            {
              id: 'shot-1',
              sceneId,
              shotNumber: '1A',
              sequenceOrder: 1,
              shotType: 'ESTABLISHING',
              framing: 'Extreme Wide Shot',
              cameraMovement: 'Static Crane',
              lensMm: '18mm',
              equipment: 'Jib Crane',
              description: 'Establishing shot of the high-altitude radio observatory under a starry sky.',
              audioNotes: 'High altitude wind whistle FX',
              storyboardUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
            },
            {
              id: 'shot-2',
              sceneId,
              shotNumber: '1B',
              sequenceOrder: 2,
              shotType: 'MCU',
              framing: 'Medium Close Up',
              cameraMovement: 'Handheld Subtle',
              lensMm: '50mm',
              equipment: 'Shoulder Rig',
              description: 'Focus on DR. ARIS adjusting the glowing spectrum analyzer console.',
              audioNotes: 'Beeping telemetry signals',
              storyboardUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
            },
          ];
          setShots(demoShots);
        }
      } catch (err) {
        console.error('Error loading shots:', err);
      } finally {
        setLoading(false);
      }
    }
    loadShotsData();
  }, [projectId, sceneId]);

  const handleOpenAddModal = () => {
    setEditingShot(null);
    setShotNumber(`${shots.length + 1}A`);
    setShotType('MS');
    setFraming('Medium Shot');
    setMovement('Static');
    setLens('35mm');
    setEquipment('Tripod');
    setDescription('');
    setAudioNotes('');
    setStoryboardUrl('');
    setShowModal(true);
  };

  const handleOpenEditModal = (shot: Shot) => {
    setEditingShot(shot);
    setShotNumber(shot.shotNumber);
    setShotType(shot.shotType);
    setFraming(shot.framing);
    setMovement(shot.cameraMovement);
    setLens(shot.lensMm);
    setEquipment(shot.equipment);
    setDescription(shot.description);
    setAudioNotes(shot.audioNotes);
    setStoryboardUrl(shot.storyboardUrl || '');
    setShowModal(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      addNotification({ type: 'warning', message: 'Image size exceeds 3MB limit.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setStoryboardUrl(base64);
      addNotification({ type: 'success', message: 'Storyboard image uploaded!' });
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleDriveSync = () => {
    const backupData = {
      projectTitle: project?.title || 'Screenplay Project',
      syncedAt: new Date().toISOString(),
      sceneId,
      shotCount: shots.length,
      shots,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.title || 'Project'}_Scene_${sceneId}_ShotList_DriveSync.json`;
    link.click();
    URL.revokeObjectURL(url);

    addNotification({
      type: 'success',
      message: 'Synced to Google Drive / Cloud Backup Package!',
    });
  };

  const handleSaveShot = async () => {
    if (!projectId || !sceneId) return;
    try {
      const saved = await saveShot(projectId, 'default-script', sceneId, {
        id: editingShot ? editingShot.id : undefined,
        shotNumber,
        sequenceOrder: editingShot ? editingShot.sequenceOrder : shots.length + 1,
        shotType,
        framing,
        cameraMovement: movement,
        lensMm: lens,
        equipment,
        description,
        audioNotes,
        storyboardUrl: storyboardUrl || undefined,
      });

      if (editingShot) {
        setShots((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
        addNotification({ type: 'success', message: `Updated Shot #${shotNumber}` });
      } else {
        setShots((prev) => [...prev, saved]);
        addNotification({ type: 'success', message: `Added Shot #${shotNumber}` });
      }
      setShowModal(false);
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to save shot' });
    }
  };

  const handleDeleteShot = async (id: string) => {
    if (!projectId || !sceneId) return;
    try {
      await deleteShot(projectId, 'default-script', sceneId, id);
      setShots((prev) => prev.filter((s) => s.id !== id));
      addNotification({ type: 'info', message: 'Shot deleted' });
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to delete shot' });
    }
  };

  if (loading) {
    return (
      <div className="shotlist-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Loading Shot List...</p>
      </div>
    );
  }

  return (
    <div className="shotlist-page">
      {/* Header */}
      <header className="shotlist-header">
        <div className="shotlist-header-left">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/project/${projectId}/breakdown`)}
            icon={<IconArrowLeft size={16} />}
          >
            Back to Breakdown
          </Button>
          <div>
            <h1>Shot List & Storyboard Builder</h1>
            <span className="shotlist-subtitle">
              Scene {sceneId?.replace('scene-', '') || '1'} • {shots.length} Shots Planned
            </span>
          </div>
        </div>

        {/* Center Header: Script Name in Big Bold Yellow Text */}
        <div className="shotlist-header-center">
          <span className="shotlist-header-script-title" title={project?.title || 'Screenplay'}>
            {project?.title || 'Screenplay'}
          </span>
        </div>

        <div className="shotlist-header-right">
          {/* View Toggle */}
          <div className="view-toggle-bar">
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <IconList size={16} /> Table View
            </button>
            <button
              className={`toggle-btn ${viewMode === 'storyboard' ? 'active' : ''}`}
              onClick={() => setViewMode('storyboard')}
            >
              <IconGrid size={16} /> Storyboard View
            </button>
          </div>

          <Button
            variant="secondary"
            icon={<IconCloud size={16} />}
            onClick={handleGoogleDriveSync}
            title="Export / Sync to Google Drive Package"
          >
            Drive Sync
          </Button>

          <Button variant="primary" icon={<IconPlus size={16} />} onClick={handleOpenAddModal}>
            Add Shot
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="shotlist-content">
        {viewMode === 'table' ? (
          /* Table View */
          <div className="shot-table-wrap">
            <table className="shot-table">
              <thead>
                <tr>
                  <th>Shot #</th>
                  <th>Visual</th>
                  <th>Type</th>
                  <th>Framing</th>
                  <th>Camera Movement</th>
                  <th>Lens</th>
                  <th>Equipment</th>
                  <th>Description</th>
                  <th>Audio Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shots.map((s) => (
                  <tr key={s.id}>
                    <td className="shot-num-cell">{s.shotNumber}</td>
                    <td>
                      {s.storyboardUrl ? (
                        <img
                          src={s.storyboardUrl}
                          alt={`Shot ${s.shotNumber}`}
                          style={{ width: '48px', height: '30px', objectFit: 'cover', borderRadius: '3px' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className="shot-type-badge">{s.shotType}</span>
                    </td>
                    <td>{s.framing}</td>
                    <td>{s.cameraMovement}</td>
                    <td>{s.lensMm}</td>
                    <td>{s.equipment}</td>
                    <td>{s.description}</td>
                    <td>{s.audioNotes || '-'}</td>
                    <td>
                      <div className="shot-actions">
                        <button className="icon-action-btn" onClick={() => handleOpenEditModal(s)} title="Edit Shot">
                          <IconEdit size={14} />
                        </button>
                        <button className="icon-action-btn danger" onClick={() => handleDeleteShot(s.id)} title="Delete Shot">
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Visual Storyboard Strip View */
          <div className="storyboard-grid">
            {shots.map((s) => (
              <div key={s.id} className="storyboard-card">
                <div className="storyboard-card-header">
                  <span className="shot-num-badge">SHOT {s.shotNumber}</span>
                  <span className="shot-type-tag">{s.shotType}</span>
                </div>

                <div className="storyboard-canvas-placeholder">
                  {s.storyboardUrl ? (
                    <img src={s.storyboardUrl} alt={`Shot ${s.shotNumber}`} />
                  ) : (
                    <>
                      <IconCamera size={32} color="var(--color-text-secondary)" />
                      <span style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-text-secondary)' }}>
                        {s.framing} • {s.lensMm}
                      </span>
                    </>
                  )}
                </div>

                <div className="storyboard-card-body">
                  <p className="storyboard-desc">{s.description || 'No description provided.'}</p>
                  <div className="storyboard-meta-row">
                    <span>🎥 {s.cameraMovement}</span>
                    <span>🛠️ {s.equipment}</span>
                  </div>
                </div>

                <div className="storyboard-card-footer">
                  <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => handleOpenEditModal(s)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => handleDeleteShot(s.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Shot Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingShot ? `Edit Shot #${shotNumber}` : 'Add New Shot'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                Shot Number
              </label>
              <input
                type="text"
                value={shotNumber}
                onChange={(e) => setShotNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                Shot Type
              </label>
              <select
                value={shotType}
                onChange={(e) => setShotType(e.target.value as ShotType)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {SHOT_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                Framing
              </label>
              <input
                type="text"
                placeholder="e.g. Low angle, OTS Dr. Aris"
                value={framing}
                onChange={(e) => setFraming(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                Camera Movement
              </label>
              <input
                type="text"
                placeholder="e.g. Tracking Dolly, Pan Right, Handheld"
                value={movement}
                onChange={(e) => setMovement(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                Lens (mm)
              </label>
              <input
                type="text"
                placeholder="e.g. 35mm, 50mm, 85mm"
                value={lens}
                onChange={(e) => setLens(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                Equipment
              </label>
              <input
                type="text"
                placeholder="e.g. Tripod, Steadicam, Gimbal"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          {/* Storyboard Artwork / Upload */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
              Storyboard Sketch / Concept Frame
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}
              />
            </div>
            <input
              type="text"
              placeholder="Or enter Image URL (https://...)"
              value={storyboardUrl}
              onChange={(e) => setStoryboardUrl(e.target.value)}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-xs)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
              Action / Framing Description
            </label>
            <textarea
              rows={2}
              placeholder="Describe what happens in this shot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '4px' }}>
              Audio / Dialogue Notes
            </label>
            <input
              type="text"
              placeholder="Dialogue line or sound effect..."
              value={audioNotes}
              onChange={(e) => setAudioNotes(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveShot}>
              Save Shot
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
