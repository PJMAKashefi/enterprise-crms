import { TechnicalDocument, DocumentDiscipline, DocumentTypeCode } from '../types';

/**
 * Standardizes project code prefix to prevent truncation bugs.
 * 
 * Common issue explained:
 * When a user had project 'PRJ-2026-01' or 'PRJ-2026', running a naive
 * `.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5)` stripped the hyphens into 'PRJ202601'
 * and then sliced the first 5 characters: 'PRJ20' — chopping '2026' into '20'.
 * This caused 'PRJ26-PJMAK-COM-PRP-0001' to become 'PRJ20-PJMAK-COM-PRP-0001'.
 *
 * This function cleanly extracts:
 * - 'PRJ-2026-01' -> 'PRJ26' (Project 2026)
 * - 'PRJ-2026'    -> 'PRJ26'
 * - 'PRJ2026'     -> 'PRJ26'
 * - 'PRJ20'       -> 'PRJ26' (auto-recovers from the slice(0,5) bug)
 * - 'PRJ26'       -> 'PRJ26'
 * - custom codes like 'HUB4', 'KAP01' are preserved up to 8 chars.
 */
export function formatProjectCodePrefix(projectCode?: string, defaultYear = 2026): string {
  if (!projectCode || !projectCode.trim()) {
    return `PRJ${String(defaultYear).slice(-2)}`;
  }

  const raw = projectCode.trim().toUpperCase();

  // If already matches PRJ20 (from previous truncation bug), repair to PRJ26
  if (raw === 'PRJ20' || raw === 'PRJ-20') {
    return 'PRJ26';
  }

  // Check for PRJ followed by year (e.g., PRJ-2026, PRJ-2026-01, PRJ2026, PRJ26, PRJ-26)
  const prjYearMatch = raw.match(/^PRJ[-_]?(?:20)?(\d{2})/);
  if (prjYearMatch) {
    const year2Digits = prjYearMatch[1];
    return `PRJ${year2Digits}`;
  }

  // Check for generic 4-digit year embedded in project code, e.g. "OFFSHORE-2026"
  const fourDigitYearMatch = raw.match(/20(\d{2})/);
  if (fourDigitYearMatch && raw.startsWith('PRJ')) {
    return `PRJ${fourDigitYearMatch[1]}`;
  }

  // If starts with PRJ
  if (raw.startsWith('PRJ')) {
    const alphanumeric = raw.replace(/[^A-Z0-9]/g, '');
    if (alphanumeric.length >= 5 && alphanumeric.startsWith('PRJ2026')) {
      return 'PRJ26';
    }
    return alphanumeric.slice(0, 8);
  }

  // For other custom project codes (e.g. HUB4, KAP01)
  const clean = raw.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return clean || `PRJ${String(defaultYear).slice(-2)}`;
}

/**
 * Extracts sequence number from a document or document number string.
 * Supports both 3-digit (001) and 4-digit (0001) formats.
 */
export function extractDocumentSequence(docOrNumber: TechnicalDocument | string | null | undefined): number {
  if (!docOrNumber) return 0;

  if (typeof docOrNumber === 'object') {
    if (typeof docOrNumber.sequenceNumber === 'number' && docOrNumber.sequenceNumber > 0) {
      return docOrNumber.sequenceNumber;
    }
    return extractDocumentSequence(docOrNumber.documentNumber);
  }

  if (typeof docOrNumber === 'string') {
    const parts = docOrNumber.trim().split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart && /^\d+$/.test(lastPart)) {
      const parsed = parseInt(lastPart, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    // Also try regex for trailing digits
    const match = docOrNumber.match(/-(\d{1,5})$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return 0;
}

/**
 * Generates the next sequential document number.
 * Follows PJMAK & ISO/Aconex standard:
 * [PROJECT_CODE]-[ORIGINATOR]-[DISCIPLINE]-[DOC_TYPE]-[SEQUENCE_4_DIGITS]
 * e.g., PRJ26-PJMAK-COM-PRP-0001
 *       PRJ26-PJMAK-COM-PRP-0002
 */
export function getNextTechnicalDocumentNumber(params: {
  projectCode?: string;
  originator?: string;
  discipline: DocumentDiscipline | string;
  documentType: DocumentTypeCode | string;
  existingDocuments?: TechnicalDocument[];
  currentDocIdToExclude?: string;
}): { documentNumber: string; sequenceNumber: number; projectPrefix: string } {
  const projectPrefix = formatProjectCodePrefix(params.projectCode);
  const originator = (params.originator || 'PJMAK').toUpperCase();
  const discipline = (params.discipline || 'COM').toUpperCase();
  const docType = (params.documentType || 'PRP').toUpperCase();

  const existing = (params.existingDocuments || []).filter(
    (d) => d && d.id !== params.currentDocIdToExclude
  );

  // Filter matching documents for this discipline and doc type
  const matchingDocs = existing.filter((d) => {
    const matchesDiscipline = (d.discipline || '').toUpperCase() === discipline;
    const matchesType = (d.documentType || '').toUpperCase() === docType;
    const numberMatches = d.documentNumber && d.documentNumber.toUpperCase().includes(`-${discipline}-${docType}-`);
    return (matchesDiscipline && matchesType) || numberMatches;
  });

  let maxSeq = 0;
  for (const d of matchingDocs) {
    const seq = extractDocumentSequence(d);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  }

  // If there are no existing matching docs in the passed list, also check if any document in the project has sequence
  const nextSeq = maxSeq > 0 ? maxSeq + 1 : 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  const documentNumber = `${projectPrefix}-${originator}-${discipline}-${docType}-${seqStr}`;

  return {
    documentNumber,
    sequenceNumber: nextSeq,
    projectPrefix,
  };
}

export function normalizeDocumentNumber(
  docNumber?: string | null,
  newDiscipline?: DocumentDiscipline,
  newDocType?: DocumentTypeCode
): string {
  if (!docNumber || !docNumber.trim()) return '';
  let normalized = docNumber.trim();

  // Fix internal spaces between segments, e.g. "PRJ20260-PJMAK TEC-PRP-OOI" -> "PRJ20260-PJMAK-TEC-PRP-OOI"
  normalized = normalized.replace(/\s+/g, '-');

  // Repair PRJ20260 -> PRJ26
  normalized = normalized.replace(/^PRJ20260[-_]?/i, 'PRJ26-');

  // Repair PRJ2026 -> PRJ26
  normalized = normalized.replace(/^PRJ2026[-_]?/i, 'PRJ26-');

  // Repair PRJ20 -> PRJ26
  normalized = normalized.replace(/^PRJ20[-_]?/i, 'PRJ26-');

  // Repair PRJ-2026- -> PRJ26-
  normalized = normalized.replace(/^PRJ[-_]2026[-_]?/i, 'PRJ26-');

  // Repair PRJ-26- -> PRJ26-
  normalized = normalized.replace(/^PRJ[-_]26[-_]?/i, 'PRJ26-');

  // Repair OCR/typing errors at the end: OOI, OO1, etc.
  normalized = normalized.replace(/[-_]([0O]{1,3}[1-9I]|[0O]{1,4})$/i, (m) => {
    const cleanDigits = m.slice(1).replace(/O/gi, '0').replace(/I/gi, '1');
    const parsed = parseInt(cleanDigits, 10);
    const num = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    return `-${String(num).padStart(4, '0')}`;
  });

  // Ensure sequence number at the end is 4 digits (e.g. -001 -> -0001, -1 -> -0001)
  normalized = normalized.replace(/-(\d{1,3})$/, (_, seq) => {
    const parsed = parseInt(seq, 10);
    const num = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    return `-${String(num).padStart(4, '0')}`;
  });

  // If no sequence digits found at the end, append -0001
  if (!/-\d{3,5}$/.test(normalized)) {
    normalized = `${normalized}-0001`;
  }

  // Substitute discipline if requested
  if (newDiscipline) {
    const parts = normalized.split('-');
    if (parts.length >= 5) {
      // Format is PROJ-ORIG-DISC-TYPE-SEQ
      parts[2] = newDiscipline;
      if (newDocType) parts[3] = newDocType;
      normalized = parts.join('-');
    }
  }

  return normalized;
}
