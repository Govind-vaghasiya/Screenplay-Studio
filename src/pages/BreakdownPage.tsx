// Production Breakdown Page — Manage tagged elements & scene breakdown sheets
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import {
  IconPlus,
  IconSparkles,
  IconTrash,
  IconCamera,
  IconArrowLeft,
  IconFileText,
  IconCheck,
  IconEdit,
  IconZap,
} from '@/components/common/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  getBreakdownElements,
  createBreakdownElement,
  bulkCreateBreakdownElements,
  updateBreakdownElement,
  deleteBreakdownElement,
  toggleElementScene,
  scanSceneForCandidates,
  analyzeSceneWithAI,
  CATEGORY_COLORS,
  ALL_CATEGORIES,
  type DetectedCandidate,
} from '@/services/breakdownService';
import { enhanceBreakdownNotesAI } from '@/services/aiService';
import { getScriptContent, getUserProjects, type ProjectDoc } from '@/services/firestoreService';
import { extractScenesFromNodes, type ExtractedScene } from '@/services/sceneService';
import type { BreakdownCategory, BreakdownElement } from '@/types';
import type { Descendant } from 'slate';
import { TEMPLATE_SCREENPLAY_SLATE } from '@/utils/templateScreenplay';
import './BreakdownPage.css';

const SCAN_PHASES = [
  { label: 'Analyzing scene sluglines, setting & environment...', cat: 'Scene' },
  { label: 'Extracting characters, spoken dialogue & cast members...', cat: 'Cast' },
  { label: 'Scanning physical props, key items & set dressing...', cat: 'Props' },
  { label: 'Detecting wardrobe, vehicles & specialized equipment...', cat: 'Wardrobe' },
  { label: 'Analyzing audio cues, sound effects & camera momentum...', cat: 'Sound' },
  { label: 'Cataloging production elements & organizing breakdown sheet...', cat: 'Special FX' },
];

export function BreakdownPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotificationStore();

  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [scriptNodes, setScriptNodes] = useState<Descendant[]>(TEMPLATE_SCREENPLAY_SLATE);
  const [elements, setElements] = useState<BreakdownElement[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Navigation & View Modes
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [sceneSearch, setSceneSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [scopeFilter, setScopeFilter] = useState<'scene' | 'all'>('scene');
  const [viewTab, setViewTab] = useState<'breakdown' | 'script'>('breakdown');

  // Add Element Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [elementName, setElementName] = useState('');
  const [elementCat, setElementCat] = useState<BreakdownCategory>('Cast');
  const [elementDesc, setElementDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEnhancingAdd, setIsEnhancingAdd] = useState(false);

  // Edit Element Modal
  const [editingElement, setEditingElement] = useState<BreakdownElement | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    categoryName: BreakdownCategory;
    description: string;
    sceneIds: string[];
  }>({
    name: '',
    categoryName: 'Cast',
    description: '',
    sceneIds: [],
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEnhancingEdit, setIsEnhancingEdit] = useState(false);

  // AI Auto-Breakdown Modal
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [aiScope, setAiScope] = useState<'active-scene' | 'full-script'>('active-scene');
  const [isScanningAI, setIsScanningAI] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(15);
  const [detectedCandidates, setDetectedCandidates] = useState<DetectedCandidate[]>([]);

  // Smooth AI Processing Animation Ticker
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isScanningAI) {
      setScanStep(0);
      setScanProgress(15);
      let currentProgress = 15;
      let currentStep = 0;

      interval = setInterval(() => {
        currentProgress = Math.min(94, currentProgress + 14);
        currentStep = (currentStep + 1) % SCAN_PHASES.length;
        setScanProgress(currentProgress);
        setScanStep(currentStep);
      }, 260);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanningAI]);

  // Load project & script content
  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      setLoading(true);
      try {
        const projects = await getUserProjects(user?.uid);
        const p = projects.find((proj) => proj.id === projectId);
        if (p) setProject(p);

        const targetScriptId = p?.defaultScriptId || 'script-demo-signal';
        const content = await getScriptContent(projectId, targetScriptId);
        if (content && content.length > 0) {
          setScriptNodes(content);
        }

        const breakdown = await getBreakdownElements(projectId);
        setElements(breakdown);
      } catch (err) {
        console.error('Error loading breakdown data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId, user?.uid]);

  // Extract scenes from Slate script nodes with exact matching industry-standard numbers
  const scenes = useMemo<ExtractedScene[]>(() => {
    const extracted = extractScenesFromNodes(scriptNodes);
    return extracted.length > 0
      ? extracted
      : extractScenesFromNodes(TEMPLATE_SCREENPLAY_SLATE);
  }, [scriptNodes]);

  const activeScene = scenes[selectedSceneIndex] || scenes[0];

  // Filter scenes by user search
  const filteredScenes = useMemo(() => {
    if (!sceneSearch.trim()) return scenes;
    const q = sceneSearch.toLowerCase();
    return scenes.filter(
      (sc) =>
        sc.heading.toLowerCase().includes(q) ||
        sc.location.toLowerCase().includes(q) ||
        sc.timeOfDay.toLowerCase().includes(q) ||
        `scene ${sc.sceneNumber}`.toLowerCase().includes(q)
    );
  }, [scenes, sceneSearch]);

  // Elements for current scope (Active Scene vs All Project Elements)
  const scopedElements = useMemo(() => {
    if (scopeFilter === 'scene' && activeScene) {
      return elements.filter((el) => (el.sceneIds || []).includes(activeScene.id));
    }
    return elements;
  }, [elements, scopeFilter, activeScene]);

  // Filter elements by Category
  const displayedElements = useMemo(() => {
    if (selectedCategory === 'All') return scopedElements;
    return scopedElements.filter((el) => el.categoryName === selectedCategory);
  }, [scopedElements, selectedCategory]);

  // Count of elements tagged in a specific scene
  const getSceneElementCount = (sceneId: string) => {
    return elements.filter((el) => (el.sceneIds || []).includes(sceneId)).length;
  };

  // Toggle Element in active scene
  const handleToggleElementInScene = async (elementId: string) => {
    if (!projectId || !activeScene) return;
    try {
      const updated = await toggleElementScene(projectId, elementId, activeScene.id);
      setElements(updated);
    } catch (err) {
      console.error('Failed to toggle element in scene:', err);
    }
  };

  // Handle Add Custom Element
  const handleAddElement = async () => {
    if (!elementName.trim() || !projectId) return;
    try {
      setIsAdding(true);
      const newEl = await createBreakdownElement(projectId, {
        categoryName: elementCat,
        categoryId: elementCat.toLowerCase(),
        name: elementName.trim(),
        description: elementDesc.trim() || `Production item for Scene ${activeScene?.sceneNumber || 1}`,
        colorCode: CATEGORY_COLORS[elementCat],
        sceneIds: activeScene ? [activeScene.id] : [],
      });
      setElements((prev) => [...prev, newEl]);
      setElementName('');
      setElementDesc('');
      setShowAddModal(false);
      addNotification({
        type: 'success',
        message: `Added "${newEl.name}" to ${newEl.categoryName}!`,
      });
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to create element' });
    } finally {
      setIsAdding(false);
    }
  };

  // Open Edit Modal for an element
  const handleOpenEditModal = (el: BreakdownElement) => {
    setEditingElement(el);
    setEditFormData({
      name: el.name,
      categoryName: el.categoryName,
      description: el.description || '',
      sceneIds: el.sceneIds || [],
    });
  };

  // Save changes to edited element
  const handleSaveEditElement = async () => {
    if (!editingElement || !projectId || !editFormData.name.trim()) return;
    try {
      setIsUpdating(true);
      const updates = {
        name: editFormData.name.trim(),
        categoryName: editFormData.categoryName,
        categoryId: editFormData.categoryName.toLowerCase(),
        colorCode: CATEGORY_COLORS[editFormData.categoryName],
        description: editFormData.description.trim(),
        sceneIds: editFormData.sceneIds,
      };

      await updateBreakdownElement(projectId, editingElement.id, updates);
      setElements((prev) =>
        prev.map((el) => (el.id === editingElement.id ? { ...el, ...updates } : el))
      );
      setEditingElement(null);
      addNotification({
        type: 'success',
        message: `Updated "${updates.name}" in breakdown!`,
      });
    } catch (err) {
      console.error('Failed to update element:', err);
      addNotification({ type: 'error', message: 'Failed to update element.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle Scene Assignment in Edit Modal
  const handleToggleEditScene = (sceneId: string) => {
    setEditFormData((prev) => {
      const exists = prev.sceneIds.includes(sceneId);
      const updated = exists
        ? prev.sceneIds.filter((s) => s !== sceneId)
        : [...prev.sceneIds, sceneId];
      return { ...prev, sceneIds: updated };
    });
  };

  // Handle Delete Element
  const handleDeleteElement = async (id: string, name: string) => {
    if (!projectId) return;
    try {
      await deleteBreakdownElement(projectId, id);
      setElements((prev) => prev.filter((el) => el.id !== id));
      addNotification({ type: 'info', message: `Deleted "${name}" from breakdown.` });
    } catch (err) {
      addNotification({ type: 'error', message: 'Failed to delete element.' });
    }
  };

  // AI Enhance Production Notes (Add Modal)
  const handleEnhanceAddNotes = async () => {
    if (!elementName.trim()) {
      addNotification({ type: 'warning', message: 'Please enter an element name first.' });
      return;
    }
    setIsEnhancingAdd(true);
    try {
      const sceneCtx = activeScene ? `${activeScene.heading}\n${activeScene.plainText}` : '';
      const enhanced = await enhanceBreakdownNotesAI(
        'gemini',
        elementName,
        elementCat,
        elementDesc,
        sceneCtx
      );
      setElementDesc(enhanced);
      addNotification({ type: 'success', message: 'AI enhanced production notes!' });
    } catch (err) {
      console.error('Enhance failed:', err);
    } finally {
      setIsEnhancingAdd(false);
    }
  };

  // AI Enhance Production Notes (Edit Modal)
  const handleEnhanceEditNotes = async () => {
    if (!editFormData.name.trim()) {
      addNotification({ type: 'warning', message: 'Please enter an element name first.' });
      return;
    }
    setIsEnhancingEdit(true);
    try {
      const sceneCtx = activeScene ? `${activeScene.heading}\n${activeScene.plainText}` : '';
      const enhanced = await enhanceBreakdownNotesAI(
        'gemini',
        editFormData.name,
        editFormData.categoryName,
        editFormData.description,
        sceneCtx
      );
      setEditFormData((prev) => ({ ...prev, description: enhanced }));
      addNotification({ type: 'success', message: 'AI enhanced production notes!' });
    } catch (err) {
      console.error('Enhance failed:', err);
    } finally {
      setIsEnhancingEdit(false);
    }
  };

  // Run AI Auto-Breakdown Scanner
  const handleStartAIScan = async (scope: 'active-scene' | 'full-script') => {
    setAiScope(scope);
    setIsScanningAI(true);
    setScanProgress(15);
    setScanStep(0);
    setShowAutoModal(true);

    const startTime = Date.now();

    try {
      const candidates: DetectedCandidate[] = [];

      if (scope === 'active-scene' && activeScene) {
        // Try Cloud AI (Gemini) first, with local NLP fallback
        const aiResults = await analyzeSceneWithAI(
          activeScene.plainText,
          activeScene.sceneNumber,
          activeScene.id,
          activeScene.heading
        );

        if (aiResults.length > 0) {
          candidates.push(...aiResults);
        } else {
          // Local multilingual NLP extraction
          const localResults = scanSceneForCandidates(
            activeScene.nodes,
            activeScene.id,
            activeScene.sceneNumber
          );
          candidates.push(...localResults);
        }
      } else {
        // Scan full script across all scenes
        for (const sc of scenes) {
          const scResults = scanSceneForCandidates(sc.nodes, sc.id, sc.sceneNumber);
          candidates.push(...scResults);
        }
      }

      // Ensure minimum 1200ms for smooth user visual feedback of the scanning stages
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }

      setScanProgress(100);

      // Mark whether items already exist
      const prepared = candidates.map((item) => {
        const alreadyExists = elements.some(
          (e) =>
            e.name.toLowerCase() === item.name.toLowerCase() &&
            e.categoryName === item.category &&
            (e.sceneIds || []).includes(item.sceneId)
        );
        return {
          ...item,
          checked: !alreadyExists,
        };
      });

      setTimeout(() => {
        setDetectedCandidates(prepared);
        setIsScanningAI(false);
      }, 350);
    } catch (err) {
      console.error('AI Breakdown scan failed:', err);
      setIsScanningAI(false);
    }
  };

  // Confirm and tag selected AI breakdown elements
  const handleConfirmAIBreakdown = async () => {
    if (!projectId) return;
    const selected = detectedCandidates.filter((c) => c.checked && c.name.trim().length > 0);

    if (selected.length === 0) {
      setShowAutoModal(false);
      return;
    }

    try {
      const itemsToCreate = selected.map((item) => ({
        categoryName: item.category,
        categoryId: item.category.toLowerCase(),
        name: item.name.trim(),
        description: item.description || `Auto-tagged for Scene ${item.sceneNumber}`,
        colorCode: CATEGORY_COLORS[item.category],
        sceneIds: [item.sceneId],
      }));

      await bulkCreateBreakdownElements(projectId, itemsToCreate);
      const updatedElements = await getBreakdownElements(projectId);
      setElements(updatedElements);

      setShowAutoModal(false);
      addNotification({
        type: 'success',
        message: `Successfully tagged ${selected.length} production breakdown elements!`,
      });
    } catch (err) {
      console.error('Failed to import AI breakdown elements:', err);
      addNotification({ type: 'error', message: 'Failed to import elements.' });
    }
  };

  const handleToggleCandidateCheck = (index: number) => {
    setDetectedCandidates((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleUpdateCandidateName = (index: number, newName: string) => {
    setDetectedCandidates((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name: newName } : item))
    );
  };

  const handleUpdateCandidateCategory = (index: number, newCat: BreakdownCategory) => {
    setDetectedCandidates((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, category: newCat } : item))
    );
  };

  const handleDeleteCandidateRow = (index: number) => {
    setDetectedCandidates((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCustomCandidate = () => {
    setDetectedCandidates((prev) => [
      ...prev,
      {
        name: 'New Custom Item',
        category: 'Props',
        sceneId: activeScene ? activeScene.id : 'scene-1',
        sceneNumber: activeScene ? activeScene.sceneNumber : 1,
        description: 'User added custom candidate',
        confidence: 'high',
        checked: true,
      },
    ]);
  };

  const handleToggleAllCandidates = (checked: boolean) => {
    setDetectedCandidates((prev) => prev.map((item) => ({ ...item, checked })));
  };

  if (loading) {
    return (
      <div className="breakdown-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Loading Production Breakdown Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="breakdown-page">
      {/* Top Header */}
      <header className="breakdown-header">
        <div className="breakdown-header-left">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const defaultScriptId = project?.defaultScriptId || 'main';
              navigate(`/project/${projectId}/script/${defaultScriptId}`);
            }}
            icon={<IconArrowLeft size={16} />}
          >
            Back to Script
          </Button>
          <div className="breakdown-title-wrap">
            <h1>Script Breakdown Engine</h1>
            <span className="breakdown-subtitle">
              {scenes.length} Scenes • {elements.length} Tagged Elements
            </span>
          </div>
        </div>

        {/* Center Header: Script Name in Big Bold Yellow Text */}
        <div className="breakdown-header-center">
          <span className="breakdown-header-script-title" title={project?.title || 'Screenplay'}>
            {project?.title || 'Screenplay'}
          </span>
        </div>

        <div className="breakdown-header-actions">
          <Button
            variant="primary"
            icon={<IconSparkles size={16} />}
            onClick={() => handleStartAIScan('active-scene')}
            title="Scan active scene with AI to auto-tag Cast, Props, SFX, Sound & Wardrobe"
          >
            AI Auto-Breakdown
          </Button>
          <Button
            variant="secondary"
            icon={<IconPlus size={16} />}
            onClick={() => setShowAddModal(true)}
          >
            Add Element
          </Button>
        </div>
      </header>

      {/* Main Breakdown Workspace */}
      <div className="breakdown-body">
        {/* Left Sidebar: Scene Navigator */}
        <aside className="breakdown-sidebar">
          <div className="sidebar-header-bar">
            <div className="sidebar-title-row">
              <span className="sidebar-section-title">Scenes ({scenes.length})</span>
              <button
                className="cat-chip"
                style={{ fontSize: '10px', padding: '1px 6px' }}
                onClick={() => handleStartAIScan('full-script')}
                title="Run AI scan on entire screenplay"
              >
                Scan All
              </button>
            </div>
            <input
              type="text"
              placeholder="Search scene, location, time..."
              value={sceneSearch}
              onChange={(e) => setSceneSearch(e.target.value)}
              className="sidebar-search-input"
            />
          </div>

          <div className="scene-picker-list">
            {filteredScenes.map((sc) => {
              const sceneIndex = scenes.findIndex((s) => s.id === sc.id);
              const isSelected = sceneIndex === selectedSceneIndex;
              const tagCount = getSceneElementCount(sc.id);

              return (
                <div
                  key={sc.id}
                  role="button"
                  tabIndex={0}
                  className={`scene-picker-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedSceneIndex(sceneIndex)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedSceneIndex(sceneIndex)}
                >
                  <div className="scene-picker-top">
                    <span className="scene-item-num">SCENE {sc.sceneNumber}</span>
                    <span className="scene-item-tag-count">{tagCount} tags</span>
                  </div>

                  <div className="scene-item-heading" title={sc.heading}>
                    {sc.heading}
                  </div>

                  <div className="scene-item-meta">
                    <span>{sc.eighths} pgs</span>
                    <span>{sc.timeOfDay}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center / Right Content: Production Breakdown Sheet */}
        <main className="breakdown-content">
          {activeScene ? (
            <div className="scene-sheet-card">
              {/* Scene Sheet Header */}
              <div className="scene-sheet-header">
                <div className="scene-sheet-header-top">
                  <div className="scene-badges-row">
                    <span className="scene-num-badge">SCENE {activeScene.sceneNumber}</span>
                    <span className="scene-type-badge">{activeScene.prefix}</span>
                    <span className="scene-type-badge">{activeScene.timeOfDay}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconCamera size={14} />}
                      onClick={() => navigate(`/project/${projectId}/shots/${activeScene.id}`)}
                    >
                      Scene Shots →
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<IconSparkles size={14} />}
                      onClick={() => handleStartAIScan('active-scene')}
                    >
                      AI Scan Scene
                    </Button>
                  </div>
                </div>

                <h2 className="scene-sheet-title">{activeScene.heading}</h2>

                <div className="scene-stats-chips">
                  <span className="scene-stat-item">
                    Page Length: <strong>{activeScene.eighths} pgs</strong>
                  </span>
                  <span className="scene-stat-item">
                    Lines: <strong>{activeScene.lineCount}</strong>
                  </span>
                  <span className="scene-stat-item">
                    Tagged Elements in Scene: <strong>{getSceneElementCount(activeScene.id)}</strong>
                  </span>
                </div>
              </div>

              {/* View Mode & Scope Toggle Bar */}
              <div className="breakdown-view-tabs">
                <div className="view-toggle-group">
                  <button
                    className={`view-toggle-btn ${viewTab === 'breakdown' ? 'active' : ''}`}
                    onClick={() => setViewTab('breakdown')}
                  >
                    <IconFileText size={13} />
                    <span>Breakdown Sheet ({scopedElements.length})</span>
                  </button>
                  <button
                    className={`view-toggle-btn ${viewTab === 'script' ? 'active' : ''}`}
                    onClick={() => setViewTab('script')}
                  >
                    <span>Scene Script & Highlights</span>
                  </button>
                </div>

                {viewTab === 'breakdown' && (
                  <div className="scope-toggle-group">
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeFilter === 'scene'}
                        onChange={() => setScopeFilter('scene')}
                      />
                      <span>This Scene Only ({getSceneElementCount(activeScene.id)})</span>
                    </label>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeFilter === 'all'}
                        onChange={() => setScopeFilter('all')}
                      />
                      <span>All Project Items ({elements.length})</span>
                    </label>
                  </div>
                )}
              </div>

              {viewTab === 'breakdown' ? (
                <>
                  {/* Category Filter Chips */}
                  <div className="category-filter-bar">
                    <button
                      className={`cat-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('All')}
                    >
                      All ({scopedElements.length})
                    </button>
                    {ALL_CATEGORIES.map((cat) => {
                      const count = scopedElements.filter((e) => e.categoryName === cat).length;
                      const isActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          className={`cat-chip ${isActive ? 'active' : ''}`}
                          style={{
                            borderColor: CATEGORY_COLORS[cat],
                            color: isActive ? '#ffffff' : CATEGORY_COLORS[cat],
                            backgroundColor: isActive ? CATEGORY_COLORS[cat] : 'transparent',
                          }}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>

                    {/* Tagged Elements Grid */}
                    <div className="elements-grid">
                      {displayedElements.length === 0 ? (
                        <div className="elements-empty">
                          <p>
                            {scopeFilter === 'scene'
                              ? `No breakdown elements tagged in Scene ${activeScene.sceneNumber} (${selectedCategory}).`
                              : `No elements created in ${selectedCategory} yet.`}
                          </p>
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<IconSparkles size={14} />}
                              onClick={() => handleStartAIScan('active-scene')}
                            >
                              AI Auto-Detect
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<IconPlus size={14} />}
                              onClick={() => {
                                if (selectedCategory !== 'All') {
                                  setElementCat(selectedCategory as BreakdownCategory);
                                }
                                setShowAddModal(true);
                              }}
                            >
                              Tag New Element
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {displayedElements.map((el) => {
                            const inCurrentScene = (el.sceneIds || []).includes(activeScene.id);

                            return (
                              <div
                                key={el.id}
                                className="element-card"
                                style={{ backgroundColor: el.colorCode }}
                              >
                                <div className="element-card-top">
                                  <span className="element-cat-tag">
                                    {el.categoryName}
                                  </span>

                                  <div className="element-actions">
                                    <button
                                      className={`element-link-btn ${inCurrentScene ? 'in-scene' : ''}`}
                                      onClick={() => handleToggleElementInScene(el.id)}
                                      title={
                                        inCurrentScene
                                          ? `Tagged in Scene ${activeScene.sceneNumber} (Click to untag)`
                                          : `Not in Scene ${activeScene.sceneNumber} (Click to tag)`
                                      }
                                    >
                                      {inCurrentScene ? '✓ In Scene' : '+ Tag to Scene'}
                                    </button>
                                    <button
                                      className="element-action-btn"
                                      onClick={() => handleOpenEditModal(el)}
                                      title="Edit Element Details & Scenes"
                                    >
                                      <IconEdit size={13} />
                                    </button>
                                    <button
                                      className="element-delete-btn"
                                      onClick={() => handleDeleteElement(el.id, el.name)}
                                      title="Delete Element from Project"
                                    >
                                      <IconTrash size={13} />
                                    </button>
                                  </div>
                                </div>

                                <h4 className="element-name">{el.name}</h4>
                                {el.description && <p className="element-desc">{el.description}</p>}
                              </div>
                            );
                          })}

                          {/* Dedicated + Add Element tile at the end of the grid */}
                          <button
                            type="button"
                            className="element-card element-card-add-tile"
                            onClick={() => {
                              if (selectedCategory !== 'All') {
                                setElementCat(selectedCategory as BreakdownCategory);
                              }
                              setShowAddModal(true);
                            }}
                            title="Add a new breakdown element to this scene"
                          >
                            <div className="add-tile-icon-wrap">
                              <IconPlus size={20} />
                            </div>
                            <span className="add-tile-label">+ Add Element</span>
                            <span className="add-tile-sub">
                              {selectedCategory !== 'All' ? `Add ${selectedCategory}` : `Add to Scene ${activeScene.sceneNumber}`}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                </>
              ) : (
                /* Scene Script Reader with Live Color Highlights */
                <div className="scene-script-reader">
                  {activeScene.nodes.map((node: any, idx: number) => {
                    const type = node.type || 'action';
                    const text = (node.children || []).map((c: any) => c.text || '').join('');

                    return (
                      <div key={idx} className={`scene-reader-line ${type}`}>
                        {text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="elements-empty">
              <p>Select a scene from the left to view its production breakdown sheet.</p>
            </div>
          )}
        </main>
      </div>

      {/* Add Custom Element Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Tag Breakdown Element ${activeScene ? `(Scene ${activeScene.sceneNumber})` : ''}`}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-field">
            <label className="form-label" htmlFor="new-element-name">
              Element Name *
            </label>
            <input
              id="new-element-name"
              type="text"
              className="form-input"
              placeholder="e.g., Vintage Radio Transmitter, Dr. Aris, Revolver"
              value={elementName}
              onChange={(e) => setElementName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="new-element-cat">
              Breakdown Category
            </label>
            <select
              id="new-element-cat"
              className="form-input"
              value={elementCat}
              onChange={(e) => setElementCat(e.target.value as BreakdownCategory)}
            >
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <div className="form-label-row">
              <label className="form-label" htmlFor="new-element-desc" style={{ margin: 0 }}>
                Production Description / Notes
              </label>
              <button
                type="button"
                className={`breakdown-enhance-btn ${isEnhancingAdd ? 'enhancing' : ''}`}
                onClick={handleEnhanceAddNotes}
                disabled={!elementName.trim() || isEnhancingAdd}
                title="AI Enhance or Generate professional department production notes"
              >
                <IconZap size={12} />
                <span>{isEnhancingAdd ? 'Enhancing...' : '⚡ Enhance with AI'}</span>
              </button>
            </div>
            <textarea
              id="new-element-desc"
              className="form-input form-textarea"
              rows={3}
              placeholder="Props specifics, special costume cues, VFX requirements..."
              value={elementDesc}
              onChange={(e) => setElementDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddElement} loading={isAdding}>
              Save Element
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Breakdown Element Modal */}
      <Modal
        isOpen={!!editingElement}
        onClose={() => setEditingElement(null)}
        title="Edit Breakdown Element"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-field">
            <label className="form-label" htmlFor="edit-element-name">
              Element Name *
            </label>
            <input
              id="edit-element-name"
              type="text"
              className="form-input"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="edit-element-cat">
              Category
            </label>
            <select
              id="edit-element-cat"
              className="form-input"
              value={editFormData.categoryName}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  categoryName: e.target.value as BreakdownCategory,
                })
              }
            >
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <div className="form-label-row">
              <label className="form-label" htmlFor="edit-element-desc" style={{ margin: 0 }}>
                Description / Production Notes
              </label>
              <button
                type="button"
                className={`breakdown-enhance-btn ${isEnhancingEdit ? 'enhancing' : ''}`}
                onClick={handleEnhanceEditNotes}
                disabled={!editFormData.name.trim() || isEnhancingEdit}
                title="AI Enhance or Generate professional department production notes"
              >
                <IconZap size={12} />
                <span>{isEnhancingEdit ? 'Enhancing...' : '⚡ Enhance with AI'}</span>
              </button>
            </div>
            <textarea
              id="edit-element-desc"
              className="form-input form-textarea"
              rows={3}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
          </div>

          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Assigned Scenes ({editFormData.sceneIds.length} of {scenes.length})
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className="cat-chip"
                  style={{ fontSize: '10px', padding: '1px 6px' }}
                  onClick={() => setEditFormData({ ...editFormData, sceneIds: scenes.map((s) => s.id) })}
                >
                  All
                </button>
                {activeScene && (
                  <button
                    type="button"
                    className="cat-chip"
                    style={{ fontSize: '10px', padding: '1px 6px' }}
                    onClick={() => setEditFormData({ ...editFormData, sceneIds: [activeScene.id] })}
                  >
                    Current Only
                  </button>
                )}
                <button
                  type="button"
                  className="cat-chip"
                  style={{ fontSize: '10px', padding: '1px 6px' }}
                  onClick={() => setEditFormData({ ...editFormData, sceneIds: [] })}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="scene-assignment-grid">
              {scenes.map((sc) => {
                const isAssigned = editFormData.sceneIds.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    className={`scene-assign-chip ${isAssigned ? 'active' : ''}`}
                    onClick={() => handleToggleEditScene(sc.id)}
                  >
                    {isAssigned ? '✓ ' : '+ '}Sc. {sc.sceneNumber}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setEditingElement(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEditElement} loading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Auto-Breakdown Review & Import Modal */}
      <Modal
        isOpen={showAutoModal}
        onClose={() => setShowAutoModal(false)}
        title="AI Auto-Detected Breakdown Candidates"
        size="md"
      >
        <div className="ai-breakdown-modal">
          <div className="ai-scope-selector">
            <button
              className={`ai-scope-btn ${aiScope === 'active-scene' ? 'active' : ''}`}
              onClick={() => handleStartAIScan('active-scene')}
            >
              Active Scene (Scene {activeScene?.sceneNumber || 1})
            </button>
            <button
              className={`ai-scope-btn ${aiScope === 'full-script' ? 'active' : ''}`}
              onClick={() => handleStartAIScan('full-script')}
            >
              Full Screenplay ({scenes.length} Scenes)
            </button>
          </div>

          {isScanningAI ? (
            <div className="ai-scan-processing-card">
              {/* Animated Radar Scanning Core */}
              <div className="ai-scan-radar-wrapper">
                <div className="ai-scan-radar-pulse pulse-1" />
                <div className="ai-scan-radar-pulse pulse-2" />
                <div className="ai-scan-radar-pulse pulse-3" />
                <div className="ai-scan-radar-core">
                  <IconSparkles size={26} className="ai-scan-sparkle-anim" />
                </div>
              </div>

              {/* Title & Scope Info */}
              <div className="ai-scan-status-header">
                <h3 className="ai-scan-title">
                  {aiScope === 'active-scene'
                    ? `AI Analyzing Scene ${activeScene?.sceneNumber || 1}...`
                    : `Deep Scanning All ${scenes.length} Scenes...`}
                </h3>
                <p className="ai-scan-subtitle">
                  Parsing characters, props, wardrobe, vehicles & audio cues
                </p>
              </div>

              {/* Dynamic Live Phase Ticker */}
              <div className="ai-scan-phase-ticker">
                <span className="ai-scan-phase-dot" />
                <span className="ai-scan-phase-text">{SCAN_PHASES[scanStep]?.label}</span>
              </div>

              {/* Shimmer Animated Progress Track */}
              <div className="ai-scan-progress-box">
                <div className="ai-scan-progress-track">
                  <div
                    className="ai-scan-progress-fill"
                    style={{ width: `${scanProgress}%` }}
                  >
                    <div className="ai-scan-progress-shimmer" />
                  </div>
                </div>
                <div className="ai-scan-progress-labels">
                  <span>Cataloging screenplay requirements</span>
                  <span className="ai-scan-progress-pct">{scanProgress}%</span>
                </div>
              </div>

              {/* Animated Category Radar Pills */}
              <div className="ai-scan-categories-grid">
                {(['Cast', 'Props', 'Wardrobe', 'Vehicles', 'Sound', 'Special FX'] as BreakdownCategory[]).map((catName) => {
                  const isCurrent = SCAN_PHASES[scanStep]?.cat === catName;
                  const color = CATEGORY_COLORS[catName] || '#f59e0b';
                  return (
                    <div
                      key={catName}
                      className={`ai-scan-cat-pill ${isCurrent ? 'active' : ''}`}
                      style={{
                        borderColor: isCurrent ? color : 'var(--color-border-subtle)',
                        color: isCurrent ? '#ffffff' : 'var(--color-text-secondary)',
                        backgroundColor: isCurrent ? color : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: isCurrent ? `0 0 14px ${color}55` : 'none',
                      }}
                    >
                      <span className="cat-dot" style={{ backgroundColor: color }} />
                      <span>{catName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : detectedCandidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
              <p>No new breakdown candidates detected in this selection.</p>
              <Button variant="secondary" size="sm" onClick={handleAddCustomCandidate} style={{ marginTop: 'var(--space-3)' }}>
                + Add Custom Element
              </Button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Found <strong>{detectedCandidates.length}</strong> candidates. Edit, modify, or add more before tagging:
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    className="cat-chip"
                    style={{ fontSize: '10px' }}
                    onClick={handleAddCustomCandidate}
                  >
                    + Add More
                  </button>
                  <button
                    className="cat-chip"
                    style={{ fontSize: '10px' }}
                    onClick={() => handleToggleAllCandidates(true)}
                  >
                    Select All
                  </button>
                  <button
                    className="cat-chip"
                    style={{ fontSize: '10px' }}
                    onClick={() => handleToggleAllCandidates(false)}
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="ai-candidates-list">
                {detectedCandidates.map((candidate, idx) => (
                  <div
                    key={`${candidate.category}-${candidate.name}-${idx}`}
                    className={`ai-candidate-row ${candidate.checked ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={candidate.checked}
                      onChange={() => handleToggleCandidateCheck(idx)}
                    />

                    <select
                      className="ai-candidate-category-select"
                      value={candidate.category}
                      style={{
                        borderColor: CATEGORY_COLORS[candidate.category],
                        color: CATEGORY_COLORS[candidate.category],
                      }}
                      onChange={(e) => handleUpdateCandidateCategory(idx, e.target.value as BreakdownCategory)}
                    >
                      {ALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <div className="ai-candidate-info">
                      <input
                        type="text"
                        className="ai-candidate-input"
                        value={candidate.name}
                        onChange={(e) => handleUpdateCandidateName(idx, e.target.value)}
                        placeholder="Element Name"
                      />
                      <span className="ai-candidate-desc">{candidate.description}</span>
                    </div>

                    <span className="ai-candidate-scene-badge">Sc. {candidate.sceneNumber}</span>

                    <button
                      className="element-delete-btn"
                      onClick={() => handleDeleteCandidateRow(idx)}
                      title="Remove candidate"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-1)' }}>
                <Button variant="ghost" size="sm" icon={<IconPlus size={13} />} onClick={handleAddCustomCandidate}>
                  Add Another Element
                </Button>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setShowAutoModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<IconCheck size={16} />}
              onClick={handleConfirmAIBreakdown}
              disabled={isScanningAI || detectedCandidates.filter((c) => c.checked).length === 0}
            >
              Tag {detectedCandidates.filter((c) => c.checked).length} Selected Elements
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
