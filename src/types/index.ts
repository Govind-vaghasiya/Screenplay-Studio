// TypeScript type definitions for Screenplay Studio

// ---- Firebase / Firestore Document Types ----

export interface Project {
  id: string;
  title: string;
  logline?: string;
  genre?: string;
  writer?: string;
  productionHouse?: string;
  email?: string;
  phone?: string;
  draftName?: string;
  version?: string;
  copyright?: string;
  ownerId: string;
  collaborators: Record<string, 'owner' | 'editor' | 'viewer'>;
  driveFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Script {
  id: string;
  projectId: string;
  title: string;
  versionName: string;
  revisionColor: RevisionColor;
  isLocked: boolean;
  content: string; // Serialized Slate JSON or Fountain string
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  scriptId: string;
  sceneNumber: string;
  sequenceOrder: number;
  prefix: 'INT.' | 'EXT.' | 'INT./EXT.' | 'I/E.';
  locationHeading: string;
  timeOfDay: 'DAY' | 'NIGHT' | 'CONTINUOUS' | 'DAWN' | 'DUSK' | 'LATER' | 'MOMENTS LATER';
  eighthsCount: number;
  lockedPageNumber: number | null;
  updatedAt: string;
}

export interface BreakdownElement {
  id: string;
  projectId: string;
  categoryId: string;
  categoryName: BreakdownCategory;
  name: string;
  description: string;
  colorCode: string;
  sceneIds: string[];
}

export interface Shot {
  id: string;
  sceneId: string;
  shotNumber: string;
  sequenceOrder: number;
  shotType: ShotType;
  framing: string;
  cameraMovement: string;
  lensMm: string;
  equipment: string;
  description: string;
  audioNotes: string;
  storyboardUrl?: string;
  driveFileId?: string;
  driveThumbnailUrl?: string;
}

// ---- Enums & Literals ----

export type RevisionColor =
  | 'White'
  | 'Blue'
  | 'Pink'
  | 'Yellow'
  | 'Green'
  | 'Goldenrod'
  | 'Buff'
  | 'Salmon'
  | 'Cherry'
  | 'Tan'
  | '2nd White'
  | '2nd Blue';

export type BreakdownCategory =
  | 'Cast'
  | 'Extras'
  | 'Props'
  | 'Vehicles'
  | 'Wardrobe'
  | 'Makeup/Hair'
  | 'SFX'
  | 'VFX'
  | 'Stunts'
  | 'Animals'
  | 'Sound'
  | 'Set Dressing'
  | 'Greenery'
  | 'Music';

export type ShotType =
  | 'ECU'  // Extreme Close Up
  | 'CU'   // Close Up
  | 'MCU'  // Medium Close Up
  | 'MS'   // Medium Shot
  | 'MWS'  // Medium Wide Shot
  | 'WIDE' // Wide Shot
  | 'EWS'  // Extreme Wide Shot
  | 'ESTABLISHING'
  | 'OTS'  // Over The Shoulder
  | 'POV'  // Point of View
  | 'INSERT'
  | 'TWO-SHOT'
  | 'AERIAL';

// ---- Screenplay Element Types ----

export type ScreenplayElementType =
  | 'scene-heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'shot'
  | 'centered'
  | 'page-break';

export interface ScreenplayElement {
  type: ScreenplayElementType;
  children: ScreenplayText[];
}

export interface ScreenplayText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

// ---- User & Auth ----

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken?: string;
}

// ---- AI ----

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AISettings {
  activeProvider: AIProvider | null;
  keys: Partial<Record<AIProvider, string>>;
}

// ---- App State ----

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
