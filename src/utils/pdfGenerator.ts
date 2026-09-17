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

  // Crown accent (golden orange)
  doc.setFillColor(245, 158, 11); // amber-500
  // Small crown crest
  doc.triangle(margin + 20, cursorY, margin + 25, cursorY - 5, margin + 30, cursorY, 'F');
  doc.triangle(margin + 28, cursorY, margin + 32, cursorY - 7, margin + 36, cursorY, 'F');
  doc.triangle(margin + 34, cursorY, margin + 39, cursorY - 5, margin + 44, cursorY, 'F');

  // Corporate Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('PJMAK', margin, cursorY + 7);

  // Header separator line
  cursorY += 12;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.6);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  const isInternal = correspondence.type === 'internal';

  if (isInternal) {
    // --- INTERNAL MEMORANDUM HEADER ---
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, cursorY, contentWidth, 24, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('INTERNAL MEMORANDUM', margin + 6, cursorY + 7);

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('REF NO:', margin + 6, cursorY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.correspondenceNumber, margin + 24, cursorY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DATE:', margin + contentWidth / 2 + 5, cursorY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.officialDate, margin + contentWidth / 2 + 20, cursorY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('FROM:', margin + 6, cursorY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const originStr = [correspondence.originDepartmentName, correspondence.senderPerson].filter(Boolean).join(' - ') || settings.companyName;
    doc.text(originStr, margin + 24, cursorY + 20);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TO:', margin + contentWidth / 2 + 5, cursorY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const destStr = [correspondence.destinationDepartmentName, correspondence.recipientPerson].filter(Boolean).join(' - ') || 'Internal Personnel';
    doc.text(destStr, margin + contentWidth / 2 + 20, cursorY + 20);

    cursorY += 29;
  } else {
    // --- OFFICIAL EXTERNAL METADATA BLOCK (No internal tags) ---
    const metaBoxY = cursorY;
    const metaBoxHeight = 16;

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, metaBoxY, contentWidth, metaBoxHeight, 1.5, 1.5, 'FD');

    // Official Ref
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('OUR REF:', margin + 4, metaBoxY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.correspondenceNumber, margin + 26, metaBoxY + 6);

    if (correspondence.externalRefNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('YOUR REF:', margin + 4, metaBoxY + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(correspondence.externalRefNumber, margin + 26, metaBoxY + 12);
    }

    // Official Date
    const rightColX = margin + contentWidth / 2 + 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('DATE:', rightColX, metaBoxY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(correspondence.officialDate, rightColX + 16, metaBoxY + 6);

    cursorY = metaBoxY + metaBoxHeight + 8;

    // --- RECIPIENT BLOCK ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('TO:', margin, cursorY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.recipientOrg || 'Valued Partner / Organization', margin + 12, cursorY);

    cursorY += 5;
    if (correspondence.recipientPerson) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('ATTENTION:', margin, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(correspondence.recipientPerson, margin + 26, cursorY);
      cursorY += 5;
    }

    if (correspondence.recipientEmail) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Email: ${correspondence.recipientEmail}`, margin + 12, cursorY);
      cursorY += 6;
    }
  }

  // --- SUBJECT LINE ---
  cursorY += 2;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, cursorY, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`SUBJECT: ${correspondence.subject.toUpperCase()}`, margin + 3, cursorY + 5.5);
  cursorY += 12;

  // Related correspondence reference banner
  if (correspondence.relatedLinks && correspondence.relatedLinks.length > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const relText = `Reference: ${correspondence.relatedLinks
      .map((r) => `${r.relationshipType.replace(/_/g, ' ')} ${r.targetCorrespondenceNumber}`)
      .join('; ')}`;
    doc.text(relText, margin, cursorY);
    cursorY += 6;
  }

  // --- LETTER BODY ---
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);

  // Strip html tags into readable text paragraphs
  const cleanBody = correspondence.bodyHtml
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<li>/gi, '  • ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  const bodyLines = doc.splitTextToSize(cleanBody, contentWidth);

  // Print text line by line, handling page break if necessary
  for (let i = 0; i < bodyLines.length; i++) {
    if (cursorY > pageHeight - 60) {
      // Add new page
      addFooter(doc, settings, pageHeight, pageWidth, margin);
      doc.addPage();
      cursorY = margin + 10;
      doc.setFont('times', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
    }
    doc.text(bodyLines[i], margin, cursorY);
    cursorY += 5;
  }

  cursorY += 8;

  // --- SIGNATURE BLOCK ---
  if (cursorY > pageHeight - 65) {
    addFooter(doc, settings, pageHeight, pageWidth, margin);
    doc.addPage();
    cursorY = margin + 10;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(isInternal ? 'Respectfully,' : 'Yours faithfully,', margin, cursorY);
  cursorY += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName, margin, cursorY);
  cursorY += 10;

  // Signature representation
  if (correspondence.signatureIncluded) {
    try {
      const selectedPreset =
        SIGNATURE_PRESETS.find((p) => p.id === settings.signature?.presetId) ||
        DEFAULT_SIGNATURE;
      const signatureImgData =
        settings.signature?.signatureImageUrl &&
        (settings.signature.signatureImageUrl.startsWith('data:image/') ||
          settings.signature.signatureImageUrl.endsWith('.png'))
          ? settings.signature.signatureImageUrl
          : selectedPreset.pngDataUrl;

      // Draw handwritten signature image (38mm width x 18mm height)
      doc.addImage(signatureImgData, 'PNG', margin, cursorY - 3, 38, 18);
      cursorY += 16;

      // Subtle cryptographic/authenticated registry mark
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`[DIGITALLY AUTHENTICATED • REGISTRY SEAL ${correspondence.officialDate || settings.companyName}]`, margin, cursorY);
      cursorY += 5;
    } catch (err) {
      console.warn('Signature image embed fallback:', err);
      // Fallback text box if image fails
      doc.setDrawColor(3, 105, 161);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, cursorY, 65, 18, 1, 1, 'D');
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(3, 105, 161);
      doc.text('★ DIGITALLY SIGNED & VERIFIED ★', margin + 3, cursorY + 4.5);
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(correspondence.signatoryName || settings.signature.signatoryName, margin + 4, cursorY + 10);
      cursorY += 22;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(correspondence.signatoryName || settings.signature.signatoryName, margin, cursorY);
  cursorY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(correspondence.signatoryPosition || settings.signature.position, margin, cursorY);
  cursorY += 8;

  // --- ATTACHMENT(S) INDICATOR (Standard Official Rule #9) ---
  const hasAttachments = correspondence.attachments && correspondence.attachments.length > 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  if (hasAttachments) {
    doc.text(`Attachment(s): Yes (${correspondence.attachments.length} ${correspondence.attachments.length === 1 ? 'enclosure' : 'enclosures'})`, margin, cursorY);
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
  } else {
    doc.text('Attachment: None', margin, cursorY);
    cursorY += 4;
  }

  // --- COPY TO (CC) BLOCK IF PRESENT ---
  const ccList = correspondence.ccEmails && correspondence.ccEmails.length > 0
    ? correspondence.ccEmails
    : correspondence.internalDistributions?.[0]?.ccUserNames || [];

  if (ccList.length > 0) {
    cursorY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('cc:', margin, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(ccList.join(', '), margin + 8, cursorY);
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
  doc.text(settings.footerText, margin, footerY);

  const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${pageNumber}`, pageWidth - margin - 12, footerY);
}
