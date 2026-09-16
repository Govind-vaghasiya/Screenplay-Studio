import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { IconFileText, IconEdit, IconCheck } from '@/components/common/Icons';
import type { ProjectDoc } from '@/services/firestoreService';
import './ScriptMetadataModal.css';

interface ScriptMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectDoc | null;
  onSave: (updatedData: Partial<ProjectDoc>) => Promise<void> | void;
}

export function ScriptMetadataModal({
  isOpen,
  onClose,
  project,
  onSave,
}: ScriptMetadataModalProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    writer: '',
    productionHouse: '',
    email: '',
    phone: '',
    draftName: '',
    version: '',
    genre: '',
    logline: '',
    copyright: '',
  });

  // Sync form data with current project
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        writer: project.writer || '',
        productionHouse: project.productionHouse || '',
        email: project.email || '',
        phone: project.phone || '',
        draftName: project.draftName || 'White Draft',
        version: project.version || 'v1.0',
        genre: project.genre || '',
        logline: project.logline || '',
        copyright: project.copyright || '',
      });
    }
  }, [project, isOpen]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a script title.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        title: formData.title.trim(),
        writer: formData.writer.trim(),
        productionHouse: formData.productionHouse.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        draftName: formData.draftName.trim() || 'White Draft',
        version: formData.version.trim() || 'v1.0',
        genre: formData.genre.trim(),
        logline: formData.logline.trim(),
        copyright: formData.copyright.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to save script metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Script Details & Title Page"
      size="md"
    >
      <div className="script-metadata-modal">
        {/* Navigation Tabs */}
        <div className="script-metadata-tabs">
          <button
            className={`metadata-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            <IconEdit size={14} />
            <span>Edit Metadata</span>
          </button>
          <button
            className={`metadata-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <IconFileText size={14} />
            <span>Title Page Preview</span>
          </button>
        </div>

        {activeTab === 'edit' ? (
          <div className="metadata-form-grid">
            {/* Script Core Identity */}
            <div className="metadata-section-title">Script Identity</div>

            <div className="form-field form-field-full">
              <label className="form-label" htmlFor="script-name-input">
                Script Name / Title *
              </label>
              <input
                id="script-name-input"
                type="text"
                className="form-input"
                placeholder="e.g. The Last Signal"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="script-writer-input">
                Writer(s) / Author
              </label>
              <input
                id="script-writer-input"
                type="text"
                className="form-input"
                placeholder="e.g. Christopher Nolan, Jonathan Nolan"
                value={formData.writer}
                onChange={(e) => handleChange('writer', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="script-studio-input">
                Production House / Studio
              </label>
              <input
                id="script-studio-input"
                type="text"
                className="form-input"
                placeholder="e.g. Syncopy / Warner Bros."
                value={formData.productionHouse}
                onChange={(e) => handleChange('productionHouse', e.target.value)}
              />
            </div>

            {/* Revision & Version Tracking */}
            <div className="metadata-section-title">Draft & Versioning</div>

            <div className="form-field">
              <label className="form-label" htmlFor="script-draft-input">
                Draft Name
              </label>
              <input
                id="script-draft-input"
                type="text"
                className="form-input"
                placeholder="e.g. First Draft, Shooting Draft, Polish"
                value={formData.draftName}
                onChange={(e) => handleChange('draftName', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="script-version-input">
                Version Number
              </label>
              <input
                id="script-version-input"
                type="text"
                className="form-input"
                placeholder="e.g. v1.0, v2.1-rev3"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
              />
            </div>

            {/* Story & Genre */}
            <div className="metadata-section-title">Story Info</div>

            <div className="form-field">
              <label className="form-label" htmlFor="script-genre-input">
                Genre
              </label>
              <input
                id="script-genre-input"
                type="text"
                className="form-input"
                placeholder="e.g. Sci-Fi Thriller, Neo-Noir Drama"
                value={formData.genre}
                onChange={(e) => handleChange('genre', e.target.value)}
              />
            </div>

            <div className="form-field form-field-full">
              <label className="form-label" htmlFor="script-logline-input">
                Logline / Synopsis
              </label>
              <textarea
                id="script-logline-input"
                className="form-input form-textarea"
                rows={2}
                placeholder="Brief pitch or one-sentence logline..."
                value={formData.logline}
                onChange={(e) => handleChange('logline', e.target.value)}
              />
            </div>

            {/* Contact & Legal Information */}
            <div className="metadata-section-title">Contact & Legal</div>

            <div className="form-field">
              <label className="form-label" htmlFor="script-email-input">
                Contact Email
              </label>
              <input
                id="script-email-input"
                type="email"
                className="form-input"
                placeholder="e.g. contact@syncopy.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="script-phone-input">
                Contact Phone
              </label>
              <input
                id="script-phone-input"
                type="text"
                className="form-input"
                placeholder="e.g. +1 (310) 555-0199"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div className="form-field form-field-full">
              <label className="form-label" htmlFor="script-copyright-input">
                Copyright / WGA Registration Notice
              </label>
              <input
                id="script-copyright-input"
                type="text"
                className="form-input"
                placeholder="e.g. © 2026 Syncopy Inc. All Rights Reserved. WGAw #192837"
                value={formData.copyright}
                onChange={(e) => handleChange('copyright', e.target.value)}
              />
            </div>
          </div>
        ) : (
          /* Title Page Live Screenplay Preview */
          <div className="title-page-preview-container">
            <div className="title-page-preview-sheet">
              <div className="preview-title-wrap">
                <div className="preview-script-title">
                  {formData.title || 'UNTITLED SCREENPLAY'}
                </div>
                <div className="preview-byline">written by</div>
                <div className="preview-author">
                  {formData.writer || 'Anonymous Writer'}
                </div>
                {formData.productionHouse && (
                  <div className="preview-studio">
                    {formData.productionHouse}
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <div className="preview-footer-left">
                  <div className="preview-draft-tag">
                    {formData.draftName || 'White Draft'} ({formData.version || 'v1.0'})
                  </div>
                  <div className="preview-date">
                    {new Date().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  {formData.copyright && (
                    <div className="preview-copyright-tag">
                      {formData.copyright}
                    </div>
                  )}
                </div>

                <div className="preview-footer-right">
                  {formData.email && <div>{formData.email}</div>}
                  {formData.phone && <div>{formData.phone}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="script-metadata-actions">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<IconCheck size={16} />}
            onClick={handleSave}
            loading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
