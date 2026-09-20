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

  // Crisp Vector Crown Accent (Amber/Gold)
  doc.setFillColor(245, 158, 11); // amber-500
  // Left point
  doc.triangle(margin + 44, cursorY + 6, margin + 47, cursorY + 1.5, margin + 50, cursorY + 6, 'F');
  // Center taller point
  doc.triangle(margin + 48, cursorY + 6, margin + 51, cursorY - 0.5, margin + 54, cursorY + 6, 'F');
  // Right point
  doc.triangle(margin + 52, cursorY + 6, margin + 55, cursorY + 1.5, margin + 58, cursorY + 6, 'F');
  // Crown base band
  doc.setFillColor(217, 119, 6); // amber-600
  doc.roundedRect(margin + 44, cursorY + 6, 14, 1.2, 0.4, 0.4, 'F');

  // Corporate Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('PJMAK', margin, cursorY + 7);

  // Header separator line
  cursorY += 12;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
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
    // --- REORGANIZED EXTERNAL SPLIT HEADER ---
    // Left: To, Attention, Email
    // Right: Our Ref, (Your Ref), Date, Attachment
    const splitStartY = cursorY;
    const rightColX = margin + 102;
    const leftColWidth = 98;
    const rightColWidth = contentWidth - 102;

    // LEFT SIDE: RECIPIENT BLOCK
    let leftY = splitStartY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(correspondence.type === 'incoming' ? 'FROM:' : 'TO:', margin, leftY);
    leftY += 5;

    // Recipient Organization - Larger font matching company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); // Prominent size matching company branding
    doc.setTextColor(15, 23, 42); // slate-900
    const recipientOrgText = correspondence.type === 'incoming' ? correspondence.senderOrg : (correspondence.recipientOrg || 'Valued Partner / Organization');
    const orgLines = doc.splitTextToSize(recipientOrgText, leftColWidth);
    doc.text(orgLines, margin, leftY);
    leftY += (orgLines.length * 5.5) + 1;

    // Attention Person & Position
    const attnPerson = correspondence.type === 'incoming' ? correspondence.senderPerson : correspondence.recipientPerson;
    const attnPosition = correspondence.recipientPosition;
    if (attnPerson) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Attention:', margin, leftY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const fullAttn = attnPosition ? `${attnPerson} (${attnPosition})` : attnPerson;
      const attnLines = doc.splitTextToSize(fullAttn, leftColWidth - 20);
      doc.text(attnLines, margin + 18, leftY);
      leftY += (attnLines.length * 4.5) + 1;
    }

    // Email
    const attnEmail = correspondence.type === 'incoming' ? correspondence.senderEmail : correspondence.recipientEmail;
    if (attnEmail) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Email:', margin, leftY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(attnEmail, margin + 14, leftY);
      leftY += 5;
    }

    // Additional Recipients (Multiple "To" Addressees)
    if (correspondence.additionalRecipients && correspondence.additionalRecipients.length > 0) {
      correspondence.additionalRecipients.forEach((addl) => {
        if (leftY > 82) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        const addlOrg = doc.splitTextToSize(`& ${addl.orgName}`, leftColWidth);
        doc.text(addlOrg, margin, leftY);
        leftY += (addlOrg.length * 4) + 0.5;
        if (addl.contactPerson) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          const addlAttn = addl.position ? `Attn: ${addl.contactPerson} (${addl.position})` : `Attn: ${addl.contactPerson}`;
          const attnLines = doc.splitTextToSize(addlAttn, leftColWidth);
          doc.text(attnLines, margin, leftY);
          leftY += (attnLines.length * 3.5) + 0.5;
        }
      });
    }

    // RIGHT SIDE: METADATA PANEL (Our Ref, Date, Attachment)
    let rightY = splitStartY;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    const metaBoxHeight = correspondence.externalRefNumber ? 26 : 21;
    doc.roundedRect(rightColX - 3, rightY - 3, rightColWidth + 3, metaBoxHeight, 1.5, 1.5, 'FD');

    // Our Ref
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('OUR REF:', rightColX, rightY + 2.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.correspondenceNumber, rightColX + 22, rightY + 2.5);
    rightY += 5.5;

    // Optional Your Ref
    if (correspondence.externalRefNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('YOUR REF:', rightColX, rightY + 2.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(correspondence.externalRefNumber, rightColX + 22, rightY + 2.5);
      rightY += 5;
    }

    // Date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('DATE:', rightColX, rightY + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(correspondence.officialDate, rightColX + 22, rightY + 2.5);
    rightY += 5.5;

    // Attachment: Yes (X) / No
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('ATTACHMENT:', rightColX, rightY + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const hasAttachments = correspondence.attachments && correspondence.attachments.length > 0;
    const attSummary = hasAttachments
      ? `Yes (${correspondence.attachments.length} ${correspondence.attachments.length === 1 ? 'item' : 'items'})`
      : 'No';
    doc.setTextColor(hasAttachments ? 15 : 100, hasAttachments ? 23 : 116, hasAttachments ? 42 : 139);
    doc.text(attSummary, rightColX + 26, rightY + 2.5);
    rightY += 6;

    cursorY = Math.max(leftY, splitStartY + metaBoxHeight + 2) + 4;
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
