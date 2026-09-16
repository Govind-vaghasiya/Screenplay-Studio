// Final Draft (.fdx) XML Export & Import Service
import type { Descendant } from 'slate';

/**
 * Maps Slate Screenplay element types to Final Draft XML paragraph types
 */
const SLATE_TO_FDX_MAP: Record<string, string> = {
  'scene-heading': 'Scene Heading',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
  shot: 'Shot',
  centered: 'Centered',
};

const FDX_TO_SLATE_MAP: Record<string, string> = {
  'Scene Heading': 'scene-heading',
  Action: 'action',
  Character: 'character',
  Parenthetical: 'parenthetical',
  Dialogue: 'dialogue',
  Transition: 'transition',
  Shot: 'shot',
  Centered: 'centered',
};

/**
 * Serializes Slate screenplay nodes into valid Final Draft 12 XML (.fdx) format.
 */
export function exportSlateToFDX(nodes: Descendant[]): string {
  const xmlParagraphs: string[] = [];

  for (const node of nodes) {
    if (!('type' in node) || !('children' in node)) continue;
    const elementType = (node as any).type || 'action';
    const fdxType = SLATE_TO_FDX_MAP[elementType] || 'Action';

    // Extract text and inline formatting
    const textRuns = (node.children as any[]).map((child) => {
      let text = child.text || '';
      // Escape XML characters
      text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const styleAttrs: string[] = [];
      if (child.bold) styleAttrs.push('Style="Bold"');
      if (child.italic) styleAttrs.push('Style="Italic"');
      if (child.underline) styleAttrs.push('Style="Underline"');

      const styleString = styleAttrs.length > 0 ? ` ${styleAttrs.join(' ')}` : '';
      return `<Text${styleString}>${text}</Text>`;
    });

    xmlParagraphs.push(`    <Paragraph Type="${fdxType}">\n      ${textRuns.join('')}\n    </Paragraph>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="3">
  <Content>
${xmlParagraphs.join('\n')}
  </Content>
</FinalDraft>`;
}

/**
 * Downloads the current Slate screenplay as a Final Draft (.fdx) XML file.
 */
export function downloadFDX(nodes: Descendant[], filename: string = 'screenplay'): void {
  const xmlContent = exportSlateToFDX(nodes);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.fdx') ? filename : `${filename}.fdx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses Final Draft (.fdx) XML content string back into Slate screenplay nodes.
 */
export function importFDXToSlate(xmlString: string): Descendant[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const paragraphs = xmlDoc.querySelectorAll('Paragraph');
  const nodes: Descendant[] = [];

  paragraphs.forEach((p) => {
    const fdxType = p.getAttribute('Type') || 'Action';
    const slateType = FDX_TO_SLATE_MAP[fdxType] || 'action';
    const textNodes = p.querySelectorAll('Text');
    const children: any[] = [];

    if (textNodes.length === 0) {
      children.push({ text: p.textContent || '' });
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

    nodes.push({
      type: slateType,
      children: children.length > 0 ? children : [{ text: '' }],
    } as any);
  });

  return nodes.length > 0
    ? nodes
    : ([
        {
          type: 'scene-heading',
          children: [{ text: 'INT. UNTITLED SCENE - DAY' }],
        },
        {
          type: 'action',
          children: [{ text: 'Begin typing your screenplay...' }],
        },
      ] as any as Descendant[]);
}
