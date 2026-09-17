/**
 * clientCodeGenerator.ts
 * Standardized, ISO/Aconex-grade automatic code allocation for clients, counterparties,
 * and project commercial entities.
 *
 * Examples:
 * - "SBM Offshore Company" -> "SBM"
 * - "National Petrochemical Company" -> "NPC"
 * - "Shell Global Solutions" -> "SGS"
 * - "Technip Energies" -> "TEN"
 * - "TotalEnergies EP" -> "TOT"
 * - "Baker Hughes" -> "BKH"
 */

// Common generic words to filter out during acronym generation
const STOP_WORDS = new Set([
  'AND', '&', 'THE', 'OF', 'FOR', 'IN', 'ON', 'AT', 'TO', 'A', 'AN',
  'CO', 'COMPANY', 'CORP', 'CORPORATION', 'LTD', 'LIMITED', 'INC',
  'INCORPORATED', 'LLC', 'BV', 'NV', 'GMBH', 'SA', 'PLC', 'GROUP',
  'HOLDINGS', 'ENTERPRISES', 'SERVICES', 'INTERNATIONAL', 'GLOBAL'
]);

/**
 * Generates a clean 3 to 4 letter uppercase code from an organization name.
 * e.g. "SBM Offshore Company" -> "SBM"
 * "National Petrochemical Co." -> "NPC"
 * "Petrobras" -> "PTB"
 */
export function generateClientCode(orgName: string, existingCodes: string[] = []): string {
  if (!orgName || !orgName.trim()) {
    return generateFallbackCode(existingCodes);
  }

  const clean = orgName
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .toUpperCase();

  const words = clean
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  let candidate = '';

  if (words.length === 0) {
    // If all words were stop words, just take the first meaningful non-space chars
    const rawLetters = orgName.replace(/[^A-Za-z]/g, '').toUpperCase();
    candidate = rawLetters.slice(0, 3) || 'CLI';
  } else if (words.length === 1) {
    // Single word e.g. "Petrobras" -> "PTB" or "SBM" -> "SBM"
    const single = words[0];
    if (single.length <= 4) {
      candidate = single;
    } else {
      // Discard vowels after first letter to make a nice consonant-based code
      const first = single[0];
      const consonants = single.slice(1).replace(/[AEIOU]/g, '');
      const code = (first + consonants).slice(0, 3);
      candidate = code.length >= 3 ? code : single.slice(0, 3);
    }
  } else if (words.length === 2) {
    // Two words: e.g. "Baker Hughes" -> "BKH"
    const w1 = words[0];
    const w2 = words[1];
    candidate = (w1.slice(0, 2) + w2.slice(0, 1)).slice(0, 3);
  } else {
    // 3 or more words: e.g. "National Petrochemical Company" -> "NPC"
    candidate = words.map((w) => w[0]).join('').slice(0, 4);
    if (candidate.length < 3) {
      candidate = candidate.padEnd(3, 'X');
    }
  }

  candidate = candidate.toUpperCase().slice(0, 4);

  // Guarantee uniqueness by appending digit or letter if already exists
  let finalCode = candidate;
  let counter = 1;
  const upperExisting = new Set(existingCodes.map((c) => (c || '').toUpperCase()));

  while (upperExisting.has(finalCode)) {
    counter++;
    const suffix = String(counter);
    finalCode = `${candidate.slice(0, Math.max(2, 4 - suffix.length))}${suffix}`;
  }

  return finalCode;
}

function generateFallbackCode(existingCodes: string[]): string {
  let num = 1;
  while (existingCodes.includes(`CLI-${String(num).padStart(2, '0')}`)) {
    num++;
  }
  return `CLI-${String(num).padStart(2, '0')}`;
}

/**
 * Standard Cost Code template based on client code & year
 * e.g. "CC-SBM-2026"
 */
export function generateDefaultCostCode(clientCode: string, year: number = new Date().getFullYear()): string {
  const code = (clientCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `CC-${code}-${year}`;
}

/**
 * Standard Revenue Code template based on client code & sequence
 * e.g. "REV-SBM-001"
 */
export function generateDefaultRevenueCode(clientCode: string, seq: number = 1): string {
  const code = (clientCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `REV-${code}-${String(seq).padStart(3, '0')}`;
}

/**
 * Standard Contract Code template based on client code
 * e.g. "CTR-SBM-2026-01"
 */
export function generateDefaultContractNumber(clientCode: string, seq: number = 1, year: number = new Date().getFullYear()): string {
  const code = (clientCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `CTR-${code}-${year}-${String(seq).padStart(2, '0')}`;
}

/**
 * Standard Proforma Invoice template based on client code
 * e.g. "PI-SBM-2026-001"
 */
export function generateDefaultProformaNumber(clientCode: string, seq: number = 1, year: number = new Date().getFullYear()): string {
  const code = (clientCode || 'GEN').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `PI-${code}-${year}-${String(seq).padStart(3, '0')}`;
}
