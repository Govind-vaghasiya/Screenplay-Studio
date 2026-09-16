import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/common/Button';
import { IconUser, IconSparkles, IconSave } from '@/components/common/Icons';
import { getAIKeys, saveAIKey } from '@/services/aiService';
import { saveUserAPIKeysToFirestore, getUserAPIKeysFromFirestore } from '@/services/firestoreService';
import type { AIProvider } from '@/types';
import './SettingsPage.css';

export function SettingsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'ai'>('profile');
  const [aiKeys, setAiKeys] = useState<Partial<Record<AIProvider, string>>>({
    gemini: '',
    openai: '',
    anthropic: '',
  });

  useEffect(() => {
    const stored = getAIKeys();
    setAiKeys({
      gemini: stored.gemini || '',
      openai: stored.openai || '',
      anthropic: stored.anthropic || '',
    });

    if (user?.uid) {
      getUserAPIKeysFromFirestore(user.uid).then((keys) => {
        if (keys.gemini || keys.openai || keys.anthropic) {
          setAiKeys((prev) => ({
            ...prev,
            ...keys,
          }));
        }
      });
    }
  }, [user?.uid]);

  const handleSaveKeys = async () => {
    if (aiKeys.gemini !== undefined) saveAIKey('gemini', aiKeys.gemini);
    if (aiKeys.openai !== undefined) saveAIKey('openai', aiKeys.openai);
    if (aiKeys.anthropic !== undefined) saveAIKey('anthropic', aiKeys.anthropic);

    if (user?.uid) {
      await saveUserAPIKeysToFirestore(user.uid, aiKeys);
    }
    addNotification({ type: 'success', message: 'AI API keys saved securely to your account!' });
  };

  return (
    <div className="settings">
      <h1 className="settings-title">Settings</h1>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'profile' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <IconUser size={16} />
          Profile
        </button>
        <button
          className={`settings-tab ${activeTab === 'ai' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <IconSparkles size={16} />
          AI Assistant
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="settings-section">
          <div className="settings-card">
            <div className="settings-profile">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="settings-avatar" />
              ) : (
                <div className="settings-avatar settings-avatar-placeholder">
                  {user?.displayName?.[0] ?? '?'}
                </div>
              )}
              <div>
                <h3 className="settings-profile-name">{user?.displayName ?? 'User'}</h3>
                <p className="settings-profile-email">{user?.email}</p>
              </div>
            </div>

            <div className="settings-info-grid">
              <div className="settings-info-item">
                <span className="settings-info-label">Account</span>
                <span className="settings-info-value">Google Account</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">User ID</span>
                <span className="settings-info-value" style={{ fontFamily: 'var(--font-screenplay)', fontSize: 'var(--text-xs)' }}>
                  {user?.uid}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <div className="settings-section">
          <div className="settings-card">
            <h3 className="settings-card-title">AI Assistant API Keys</h3>
            <p className="settings-card-desc">
              Add your API keys to enable seamless AI writing assistance. Keys are securely saved to your user database account and synced across sessions so you don't need to re-enter them.
            </p>

            <div className="settings-keys">
              <div className="form-field">
                <label className="form-label" htmlFor="key-gemini">Google Gemini API Key</label>
                <input
                  id="key-gemini"
                  type="password"
                  className="form-input"
                  placeholder="AIza..."
                  value={aiKeys.gemini ?? ''}
                  onChange={(e) => setAiKeys({ ...aiKeys, gemini: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="key-openai">OpenAI API Key</label>
                <input
                  id="key-openai"
                  type="password"
                  className="form-input"
                  placeholder="sk-..."
                  value={aiKeys.openai ?? ''}
                  onChange={(e) => setAiKeys({ ...aiKeys, openai: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="key-anthropic">Anthropic (Claude) API Key</label>
                <input
                  id="key-anthropic"
                  type="password"
                  className="form-input"
                  placeholder="sk-ant-..."
                  value={aiKeys.anthropic ?? ''}
                  onChange={(e) => setAiKeys({ ...aiKeys, anthropic: e.target.value })}
                />
              </div>

              <Button
                variant="primary"
                icon={<IconSave size={16} />}
                onClick={handleSaveKeys}
              >
                Save Keys
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
