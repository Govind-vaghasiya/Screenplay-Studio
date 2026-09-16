// Industry-standard Screenplay Scene Numbering & Extraction Service
import type { Descendant } from 'slate';

export interface ExtractedScene {
  id: string;
  index: number; // Slate child block index of scene-heading
  sceneNumber: string; // e.g. "1", "1A", "1B", "2", "3"
  heading: string;
  prefix: string; // "INT.", "EXT.", "INT./EXT.", "I/E."
  location: string;
  timeOfDay: string;
  lineCount: number;
  eighths: string; // e.g. "3/8 pgs", "1 2/8 pgs"
  nodes: any[];
  plainText: string;
  path: number[];
}

/**
 * Calculates page length in industry-standard eighths of a page (1 page = 8/8 = 54 lines approx).
 */
export function calculateSceneEighths(lines: number): { text: string; eighths: number } {
  const linesPerEighth = 54 / 8; // ~6.75 lines
  const totalEighths = Math.max(1, Math.round(lines / linesPerEighth));
  const fullPages = Math.floor(totalEighths / 8);
  const remainingEighths = totalEighths % 8;

  if (fullPages === 0) {
    return { text: `${remainingEighths}/8 pgs`, eighths: totalEighths };
  }
  if (remainingEighths === 0) {
    return { text: `${fullPages} pgs`, eighths: totalEighths };
  }
  return { text: `${fullPages} ${remainingEighths}/8 pgs`, eighths: totalEighths };
}

/**
 * Computes the next sub-scene alphanumeric identifier following industry rules:
 * - 1 -> 1A
 * - 1A -> 1B
 * - 1Z -> 1AA
 * - 10 -> 10A
 * - A1 -> B1 (or A1A)
 */
export function getNextSubSceneNumber(currentNumber: string, existingSceneNumbers: string[] = []): string {
  const trimmed = currentNumber.trim().toUpperCase();

  // Pattern: 1, 2, 3... -> 1A, 2A, 3A...
  const match = trimmed.match(/^(\d+)([A-Z]*)$/);
  if (match) {
    const baseDigits = match[1];
    const suffix = match[2];

    if (!suffix) {
      let candidateSuffix = 'A';
      let candidate = `${baseDigits}${candidateSuffix}`;
      while (existingSceneNumbers.includes(candidate)) {
        candidateSuffix = String.fromCharCode(candidateSuffix.charCodeAt(0) + 1);
        if (candidateSuffix.charCodeAt(0) > 90) {
          candidate = `${baseDigits}AA`;
          break;
        }
        candidate = `${baseDigits}${candidateSuffix}`;
      }
      return candidate;
    }

    // Suffix exists (e.g. 1A -> 1B, 1Z -> 1AA)
    const lastChar = suffix.charCodeAt(suffix.length - 1);
    if (lastChar < 90) { // 'Z' is 90
      const nextChar = String.fromCharCode(lastChar + 1);
      let candidate = `${baseDigits}${suffix.slice(0, -1)}${nextChar}`;
      while (existingSceneNumbers.includes(candidate)) {
        const charCode = candidate.charCodeAt(candidate.length - 1) + 1;
        if (charCode > 90) {
          candidate = `${candidate}A`;
          break;
        }
        candidate = `${baseDigits}${suffix.slice(0, -1)}${String.fromCharCode(charCode)}`;
      }
      return candidate;
    }
    return `${baseDigits}${suffix}A`;
  }

  // Fallback for non-standard prefix (e.g., A1 -> A1A)
  return `${trimmed}A`;
}

/**
 * Resolves deterministic, duplicate-free scene numbers across all scene headings.
 * Handles sub-scenes (1A, 1B), custom user-set numbers, and auto-sequential numbers.
 */
export function resolveSceneNumbers(nodes: Descendant[]): Map<number, string> {
  const resolvedMap = new Map<number, string>(); // lineIndex -> sceneNumber
  let mainSceneCounter = 1;

  for (let idx = 0; idx < nodes.length; idx++) {
    const node = nodes[idx] as any;
    if (!node || node.type !== 'scene-heading') continue;

    const customNum = node.sceneNumber ? String(node.sceneNumber).trim().toUpperCase() : null;

    if (customNum) {
      // If node has explicit sceneNumber
      resolvedMap.set(idx, customNum);

      // If it's a numeric main scene (e.g., "5"), sync our counter
      const parsedInt = parseInt(customNum, 10);
      if (!isNaN(parsedInt) && /^\d+$/.test(customNum)) {
        mainSceneCounter = Math.max(mainSceneCounter, parsedInt + 1);
      }
    } else {
      // Auto-sequence main scene number
      const assigned = String(mainSceneCounter++);
      resolvedMap.set(idx, assigned);
    }
  }

  return resolvedMap;
}

/**
 * Standardized scene extractor used by both ScriptEditor and BreakdownPage.
 * Extracts scene items, headings, eighths, and block nodes with exact matching scene numbers.
 */
export function extractScenesFromNodes(nodes: Descendant[]): ExtractedScene[] {
  if (!nodes || nodes.length === 0) return [];

  const resolvedNumbers = resolveSceneNumbers(nodes);
  const list: ExtractedScene[] = [];
  let currentScene: ExtractedScene | null = null;

  for (let idx = 0; idx < nodes.length; idx++) {
    const node = nodes[idx] as any;
    if (!node) continue;

    const nodeType = node.type || 'action';
    const text = (node.children ? (node.children as any[]) : [])
      .map((c) => c.text || '')
      .join('')
      .trim();

    if (nodeType === 'scene-heading') {
      if (currentScene) {
        currentScene.eighths = calculateSceneEighths(currentScene.lineCount).text;
        list.push(currentScene);
      }

      const sceneNum = resolvedNumbers.get(idx) || `${list.length + 1}`;

      // Parse Prefix (INT., EXT., etc.)
      const prefixMatch = text.match(/^(INT\.|EXT\.|I\/E\.|INT\/EXT\.)/i);
      const prefix = prefixMatch ? prefixMatch[0].toUpperCase() : 'INT.';

      // Parse Time of Day (DAY, NIGHT, etc.)
      const timeMatch = text.match(/-\s*(DAY|NIGHT|CONTINUOUS|DAWN|DUSK|LATER|MOMENTS LATER|EVENING)\b/i);
      const timeOfDay = timeMatch ? timeMatch[1].toUpperCase() : 'DAY';

      // Parse Location
      const location = text
        .replace(/^(INT\.|EXT\.|I\/E\.|INT\/EXT\.)/i, '')
        .replace(/-\s*(DAY|NIGHT|CONTINUOUS|DAWN|DUSK|LATER|MOMENTS LATER|EVENING)\b/i, '')
        .trim();

      currentScene = {
        id: `scene-${sceneNum.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        index: idx,
        sceneNumber: sceneNum,
        heading: text || `SCENE ${sceneNum}`,
        prefix,
        location: location || 'LOCATION',
        timeOfDay,
        lineCount: 1,
        eighths: '1/8 pgs',
        nodes: [node],
        plainText: text,
        path: [idx],
      };
    } else if (currentScene) {
      currentScene.lineCount++;
      currentScene.nodes.push(node);
      currentScene.plainText += `\n${text}`;
    }
  }

  if (currentScene) {
    currentScene.eighths = calculateSceneEighths(currentScene.lineCount).text;
    list.push(currentScene);
  }

  return list;
}

/**
 * Finds the active scene index in `scenes` based on the editor's current cursor/selection.
 */
export function getActiveSceneFromSelection(
  selectionPath: number[] | null | undefined,
  scenes: ExtractedScene[]
): number {
  if (!selectionPath || selectionPath.length === 0 || scenes.length === 0) {
    return 0;
  }

  const currentLineIndex = selectionPath[0];
  let activeIdx = 0;

  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].index <= currentLineIndex) {
      activeIdx = i;
    } else {
      break;
    }
  }

  return activeIdx;
}

/**
 * Renumbers all scene headings sequentially (1, 2, 3...) resetting custom/sub-scene tags.
 */
export function renumberAllScenesSequentially(nodes: Descendant[]): Descendant[] {
  let sceneCounter = 1;
  return nodes.map((node: any) => {
    if (node && node.type === 'scene-heading') {
      return {
        ...node,
        sceneNumber: String(sceneCounter++),
      };
    }
    return node;
  });
}
