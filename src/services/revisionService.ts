// Script Revision Tracking & Page Locking Service — Industry Standard
import type { Descendant } from 'slate';
import type { RevisionColor } from '@/types';

export interface RevisionBaseline {
  lockedAt: string;
  revisionColor: RevisionColor;
  sceneHeadings: Array<{ sceneNumber: string; text: string }>;
  lineHashes: string[];
}

export const REVISION_DRAFT_COLORS: Array<{ name: RevisionColor; hex: string; order: number }> = [
  { name: 'White', hex: '#ffffff', order: 1 },
  { name: 'Blue', hex: '#93c5fd', order: 2 },
  { name: 'Pink', hex: '#f9a8d4', order: 3 },
  { name: 'Yellow', hex: '#fde68a', order: 4 },
  { name: 'Green', hex: '#86efac', order: 5 },
  { name: 'Goldenrod', hex: '#fbbf24', order: 6 },
  { name: 'Buff', hex: '#fcd34d', order: 7 },
  { name: 'Salmon', hex: '#fca5a5', order: 8 },
  { name: 'Cherry', hex: '#f87171', order: 9 },
  { name: 'Tan', hex: '#d2b48c', order: 10 },
  { name: '2nd White', hex: '#e5e7eb', order: 11 },
  { name: '2nd Blue', hex: '#60a5fa', order: 12 },
];

/**
 * Computes a fast hash of text content for line revision comparison.
 */
export function hashLineContent(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Creates a locked revision snapshot baseline from current Slate nodes.
 */
export function createRevisionBaseline(nodes: Descendant[], color: RevisionColor = 'White'): RevisionBaseline {
  const lineHashes: string[] = [];
  const sceneHeadings: Array<{ sceneNumber: string; text: string }> = [];
  let sceneCount = 1;

  for (const node of nodes) {
    if (!('children' in node)) continue;
    const text = (node.children as any[]).map((c) => c.text || '').join('');
    lineHashes.push(hashLineContent(text.trim()));

    if ((node as any).type === 'scene-heading') {
      sceneHeadings.push({
        sceneNumber: `${sceneCount++}`,
        text: text.trim(),
      });
    }
  }

  return {
    lockedAt: new Date().toISOString(),
    revisionColor: color,
    sceneHeadings,
    lineHashes,
  };
}

/**
 * Determines which lines have been modified compared to baseline, to display revision asterisks (*).
 */
export function getModifiedLineIndices(currentNodes: Descendant[], baseline: RevisionBaseline | null): Set<number> {
  const modifiedIndices = new Set<number>();
  if (!baseline || !baseline.lineHashes) return modifiedIndices;

  currentNodes.forEach((node, index) => {
    if (!('children' in node)) return;
    const text = (node.children as any[]).map((c) => c.text || '').join('').trim();
    const currentHash = hashLineContent(text);
    const baselineHash = baseline.lineHashes[index];

    // If text was modified or line was newly inserted
    if (baselineHash === undefined || currentHash !== baselineHash) {
      if (text.length > 0) {
        modifiedIndices.add(index);
      }
    }
  });

  return modifiedIndices;
}

/**
 * Computes alphanumeric scene numbering for newly inserted scenes in locked scripts (e.g. 2A, 2B).
 */
export function getSceneNumberForHeading(
  headingText: string,
  headingIndex: number,
  allHeadings: string[],
  baseline: RevisionBaseline | null
): string {
  if (!baseline) {
    return `${headingIndex + 1}`;
  }

  // Check if heading existed in baseline
  const matched = baseline.sceneHeadings.find((sh) => sh.text.toUpperCase() === headingText.trim().toUpperCase());
  if (matched) {
    return matched.sceneNumber;
  }

  // Inserted scene: calculate A/B suffix
  const prevHeading = allHeadings[headingIndex - 1];
  if (prevHeading) {
    const prevMatch = baseline.sceneHeadings.find((sh) => sh.text.toUpperCase() === prevHeading.trim().toUpperCase());
    const baseNum = prevMatch ? prevMatch.sceneNumber : `${headingIndex}`;
    return `${baseNum}A`;
  }

  return `A1`;
}
