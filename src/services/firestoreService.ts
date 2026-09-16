// Firestore service for Project and Script CRUD operations
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile } from '@/types';
import { TEMPLATE_SCREENPLAY_SLATE } from '@/utils/templateScreenplay';

export interface ProjectDoc {
  id: string;
  title: string;
  genre: string;
  logline: string;
  writer?: string;
  productionHouse?: string;
  email?: string;
  phone?: string;
  draftName?: string;
  version?: string;
  copyright?: string;
  ownerId: string;
  collaborators: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  scriptCount: number;
  defaultScriptId: string;
}

export interface ScriptDoc {
  id: string;
  projectId: string;
  title: string;
  content: string; // JSON string of Slate nodes
  updatedAt: string;
  createdAt: string;
}

export const DEFAULT_DEMO_PROJECT: ProjectDoc = {
  id: 'project-demo-signal',
  title: 'The Last Signal',
  genre: 'Sci-Fi Thriller',
  writer: 'Elena Rostova & Marcus Vance',
  productionHouse: 'Aperture Zenith Pictures',
  email: 'contact@zenithpictures.io',
  phone: '+1 (310) 555-0199',
  draftName: 'White Production Draft',
  version: 'v1.0',
  copyright: '© 2026 Aperture Zenith. All Rights Reserved. WGAw Registered.',
  logline:
    'When an isolated radio observatory catches an anomalous mathematical signal from deep space, a linguist and an engineer scramble to decode it before government silence descends.',
  ownerId: '',
  collaborators: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  scriptCount: 1,
  defaultScriptId: 'script-demo-signal',
};

const LOCAL_STORAGE_PROJECTS_KEY = 'screenplay_studio_projects';
const LOCAL_STORAGE_SCRIPTS_PREFIX = 'screenplay_studio_script_';

// Helper to get local cache
function getLocalProjects(): ProjectDoc[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalProjects(projects: ProjectDoc[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

/**
 * Sync user profile to /users/{uid}
 */
export async function syncUserProfile(user: UserProfile) {
  if (!user.uid) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync user profile to Firestore:', err);
  }
}

/**
 * Saves user AI API keys securely in Firestore under /users/{uid}/settings/ai
 */
export async function saveUserAPIKeysToFirestore(
  userId: string,
  keys: Partial<Record<string, string>>
): Promise<void> {
  if (!userId) return;
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'ai');
    await setDoc(
      settingsRef,
      {
        ...keys,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save API keys to Firestore:', err);
  }
}

/**
 * Loads user AI API keys from Firestore under /users/{uid}/settings/ai
 */
export async function getUserAPIKeysFromFirestore(
  userId: string
): Promise<Partial<Record<string, string>>> {
  if (!userId) return {};
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'ai');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data() || {};
    }
  } catch (err) {
    console.warn('Failed to load API keys from Firestore:', err);
  }
  return {};
}

/**
 * Seed demo template project into Firestore & localStorage if user has no projects
 */
export async function seedDemoProjectIfEmpty(userId: string): Promise<ProjectDoc[]> {
  const existing = await getUserProjects(userId);
  if (existing.length > 0) {
    return existing;
  }

  const demoId = `project-demo-signal`;
  const defaultScriptId = `script-demo-signal`;
  const demoProject: ProjectDoc = {
    ...DEFAULT_DEMO_PROJECT,
    ownerId: userId,
    collaborators: { [userId]: 'owner' },
  };

  try {
    // Write project to Firestore
    await setDoc(doc(db, 'projects', demoId), {
      ...demoProject,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    });

    // Write initial script to subcollection /projects/{demoId}/scripts/{defaultScriptId}
    await setDoc(doc(db, 'projects', demoId, 'scripts', defaultScriptId), {
      id: defaultScriptId,
      projectId: demoId,
      title: 'The Last Signal - Draft 1',
      content: JSON.stringify(TEMPLATE_SCREENPLAY_SLATE),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not seed demo project to Firestore (using local):', err);
  }

  // Also cache locally
  const current = getLocalProjects();
  if (!current.some((p) => p.id === demoId)) {
    const updated = [demoProject, ...current];
    setLocalProjects(updated);
    localStorage.setItem(
      `${LOCAL_STORAGE_SCRIPTS_PREFIX}${demoId}_${defaultScriptId}`,
      JSON.stringify(TEMPLATE_SCREENPLAY_SLATE)
    );
    return updated;
  }

  return [demoProject];
}

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId?: string): Promise<ProjectDoc[]> {
  if (!userId) {
    const local = getLocalProjects();
    return local.length > 0 ? local : [DEFAULT_DEMO_PROJECT];
  }

  try {
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const projects = snap.docs.map((d) => d.data() as ProjectDoc);
      projects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setLocalProjects(projects);
      return projects;
    }
  } catch (err) {
    console.warn('Firestore query failed, using local cache:', err);
  }

  // Fallback to local projects
  const local = getLocalProjects().filter((p) => p.ownerId === userId || !p.ownerId);
  return local.length > 0 ? local : [DEFAULT_DEMO_PROJECT];
}

/**
 * Real-time listener for user projects
 */
export function subscribeUserProjects(
  userId: string,
  onProjects: (projects: ProjectDoc[]) => void
) {
  if (!userId) {
    onProjects(getLocalProjects());
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', userId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const projects = snap.docs.map((d) => d.data() as ProjectDoc);
        projects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        setLocalProjects(projects);
        onProjects(projects);
      },
      (err) => {
        console.warn('Firestore subscription error (fallback to local):', err);
        onProjects(getLocalProjects());
      }
    );
  } catch (err) {
    console.warn('Subscription setup failed:', err);
    onProjects(getLocalProjects());
    return () => {};
  }
}

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  data: {
    title: string;
    genre: string;
    logline: string;
    writer?: string;
    productionHouse?: string;
    email?: string;
    phone?: string;
    draftName?: string;
    version?: string;
    copyright?: string;
  },
  initialScriptNodes?: any[]
): Promise<ProjectDoc> {
  const projectId = `proj-${Date.now()}`;
  const scriptId = `script-${Date.now()}`;

  const newProj: ProjectDoc = {
    id: projectId,
    title: data.title.trim(),
    genre: data.genre.trim() || 'Drama',
    logline: data.logline.trim() || '',
    writer: data.writer?.trim() || '',
    productionHouse: data.productionHouse?.trim() || '',
    email: data.email?.trim() || '',
    phone: data.phone?.trim() || '',
    draftName: data.draftName?.trim() || 'White Draft',
    version: data.version?.trim() || 'v1.0',
    copyright: data.copyright?.trim() || '',
    ownerId: userId,
    collaborators: { [userId]: 'owner' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scriptCount: 1,
    defaultScriptId: scriptId,
  };

  // 1. Save locally first for instant UI response
  const local = getLocalProjects();
  const updatedLocal = [newProj, ...local.filter((p) => p.id !== projectId)];
  setLocalProjects(updatedLocal);

  // Initial script content
  const initialContent =
    initialScriptNodes && initialScriptNodes.length > 0
      ? initialScriptNodes
      : [
          {
            type: 'scene-heading',
            children: [{ text: `EXT. ${data.title.toUpperCase() || 'UNTITLED SCENE'} - DAY` }],
          },
          {
            type: 'action',
            children: [{ text: data.logline || 'Action starts here...' }],
          },
        ];

  localStorage.setItem(
    `${LOCAL_STORAGE_SCRIPTS_PREFIX}${projectId}_${scriptId}`,
    JSON.stringify(initialContent)
  );

  // 2. Persist to Firestore
  try {
    await setDoc(doc(db, 'projects', projectId), {
      ...newProj,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'projects', projectId, 'scripts', scriptId), {
      id: scriptId,
      projectId,
      title: `${data.title} - Draft 1`,
      content: JSON.stringify(initialContent),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to persist project to Firestore:', err);
  }

  return newProj;
}

/**
 * Update project metadata (title, writer, productionHouse, email, draftName, version, etc.)
 */
export async function updateProjectMetadata(
  projectId: string,
  updates: Partial<ProjectDoc>
): Promise<ProjectDoc | null> {
  const localProjects = getLocalProjects();
  const existing = localProjects.find((p) => p.id === projectId);
  if (!existing && !projectId.includes('demo') && !projectId.includes('signal')) {
    return null;
  }

  const updatedDoc: ProjectDoc = {
    ...(existing || DEFAULT_DEMO_PROJECT),
    ...updates,
    id: projectId,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save locally
  const otherProjects = localProjects.filter((p) => p.id !== projectId);
  setLocalProjects([updatedDoc, ...otherProjects]);

  // 2. Sync to Firestore
  try {
    await setDoc(
      doc(db, 'projects', projectId),
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync updated project metadata to Firestore:', err);
  }

  return updatedDoc;
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  // 1. Remove from local storage
  const local = getLocalProjects();
  setLocalProjects(local.filter((p) => p.id !== projectId));

  // 2. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (err) {
    console.warn('Failed to delete project from Firestore:', err);
  }
}

/**
 * Get script content
 */
export async function getScriptContent(projectId: string, scriptId: string): Promise<any[]> {
  // Check local first
  const localKey = `${LOCAL_STORAGE_SCRIPTS_PREFIX}${projectId}_${scriptId}`;
  const localRaw = localStorage.getItem(localKey);

  try {
    const snap = await getDoc(doc(db, 'projects', projectId, 'scripts', scriptId));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.content) {
        const parsed = JSON.parse(data.content);
        localStorage.setItem(localKey, data.content);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch script from Firestore, checking cache:', err);
  }

  if (localRaw) {
    try {
      return JSON.parse(localRaw);
    } catch {}
  }

  // Fallback to demo template if matching demo
  if (projectId.includes('demo') || projectId.includes('signal')) {
    return TEMPLATE_SCREENPLAY_SLATE;
  }

  // Fallback default starter
  return [
    {
      type: 'scene-heading',
      children: [{ text: 'INT. SCENE - DAY' }],
    },
    {
      type: 'action',
      children: [{ text: 'Start writing your scene description here...' }],
    },
  ];
}

/**
 * Save script content
 */
export async function saveScriptContent(
  projectId: string,
  scriptId: string,
  nodes: any[]
): Promise<void> {
  const json = JSON.stringify(nodes);
  const localKey = `${LOCAL_STORAGE_SCRIPTS_PREFIX}${projectId}_${scriptId}`;
  localStorage.setItem(localKey, json);

  // Update project's updatedAt locally
  const localProjects = getLocalProjects();
  const updated = localProjects.map((p) =>
    p.id === projectId ? { ...p, updatedAt: new Date().toISOString() } : p
  );
  setLocalProjects(updated);

  // Sync to Firestore
  try {
    await setDoc(
      doc(db, 'projects', projectId, 'scripts', scriptId),
      {
        content: json,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'projects', projectId),
      {
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync script to Firestore:', err);
  }
}
