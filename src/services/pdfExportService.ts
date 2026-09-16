// Screenplay PDF Export & Print Service — Industry Standard Layout
import type { Descendant } from 'slate';

export interface PDFExportOptions {
  title: string;
  author?: string;
  productionHouse?: string;
  draftName?: string;
  version?: string;
  email?: string;
  phone?: string;
  copyright?: string;
  contactInfo?: string;
  includeTitlePage?: boolean;
}

/**
 * Renders Slate screenplay nodes into industry-standard printable HTML/CSS formatted for PDF export.
 */
export function generateScreenplayHTML(nodes: Descendant[], options: PDFExportOptions): string {
  const {
    title,
    author = 'Anonymous',
    productionHouse = '',
    draftName = 'White Draft',
    version = 'v1.0',
    email = '',
    phone = '',
    copyright = '',
    contactInfo = '',
    includeTitlePage = true,
  } = options;

  const formattedBlocks = nodes.map((node: any) => {
    const type = node.type || 'action';
    const text = (node.children || [])
      .map((c: any) => {
        let content = c.text || '';
        if (c.bold) content = `<strong>${content}</strong>`;
        if (c.italic) content = `<em>${content}</em>`;
        if (c.underline) content = `<u>${content}</u>`;
        return content;
      })
      .join('');

    switch (type) {
      case 'scene-heading':
        return `<div class="pdf-element pdf-scene-heading">${text.toUpperCase()}</div>`;
      case 'character':
        return `<div class="pdf-element pdf-character">${text.toUpperCase()}</div>`;
      case 'parenthetical':
        return `<div class="pdf-element pdf-parenthetical">${text}</div>`;
      case 'dialogue':
        return `<div class="pdf-element pdf-dialogue">${text}</div>`;
      case 'transition':
        return `<div class="pdf-element pdf-transition">${text.toUpperCase()}</div>`;
      case 'shot':
        return `<div class="pdf-element pdf-shot">${text.toUpperCase()}</div>`;
      case 'centered':
        return `<div class="pdf-element pdf-centered">${text}</div>`;
      default:
        return `<div class="pdf-element pdf-action">${text}</div>`;
    }
  });

  const contactLines = [
    email ? `Email: ${email}` : '',
    phone ? `Phone: ${phone}` : '',
    contactInfo,
  ].filter(Boolean).join('<br>');

  const titlePageHTML = includeTitlePage
    ? `<div class="pdf-page title-page">
        <div class="title-wrap">
          <h1 class="pdf-title">${title.toUpperCase()}</h1>
          <p class="pdf-byline">written by</p>
          <p class="pdf-author">${author}</p>
          ${productionHouse ? `<p class="pdf-studio">${productionHouse}</p>` : ''}
        </div>
        <div class="title-footer">
          <div class="title-footer-left">
            <p class="pdf-draft"><strong>${draftName}</strong> (${version})</p>
            <p class="pdf-date">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            ${copyright ? `<p class="pdf-copyright">${copyright}</p>` : ''}
          </div>
          ${contactLines ? `<div class="title-footer-right"><p class="pdf-contact">${contactLines}</p></div>` : ''}
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - Screenplay PDF</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap');

    @page {
      size: 8.5in 11in;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #000000;
      font-family: 'Courier Prime', 'Courier New', monospace;
      font-size: 12pt;
      line-height: 1.2;
      -webkit-print-color-adjust: exact;
    }

    .pdf-page {
      width: 8.5in;
      min-height: 11in;
      padding: 1.0in 1.0in 1.0in 1.5in;
      position: relative;
      page-break-after: always;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      margin: 0 auto 20px auto;
      background: #fff;
    }

    @media print {
      body { background: #fff; }
      .pdf-page { box-shadow: none; margin: 0; }
    }

    /* Title Page Layout */
    .title-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      padding: 3.5in 1.0in 1.0in 1.5in;
    }

    .pdf-title {
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.12em;
      margin-bottom: 24pt;
    }

    .pdf-byline {
      font-size: 12pt;
      margin-bottom: 10pt;
      font-style: italic;
    }

    .pdf-author {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 8pt;
    }

    .pdf-studio {
      font-size: 11pt;
      color: #333;
      margin-top: 6pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .title-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      text-align: left;
      font-size: 10pt;
      line-height: 1.4;
    }

    .title-footer-left {
      text-align: left;
      max-width: 55%;
    }

    .title-footer-right {
      text-align: right;
      max-width: 40%;
    }

    .pdf-draft {
      margin: 0 0 4pt 0;
    }

    .pdf-date {
      margin: 0 0 4pt 0;
      color: #555;
    }

    .pdf-copyright {
      margin: 4pt 0 0 0;
      font-size: 9pt;
      color: #666;
    }

    .pdf-contact {
      margin: 0;
      font-size: 9.5pt;
      line-height: 1.4;
    }

    /* Screenplay Formatting Standards */
    .pdf-element {
      margin-bottom: 12pt;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .pdf-scene-heading {
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 18pt;
    }

    .pdf-action {
      text-align: left;
    }

    .pdf-character {
      text-align: left;
      margin-left: 2.2in;
      text-transform: uppercase;
      margin-top: 14pt;
      margin-bottom: 0;
      font-weight: bold;
    }

    .pdf-parenthetical {
      margin-left: 1.6in;
      margin-right: 2.0in;
      margin-bottom: 0;
    }

    .pdf-dialogue {
      margin-left: 1.0in;
      margin-right: 1.5in;
      margin-bottom: 12pt;
    }

    .pdf-transition {
      text-align: right;
      text-transform: uppercase;
      margin-top: 14pt;
      margin-bottom: 14pt;
    }

    .pdf-shot {
      text-transform: uppercase;
      font-weight: bold;
      margin-top: 14pt;
    }

    .pdf-centered {
      text-align: center;
    }
  </style>
</head>
<body>
  ${titlePageHTML}
  <div class="pdf-page script-body">
    ${formattedBlocks.join('\n')}
  </div>
</body>
</html>`;
}

/**
 * Triggers PDF print window for downloading or printing industry-standard screenplay PDF.
 */
export function exportToPDF(nodes: Descendant[], options: PDFExportOptions): void {
  const html = generateScreenplayHTML(nodes, options);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up blocked! Please allow pop-ups to export screenplay PDF.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Trigger print after styles load
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
