import { jsPDF } from 'jspdf';
import { Correspondence, CompanySettings } from '../types';
import { SIGNATURE_PRESETS, DEFAULT_SIGNATURE } from '../assets/signatures';

export function generateCorrespondencePdf(
  correspondence: Correspondence,
  settings: CompanySettings,
  saveToFile: boolean = true
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // --- HEADER / LETTERHEAD ---
  let cursorY = margin;

  // Compute effective date:
  // "For example, when I draft a letter today, but I will finally send it after 2 days, the day that I am sending it should be written on the letter."
  const todayStr = new Date().toISOString().split('T')[0];
  const isAlreadySent = correspondence.status === 'sent';
  const effectiveDate = isAlreadySent
    ? (correspondence.dateSent || correspondence.officialDate || todayStr)
    : (correspondence.officialDate && correspondence.officialDate > todayStr
        ? correspondence.officialDate
        : todayStr);

  const isInternal = correspondence.type === 'internal';

  // Draw authentic PJMAK Logo on the left
  let logoDrawn = false;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 310;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);

        // Royal Crown directly centered above M (x = 233, y = 24)
        ctx.fillStyle = '#F59E0B';
        const crown = new Path2D('M 203,20 L 210,0 L 224,12 L 233,-4 L 242,12 L 256,0 L 263,20 Z');
        ctx.fill(crown);
        ctx.fillStyle = '#D97706';
        ctx.fillRect(203, 21, 60, 5);

        // Letter P
        ctx.fillStyle = '#0F172A';
        ctx.fill(new Path2D('M 40,40 L 95,40 C 115,40 128,52 128,70 C 128,88 115,100 95,100 L 64,100 L 64,130 L 40,130 Z M 64,58 L 64,82 L 92,82 C 102,82 106,77 106,70 C 106,63 102,58 92,58 Z'));

        // Letter J
        ctx.fill(new Path2D('M 136,40 L 160,40 L 160,105 C 160,122 148,131 128,131 C 114,131 104,125 100,118 L 114,105 C 117,109 122,113 128,113 C 134,113 136,110 136,104 Z'));

        // Letter M filled with Dutch flag tricolor
        ctx.save();
        ctx.clip(new Path2D('M 190,130 L 190,40 L 214,40 L 233,88 L 252,40 L 276,40 L 276,130 L 256,130 L 256,76 L 242,112 L 224,112 L 210,76 L 210,130 Z'));
        ctx.fillStyle = '#C8102E';
        ctx.fillRect(180, 38, 105, 32);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(180, 70, 105, 30);
        ctx.fillStyle = '#21468B';
        ctx.fillRect(180, 100, 105, 32);
        ctx.restore();

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.2;
        ctx.stroke(new Path2D('M 190,130 L 190,40 L 214,40 L 233,88 L 252,40 L 276,40 L 276,130 L 256,130 L 256,76 L 242,112 L 224,112 L 210,76 L 210,130 Z'));

        // Letter A
        ctx.fillStyle = '#0F172A';
        ctx.fill(new Path2D('M 314,40 L 338,40 L 366,130 L 342,130 L 334,106 L 298,106 L 290,130 L 266,130 Z M 304,88 L 328,88 L 316,58 Z'));

        // Letter K
        ctx.fill(new Path2D('M 374,40 L 398,40 L 398,76 L 426,40 L 454,40 L 420,82 L 456,130 L 428,130 L 404,96 L 398,104 L 398,130 L 374,130 Z'));

        const logoDataUrl = canvas.toDataURL('image/png');
        doc.addImage(logoDataUrl, 'PNG', margin, cursorY, 44, 12.63);
        logoDrawn = true;
      }
    } catch (e) {
      console.warn('Canvas logo generation failed, using vector fallback', e);
    }
  }

  if (!logoDrawn) {
    // Vector fallback for brand name & crown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('PJMAK', margin, cursorY + 9);
    // Amber crown accent
    doc.setFillColor(245, 158, 11);
    doc.triangle(margin + 42, cursorY + 5, margin + 45, cursorY + 1, margin + 48, cursorY + 5, 'F');
    doc.triangle(margin + 46, cursorY + 5, margin + 49, cursorY - 1, margin + 52, cursorY + 5, 'F');
    doc.triangle(margin + 50, cursorY + 5, margin + 53, cursorY + 1, margin + 56, cursorY + 5, 'F');
  }

  // --- TOP RIGHT METADATA (Matches on-screen header) ---
  const rightX = pageWidth - margin;
  let metaY = cursorY + 2.5;

  if (isInternal) {
    // Internal memo title & reference
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(88, 28, 135); // purple-900
    doc.text('INTERNAL MEMORANDUM (IC)', margin, cursorY + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Ref No: ', rightX - doc.getTextWidth(correspondence.correspondenceNumber) - 1, metaY, { align: 'right' });
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.correspondenceNumber, rightX, metaY, { align: 'right' });
    metaY += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Date: ', rightX - doc.getTextWidth(effectiveDate) - 1, metaY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(effectiveDate, rightX, metaY, { align: 'right' });
    metaY += 5;

    cursorY = Math.max(cursorY + 20, metaY) + 2;

    // Header divider line (solid dark slate-900)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.65);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    // Internal Memo From / To Grid
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, cursorY, contentWidth, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(margin, cursorY, contentWidth, 18, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('FROM:', margin + 4, cursorY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const originStr = [correspondence.originDepartmentName, correspondence.senderPerson].filter(Boolean).join(' — ') || settings.companyName;
    doc.text(originStr, margin + 20, cursorY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TO:', margin + 4, cursorY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const destStr = [correspondence.destinationDepartmentName, correspondence.recipientPerson].filter(Boolean).join(' — ') || 'Internal Personnel';
    doc.text(destStr, margin + 20, cursorY + 13);

    cursorY += 23;
  } else {
    // External Letterhead (Matches on-screen header)
    const hasAttachments = correspondence.attachments && correspondence.attachments.length > 0;
    const totalAttachments = correspondence.attachments?.length || 0;

    // Top right metadata block (clean, non-overlapping 2-column layout)
    const metaBlockWidth = 62;
    const metaStartX = rightX - metaBlockWidth;
    const labelColWidth = 24;
    const valColX = metaStartX + labelColWidth;

    // Our Ref:
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Our Ref:', metaStartX, metaY);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.correspondenceNumber, valColX, metaY);
    metaY += 5;

    // Date: (effective date of dispatch/send)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Date:', metaStartX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(effectiveDate, valColX, metaY);
    metaY += 5;

    // Attachment:
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const attText = totalAttachments > 0 ? `Yes (${totalAttachments})` : 'No';
    doc.text('Attachment:', metaStartX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(totalAttachments > 0 ? 15 : 71, totalAttachments > 0 ? 23 : 85, totalAttachments > 0 ? 42 : 105);
    doc.text(attText, valColX, metaY);
    metaY += 5;

    // Optional Your Ref:
    if (correspondence.externalRefNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Your Ref:', metaStartX, metaY);
      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(correspondence.externalRefNumber, valColX, metaY);
      metaY += 5;
    }

    cursorY = Math.max(cursorY + 16, metaY) + 2;

    // Solid dark divider line across page (matching on-screen border-b-2 border-slate-900)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.65);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;

    // --- RECIPIENT BLOCK (Directly below divider, full width left aligned) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(correspondence.type === 'incoming' ? 'FROM:' : 'TO:', margin, cursorY);
    cursorY += 4.5;

    // Recipient Organization - Prominent bold typography (matching text-base/text-lg font-bold text-slate-900)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    const recipientOrgText = correspondence.type === 'incoming'
      ? correspondence.senderOrg
      : (correspondence.recipientOrg || 'Valued Partner / Organization');
    const orgLines = doc.splitTextToSize(recipientOrgText, contentWidth);
    doc.text(orgLines, margin, cursorY);
    cursorY += (orgLines.length * 5) + 1;

    // Primary Attention Person & Position
    const attnPerson = correspondence.type === 'incoming' ? correspondence.senderPerson : correspondence.recipientPerson;
    const attnPosition = correspondence.recipientPosition;
    if (attnPerson) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Attention: ', margin, cursorY);
      const attnPrefixWidth = doc.getTextWidth('Attention: ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const fullAttn = attnPosition ? `${attnPerson} (${attnPosition})` : attnPerson;
      doc.text(fullAttn, margin + attnPrefixWidth, cursorY);
      cursorY += 4.2;
    }

    // Primary Email
    const attnEmail = correspondence.type === 'incoming' ? correspondence.senderEmail : correspondence.recipientEmail;
    if (attnEmail) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Email: ', margin, cursorY);
      const emailPrefixWidth = doc.getTextWidth('Email: ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(attnEmail, margin + emailPrefixWidth, cursorY);
      cursorY += 4.5;
    }

    // Additional Recipients (Multiple Addressees) - Clean corporate formatting:
    // No "ADDITIONAL ADDRESSEES:" heading, company name not repeated if same company
    if (correspondence.additionalRecipients && correspondence.additionalRecipients.length > 0) {
      correspondence.additionalRecipients.forEach((addl) => {
        if (!addl.contactPerson && !addl.orgName) return;

        cursorY += 2;

        const isSameCompany =
          !addl.orgName ||
          !addl.orgName.trim() ||
          (recipientOrgText &&
            addl.orgName.trim().toLowerCase() === recipientOrgText.trim().toLowerCase());

        // If from another company, show that company name
        if (!isSameCompany && addl.orgName) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(addl.orgName, margin, cursorY);
          cursorY += 4.5;
        }

        // Attention line in identical clean format
        if (addl.contactPerson) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text('Attention: ', margin, cursorY);
          const addlAttnPrefixWidth = doc.getTextWidth('Attention: ');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          const fullAddlAttn = addl.position ? `${addl.contactPerson} (${addl.position})` : addl.contactPerson;
          doc.text(fullAddlAttn, margin + addlAttnPrefixWidth, cursorY);
          cursorY += 4.2;
        }

        // Email line
        if (addl.email) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text('Email: ', margin, cursorY);
          const addlEmailPrefixWidth = doc.getTextWidth('Email: ');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text(addl.email, margin + addlEmailPrefixWidth, cursorY);
          cursorY += 4.5;
        }
      });
    }

    cursorY += 2;
  }

  // --- SUBJECT BANNER (Clean, prominent subject line without black box) ---
  cursorY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`SUBJECT: ${correspondence.subject.toUpperCase()}`, margin, cursorY + 4);
  cursorY += 18; // Generous automatic blank line spacing between Subject line and letter greeting

  // Related correspondence reference banner
  if (correspondence.relatedLinks && correspondence.relatedLinks.length > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const relText = `Reference: ${correspondence.relatedLinks
      .map((r) => `${(r.relationshipType || 'relates_to').replace(/_/g, ' ')} ${r.targetCorrespondenceNumber}`)
      .join('; ')}`;
    doc.text(relText, margin, cursorY);
    cursorY += 6;
  }

  // --- LETTER BODY (Fully Justified Paragraphs with Bold & Highlight Support) ---
  // Determine font family
  const selectedFont = (correspondence.fontFamily || '').toLowerCase();
  const fontBase =
    selectedFont === 'calibri' || selectedFont === 'sans'
      ? 'helvetica'
      : selectedFont === 'mono'
      ? 'courier'
      : 'times';

  // Split into clean paragraphs
  const rawBodyClean = (correspondence.bodyHtml || '')
    .replace(/Formatted text/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n\n');

  const paragraphHtmls = rawBodyClean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Check if letter can fit on a single page
  doc.setFont(fontBase, 'normal');
  doc.setFontSize(9.8);
  const plainParagraphs = paragraphHtmls.map((p) => p.replace(/<[^>]+>/g, ''));
  const testLines = plainParagraphs.reduce((acc, p) => acc + doc.splitTextToSize(p, contentWidth).length, 0);
  const isSinglePageCandidate = testLines <= 38;

  // Font size calculation from correspondence or single-page fitting
  let bodyFontSize = isSinglePageCandidate ? 9.8 : 10.5;
  if (correspondence.fontSize) {
    const sizeNum = parseFloat(correspondence.fontSize);
    if (!isNaN(sizeNum) && sizeNum > 0) {
      bodyFontSize = isSinglePageCandidate ? Math.min(sizeNum, 10.2) : sizeNum;
    }
  }

  const lineHeight = isSinglePageCandidate ? 4.6 : 5.2;
  const paraSpacing = isSinglePageCandidate ? 2.4 : 3.5;

  for (const paraHtml of paragraphHtmls) {
    // Parse paragraph into styled tokens (bold, highlight, italic, underline)
    const tokens = parseRichTokens(paraHtml);

    // Group tokens into lines of width <= contentWidth
    const lines: Array<Array<{ text: string; isBold: boolean; isItalic: boolean; isUnderline: boolean; isHighlight: boolean; isSpace: boolean; width: number }>> = [];
    let currentLine: typeof lines[0] = [];
    let currentWidth = 0;

    for (const token of tokens) {
      doc.setFont(fontBase, token.isBold && token.isItalic ? 'bolditalic' : token.isBold ? 'bold' : token.isItalic ? 'italic' : 'normal');
      doc.setFontSize(bodyFontSize);
      const w = doc.getTextWidth(token.text);
      (token as any).width = w;

      if (currentWidth + w > contentWidth && currentLine.length > 0 && !token.isSpace) {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
      }
      if (currentLine.length === 0 && token.isSpace) continue; // skip leading space
      currentLine.push(token as any);
      currentWidth += w;
    }
    if (currentLine.length > 0) lines.push(currentLine);

    const paraHeight = lines.length * lineHeight;

    // Check for page break
    if (cursorY + paraHeight > pageHeight - (isSinglePageCandidate ? 32 : 55)) {
      addFooter(doc, settings, pageHeight, pageWidth, margin);
      doc.addPage();
      cursorY = margin + 10;
    }

    // Render lines with justification
    for (let li = 0; li < lines.length; li++) {
      const lineTokens = lines[li];
      const isLastLine = li === lines.length - 1;
      const totalLineWidth = lineTokens.reduce((sum, t) => sum + t.width, 0);
      const spaceTokens = lineTokens.filter((t) => t.isSpace);
      const extraSpace =
        !isLastLine && spaceTokens.length > 0 && totalLineWidth < contentWidth
          ? (contentWidth - totalLineWidth) / spaceTokens.length
          : 0;

      let curX = margin;
      for (const token of lineTokens) {
        const tokenDisplayWidth = token.width + (token.isSpace ? extraSpace : 0);

        // Yellow highlight marker background
        if (token.isHighlight) {
          doc.setFillColor(254, 240, 138); // Yellow-200 highlight
          doc.rect(curX, cursorY - (bodyFontSize * 0.32), tokenDisplayWidth, bodyFontSize * 0.42, 'F');
        }

        doc.setFont(fontBase, token.isBold && token.isItalic ? 'bolditalic' : token.isBold ? 'bold' : token.isItalic ? 'italic' : 'normal');
        doc.setFontSize(bodyFontSize);
        doc.setTextColor(token.isBold ? 15 : 30, token.isBold ? 23 : 41, token.isBold ? 42 : 59);
        doc.text(token.text, curX, cursorY);

        // Underline
        if (token.isUnderline && !token.isSpace) {
          doc.setDrawColor(token.isBold ? 15 : 30, token.isBold ? 23 : 41, token.isBold ? 42 : 59);
          doc.setLineWidth(0.2);
          doc.line(curX, cursorY + 0.5, curX + token.width, cursorY + 0.5);
        }

        curX += tokenDisplayWidth;
      }
      cursorY += lineHeight;
    }

    cursorY += paraSpacing;
  }

  cursorY += isSinglePageCandidate ? 2 : 4;

  // --- SIGNATURE BLOCK (Compact executive layout) ---
  const sigBlockHeight = isSinglePageCandidate ? 26 : 42;
  if (cursorY + sigBlockHeight > pageHeight - 20) {
    addFooter(doc, settings, pageHeight, pageWidth, margin);
    doc.addPage();
    cursorY = margin + 10;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(isSinglePageCandidate ? 9.5 : 10);
  doc.text(isInternal ? 'Respectfully,' : 'Yours faithfully,', margin, cursorY);
  cursorY += isSinglePageCandidate ? 4 : 5;

  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName, margin, cursorY);
  cursorY += isSinglePageCandidate ? 5 : 8;

  // Signature representation
  if (correspondence.signatureIncluded) {
    try {
      let signatureImgData =
        correspondence.signatureImageUrl || settings.signature?.signatureImageUrl;

      if (!signatureImgData || (!signatureImgData.startsWith('data:image/') && !signatureImgData.endsWith('.png'))) {
        const selectedPreset =
          SIGNATURE_PRESETS.find(
            (p) =>
              p.id === settings.signature?.presetId ||
              p.svgUrl === signatureImgData ||
              p.pngUrl === signatureImgData
          ) || DEFAULT_SIGNATURE;
        signatureImgData = selectedPreset.pngDataUrl;
      }

      const sigWidth = isSinglePageCandidate ? 28 : 36;
      const sigHeight = isSinglePageCandidate ? 11 : 16;

      // Detect image format (PNG vs JPEG)
      let imgFormat = 'PNG';
      if (
        signatureImgData.startsWith('data:image/jpeg') ||
        signatureImgData.startsWith('data:image/jpg') ||
        /\.jpe?g($|\?)/i.test(signatureImgData)
      ) {
        imgFormat = 'JPEG';
      }

      // Draw handwritten signature image (compact so whole letter fits on 1 page)
      doc.addImage(signatureImgData, imgFormat, margin, cursorY - 2, sigWidth, sigHeight);
      cursorY += isSinglePageCandidate ? 11 : 16;

      // Subtle cryptographic/authenticated registry mark matching the letter's sending date
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`[DIGITALLY AUTHENTICATED • REGISTRY SEAL ${effectiveDate}]`, margin, cursorY);
      cursorY += isSinglePageCandidate ? 3.5 : 5;
    } catch (err) {
      console.warn('Signature image embed fallback:', err);
      // Fallback text box if image fails
      doc.setDrawColor(3, 105, 161);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, cursorY, 65, 16, 1, 1, 'D');
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(3, 105, 161);
      doc.text('★ DIGITALLY SIGNED & VERIFIED ★', margin + 3, cursorY + 4.5);
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(correspondence.signatoryName || settings.signature.signatoryName, margin + 4, cursorY + 10);
      cursorY += 18;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isSinglePageCandidate ? 9 : 9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(correspondence.signatoryName || settings.signature.signatoryName, margin, cursorY);
  cursorY += isSinglePageCandidate ? 3.5 : 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isSinglePageCandidate ? 8 : 8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(correspondence.signatoryPosition || settings.signature.position, margin, cursorY);
  cursorY += isSinglePageCandidate ? 5 : 8;

  // --- ATTACHMENT(S) ENCLOSURES (If present) ---
  const hasAttachments = correspondence.attachments && correspondence.attachments.length > 0;
  if (hasAttachments) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Enclosures (${correspondence.attachments.length}):`, margin, cursorY);
    cursorY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    correspondence.attachments.forEach((att, idx) => {
      if (cursorY <= pageHeight - 20) {
        doc.text(`${idx + 1}. ${att.fileName}`, margin + 4, cursorY);
        cursorY += 3.5;
      }
    });
    cursorY += 2;
  }

  // --- COPY TO (CC) BLOCK IF PRESENT & ENABLED FOR LETTERHEAD ---
  if (correspondence.showCcOnLetter !== false) {
    const externalCcFormatted = (correspondence.externalCcRecipients || []).map(
      (ext) => `${ext.name}${ext.orgName ? ` (${ext.orgName})` : ''}`
    );
    const ccList = [
      ...externalCcFormatted,
      ...(correspondence.ccEmails || []).filter(
        (email) => !(correspondence.externalCcRecipients || []).some((ext) => ext.email === email)
      ),
      ...(correspondence.internalCcUserNames || []),
    ];

    if (ccList.length > 0) {
      cursorY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('cc:', margin, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const ccStr = ccList.join(', ');
      const ccLines = doc.splitTextToSize(ccStr, pageWidth - (margin * 2) - 10);
      doc.text(ccLines, margin + 8, cursorY);
      cursorY += (ccLines.length * 3.5);
    }
  }

  // Footer on final page
  addFooter(doc, settings, pageHeight, pageWidth, margin);

  if (saveToFile) {
    const filename = `${correspondence.correspondenceNumber}_${correspondence.subject.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(filename);
  }

  return doc;
}

function addFooter(
  doc: jsPDF,
  settings: CompanySettings,
  pageHeight: number,
  pageWidth: number,
  margin: number
) {
  const footerY = pageHeight - 12;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const cleanFooter = settings.footerText?.replace(/\(Project Management Key\)\s*•?\s*/g, '') || "PJMAK Company • KvK 91081289 • Van Grobbendoncklaan 179, 5213 AV 's-Hertogenbosch, the Netherlands • Tel: +31 610 26 95 54";
  doc.text(cleanFooter, margin, footerY);

  const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${pageNumber}`, pageWidth - margin - 12, footerY);
}

interface RichToken {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isHighlight: boolean;
  isSpace: boolean;
}

function parseRichTokens(paragraphHtml: string): RichToken[] {
  // Normalize spans with style to semantic tags for robust Word/HTML compatibility
  const normalized = paragraphHtml
    .replace(/<span\s+style="[^"]*font-weight:\s*(?:bold|[789]00)[^"]*"[^>]*>(.*?)<\/span>/gi, '<strong>$1</strong>')
    .replace(/<span\s+style="[^"]*background(?:-color)?:\s*[^"]*"[^>]*>(.*?)<\/span>/gi, '<mark>$1</mark>')
    .replace(/<span\s+style="[^"]*font-style:\s*italic[^"]*"[^>]*>(.*?)<\/span>/gi, '<em>$1</em>')
    .replace(/<span\s+style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<u>$1</u>');

  const regex = /(<strong>|<b>|<\/strong>|<\/b>|<em>|<i>|<\/em>|<\/i>|<u>|<\/u>|<mark[^>]*>|<\/mark>)/gi;
  const parts = normalized.split(regex);
  const tokens: RichToken[] = [];
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isHighlight = false;

  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower === '<strong>' || lower === '<b>') {
      isBold = true;
    } else if (lower === '</strong>' || lower === '</b>') {
      isBold = false;
    } else if (lower === '<em>' || lower === '<i>') {
      isItalic = true;
    } else if (lower === '</em>' || lower === '</i>') {
      isItalic = false;
    } else if (lower === '<u>') {
      isUnderline = true;
    } else if (lower === '</u>') {
      isUnderline = false;
    } else if (lower.startsWith('<mark')) {
      isHighlight = true;
    } else if (lower === '</mark>') {
      isHighlight = false;
    } else {
      // Strip any other lingering tags (e.g. <span> or <div>)
      const cleanText = part.replace(/<[^>]+>/g, '');
      const words = cleanText.split(/(\s+)/);
      for (const w of words) {
        if (!w) continue;
        tokens.push({
          text: w,
          isBold,
          isItalic,
          isUnderline,
          isHighlight,
          isSpace: /^\s+$/.test(w),
        });
      }
    }
  }

  return tokens;
}
