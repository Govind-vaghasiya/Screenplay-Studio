# Screenplay Studio — Project History, Work Log & Future Roadmap

**Repository:** [https://github.com/Govind-vaghasiya/Screenplay-Studio.git](https://github.com/Govind-vaghasiya/Screenplay-Studio.git)  
**Live Production URL:** [https://screenplay-studio-607a5.web.app](https://screenplay-studio-607a5.web.app)  
**Firebase Project:** `screenplay-studio-607a5`  
**Last Updated:** September 16, 2026  

---

## 📋 Table of Contents
1. [Executive Summary & Original Vision](#1-executive-summary--original-vision)
2. [Chronological Development Log (Date-Wise)](#2-chronological-development-log-date-wise)
3. [Version Releases & Milestones](#3-version-releases--milestones)
4. [Completed Feature Matrix](#4-completed-feature-matrix)
5. [Architecture & Technical Implementation](#5-architecture--technical-implementation)
6. [Future Roadmap (What Remains to be Done)](#6-future-roadmap-what-remains-to-be-done)

---

## 1. Executive Summary & Original Vision

### Initial Goal
Build **Screenplay Studio** — a comprehensive, state-of-the-art web application for screenwriters, directors, and film production teams that bridges the gap between creative writing and physical film production planning.

### Core Problems Solved
- **Fragmented Workflows:** Screenwriters previously had to switch between separate software for writing (Final Draft), breaking down scenes (Movie Magic Breakdown), scheduling shots, and collaborating.
- **Dumb Import Engines:** Traditional tools fail when importing unstructured transcripts, transcripts in Hindi/Hinglish, or non-standard formatting.
- **Cluttered AI Assistants:** Many AI tools obstruct the writing canvas or expose sensitive API keys repeatedly.
- **Manual Breakdown Overhead:** Tagging hundreds of props, cast members, and sounds across dozens of scenes is historically a tedious multi-day job.

---

## 2. Chronological Development Log (Date-Wise)

### 📅 Phase 1: Foundation & Core Screenplay Editor (2026-09-14)
* **Goal:** Establish modern dark-theme cinematography UI and Slate.js Fountain editor.
* **Accomplishments:**
  - Setup React 19 + TypeScript + Vite project foundation.
  - Built Slate.js custom rich-text engine with strict Courier 12pt industry standard styling.
  - Implemented automatic element transitions (Scene Heading -> Action -> Character -> Dialogue -> Parenthetical -> Transition).
  - Built keyboard navigation (`Tab` to cycle elements, `Enter` to auto-progress).
  - Setup Firebase Authentication (Google OAuth with Drive scope) and Firestore database collections.

---

### 📅 Phase 2: Smart Multilingual Import & Metadata System (2026-09-15)
* **Goal:** Allow importing PDF, FDX, TXT, and raw story transcriptions, with complete script metadata management.
* **Accomplishments:**
  - **Universal Import Engine (`src/services/scriptImportService.ts`):**
    - Multi-stage parser detecting character names, spoken dialogue blocks, and sluglines.
    - Integrated bilingual support (Hindi / Hinglish / English) capable of converting unstructured transcripts (e.g. "अजनबी दस्तक") into clean Fountain screenplay elements.
  - **Script Metadata Management (`src/components/editor/ScriptMetadataModal.tsx`):**
    - Added ability to edit script Title, Writer, Production House / Studio, Contact Email, Draft Revision, Version number, and Copyright information.
    - Synced metadata in real time to Firestore projects.

---

### 📅 Phase 3: Automated Production Breakdown Engine (2026-09-15 - 2026-09-16)
* **Goal:** Build an intelligent AI-assisted breakdown sheet for department heads and assistant directors.
* **Accomplishments:**
  - **Dynamic Scene Sync (`src/services/sceneService.ts`):**
    - Synchronized left scene navigator directly with active scene numbers and script modifications.
    - Real-time line count, page length (eighths calculation), and tagged element counters.
  - **14-Category Production Department Support:**
    - Cast, Extras, Props, Vehicles, Wardrobe, Makeup/Hair, SFX, VFX, Stunts, Animals, Sound, Set Dressing, Greenery, Music, Special Equipment.
  - **UI/UX Polish:**
    - Replaced low-contrast outlines with solid, high-visibility color-coded department cards with crisp white typography.
    - Positioned `+ Add Element` tile cleanly at the end of the grid list.
    - In-scene verification badges (`✓ In Scene`), element edit modal, and delete controls.
  - **High-Tech AI Auto-Scan Animation (`src/pages/BreakdownPage.tsx`):**
    - Built animated radar pulse core with expanding sonar waves.
    - Added real-time 6-phase status ticker cycling through analysis steps (sluglines, cast, props, wardrobe, audio, FX).
    - Added shimmer gradient progress bar (0% -> 100%) and dynamic category radar pills.

---

### 📅 Phase 4: Floating Inline AI Assistant & Prompt Enhancer (2026-09-16)
* **Goal:** Interactive on-canvas AI writing assistant with Bolt.ai style prompt enhancer.
* **Accomplishments:**
  - **Clean, Distraction-Free Floating Canvas Popover:**
    - Cleaned header: ✨ **Screenplay AI Assistant** + AI Engine selector (Gemini 2.5 Flash / GPT-4o / Claude 3.5 Sonnet) + Close button.
    - Removed all API key inputs and badges from the editor screen for an uncluttered writing experience.
  - **Bolt.ai Style Prompt Enhancer (`⚡ Enhance`):**
    - Transforms simple instructions (e.g. "make sarcastic") into professional Hollywood screenwriting directives.
  - **Context-Aware Screenplay Generation:**
    - Eliminated static demo templates (*Maya & Aris*).
    - AI dynamically extracts active characters (`PAWAN`, `VIKKY`), scene headings (`INT. PAWAN'S PG ROOM - NIGHT`), and language cues from the user's active screenplay.
  - **Insertion Controls:**
    - `Replace Selection`, `Insert Below`, `Insert Above`, `Discard`.

---

### 📅 Phase 5: Breakdown Element AI Enhance & Header Script Display (2026-09-16)
* **Goal:** AI enhancement in breakdown modals and centered script title in header.
* **Accomplishments:**
  - **Breakdown Element AI Enhance (`src/services/aiService.ts`):**
    - Added `⚡ Enhance with AI` button inside **Edit Breakdown Element** and **Add Breakdown Element** modals.
    - Generates department-specific production notes tailored to element name, category, and scene context (e.g. 2200K amber lighting for lamps, mechanical oscillation for fans, psychological stakes for characters).
  - **Prominent Header Script Title:**
    - Displayed active script title in the exact center of the Breakdown and Shot List headers in big, bold, vibrant yellow text (`#facc15`) with golden glow.

---

### 📅 Phase 6: Cloud Key Persistence, Version Control & Live Deployment (2026-09-16)
* **Goal:** Secure cloud persistence of API keys, GitHub repository sync, and live internet deployment.
* **Accomplishments:**
  - **Secure Cloud Firestore API Key Storage (`src/services/firestoreService.ts`):**
    - Keys configured in **Settings (`/settings`)** are saved to `users/{uid}/settings/ai`.
    - Auto-synced on login across all devices via `AuthContext.tsx`.
  - **GitHub Repository Sync:**
    - Created, initialized, and pushed clean repository to `git@github.com:Govind-vaghasiya/Screenplay-Studio.git` (`main` branch).
  - **Firebase Hosting Production Deployment:**
    - Configured SPA rewrites in `firebase.json` and `.firebaserc`.
    - Deployed live to **[https://screenplay-studio-607a5.web.app](https://screenplay-studio-607a5.web.app)**.

---

## 3. Version Releases & Milestones

| Version | Release Date | Milestone / Focus | Status |
|---|---|---|---|
| **v0.1.0** | 2026-09-14 | Initial Slate.js Fountain Editor & Firebase Auth | ✅ Completed |
| **v0.2.0** | 2026-09-15 | Multilingual Smart Import (PDF/FDX/TXT) & Script Metadata Modal | ✅ Completed |
| **v0.3.0** | 2026-09-15 | Production Breakdown Engine & 14-Category Department Sheets | ✅ Completed |
| **v0.4.0** | 2026-09-16 | Scene Sync Engine, Solid Color Tiles & Radar Scan Animation | ✅ Completed |
| **v0.5.0** | 2026-09-16 | Context-Aware Inline AI Assistant & Bolt.ai Prompt Enhancer | ✅ Completed |
| **v0.6.0** | 2026-09-16 | Breakdown Notes AI Enhancer & Big Yellow Header Script Title | ✅ Completed |
| **v1.0.0** | 2026-09-16 | **Production Release**: GitHub Sync & Live Firebase Hosting Deployment | 🚀 Live |

---

## 4. Completed Feature Matrix

### ✍️ Screenplay Editor
- [x] Standard Courier 12pt industry layout
- [x] 6-Element hierarchy (Scene Heading, Action, Character, Parenthetical, Dialogue, Transition)
- [x] Fast keyboard shortcuts (`Tab`, `Enter`, `Cmd+/`)
- [x] Revision Draft Color Tracking (White, Blue, Pink, Yellow, Green, Goldenrod, Buff, Salmon, Cherry)
- [x] Script Locking / Freezing for production scene numbers
- [x] Scene Navigator drawer with jumping & search
- [x] Director & DP Script Comments drawer (with scene tags and resolution toggles)

### 🤖 AI Writing & Assistance
- [x] Floating canvas Inline AI popover (triggered via right-click / selection)
- [x] Bolt.ai style `⚡ Enhance` button for prompt engineering
- [x] Zero-template dynamic extraction (adapts to open characters like Pawan, Vikky, Maya)
- [x] Quick screenplay directive chips (Punch up dialogue, Deepen subtext, Intensify action, Translate to Hindi)
- [x] Model Selector (Google Gemini 2.5 Flash, OpenAI GPT-4o, Claude 3.5 Sonnet)
- [x] Clean UI with no intrusive API key bars inside the canvas

### 🎬 Production Breakdown Engine
- [x] Automated scene identification and dynamic scene sync
- [x] 14 Industry-standard production categories
- [x] Solid color-coded category cards with high-contrast text
- [x] Scene assignment matrix (Assign elements to single, multiple, or all scenes)
- [x] High-tech animated AI scanning modal (sonar radar pulses, phase ticker, shimmer progress)
- [x] `⚡ Enhance with AI` button inside element add/edit modals for cinematic production notes

### 🎥 Shot List & Storyboard Builder
- [x] Table View & Visual Storyboard Grid View
- [x] Shot parameters: Framing (EWS, MCU, CU, OTS), Movement (Crane, Steadicam, Handheld), Lens (mm), Equipment, Audio Notes
- [x] Google Drive sync package exporter

### ☁️ Cloud, Security & Persistence
- [x] Google OAuth Authentication with Drive scopes
- [x] Firestore multi-tenant security rules and database sync
- [x] Persistent AI Keys stored in Firestore user profile (`/users/{uid}/settings/ai`)
- [x] Firebase Hosting SPA deployment with global CDN

---

## 5. Architecture & Technical Implementation

```
Screenplay-Studio/
├── src/
│   ├── components/
│   │   ├── common/           # Button, Modal, Toast, ShortcutsModal, Icons (SVG)
│   │   ├── editor/           # ScreenplayEditor, InlineAIAssistant, SceneNavigator,
│   │   │                     # ScriptMetadataModal, ScriptCommentsDrawer, ImportScriptModal
│   │   └── layout/           # AppLayout, Sidebar, ProtectedRoute
│   ├── config/
│   │   └── firebase.ts       # Firebase App, Auth, Firestore, Analytics config
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state, Google Sign-in, Auto-loading user API keys
│   ├── pages/
│   │   ├── LandingPage.tsx   # Cinematic landing & CTA
│   │   ├── DashboardPage.tsx # Project cards, script stats, creation modals
│   │   ├── ScriptEditorPage  # Slate.js canvas, revisions, locking, comments
│   │   ├── BreakdownPage.tsx # 14-cat breakdown sheet, AI scan radar, scene sync
│   │   ├── ShotListPage.tsx  # Shot list builder, storyboard grid, Drive sync
│   │   └── SettingsPage.tsx  # Profile info, Gemini/OpenAI/Claude API key storage
│   ├── services/
│   │   ├── aiService.ts          # Inline AI, prompt enhancer, element note enhancer
│   │   ├── breakdownService.ts   # Element CRUD, scene scanning NLP/AI, category colors
│   │   ├── firestoreService.ts   # Firestore project/script/shot sync, user API key doc
│   │   ├── sceneService.ts       # Slate node parser, eighths calculation, slugline parsing
│   │   └── scriptImportService.ts# Universal PDF, FDX, TXT, story transcript parser
│   ├── stores/               # Zustand appStore & notificationStore
│   └── types/                # TypeScript interfaces (Slate, Breakdown, Shots, Revisions)
├── firebase.json             # Firebase Hosting & Firestore Rules configuration
├── firestore.rules           # Cloud security rules
└── .firebaserc               # Firebase project target (`screenplay-studio-607a5`)
```

---

## 6. Future Roadmap (What Remains to be Done)

### 🚀 Phase 7: Real-Time Multi-User Collaboration & Presence (Upcoming v1.1.0)
- [ ] **Live Multi-User Cursors:** Real-time character/line presence using WebSockets / Firestore listeners so co-writers see each other's live typing.
- [ ] **Threaded Inline Mentions:** `@mention` collaborators directly inside screenplay action lines and notes.
- [ ] **Granular Permissions:** Role-based access control (Owner, Co-Writer, Director, Producer, Read-Only Crew).

### 📄 Phase 8: Advanced Export & Industry Delivery Formats (Upcoming v1.2.0)
- [ ] **Final Draft XML (`.fdx`) Native Export:** Exporting complete script, character lists, and scene metadata directly to `.fdx`.
- [ ] **Production PDF with Industry Call-Outs:** Watermarked PDFs with D-Day revision headers, scene numbers on both margins, and locked page numbers (A-pages/B-pages).
- [ ] **Movie Magic Breakdown Export:** Exporting tagged breakdown elements directly into `.sex` format for scheduling in Movie Magic Scheduling.

### 🎨 Phase 9: Generative AI Storyboard Image Synthesis (Upcoming v1.3.0)
- [ ] **Direct Frame Generation:** Use Google Imagen 3 or DALL-E 3 to automatically generate visual storyboard sketches directly from shot framing and description.
- [ ] **Lighting & Camera Angle Prompts:** Preset cinematic lens choices (Anamorphic, 35mm, 85mm portrait, low-angle Dutch tilt) feeding directly into image synthesis.

### 📊 Phase 10: Production Scheduling & Call Sheet Automation (Upcoming v1.4.0)
- [ ] **Stripboard / Day-out-of-Days (DOOD):** Automatic shooting schedule optimizer grouping scenes by location, cast availability, and time of day.
- [ ] **Automated Daily Call Sheets:** One-click generation of actor call times, scene requirements, and equipment packing lists.
