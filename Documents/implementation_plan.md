# Screenplay Studio — Phased Implementation Plan

A professional screenwriting and production planning tool for filmmakers, built as a modern web application.

---

## Analysis of Original Plan

Your existing [Plan.md](file:///Users/chromakey/Desktop/Screenplay-Studio/Plan.md) covers the right domains but has issues that would block successful delivery:

| Area | Issue | Resolution |
|------|-------|------------|
| **Structure** | All 10 steps listed flat — no MVP or phasing | Reorganized into 6 incremental phases |
| **Missing foundations** | No project scaffold, design system, routing, or state management | Added as Phase 1 |
| **Premature complexity** | CRDT collaboration (Yjs + WebSockets) too early | Moved to Phase 5 (post-MVP) |
| **Schema inconsistency** | Shots at `projects/{id}/scenes/` but scenes under `scripts/` | Unified under `projects/{id}/scripts/{id}/scenes/{id}/shots/` |
| **Security risk** | API keys in `localStorage` | Keys stored in encrypted `sessionStorage`, never persisted to disk |
| **Missing features** | No Fountain parser, undo/redo, offline, settings, onboarding | Added across appropriate phases |
| **No UI/UX plan** | Only backend schemas and logic — no component tree or design | Added component architecture and design system |

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React 18 + Vite | Fast dev builds, modern React features |
| **Language** | TypeScript | Type safety for complex editor logic |
| **Editor** | Slate.js 0.100+ | Programmable rich-text, custom elements |
| **Styling** | Vanilla CSS + CSS Custom Properties | Full control over screenplay typography |
| **Backend** | Firebase (Auth, Firestore, Cloud Functions, Hosting) | Serverless, real-time, generous free tier |
| **File Storage** | Google Drive API | User's own storage, no server costs |
| **State Management** | Zustand | Lightweight, works great with React |
| **Routing** | React Router v6 | Standard SPA routing |
| **PDF Export** | `@react-pdf/renderer` | React-native PDF generation |
| **AI** | BYO-Key (Gemini, OpenAI, Anthropic) via Cloud Function proxy | No token cost to developer |
| **Testing** | Vitest + Playwright | Unit + E2E coverage |

---

## Phase 1: Project Foundation & Design System

> **Goal:** Scaffold the project, establish the design system, set up Firebase, and create the app shell with authentication and routing.

### 1.1 Project Scaffolding

- Initialize Vite + React + TypeScript project
- Configure ESLint, Prettier, path aliases (`@/components`, `@/services`, etc.)
- Set up folder structure:

```
src/
├── assets/              # Fonts (Courier Prime), icons, images
├── components/          # Reusable UI components
│   ├── common/          # Button, Modal, Dropdown, Toast, etc.
│   ├── layout/          # Sidebar, Header, PageContainer
│   └── editor/          # Screenplay editor components (Phase 2)
├── contexts/            # React contexts (Auth, Theme)
├── hooks/               # Custom hooks
├── pages/               # Route-level page components
├── services/            # Firebase, Google Drive, AI service modules
├── stores/              # Zustand stores
├── styles/              # Global CSS, design tokens, typography
├── types/               # TypeScript type definitions
├── utils/               # Helpers, constants, Fountain parser
└── config/              # Firebase config, environment variables
```

### 1.2 Design System & Global Styles

- **Color palette:** Dark mode primary (professional, cinematic feel — deep charcoal backgrounds with amber/gold accents)
- **Typography:** `Inter` for UI, `Courier Prime` for screenplay content
- **CSS custom properties** for all tokens (colors, spacing, radii, shadows, transitions)
- **Component library:** Button, IconButton, Modal, Dropdown, Tooltip, Toast, TextInput, Sidebar, Card

### 1.3 Firebase Setup

- Initialize Firebase project (Auth, Firestore, Cloud Functions, Hosting)
- Configure Google Identity Provider with `drive.file` OAuth scope
- Deploy Firestore security rules (from original plan, corrected)
- Create Firebase config module (`src/config/firebase.ts`)

### 1.4 Authentication Flow

- Google Sign-In with OAuth consent screen
- Auth context provider wrapping the app
- Protected route wrapper component
- Token refresh and session management
- Sign-out with cleanup

### 1.5 App Shell & Routing

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing / Marketing | Public landing page |
| `/dashboard` | Dashboard | Project list, create new, recent projects |
| `/project/:id` | Project Hub | Project settings, scripts list, team |
| `/project/:id/script/:scriptId` | **Script Editor** | The main writing workspace |
| `/project/:id/breakdown` | Breakdown Manager | Scene breakdown & tagging |
| `/project/:id/shots/:sceneId` | Shot List & Storyboard | Visual shot planning |
| `/settings` | User Settings | API keys, preferences, theme |

### 1.6 Verification

- [ ] `npm run dev` starts without errors
- [ ] Google sign-in works and returns an access token
- [ ] Firestore security rules deploy successfully
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Design system renders correctly across components

---

## Phase 2: Screenplay Editor Core

> **Goal:** Build the Slate.js screenplay editor with proper formatting, keyboard shortcuts, the auto-formatting state machine, and Fountain format support.

### 2.1 Slate.js Editor Setup

- Install and configure Slate.js with React bindings
- Define custom element types:

```typescript
type ScreenplayElementType =
  | 'scene-heading'    // INT./EXT. LOCATION - TIME OF DAY
  | 'action'           // Action/description paragraphs
  | 'character'        // Character name (uppercase, centered)
  | 'parenthetical'    // (emotional direction)
  | 'dialogue'         // Character's spoken lines
  | 'transition'       // CUT TO:, FADE IN:, etc.
  | 'shot'             // CLOSE ON:, ANGLE ON:, etc.
  | 'centered'         // Centered text (> text <)
  | 'page-break';      // Manual page break (===)
```

- Create custom `renderElement` for each type with correct indentation and styling
- Create custom `renderLeaf` for inline formatting (bold, italic, underline)

### 2.2 Typography & Layout (Industry Standard)

- Enforce **Courier Prime 12pt** for all screenplay content
- Page dimensions: 8.5" × 11" (816px × 1056px at 96 DPI)
- Margins: Top 1.0", Bottom 1.0", Left 1.5", Right 1.0"
- Element-specific indentation per original plan specs
- Virtual page breaks with page numbering
- "Continuous scroll" mode and "Page view" mode toggle

### 2.3 Auto-Formatting State Machine

Implement the `Enter` and `Tab` key transitions from the original plan, plus these additions:

| Current Element | Trigger | Result |
|----------------|---------|--------|
| Scene Heading | `Enter` | → Action |
| Action | `Enter` | → Action |
| Action (empty) | `Enter` | → Scene Heading |
| Action (empty) | `Tab` | → Character |
| Character | `Enter` | → Dialogue |
| Dialogue | `Enter` | → Dialogue |
| Dialogue (empty) | `Enter` | → Action |
| Dialogue | `Tab` | → Parenthetical |
| Parenthetical | `Enter` | → Dialogue |
| Transition | `Enter` | → Scene Heading |

Additional keyboard shortcuts:
- `Cmd/Ctrl + 1-7` — Force element type
- `Cmd/Ctrl + B/I/U` — Bold, italic, underline
- `Cmd/Ctrl + Z/Shift+Z` — Undo/redo (Slate built-in)

### 2.4 Fountain Format Parser

Build a bidirectional Fountain ↔ Slate converter:

- **Import:** Parse `.fountain` files into Slate node tree
- **Export:** Serialize Slate editor state to valid Fountain markup
- Support: Title page, scene headings, action, character, dialogue, parentheticals, transitions, centered text, page breaks, notes, boneyard, sections, synopses, inline formatting

### 2.5 Scene Navigator Panel

- Left sidebar showing scene list extracted from editor content
- Click-to-navigate to any scene
- Scene reordering via drag & drop
- Scene number display (auto-numbered)
- Scene length display (in eighths of a page)

### 2.6 Editor Toolbar

- Element type dropdown (current block type)
- Inline formatting buttons (Bold, Italic, Underline)
- Scene heading builder (INT/EXT picker, location autocomplete, time of day)
- Character name autocomplete (from previously used names)
- View mode toggle (Continuous / Page view)

### 2.7 Verification

- [ ] Typing a scene heading in uppercase auto-detects the element type
- [ ] `Enter` after Character creates Dialogue block
- [ ] `Tab` on empty Action converts to Character
- [ ] Importing a `.fountain` file renders correctly
- [ ] Exporting to `.fountain` produces valid output
- [ ] Page count is approximately accurate (1 page ≈ 54 lines)

---

## Phase 3: Project Management & Persistence

> **Goal:** Connect the editor to Firestore for saving/loading, implement project CRUD, Google Drive integration, and script version management.

### 3.1 Firestore Data Layer

- Implement Firestore service module with CRUD operations for:
  - Projects (create, list, update, delete)
  - Scripts (create, list, update, delete, duplicate)
  - Scenes (auto-extracted from editor content on save)
- Auto-save with debounce (2-second delay after last keystroke)
- Manual save with `Cmd/Ctrl + S`
- Last-saved timestamp display
- Conflict detection (warn if document changed externally)

### 3.2 Firestore Schema (Corrected)

```
/projects/{projectId}
  ├── title, ownerId, collaborators, driveFolderId, createdAt, updatedAt
  │
  ├── /scripts/{scriptId}
  │     ├── title, versionName, revisionColor, isLocked, createdAt
  │     ├── content (serialized Slate JSON or Fountain string)
  │     │
  │     └── /scenes/{sceneId}
  │           ├── sceneNumber, sequenceOrder, prefix, locationHeading
  │           ├── timeOfDay, eighthsCount, lockedPageNumber, updatedAt
  │           │
  │           └── /shots/{shotId}
  │                 └── shotNumber, shotType, framing, cameraMovement, etc.
  │
  └── /breakdown_elements/{elementId}
        └── categoryId, categoryName, name, description, colorCode
```

### 3.3 Google Drive Integration

- `GoogleDriveService.ts` from original plan (with error handling added)
- Auto-create project folder on first project creation
- Upload storyboard images to project folder
- Export PDFs/FDX to project folder
- Display Google Drive link in project settings

### 3.4 Dashboard Page

- Project grid/list view with thumbnails
- Create new project flow (title, genre, logline)
- Open existing project
- Delete project (with confirmation)
- Search and filter projects
- Recent projects section

### 3.5 Script Version Management

- Create new draft (with revision color: White → Blue → Pink → Yellow → Green → Goldenrod → Buff → Salmon → Cherry → Tan → 2nd White → 2nd Blue …)
- View draft history
- Compare drafts side-by-side (diff view)
- Duplicate script as new draft

### 3.6 Verification

- [ ] Creating a project writes to Firestore and creates a Google Drive folder
- [ ] Auto-save persists editor content to Firestore
- [ ] Reloading the page restores the editor state
- [ ] Creating a new draft copies the current script content
- [ ] Dashboard displays all user projects correctly

---

## Phase 4: Production Tools

> **Goal:** Build the production breakdown engine, shot list/storyboard builder, revision tracking, and page locking — the features that differentiate this from a basic text editor.

### 4.1 Production Breakdown Engine

- **Eighths calculation:** `eighths = Round((lineCount / 54) * 8)` with display as fractions
- **Breakdown sheet per scene:** List all tagged elements (cast, props, wardrobe, vehicles, SFX, stunts, animals, sound effects, makeup, set dressing)
- **Category management:** Pre-defined categories with color codes, ability to add custom categories
- **Element tagging:** 
  - Manual: Select text in editor, assign to breakdown category
  - Auto-detect: Scan `ALL CAPS` words in action blocks, suggest matches against existing elements
- **Breakdown report:** Printable/exportable summary of all scenes and their elements

### 4.2 Shot List & Storyboard Builder

- Per-scene shot list table with columns: Shot #, Type, Framing, Camera Movement, Lens, Equipment, Description, Audio Notes
- Add/edit/delete/reorder shots
- Upload storyboard images (stored on Google Drive)
- Image thumbnail display in shot list
- Storyboard strip view (horizontal scroll of thumbnails with shot info)
- `ShotListController.ts` from original plan with error handling

### 4.3 Revision Tracking & Page Locking

- **Page locking:** When script is locked, freeze scene numbers and page boundaries
- **Alphanumeric scene numbering:** Inserted scenes get `2A`, `2B` suffixes
- **Revision asterisks:** SHA-256 hash per line, compare against locked baseline, render `*` in right margin at 7.25"
- **Revision color headers:** Display current draft color at top of each page
- **Omitted scenes:** Mark deleted scenes as "OMITTED" instead of removing

### 4.4 Verification

- [ ] Scene breakdown correctly identifies and tags elements
- [ ] Eighths calculation matches manual counting
- [ ] Locking a script freezes scene numbers
- [ ] Inserting a scene between 2 and 3 creates scene 2A
- [ ] Changed lines show asterisks after locking
- [ ] Storyboard images upload to Google Drive and display correctly

---

## Phase 5: AI Writing Assistant & Export

> **Goal:** Integrate BYO-key AI assistance for writing, and build PDF + FDX export engines.

### 5.1 AI Writing Assistant

- **Settings page:** Secure input for API keys (Gemini, OpenAI, Anthropic)
- **Key storage:** Encrypted in `sessionStorage` (cleared on tab close), optional `localStorage` with user consent
- **Firebase Cloud Function proxy** (from original plan) — user's key in header, never stored server-side
- **AI features:**
  - Generate scene from prompt (with preceding context)
  - Continue writing from cursor position
  - Rewrite selected text (make it more dramatic, more concise, etc.)
  - Character dialogue consistency check
  - Scene description enhancement
  - Suggest transitions
- **Streaming output:** Display AI-generated text character-by-character as it streams
- **Insert/Replace:** User can accept, edit, or reject AI suggestions before inserting into editor
- **Prompt templates:** Pre-built prompts for common screenwriting tasks

### 5.2 PDF Export

- Generate industry-standard screenplay PDFs:
  - Courier 12pt, correct margins (1.0" top/bottom/right, 1.5" left)
  - Page numbers top-right at 0.5" from top (`1.`, `2.`, `3.`)
  - Revision headers on locked drafts
  - Revision asterisks in right margin
  - Title page (title, author, contact info, date, draft info)
  - Scene continuations (`(CONTINUED)` / `CONTINUED:`) across page breaks
  - Character name `(CONT'D)` when dialogue breaks across pages
- Save to Google Drive automatically
- Print-friendly layout

### 5.3 FDX (Final Draft) Export

- Generate valid `.fdx` XML files compatible with Final Draft 12+
- Map all Slate element types to FDX paragraph styles
- Preserve inline formatting (bold, italic, underline)
- Include scene numbers and revision data
- Import `.fdx` files (parse XML → Slate nodes)

### 5.4 Additional Export Formats

- Fountain (`.fountain`) — already built in Phase 2
- Plain text outline
- Scene-by-scene summary report

### 5.5 Verification

- [ ] AI generates valid Fountain markup that inserts correctly into editor
- [ ] Streaming works without blocking the UI
- [ ] PDF output matches industry standard formatting
- [ ] FDX files open correctly in Final Draft
- [ ] Exported PDF includes revision asterisks and color headers when applicable

---

## Phase 6: Collaboration & Polish

> **Goal:** Add real-time collaboration, polish the UI, add onboarding, and prepare for production deployment.

### 6.1 Real-Time Collaboration (Post-MVP)

- Integrate Yjs with `slate-yjs` bindings
- WebSocket signaling server (or Firestore-based CRDT sync for serverless)
- Remote cursor display with collaborator colors and names
- Presence indicators (who's online, where they're editing)
- Commenting system (inline comments on selected text)
- Permission levels: Owner, Editor, Viewer (from Firestore collaborators map)

### 6.2 UI Polish & Animations

- Smooth page transitions (route animations)
- Micro-interactions on buttons, menus, toggles
- Loading skeletons for async content
- Toast notifications for save, export, errors
- Keyboard shortcut overlay (`Cmd + /`)
- Dark/light theme toggle (default: dark)
- Responsive layout for tablet (editor in fullscreen mode)

### 6.3 Onboarding & Help

- First-run tutorial overlay
- Sample script pre-loaded (for demo/exploration)
- Keyboard shortcut reference panel
- Element formatting guide
- Tooltip hints on complex features

### 6.4 Performance & Reliability

- Lazy loading for route-level code splitting
- Virtual scrolling for long scripts (100+ pages)
- Offline support via Firestore persistence
- Error boundaries with graceful fallbacks
- Analytics (optional, privacy-respecting)

### 6.5 Deployment

- Firebase Hosting deployment pipeline
- Custom domain configuration
- Environment variables for production vs staging
- Cloud Function deployment
- CI/CD setup (GitHub Actions)

### 6.6 Verification

- [ ] Two users can edit the same script simultaneously
- [ ] Cursor positions are visible to both users
- [ ] App loads in under 3 seconds on standard connection
- [ ] Offline edits sync correctly when reconnected
- [ ] All routes load correctly in production build

---

## Execution Order Summary

| Phase | Name | Key Deliverable | Estimated Effort |
|-------|------|----------------|-----------------|
| **1** | Foundation & Design System | App shell with auth, routing, design system | 1-2 weeks |
| **2** | Screenplay Editor Core | Functional screenplay editor with Fountain support | 2-3 weeks |
| **3** | Project Management & Persistence | Save/load, projects, versions, Google Drive | 1-2 weeks |
| **4** | Production Tools | Breakdown, shot lists, revision tracking | 2-3 weeks |
| **5** | AI & Export | AI writing assistant, PDF/FDX export | 1-2 weeks |
| **6** | Collaboration & Polish | Real-time collab, UI polish, deployment | 2-3 weeks |

> [!IMPORTANT]
> **After Phase 3, you have a usable MVP** — a working screenplay editor that saves to the cloud. Phases 4-6 add professional production features. I recommend we build and validate each phase before moving to the next.

---

## Open Questions

> [!IMPORTANT]
> Please clarify these before we begin Phase 1:

1. **Firebase Project:** Do you already have a Firebase project created, or should I set one up from scratch?
2. **Domain:** Do you have a custom domain in mind (e.g., `screenplaystudio.app`), or will we use Firebase Hosting's default URL for now?
3. **Primary target users:** Solo screenwriters, or collaborative production teams? This affects how early we need collaboration features.
4. **Mobile support:** Do you need mobile responsiveness, or is this desktop-only for now?
5. **Sample script:** Should I include a sample screenplay (e.g., a short scene) for testing and onboarding?
