// Script & Story Importer Service — Multi-Format Parsing, Smart Conversion & Screenplay Analysis
import type { Descendant } from 'slate';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using unpkg / cdnjs worker bundle
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ScreenplayMetadata {
  title?: string;
  author?: string;
  genre?: string;
  logline?: string;
  draftDate?: string;
}

export interface ScreenplayAnalysis {
  totalScenes: number;
  totalCharacters: number;
  characterList: Array<{ name: string; lineCount: number }>;
  totalDialogueLines: number;
  totalActionBlocks: number;
  estimatedPages: number;
}

export interface ParsedScreenplayResult {
  nodes: Descendant[];
  metadata: ScreenplayMetadata;
  analysis: ScreenplayAnalysis;
}

/**
 * Standard FDX paragraph type mapping to Slate element types
 */
const FDX_TO_SLATE_MAP: Record<string, string> = {
  'Scene Heading': 'scene-heading',
  Action: 'action',
  Character: 'character',
  Parenthetical: 'parenthetical',
  Dialogue: 'dialogue',
  Transition: 'transition',
  Shot: 'shot',
  Centered: 'centered',
  General: 'action',
};

/**
 * Parses Final Draft (.fdx) XML into Slate screenplay nodes with metadata extraction
 */
export function parseFDXToSlate(xmlString: string): {
  metadata: ScreenplayMetadata;
  nodes: Descendant[];
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Extract Metadata from TitlePage if available
  const metadata: ScreenplayMetadata = {};
  const titleElem = xmlDoc.querySelector(
    'TitlePage Content Paragraph[Type="Title"] Text, Content Paragraph[Type="Title"] Text'
  );
  if (titleElem?.textContent) metadata.title = titleElem.textContent.trim();

  const authorElem = xmlDoc.querySelector(
    'TitlePage Content Paragraph[Type="Author"] Text, Content Paragraph[Type="Author"] Text'
  );
  if (authorElem?.textContent) metadata.author = authorElem.textContent.trim();

  const paragraphs = xmlDoc.querySelectorAll('Content > Paragraph, Paragraph');
  const nodes: Descendant[] = [];

  paragraphs.forEach((p) => {
    const fdxType = p.getAttribute('Type') || 'Action';
    if (fdxType === 'Title' || fdxType === 'Author') return; // Skip title page paragraphs

    const slateType = FDX_TO_SLATE_MAP[fdxType] || 'action';
    const textNodes = p.querySelectorAll('Text');
    const children: any[] = [];

    if (textNodes.length === 0) {
      const text = p.textContent || '';
      if (text.trim()) children.push({ text });
    } else {
      textNodes.forEach((t) => {
        const text = t.textContent || '';
        const style = t.getAttribute('Style') || '';
        children.push({
          text,
          bold: style.includes('Bold'),
          italic: style.includes('Italic'),
          underline: style.includes('Underline'),
        });
      });
    }

    if (children.length > 0) {
      nodes.push({
        type: slateType,
        children,
      } as any);
    }
  });

  return {
    metadata,
    nodes: nodes.length > 0 ? nodes : createFallbackNodes(metadata.title),
  };
}

/**
 * Helper to identify and clean Scene Headings (e.g. "1 INT. PAWAN'S PG ROOM - NIGHT 1" or "20 FLASHBACK - EXT. VILLAGE - DAY 20")
 */
function parseSceneHeading(line: string): { isHeading: boolean; text: string; sceneNumber?: string } {
  const trimmed = line.trim();

  // Pattern 1: Leading scene number e.g. "1 INT. ...", "20 FLASHBACK - EXT. ..."
  const leadingMatch = trimmed.match(/^(\d+[A-Z]?)\s+(.*)$/);
  let candidate = trimmed;
  let sceneNum: string | undefined;

  if (leadingMatch) {
    sceneNum = leadingMatch[1];
    candidate = leadingMatch[2].trim();
  }

  // Check if candidate starts with standard scene heading prefixes
  const isScene =
    /^(INT\.|EXT\.|I\/E\.|INT\/EXT\.|INT\s|EXT\s|EST\.|FLASHBACK\s*-\s*EXT\.|FLASHBACK\s*-\s*INT\.)/i.test(
      candidate
    ) ||
    (candidate.startsWith('.') && !candidate.startsWith('..'));

  if (!isScene) {
    return { isHeading: false, text: line };
  }

  let headingText = candidate.startsWith('.') ? candidate.slice(1).trim() : candidate;

  // Clean trailing repeated scene number e.g. "INT. ROOM - NIGHT 1" -> "INT. ROOM - NIGHT"
  if (sceneNum) {
    const trailingRegex = new RegExp(`\\s+${sceneNum}$`, 'i');
    headingText = headingText.replace(trailingRegex, '').trim();
  } else {
    // Check if trailing number exists alone: "INT. ROOM - NIGHT 1"
    const trailingAlone = headingText.match(/^(.*)\s+(\d+[A-Z]?)$/);
    if (trailingAlone && /^(INT\.|EXT\.|I\/E\.|INT\/EXT\.)/i.test(trailingAlone[1])) {
      headingText = trailingAlone[1].trim();
      sceneNum = trailingAlone[2];
    }
  }

  return {
    isHeading: true,
    text: headingText.toUpperCase(),
    sceneNumber: sceneNum,
  };
}

/**
 * Helper to check if line is a Character Cue (e.g. "PAWAN", "PAWAN (CONT'D)", "UNKNOWN VOICE (O.S.)", "BOY (FROM MIRROR)")
 */
function isCharacterLine(line: string, prevType: string): boolean {
  if (line.startsWith('@')) return true;

  // Reject quotes / dialogue strings
  if (/^["'“‘]/.test(line) || /["'”’]$/.test(line)) return false;

  // Reject lines that end with colons or periods
  if (line.endsWith(':') || line.endsWith('.')) return false;

  // Strip extension in parentheses to check name (e.g. "PAWAN (CONT'D)" -> "PAWAN")
  const nameBase = line.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!nameBase || nameBase.length > 38 || nameBase.length < 2) return false;

  // Name must be all caps with letters
  const isAllUpper =
    nameBase === nameBase.toUpperCase() &&
    /[A-Z]/.test(nameBase) &&
    !/[.!?:;,]$/.test(nameBase);

  if (!isAllUpper) return false;

  // Reject common non-character all-caps cues
  const nonCharacters = [
    'THE END',
    'FADE IN',
    'FADE OUT',
    'CUT TO',
    'CONTINUED',
    'CONTINUE',
    'SILENCE',
    'BLACKOUT',
    'ELECTRICAL SHOCK',
    'CRASH',
  ];
  if (nonCharacters.includes(nameBase)) return false;

  // Characters typically appear after a blank line, scene heading, transition, or end of previous dialogue/action
  return (
    prevType === 'blank' ||
    prevType === 'scene-heading' ||
    prevType === 'transition' ||
    prevType === 'centered' ||
    prevType === 'action' ||
    prevType === 'dialogue'
  );
}

/**
 * Parses Fountain screenplay text (and standard screenplay plain text) into Slate screenplay nodes.
 * Full support for scene numbers, character extensions, multi-line dialogue, title metadata, and transitions.
 */
export function parseFountainToSlate(fountainText: string): {
  metadata: ScreenplayMetadata;
  nodes: Descendant[];
} {
  const metadata: ScreenplayMetadata = {};

  // Clean markdown code fences if present
  let cleanText = fountainText
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .trim();

  // Strip boneyard comments: /* ... */
  cleanText = cleanText.replace(/\/\*[\s\S]*?\*\//g, '');

  const rawLines = cleanText.split(/\r?\n/);
  const nodes: Descendant[] = [];

  let lineIndex = 0;
  let inTitlePage = true;
  const titleCandidateLines: string[] = [];

  // 1. Process Title Page / Header key-values or title blocks before the first Scene Heading
  while (lineIndex < rawLines.length && inTitlePage) {
    const line = rawLines[lineIndex];
    const trimmed = line.trim();

    // Check if we hit the first scene heading, transition, or transcript timestamp/speaker line
    const headingCheck = parseSceneHeading(trimmed);
    const isTransition = /^(FADE IN:|FADE OUT\.|CUT TO:)/i.test(trimmed);
    const isTimestampOrSpeaker =
      /\b\d{2}[;:]\d{2}[;:]\d{2}/.test(trimmed) ||
      /^Speaker\s*\d+/i.test(trimmed);

    if (headingCheck.isHeading || isTransition || isTimestampOrSpeaker) {
      inTitlePage = false;
      break;
    }

    const match = trimmed.match(/^([A-Za-z\s]+):\s*(.*)$/);
    if (match && lineIndex < 15) {
      const key = match[1].trim().toLowerCase();
      const val = match[2].trim();

      if (key === 'title') metadata.title = val;
      else if (key === 'author' || key === 'authors' || key === 'written by') metadata.author = val;
      else if (key === 'genre') metadata.genre = val;
      else if (key === 'logline' || key === 'story') metadata.logline = val;
      else if (key === 'draft date' || key === 'date') metadata.draftDate = val;

      lineIndex++;
    } else if (trimmed) {
      // Collect non-empty lines before first scene as possible title
      titleCandidateLines.push(trimmed);
      lineIndex++;
    } else {
      lineIndex++;
      if (metadata.title || titleCandidateLines.length > 0) {
        if (lineIndex > 8) inTitlePage = false;
      }
    }
  }

  // If no explicit "Title:" was found, synthesize from header lines (e.g. Hindi title + English subtitle)
  if (!metadata.title && titleCandidateLines.length > 0) {
    metadata.title = titleCandidateLines.join(' ');
  }

  // 2. Process Script Body Lines
  let prevType: string = 'blank';

  for (let i = lineIndex; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // Strip inline [[notes]]
    const line = trimmed.replace(/\[\[[\s\S]*?\]\]/g, '').trim();

    if (!line) {
      prevType = 'blank';
      continue;
    }

    // Centered Text: > Centered < or Title Cards / End Credits
    if (
      (line.startsWith('>') && line.endsWith('<')) ||
      /^THE END$/i.test(line) ||
      /^TITLE CARD:/i.test(line) ||
      /^END CREDITS$/i.test(line)
    ) {
      const centerText = line.startsWith('>') && line.endsWith('<') ? line.slice(1, -1).trim() : line;
      nodes.push({
        type: 'centered',
        children: [{ text: centerText }],
      } as any);
      prevType = 'centered';
      continue;
    }

    // Forced Transition: > CUT TO:
    if (line.startsWith('>') && !line.endsWith('<')) {
      const transText = line.slice(1).trim();
      nodes.push({
        type: 'transition',
        children: [{ text: transText.toUpperCase() }],
      } as any);
      prevType = 'transition';
      continue;
    }

    // Standard Transitions: CUT TO:, FADE IN:, FADE OUT., SMASH CUT TO:, CUT TO BLACK.
    if (
      /^(CUT TO:|DISSOLVE TO:|SMASH CUT TO:|FADE OUT\.|FADE IN:|MATCH CUT TO:|JUMP CUT TO:|CUT TO BLACK\.)/i.test(
        line
      ) ||
      (line.endsWith('TO:') && line === line.toUpperCase())
    ) {
      nodes.push({
        type: 'transition',
        children: [{ text: line.toUpperCase() }],
      } as any);
      prevType = 'transition';
      continue;
    }

    // Scene Heading check (e.g. 1 INT. ROOM - NIGHT 1)
    const sceneCheck = parseSceneHeading(line);
    if (sceneCheck.isHeading) {
      nodes.push({
        type: 'scene-heading',
        sceneNumber: sceneCheck.sceneNumber,
        children: [{ text: sceneCheck.text }],
      } as any);
      prevType = 'scene-heading';
      continue;
    }

    // Parenthetical: (mumbling in sleep), (whispering), (nervous)
    if (line.startsWith('(') && line.endsWith(')')) {
      nodes.push({
        type: 'parenthetical',
        children: [{ text: line }],
      } as any);
      prevType = 'parenthetical';
      continue;
    }

    // Character Cue: ALL CAPS Name (e.g. PAWAN, UNKNOWN VOICE (O.S.), BOY (FROM MIRROR))
    if (isCharacterLine(line, prevType)) {
      const cleanCharName = line.replace(/^@/, '').replace(/\s*\^$/, '').trim();
      nodes.push({
        type: 'character',
        children: [{ text: cleanCharName }],
      } as any);
      prevType = 'character';
      continue;
    }

    // Dialogue: Follows Character, Parenthetical, or Continues Previous Dialogue Line
    if (prevType === 'character' || prevType === 'parenthetical' || prevType === 'dialogue') {
      // If continuing existing dialogue, append to the last dialogue node for smooth paragraph flow
      const lastNode = nodes[nodes.length - 1] as any;
      if (prevType === 'dialogue' && lastNode && lastNode.type === 'dialogue') {
        const existingText = (lastNode.children || []).map((c: any) => c.text || '').join('');
        lastNode.children = [{ text: `${existingText} ${line}` }];
      } else {
        nodes.push({
          type: 'dialogue',
          children: [{ text: line }],
        } as any);
      }
      prevType = 'dialogue';
      continue;
    }

    // Action / Description Block
    const lastNode = nodes[nodes.length - 1] as any;
    if (prevType === 'action' && lastNode && lastNode.type === 'action') {
      const existingText = (lastNode.children || []).map((c: any) => c.text || '').join('');
      lastNode.children = [{ text: `${existingText} ${line}` }];
    } else {
      nodes.push({
        type: 'action',
        children: [{ text: line }],
      } as any);
    }
    prevType = 'action';
  }

  return {
    metadata,
    nodes: nodes.length > 0 ? nodes : createFallbackNodes(metadata.title),
  };
}

/**
 * Checks if raw text is an audio transcription (contains timestamps or speaker labels) or plain story narrative
 */
export function isTranscriptionOrStory(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const hasTimestamps =
    /\d{2}[;:]\d{2}[;:]\d{2}/.test(raw) ||
    /\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(raw) ||
    /\[\d{1,2}:\d{2}\]/.test(raw);
  const hasSpeakerLabels = /Speaker\s+\d+|Narrator:|Host:/i.test(raw);
  const hasNoSceneHeadings = !/^(?:(?:\d+\s+)?(?:INT\.|EXT\.|I\/E\.|INT\/EXT\.))/m.test(raw);
  return (hasTimestamps || hasSpeakerLabels) || (hasNoSceneHeadings && raw.trim().length > 100);
}

/**
 * Strips timestamps, speaker labels, and clean transcript formatting into coherent story narrative
 */
export function cleanTranscriptionText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Remove timestamps e.g. 00;00;02;01 - 00;00;17;29 or 00:00:02 - 00:00:17
    if (/^\d{2}[;:]\d{2}[;:]\d{2}[;:]\d{2}\s*-\s*\d{2}[;:]\d{2}[;:]\d{2}[;:]\d{2}$/.test(trimmed)) continue;
    if (/^\d{1,2}:\d{2}(?::\d{2})?\s*-\s*\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed)) continue;
    if (/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(trimmed)) continue;

    // Remove speaker labels e.g. Speaker 1, Narrator, etc.
    if (/^(?:Speaker\s+\d+|Narrator|Host|Vocalist|User):?$/i.test(trimmed)) continue;

    cleanLines.push(trimmed);
  }

  return cleanLines.join('\n');
}

/**
 * Converts story narrative or audio transcription into standard multi-scene Fountain screenplay text
 */
export function convertStoryOrTranscriptToFountain(rawStoryOrTranscript: string): string {
  const cleanedText = cleanTranscriptionText(rawStoryOrTranscript);
  const paragraphs = cleanedText.split(/\n\s*\n|\n/);

  const fountainBlocks: string[] = [];
  fountainBlocks.push('\nFADE IN:\n');

  let sceneCount = 1;
  let currentSceneHeading = `1 INT. STORY SCENE - NIGHT 1`;
  fountainBlocks.push(currentSceneHeading + '\n');

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect location shifts
    if (/बाथरूम|bathroom/i.test(trimmed) && !currentSceneHeading.includes('BATHROOM')) {
      sceneCount++;
      currentSceneHeading = `${sceneCount} INT. BATHROOM - CONTINUOUS ${sceneCount}`;
      fountainBlocks.push('\n' + currentSceneHeading + '\n');
    } else if (/कॉरिडोर|corridor|hallway/i.test(trimmed) && !currentSceneHeading.includes('CORRIDOR')) {
      sceneCount++;
      currentSceneHeading = `${sceneCount} INT. CORRIDOR - NIGHT ${sceneCount}`;
      fountainBlocks.push('\n' + currentSceneHeading + '\n');
    } else if (/लैंडलॉर्ड|landlord|office|दफ्तर/i.test(trimmed) && !currentSceneHeading.includes('LANDLORD')) {
      sceneCount++;
      currentSceneHeading = `${sceneCount} INT. LANDLORD'S OFFICE - MORNING ${sceneCount}`;
      fountainBlocks.push('\n' + currentSceneHeading + '\n');
    } else if (/ट्रेन|train|स्टेशन|station/i.test(trimmed) && !currentSceneHeading.includes('TRAIN')) {
      sceneCount++;
      currentSceneHeading = `${sceneCount} INT. TRAIN COMPARTMENT - MORNING ${sceneCount}`;
      fountainBlocks.push('\n' + currentSceneHeading + '\n');
    } else if (/गांव|village|घर|courtyard/i.test(trimmed) && !currentSceneHeading.includes('VILLAGE')) {
      sceneCount++;
      currentSceneHeading = `${sceneCount} EXT. VILLAGE - PAWAN'S HOME - DAY ${sceneCount}`;
      fountainBlocks.push('\n' + currentSceneHeading + '\n');
    } else if (/छत|rooftop/i.test(trimmed) && !currentSceneHeading.includes('ROOFTOP')) {
      sceneCount++;
      currentSceneHeading = `${sceneCount} EXT. ROOFTOP - NIGHT ${sceneCount}`;
      fountainBlocks.push('\n' + currentSceneHeading + '\n');
    }

    // Check for spoken dialogue in Hindi / English narrative:
    // e.g. "पवन ने कहा..." or "विक्की ने कहा..." or "Vikky said..."
    const speechMatch = trimmed.match(
      /(?:(पवन|विक्की|बाबूजी|लैंडलॉर्ड|दोस्त|लड़का|माँ|माताजी|Pawan|Vikky|Babuji|Mother|Landlord|Voice))\s*(?:ने)?\s*(?:कहा|पूछा|बोला|चिल्लाया|whispered|said|asked|screamed|replied)\s*[,:-]?\s*["“']?([^"”'\n.?!]+[.?!]?)/i
    );

    if (speechMatch) {
      let charName = speechMatch[1].toUpperCase();
      if (charName === 'पवन') charName = 'PAWAN';
      else if (charName === 'विक्की') charName = 'VIKKY';
      else if (charName === 'बाबूजी') charName = 'BABUJI';
      else if (charName === 'लैंडलॉर्ड') charName = 'LANDLORD';
      else if (charName === 'लड़का') charName = 'BOY';
      else if (charName === 'माँ' || charName === 'माताजी') charName = 'MOTHER';

      const dialogue = speechMatch[2].trim();

      // Push preceding text as action
      const actionText = trimmed.replace(speechMatch[0], '').trim();
      if (actionText) {
        fountainBlocks.push(actionText + '\n');
      }

      // Push Character & Dialogue
      fountainBlocks.push(charName);
      fountainBlocks.push(dialogue + '\n');
    } else {
      fountainBlocks.push(trimmed + '\n');
    }
  }

  fountainBlocks.push('\nFADE OUT.\n');
  return fountainBlocks.join('\n');
}

/**
 * Smart Heuristic Rule-Based Parser for plain story prose, novel excerpts, synopses, and scripts.
 */
export function parsePlainTextStoryToSlate(rawStoryText: string): Descendant[] {
  // If text is a transcript or story narrative, convert it into structured Fountain blocks first
  const fountainScript = convertStoryOrTranscriptToFountain(rawStoryText);
  const parsed = parseFountainToSlate(fountainScript);
  return parsed.nodes.length > 0 ? parsed.nodes : createFallbackNodes('Story Draft');
}

/**
 * Extracts and decodes text content from uploaded PDF documents using PDF.js
 */
export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text items by line using their transform Y coordinates (with a vertical tolerance of 4px)
      const linesMap = new Map<number, Array<{ x: number; text: string }>>();

      for (const item of textContent.items as any[]) {
        if (!item.str || item.str.trim() === '') continue;
        const y = Math.round(item.transform[5]); // Y coordinate
        const x = item.transform[4]; // X coordinate

        // Match existing line within 4px vertical threshold
        let foundY: number | null = null;
        for (const key of linesMap.keys()) {
          if (Math.abs(key - y) <= 4) {
            foundY = key;
            break;
          }
        }

        const targetY = foundY !== null ? foundY : y;
        if (!linesMap.has(targetY)) {
          linesMap.set(targetY, []);
        }
        linesMap.get(targetY)!.push({ x, text: item.str });
      }

      // Sort lines from top of page to bottom (descending Y in PDF coordinates)
      const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
      const pageLines: string[] = [];
      let prevY: number | null = null;

      for (const y of sortedY) {
        const itemsOnLine = linesMap.get(y)!;
        // Sort items on the same line from left to right (ascending X)
        itemsOnLine.sort((a, b) => a.x - b.x);
        const lineString = itemsOnLine.map((it) => it.text).join(' ').trim();

        if (lineString) {
          // If vertical gap between lines is significant (> 18pt), insert an empty line separator
          if (prevY !== null && prevY - y > 18) {
            pageLines.push('');
          }
          pageLines.push(lineString);
          prevY = y;
        }
      }

      pageTexts.push(pageLines.join('\n'));
    }

    return pageTexts.join('\n\n');
  } catch (err) {
    console.error('PDF.js text extraction error:', err);
    throw new Error('Failed to extract text from PDF document.');
  }
}

/**
 * Extracts and decodes text content from uploaded File objects.
 */
export async function extractTextFromFile(file: File): Promise<{
  text: string;
  detectedType: 'fountain' | 'fdx' | 'txt' | 'json' | 'pdf';
  filename: string;
}> {
  const filename = file.name;
  const lowerName = filename.toLowerCase();

  let detectedType: 'fountain' | 'fdx' | 'txt' | 'json' | 'pdf' = 'txt';
  if (lowerName.endsWith('.fountain')) detectedType = 'fountain';
  else if (lowerName.endsWith('.fdx')) detectedType = 'fdx';
  else if (lowerName.endsWith('.json')) detectedType = 'json';
  else if (lowerName.endsWith('.pdf')) detectedType = 'pdf';

  if (detectedType === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractTextFromPDF(arrayBuffer);
    return { text, detectedType, filename };
  }

  // Text / XML / JSON reading
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      resolve({ text, detectedType, filename });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * Analyzes screenplay nodes and produces rich statistics (scenes, characters, dialogue, page count)
 */
export function analyzeScreenplayNodes(nodes: Descendant[]): ScreenplayAnalysis {
  let totalScenes = 0;
  let totalDialogueLines = 0;
  let totalActionBlocks = 0;
  let totalLinesEstimate = 0;

  const characterFrequency: Record<string, number> = {};

  let lastChar = '';

  for (const node of nodes) {
    if (!('type' in node)) continue;
    const type = (node as any).type;
    const text = ((node as any).children || [])
      .map((c: any) => c.text || '')
      .join('')
      .trim();

    if (!text && type !== 'page-break') continue;

    if (type === 'scene-heading') {
      totalScenes++;
      totalLinesEstimate += 2;
    } else if (type === 'character') {
      lastChar = text;
      characterFrequency[lastChar] = (characterFrequency[lastChar] || 0) + 1;
      totalLinesEstimate += 1;
    } else if (type === 'dialogue') {
      totalDialogueLines++;
      const lines = Math.max(1, Math.ceil(text.length / 38));
      totalLinesEstimate += lines;
    } else if (type === 'parenthetical') {
      totalLinesEstimate += 1;
    } else if (type === 'action') {
      totalActionBlocks++;
      const lines = Math.max(1, Math.ceil(text.length / 60));
      totalLinesEstimate += lines + 1;
    } else if (type === 'transition') {
      totalLinesEstimate += 2;
    } else {
      totalLinesEstimate += 1;
    }
  }

  const characterList = Object.entries(characterFrequency)
    .map(([name, lineCount]) => ({ name, lineCount }))
    .sort((a, b) => b.lineCount - a.lineCount);

  // Hollywood standard: ~54-56 lines per screenplay page
  const estimatedPages = Math.max(1, Math.ceil(totalLinesEstimate / 54));

  return {
    totalScenes: Math.max(1, totalScenes),
    totalCharacters: characterList.length,
    characterList,
    totalDialogueLines,
    totalActionBlocks,
    estimatedPages,
  };
}

/**
 * Fallback empty Slate nodes
 */
function createFallbackNodes(title?: string): Descendant[] {
  return [
    {
      type: 'scene-heading',
      children: [{ text: `EXT. ${title?.toUpperCase() || 'UNTITLED SCENE'} - DAY` }],
    },
    {
      type: 'action',
      children: [{ text: 'Action begins here...' }],
    },
  ] as any as Descendant[];
}
