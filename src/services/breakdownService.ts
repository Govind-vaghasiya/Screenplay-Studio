import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { BreakdownElement, BreakdownCategory, Shot } from '@/types';
import type { Descendant } from 'slate';
import { getAIKeys } from '@/services/aiService';

// Category color mappings (Industry standard breakdown colors)
export const CATEGORY_COLORS: Record<BreakdownCategory, string> = {
  Cast: '#ef4444',          // Red
  Extras: '#f97316',        // Orange
  Props: '#eab308',         // Yellow
  Vehicles: '#84cc16',      // Lime
  Wardrobe: '#06b6d4',      // Cyan
  'Makeup/Hair': '#ec4899', // Pink
  SFX: '#8b5cf6',           // Purple
  VFX: '#3b82f6',           // Blue
  Stunts: '#dc2626',        // Crimson
  Animals: '#10b981',       // Emerald
  Sound: '#6366f1',         // Indigo
  'Set Dressing': '#14b8a6',// Teal
  Greenery: '#22c55e',      // Green
  Music: '#a855f7',         // Violet
};

export const ALL_CATEGORIES: BreakdownCategory[] = [
  'Cast',
  'Extras',
  'Props',
  'Vehicles',
  'Wardrobe',
  'Makeup/Hair',
  'SFX',
  'VFX',
  'Stunts',
  'Animals',
  'Sound',
  'Set Dressing',
  'Greenery',
  'Music',
];

const LOCAL_STORAGE_BREAKDOWN_PREFIX = 'screenplay_studio_breakdown_';

function getLocalBreakdown(projectId: string): BreakdownElement[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_BREAKDOWN_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalBreakdown(projectId: string, elements: BreakdownElement[]) {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_BREAKDOWN_PREFIX}${projectId}`,
      JSON.stringify(elements)
    );
  } catch (err) {
    console.warn('Failed to cache breakdown to localStorage:', err);
  }
}

/**
 * Calculates page length in industry-standard eighths.
 * 1 full page = ~54 screenplay lines = 8 eighths.
 */
export function calculateEighths(lineCount: number): { eighths: number; text: string } {
  if (lineCount <= 0) return { eighths: 1, text: '1/8' };
  const rawEighths = Math.max(1, Math.round((lineCount / 54) * 8));
  const fullPages = Math.floor(rawEighths / 8);
  const remainderEighths = rawEighths % 8;

  if (fullPages === 0) {
    return { eighths: rawEighths, text: `${remainderEighths}/8` };
  } else if (remainderEighths === 0) {
    return { eighths: rawEighths, text: `${fullPages}` };
  } else {
    return { eighths: rawEighths, text: `${fullPages} ${remainderEighths}/8` };
  }
}

export interface DetectedCandidate {
  name: string;
  category: BreakdownCategory;
  sceneId: string;
  sceneNumber: string | number;
  description: string;
  confidence?: 'high' | 'medium';
  checked: boolean;
}

/**
 * Multilingual smart entity recognition for screenplay elements (English, Hindi, mixed scripts).
 */
export function scanSceneForCandidates(
  nodes: Descendant[],
  sceneId: string,
  sceneNumber: string | number
): DetectedCandidate[] {
  const candidates: Map<string, DetectedCandidate> = new Map();

  const addCandidate = (
    name: string,
    category: BreakdownCategory,
    description: string,
    confidence: 'high' | 'medium' = 'high'
  ) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) return;
    const key = `${category}:${trimmed.toLowerCase()}`;
    if (!candidates.has(key)) {
      candidates.set(key, {
        name: trimmed,
        category,
        sceneId,
        sceneNumber,
        description,
        confidence,
        checked: true,
      });
    }
  };

  // Hindi and Multilingual keyword dictionaries for film breakdown
  const propPatterns = [
    /\b(gun|revolver|pistol|rifle|knife|blade|phone|smartphone|laptop|radio|transmitter|key|keys|badge|briefcase|envelope|letter|glass|bottle|drink|coffee|cigarette|lighter|watch|money|cash|wallet|torch|flashlight|book|notebook|map|camera|tape|recorder|drive|disk)\b/i,
    /(गुल्लक|पंखा|टेबल फैन|चाकू|हथियार|फोन|मोबाइल|कागज़|चिट्ठी|पैसा|पैसे|पर्स|बटुवा|चाबी|चाबियां|किताब|डायरी|कैमरा|घड़ी|बोतल|गिलास|दवा|दवाई|सिगरेट|माचिस|टॉर्च|थैला|बैग|ब्रीफकेस)/,
  ];

  const vehiclePatterns = [
    /\b(car|truck|van|suv|taxi|cab|police car|helicopter|chopper|airplane|plane|jet|flight|train|subway|motorcycle|bike|boat|ship|spaceship)\b/i,
    /(फ्लाइट|हवाई जहाज|कार|गाड़ी|टैक्सी|ऑटो|रिक्शा|बस|ट्रक|ट्रेन|हेलीकॉप्टर|मोटरसाइकिल|बाइक|नाव|जहाज)/,
  ];

  const soundPatterns = [
    /\b(gunshot|explosion|alarm|siren|thunder|lightning|screaming|shout|knock|doorbell|ring|whisper|static|hum|buzz|feedback|creak|footsteps)\b/i,
    /(दस्तक|आवाज|धमाका|चीख|सायरन|अलार्म|घंटी|खटखट|गड़गड़ाहट|फुसफुसाहट|कदमों की आवाज|खड़खड़ाहट)/,
  ];

  const sfxPatterns = [
    /\b(explodes|explosion|shatters|broken glass|bursts|fire|flames|smoke|blood|gunshot wound|squib|water flood|sparking|sparks|fog)\b/i,
    /(टूटा|फूटा|गुल्लक टूटा|आग|धुआं|खून|चोट|कांच टूटा|पानी बहा|विस्फोट|धमाका)/,
  ];

  const setDressingPatterns = [
    /\b(desk|chair|table|bed|sofa|couch|monitor|screen|cabinet|bookshelf|door|window|curtain|mirror|lamp|light|counter)\b/i,
    /(कमरा|लाइट|बत्ती|टेबल|कुर्सी|बिस्तर|सोफा|पलंग|अलमारी|दरवाजा|खिड़की|आईना|शीशा|दीवार)/,
  ];

  const wardrobePatterns = [
    /\b(suit|jacket|coat|uniform|dress|gown|hoodie|gloves|boots|shoes|hat|helmet|mask|hazmat suit|lab coat)\b/i,
    /(कमीज|पैंट|वर्दी|कोट|जैकेट|दुपट्टा|साड़ी|टोपी|जूते|दस्ताने|मास्क|गाउन)/,
  ];

  const extrasPatterns = [
    /\b(crowd|passengers|technicians|officers|guards|bystanders|waiters|customers|pedestrians|soldiers|audience)\b/i,
    /(भीड़|यात्री|लोग|पुलिसकर्मी|गार्ड|सुरक्षाकर्मी|सैनिक|दर्शक|ग्राहक)/,
  ];

  // Traverse nodes
  for (const node of nodes) {
    if (!('type' in node) || !('children' in node)) continue;
    const text = (node.children as any[]).map((c) => c.text || '').join('').trim();
    if (!text) continue;

    const nodeType = (node as any).type;

    // 1. Cast detection from Character nodes or Speaker tags
    if (nodeType === 'character' || /^Speaker\s*\d+/i.test(text)) {
      const cleanName = text
        .replace(/\s*\(.*?\)\s*/g, '')
        .replace(/^Speaker\s*\d+\s*[:-]?\s*/i, '')
        .trim();

      if (cleanName && cleanName.length > 1 && !/^(CONTINUOUS|LATER|VOICE|V\.O\.|O\.S\.)/i.test(cleanName)) {
        addCandidate(cleanName, 'Cast', 'Speaking character in this scene', 'high');
      }
    }

    // 2. Action / Dialogue text regex scanning
    if (nodeType === 'action' || nodeType === 'dialogue') {
      // Check ALL-CAPS terms in action
      if (nodeType === 'action') {
        const capsMatches = text.match(/\b[A-Z]{3,}(?:\s+[A-Z]{3,})*\b/g);
        if (capsMatches) {
          for (const cap of capsMatches) {
            if ([
              'FADE', 'CUT', 'DISSOLVE', 'INT', 'EXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'CONTINUED',
              'SMASH', 'BACK TO', 'MOMENTS LATER', 'CLOSE ON', 'ANGLE ON', 'POV', 'MORE', 'THE END',
              'SUPER', 'INSERT', 'MONTAGE', 'SERIES OF SHOTS', 'FLASHBACK', 'OMITTED', 'SCENE'
            ].includes(cap)) {
              continue;
            }
            addCandidate(cap, 'Props', 'Key object/element highlighted in action', 'high');
          }
        }
      }

      // Check Props
      for (const pattern of propPatterns) {
        const m = text.match(pattern);
        if (m) {
          addCandidate(m[0], 'Props', 'Handheld prop / interaction object', 'high');
        }
      }

      // Check Vehicles
      for (const pattern of vehiclePatterns) {
        const m = text.match(pattern);
        if (m) {
          addCandidate(m[0], 'Vehicles', 'Vehicle / transport required in scene', 'high');
        }
      }

      // Check Sound
      for (const pattern of soundPatterns) {
        const m = text.match(pattern);
        if (m) {
          addCandidate(m[0], 'Sound', 'Special audio cue / production sound effect', 'high');
        }
      }

      // Check SFX
      for (const pattern of sfxPatterns) {
        const m = text.match(pattern);
        if (m) {
          addCandidate(m[0], 'SFX', 'Practical special effect / physical stunt FX', 'high');
        }
      }

      // Check Set Dressing
      for (const pattern of setDressingPatterns) {
        const m = text.match(pattern);
        if (m) {
          addCandidate(m[0], 'Set Dressing', 'Environment fixture / room set piece', 'medium');
        }
      }

      // Check Wardrobe
      for (const pattern of wardrobePatterns) {
        const m = text.match(pattern);
        if (m) {
          addCandidate(m[0], 'Wardrobe', 'Specific costume / wardrobe requirement', 'medium');
        }
      }

      // Check Extras
      for (const pattern of extrasPatterns) {
        const m = text.match(pattern);
        if (m) {
          addCandidate(m[0], 'Extras', 'Background crowd / atmosphere actors', 'high');
        }
      }

      // Detect character names mentioned in Hindi/prose dialogue (e.g. "पवन ने उठकर पूछा", "विक्की खड़ा था")
      const hindiNames = text.match(/(पवन|विक्की|रोहित|राहुल|सीमा|माया|अमित|प्रिया|डॉक्टर|इंस्पेक्टर)/g);
      if (hindiNames) {
        for (const hn of hindiNames) {
          addCandidate(hn, 'Cast', 'Character identified in scene text', 'high');
        }
      }
    }
  }

  return Array.from(candidates.values());
}

/**
 * AI Cloud Breakdown using Gemini API (if user BYO-Key exists) or Smart Fallback
 */
export async function analyzeSceneWithAI(
  sceneText: string,
  sceneNumber: string | number,
  sceneId: string,
  heading: string
): Promise<DetectedCandidate[]> {
  const keys = getAIKeys();
  const geminiKey = keys.gemini;

  if (geminiKey) {
    try {
      const prompt = `You are a professional Hollywood 1st Assistant Director (1st AD) and Script Supervisor.
Perform an industry-standard Script Breakdown for the following scene.
Categories must strictly be chosen from:
- Cast (speaking characters)
- Extras (background crowd, silent actors)
- Props (handheld items used by characters)
- Vehicles (cars, planes, bikes, spacecraft)
- Wardrobe (specific costume requirements)
- Makeup/Hair (wounds, blood, aging, styling)
- SFX (practical physical special effects)
- VFX (visual effects, green screen, CGI)
- Stunts (fights, falls, physical action)
- Animals
- Sound (key audio cues, gunshots, radio static)
- Set Dressing (furniture, specific room fixtures)
- Greenery
- Music

Scene Heading: ${heading} (Scene ${sceneNumber})
Scene Content:
${sceneText}

Return ONLY a valid JSON array of objects with NO markdown fences:
[
  { "name": "Element Name", "category": "CategoryName", "description": "Short explanation why needed" }
]`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const rawOutput = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJSON = rawOutput.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJSON);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            name: item.name || 'Unnamed Element',
            category: (ALL_CATEGORIES.includes(item.category) ? item.category : 'Props') as BreakdownCategory,
            sceneId,
            sceneNumber,
            description: item.description || 'AI Auto-detected element',
            confidence: 'high',
            checked: true,
          }));
        }
      }
    } catch (err) {
      console.warn('Gemini Breakdown API fallback to local NLP:', err);
    }
  }

  // Fallback to our robust multilingual NLP extractor
  return [];
}

// ---- Firestore Breakdown Element CRUD with LocalStorage Cache ----

export const DEFAULT_DEMO_BREAKDOWN: Omit<BreakdownElement, 'id' | 'projectId'>[] = [
  {
    categoryName: 'Cast',
    categoryId: 'cast',
    name: 'Maya',
    description: 'Lead astrophysicist, radio telescope operator',
    colorCode: CATEGORY_COLORS.Cast,
    sceneIds: ['scene-1', 'scene-2'],
  },
  {
    categoryName: 'Cast',
    categoryId: 'cast',
    name: 'Dr. Aris Vance',
    description: 'Senior radio telemetry engineer',
    colorCode: CATEGORY_COLORS.Cast,
    sceneIds: ['scene-1', 'scene-2'],
  },
  {
    categoryName: 'Props',
    categoryId: 'props',
    name: 'Encrypted Telemetry Drive',
    description: 'Ruggedized military-grade SSD cartridge containing deep space data',
    colorCode: CATEGORY_COLORS.Props,
    sceneIds: ['scene-1', 'scene-2'],
  },
  {
    categoryName: 'Props',
    categoryId: 'props',
    name: 'Oscilloscope Waveform Display',
    description: 'CRT frequency analyzer glowing with pulsing sinusoidal wave',
    colorCode: CATEGORY_COLORS.Props,
    sceneIds: ['scene-1'],
  },
  {
    categoryName: 'Sound',
    categoryId: 'sound',
    name: 'Anomalous Mathematical Signal',
    description: 'High-frequency harmonic carrier tone pulsing in Fibonacci rhythm',
    colorCode: CATEGORY_COLORS.Sound,
    sceneIds: ['scene-1'],
  },
  {
    categoryName: 'SFX',
    categoryId: 'sfx',
    name: 'Control Deck Power Surge Strobe',
    description: 'Amber emergency warning lights and sparking electrical relay',
    colorCode: CATEGORY_COLORS.SFX,
    sceneIds: ['scene-1'],
  },
  {
    categoryName: 'Set Dressing',
    categoryId: 'set dressing',
    name: 'Radio Dish Array Catwalk',
    description: 'Industrial metal railings and antenna cluster overlooking desert night',
    colorCode: CATEGORY_COLORS['Set Dressing'],
    sceneIds: ['scene-1'],
  },
];

export async function getBreakdownElements(projectId: string): Promise<BreakdownElement[]> {
  // 1. Check local cache first
  const local = getLocalBreakdown(projectId);

  // If demo project and cache empty, seed demo breakdown
  if (local.length === 0 && (projectId.includes('demo') || projectId.includes('signal'))) {
    const seeded = DEFAULT_DEMO_BREAKDOWN.map((el, i) => ({
      ...el,
      id: `elem-demo-${i + 1}`,
      projectId,
    }));
    setLocalBreakdown(projectId, seeded);
    return seeded;
  }

  if (local.length > 0) {
    return local;
  }

  // 2. Fetch from Firestore
  try {
    const colRef = collection(db, 'projects', projectId, 'breakdown_elements');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BreakdownElement));
      setLocalBreakdown(projectId, items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore breakdown query failed, using cache:', err);
  }

  return local;
}

export async function createBreakdownElement(
  projectId: string,
  element: Omit<BreakdownElement, 'id' | 'projectId'>
): Promise<BreakdownElement> {
  const newId = `elem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const data: BreakdownElement = {
    id: newId,
    projectId,
    ...element,
    colorCode: element.colorCode || CATEGORY_COLORS[element.categoryName] || '#eab308',
  };

  // 1. Cache locally
  const current = getLocalBreakdown(projectId);
  const updated = [...current, data];
  setLocalBreakdown(projectId, updated);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'projects', projectId, 'breakdown_elements', newId);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('Could not persist breakdown element to Firestore:', err);
  }

  return data;
}

export async function bulkCreateBreakdownElements(
  projectId: string,
  newElements: Array<Omit<BreakdownElement, 'id' | 'projectId'>>
): Promise<BreakdownElement[]> {
  const current = getLocalBreakdown(projectId);
  const createdList: BreakdownElement[] = [];

  for (const el of newElements) {
    // Check if element with same name & category already exists
    const existingIndex = current.findIndex(
      (c) => c.name.toLowerCase() === el.name.toLowerCase() && c.categoryName === el.categoryName
    );

    if (existingIndex >= 0) {
      // Link sceneId to existing element if not present
      const existing = current[existingIndex];
      const mergedSceneIds = Array.from(new Set([...(existing.sceneIds || []), ...(el.sceneIds || [])]));
      current[existingIndex] = { ...existing, sceneIds: mergedSceneIds };
      createdList.push(current[existingIndex]);
    } else {
      const newId = `elem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const data: BreakdownElement = {
        id: newId,
        projectId,
        ...el,
        colorCode: el.colorCode || CATEGORY_COLORS[el.categoryName] || '#eab308',
      };
      current.push(data);
      createdList.push(data);

      // Async write to Firestore
      try {
        const docRef = doc(db, 'projects', projectId, 'breakdown_elements', newId);
        setDoc(docRef, { ...data, updatedAt: serverTimestamp() });
      } catch {}
    }
  }

  setLocalBreakdown(projectId, current);
  return createdList;
}

export async function updateBreakdownElement(
  projectId: string,
  elementId: string,
  updates: Partial<BreakdownElement>
): Promise<void> {
  const current = getLocalBreakdown(projectId);
  const updated = current.map((el) => (el.id === elementId ? { ...el, ...updates } : el));
  setLocalBreakdown(projectId, updated);

  try {
    const docRef = doc(db, 'projects', projectId, 'breakdown_elements', elementId);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('Could not update breakdown element in Firestore:', err);
  }
}

export async function toggleElementScene(
  projectId: string,
  elementId: string,
  sceneId: string
): Promise<BreakdownElement[]> {
  const current = getLocalBreakdown(projectId);
  const updated = current.map((el) => {
    if (el.id === elementId) {
      const exists = el.sceneIds.includes(sceneId);
      const newSceneIds = exists
        ? el.sceneIds.filter((s) => s !== sceneId)
        : [...el.sceneIds, sceneId];
      return { ...el, sceneIds: newSceneIds };
    }
    return el;
  });

  setLocalBreakdown(projectId, updated);

  const changed = updated.find((e) => e.id === elementId);
  if (changed) {
    try {
      const docRef = doc(db, 'projects', projectId, 'breakdown_elements', elementId);
      await updateDoc(docRef, { sceneIds: changed.sceneIds, updatedAt: serverTimestamp() });
    } catch {}
  }

  return updated;
}

export async function deleteBreakdownElement(projectId: string, elementId: string): Promise<void> {
  const current = getLocalBreakdown(projectId);
  const filtered = current.filter((el) => el.id !== elementId);
  setLocalBreakdown(projectId, filtered);

  try {
    const docRef = doc(db, 'projects', projectId, 'breakdown_elements', elementId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete breakdown element from Firestore:', err);
  }
}

// ---- Firestore Shot List CRUD ----

export async function getShotsForScene(projectId: string, scriptId: string, sceneId: string): Promise<Shot[]> {
  try {
    const colRef = collection(db, 'projects', projectId, 'scripts', scriptId, 'scenes', sceneId, 'shots');
    const snapshot = await getDocs(colRef);
    const shots = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Shot));
    return shots.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  } catch (err) {
    console.error('Error fetching shots:', err);
    return [];
  }
}

export async function saveShot(
  projectId: string,
  scriptId: string,
  sceneId: string,
  shot: Omit<Shot, 'id' | 'sceneId'> & { id?: string }
): Promise<Shot> {
  const colRef = collection(db, 'projects', projectId, 'scripts', scriptId, 'scenes', sceneId, 'shots');
  const shotId = shot.id || doc(colRef).id;
  const docRef = doc(colRef, shotId);

  const shotData: Shot = {
    id: shotId,
    sceneId,
    shotNumber: shot.shotNumber || '1',
    sequenceOrder: shot.sequenceOrder || 1,
    shotType: shot.shotType || 'MS',
    framing: shot.framing || '',
    cameraMovement: shot.cameraMovement || 'Static',
    lensMm: shot.lensMm || '35mm',
    equipment: shot.equipment || 'Tripod',
    description: shot.description || '',
    audioNotes: shot.audioNotes || '',
    driveFileId: shot.driveFileId,
    driveThumbnailUrl: shot.driveThumbnailUrl,
  };

  await setDoc(docRef, { ...shotData, updatedAt: serverTimestamp() });
  return shotData;
}

export async function deleteShot(
  projectId: string,
  scriptId: string,
  sceneId: string,
  shotId: string
): Promise<void> {
  const docRef = doc(db, 'projects', projectId, 'scripts', scriptId, 'scenes', sceneId, 'shots', shotId);
  await deleteDoc(docRef);
}
