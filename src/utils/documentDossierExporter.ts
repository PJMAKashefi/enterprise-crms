import { jsPDF } from 'jspdf';
import { TechnicalDocument, FrontPageConfig, User } from '../types';

/**
 * Strip redundant 'Rev' prefixes so 'Rev 0' or '0' cleanly formats as '0' in front of 'Rev:'.
 * Result: 'Rev: 0', NEVER 'Rev: Rev 0'.
 */
export function formatRevisionLabel(rev?: string | null): string {
  if (rev === undefined || rev === null) return '0';
  const str = String(rev).trim();
  if (!str) return '0';
  return str.replace(/^(?:rev(?:ision)?\.?\s*:?\s*)+/i, '').trim() || '0';
}

/**
 * Professional formatting criteria for converting Word HTML into a structured, decent corporate document.
 */
export function formatImportedWordHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  let html = rawHtml;

  // 1. Remove Word junk styles, mso attributes, and comment blocks
  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s*mso-[^:]+:[^;"]+;?/gi, '')
    .replace(/\s*style="[^"]*mso-[^"]*"/gi, '')
    .replace(/<span\s+style="[^"]*font-family:\s*Wingdings[^"]*"[^>]*>.*?<\/span>/gi, '•')
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
    .replace(/<\/?[ou]:\w+[^>]*>/gi, '');

  // 2. Clean empty paragraph clutter
  html = html
    .replace(/<p[^>]*>(\s*(&nbsp;|<br\s*\/?>)*\s*)+<\/p>/gi, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

  // 3. Ensure headings have clean corporate typography classes and styling
  html = html
    .replace(/<h1([^>]*)>/gi, '<h1 class="doc-h1"$1 style="font-size: 18pt; font-weight: 800; color: #0B1E36; border-bottom: 2px solid #0B1E36; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; page-break-after: avoid; break-after: avoid;">')
    .replace(/<h2([^>]*)>/gi, '<h2 class="doc-h2"$1 style="font-size: 14pt; font-weight: 700; color: #1E40AF; margin-top: 20px; margin-bottom: 10px; page-break-after: avoid; break-after: avoid;">')
    .replace(/<h3([^>]*)>/gi, '<h3 class="doc-h3"$1 style="font-size: 12pt; font-weight: 700; color: #0F172A; margin-top: 16px; margin-bottom: 8px; page-break-after: avoid; break-after: avoid;">')
    .replace(/<h4([^>]*)>/gi, '<h4 class="doc-h4"$1 style="font-size: 10.5pt; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 12px; margin-bottom: 6px; page-break-after: avoid; break-after: avoid;">');

  // 4. Enhance all tables with decent, structured corporate styling
  html = html.replace(/<table([^>]*)>/gi, '<table class="doc-table"$1 style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 9.5pt; border: 1.5px solid #0B1E36;">');
  html = html.replace(/<th([^>]*)>/gi, '<th class="doc-th"$1 style="background-color: #0B1E36; color: #FFFFFF; font-weight: bold; padding: 8px 10px; text-align: left; border: 1px solid #0B1E36;">');
  html = html.replace(/<td([^>]*)>/gi, '<td class="doc-td"$1 style="padding: 7px 10px; border: 1px solid #CBD5E1; color: #1E293B; vertical-align: top;">');

  // 5. Structure blockquotes/notes
  html = html.replace(/<blockquote([^>]*)>/gi, '<blockquote class="doc-blockquote"$1 style="background-color: #F8FAFC; border-left: 4px solid #0B1E36; padding: 10px 16px; margin: 14px 0; border-radius: 0 6px 6px 0;">');

  return html;
}

/**
 * High-fidelity HTML builder for the entire 3-Page Front Dossier + Body Content.
 * Used for both Microsoft Word export and isolated browser print-to-PDF.
 */
export function buildDossierHtml(
  doc: TechnicalDocument,
  cfg: FrontPageConfig,
  currentUser: User,
  options: { forWord?: boolean } = {}
): string {
  const isWord = options.forWord ?? false;
  const clientLogo = doc.clientLogoUrl || cfg.clientLogoUrl;
  const clientCompany = doc.clientCompany || '';
  const clientRole = doc.clientRoleLabel || cfg.clientRoleLabel || 'Client / Operator';
  const contractorDocNum = doc.contractorDocumentNumber || doc.documentNumber;
  const currentRev = doc.currentRevision || 'Rev 0';
  const issueReason = doc.reasonForIssue || 'For Review & Approval';
  const issueDate = doc.revisionDate || new Date().toISOString().slice(0, 10);
  const authorName = doc.createdByUserName || currentUser?.name || 'Lead Engineer';

  // Common styles
  const tableStyle = 'width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;';
  const thStyle = 'background-color: #0F172A; color: #FFFFFF; font-weight: bold; font-size: 10pt; text-align: left; padding: 8px 10px; border: 1px solid #0F172A;';
  const tdStyle = 'font-size: 9.5pt; padding: 7px 10px; border: 1px solid #CBD5E1; color: #1E293B; vertical-align: top;';
  const tdHeaderStyle = 'background-color: #F1F5F9; font-weight: bold; color: #0F172A; width: 22%; border: 1px solid #94A3B8; font-size: 9.5pt; padding: 7px 10px;';
  const tdValueStyle = 'color: #0F172A; border: 1px solid #94A3B8; font-size: 9.5pt; padding: 7px 10px;';

  // Helper: Standard Page Letterhead (matches exact attached letterhead design across ALL pages)
  const renderLetterheadHtml = (pageSubLabel?: string) => `
    <div class="letterhead-container" style="width: 100%; margin-bottom: 24px; padding-bottom: 6px;">
      <!-- Tier 1: Brand & Client -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
        <tr>
          <td style="vertical-align: middle; width: 45%; padding: 0;">
            <span style="font-size: 26pt; font-weight: 900; color: #0B1E36; letter-spacing: -0.5px; font-family: Arial, Helvetica, sans-serif;">PJMAK</span>
          </td>
          <td style="vertical-align: middle; text-align: right; width: 55%; padding: 0;">
            <div style="font-size: 20pt; font-weight: 800; color: #1E40AF; font-family: Arial, Helvetica, sans-serif; line-height: 1.15;">
              ${clientCompany || 'Case Services'}
            </div>
            <div style="font-size: 8pt; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
              ${clientRole || 'CLIENT / OPERATOR'}
            </div>
          </td>
        </tr>
      </table>

      <!-- Primary Dark Blue Divider Bar -->
      <div style="height: 2.5px; background-color: #0B1E36; width: 100%; margin-bottom: 6px;"></div>

      <!-- Tier 2: Sub-bar with Document Title & Reference Metadata -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
        <tr>
          <td style="vertical-align: middle; font-size: 10pt; font-weight: 800; color: #0B1E36; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.2px;">
            ${doc.title}
          </td>
          <td style="vertical-align: middle; text-align: right; font-size: 9pt; color: #475569; font-family: Arial, Helvetica, sans-serif; white-space: nowrap;">
            <span style="color: #64748B;">Doc Ref:</span> <strong style="color: #0F172A; font-family: monospace; font-size: 9.5pt;">${contractorDocNum}</strong>
            <span style="color: #CBD5E1; margin: 0 5px;">|</span>
            <span style="color: #64748B;">Rev:</span> <strong style="color: #0F172A; font-family: monospace; font-size: 9.5pt;">${formatRevisionLabel(doc.contractorRevisionNo || currentRev)}</strong>
          </td>
        </tr>
      </table>

      <!-- Subtle Bottom Divider Line -->
      <div style="height: 1px; background-color: #E2E8F0; width: 100%;"></div>
    </div>
  `;

  // --- PAGE 1: CONTROL SHEET ---
  let page1Html = '';
  if (cfg.showPage1ControlSheet) {
    page1Html = `
      <div class="dossier-page page-1" style="${isWord ? 'page-break-after: always; mso-break-type: page-break;' : 'page-break-after: always; break-after: page; min-height: 980px;'} padding: 10px 0;">
        ${renderLetterheadHtml('Page 1 of Dossier: Document Control')}

        <div style="background-color: #0B1E36; color: #FFFFFF; padding: 12px 16px; border-radius: 4px; font-weight: 800; font-size: 12pt; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
          DOCUMENT CONTROL SHEET — FORMAL TRANSMITTAL METADATA
        </div>

        <table style="${tableStyle} border: 2px solid #0F172A;">
          <tr>
            <td colspan="4" style="background-color: #F8FAFC; padding: 12px 14px; border-bottom: 2px solid #0F172A;">
              <span style="font-size: 8.5pt; color: #64748B; text-transform: uppercase; font-weight: bold; display: block;">Document Title</span>
              <span style="font-size: 14pt; font-weight: 900; color: #020617; line-height: 1.3;">${doc.title}</span>
            </td>
          </tr>
          <tr>
            <td style="${tdHeaderStyle}">Client Name:</td>
            <td style="${tdValueStyle}"><strong>${doc.clientCompany || 'Case Services'}</strong></td>
            <td style="${tdHeaderStyle}">Contract Ref:</td>
            <td style="${tdValueStyle}"><strong>${cfg.showContractNumber && doc.contractNumber ? doc.contractNumber : 'N/A (Proposal / Tender)'}</strong></td>
          </tr>
          <tr>
            <td style="${tdHeaderStyle}">Document Type:</td>
            <td style="${tdValueStyle}"><strong>${doc.documentType} — ${doc.documentType === 'PRP' ? 'Proposal' : doc.documentType === 'BOQ' ? 'Bill of Quantities' : doc.documentType === 'MST' ? 'Method Statement' : doc.documentType}</strong></td>
            <td style="${tdHeaderStyle}">Client Doc Number:</td>
            <td style="${tdValueStyle}"><strong>${cfg.showClientDocNumber && doc.clientDocumentNumber ? doc.clientDocumentNumber : 'N/A'}</strong></td>
          </tr>
          <tr>
            <td style="${tdHeaderStyle}">Contractor Doc Number:</td>
            <td style="${tdValueStyle} font-family: monospace; font-weight: bold; color: #1E3A8A;">${contractorDocNum}</td>
            <td style="${tdHeaderStyle}">Contractor Revision:</td>
            <td style="${tdValueStyle} font-family: monospace; font-weight: bold;">${formatRevisionLabel(doc.contractorRevisionNo || currentRev)}</td>
          </tr>
          <tr>
            <td style="${tdHeaderStyle}">Originator / Authority:</td>
            <td style="${tdValueStyle}"><strong>${doc.originator || 'PJMAK'}</strong></td>
            <td style="${tdHeaderStyle}">PO / Work Order:</td>
            <td style="${tdValueStyle}"><strong>${cfg.showPoNumber && doc.poNumber ? doc.poNumber : 'N/A'}</strong></td>
          </tr>
        </table>

        <div style="margin-top: 24px;">
          <div style="font-weight: 800; font-size: 10.5pt; color: #0F172A; text-transform: uppercase; margin-bottom: 6px;">
            Document Revision Record & Issue Log
          </div>
          <table style="${tableStyle}">
            <thead>
              <tr>
                <th style="${thStyle} width: 12%;">Rev.</th>
                <th style="${thStyle} width: 34%;">Reason For Issue</th>
                <th style="${thStyle} width: 14%;">Issue Date</th>
                <th style="${thStyle} width: 14%;">Author</th>
                <th style="${thStyle} width: 13%;">Reviewer</th>
                <th style="${thStyle} width: 13%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${(doc.revisions && doc.revisions.length > 0)
                ? doc.revisions.map((rev) => `
                  <tr>
                    <td style="${tdStyle} font-family: monospace; font-weight: bold; background-color: #F8FAFC; text-align: center;">${formatRevisionLabel(rev.revision)}</td>
                    <td style="${tdStyle} font-weight: 600;">${rev.reasonForIssue}</td>
                    <td style="${tdStyle} font-family: monospace;">${rev.issueDate || issueDate}</td>
                    <td style="${tdStyle}">${rev.signOff?.preparedBy?.name || rev.issuedByUserName || authorName}</td>
                    <td style="${tdStyle}">${rev.signOff?.checkedBy?.name || 'Lead Specialist'}</td>
                    <td style="${tdStyle} color: #047857; font-weight: bold;">Approved</td>
                  </tr>
                `).join('')
                : `
                  <tr>
                    <td style="${tdStyle} font-family: monospace; font-weight: bold; background-color: #F8FAFC; text-align: center;">${formatRevisionLabel(currentRev)}</td>
                    <td style="${tdStyle} font-weight: 600;">${issueReason}</td>
                    <td style="${tdStyle} font-family: monospace;">${issueDate}</td>
                    <td style="${tdStyle}">${authorName}</td>
                    <td style="${tdStyle}">Lead Specialist</td>
                    <td style="${tdStyle} color: #047857; font-weight: bold;">Approved</td>
                  </tr>
                `
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- PAGE 2: TITLE SHEET & SIGN-OFF APPROVAL MATRIX ---
  let page2Html = '';
  if (cfg.showPage2CoverSheet) {
    const initPerson = doc.signOffTeam?.find((s) => s.role === 'initiated');
    const chkPerson = doc.signOffTeam?.find((s) => s.role === 'checked');
    const verPerson = doc.signOffTeam?.find((s) => s.role === 'verified');
    const appPerson = doc.signOffTeam?.find((s) => s.role === 'approved');

    page2Html = `
      <div class="dossier-page page-2" style="${isWord ? 'page-break-after: always; mso-break-type: page-break;' : 'page-break-after: always; break-after: page; min-height: 980px;'} padding: 10px 0;">
        ${renderLetterheadHtml('Page 2 of Dossier: Formal Cover')}

        <div style="text-align: center; padding: 36px 12px 24px 12px;">
          <h1 style="font-size: 26pt; font-weight: 900; color: #020617; text-transform: uppercase; margin: 0 0 12px 0; letter-spacing: -0.5px; line-height: 1.25;">
            ${doc.title}
          </h1>
          ${cfg.showScopeOfWorks ? `
            <p style="font-size: 11pt; font-weight: 600; color: #475569; max-width: 650px; margin: 0 auto; line-height: 1.5;">
              ${doc.documentScope || doc.description || doc.projectName}
            </p>
          ` : ''}
        </div>

        ${cfg.showGraphicBanner ? `
          <div style="background-color: #0B1E36; color: #FFFFFF; padding: 22px; border-radius: 12px; margin: 20px 0 28px 0; text-align: center; border: 1px solid #1E293B;">
            <div style="font-size: 16pt; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">
              ${doc.projectName}
            </div>
            <div style="font-size: 9.5pt; color: #94A3B8;">
              Official High-Reliability Engineering & Commercial Deliverable
            </div>
          </div>
        ` : ''}

        <table style="${tableStyle} background-color: #F8FAFC; border: 1px solid #CBD5E1; margin-bottom: 24px;">
          <tr>
            <td style="${tdStyle} border: none; width: 50%;">Project: <strong style="color: #0F172A;">${doc.projectName}</strong></td>
            <td style="${tdStyle} border: none; width: 50%;">Doc Ref: <strong style="color: #1E3A8A; font-family: monospace;">${contractorDocNum}</strong></td>
          </tr>
          <tr>
            <td style="${tdStyle} border: none; width: 50%;">Client Doc Ref: <strong style="color: #0F172A; font-family: monospace;">${cfg.showClientDocNumber && doc.clientDocumentNumber ? doc.clientDocumentNumber : 'N/A'}</strong></td>
            <td style="${tdStyle} border: none; width: 50%;">Revision: <strong style="color: #0F172A; font-family: monospace;">${formatRevisionLabel(doc.contractorRevisionNo || currentRev)}</strong></td>
          </tr>
        </table>

        <div style="margin-top: 10px;">
          <div style="font-weight: 800; font-size: 10.5pt; color: #0F172A; text-transform: uppercase; margin-bottom: 8px;">
            Formal Sign-Off & Verification Matrix
          </div>
          <table style="${tableStyle} border: 2px solid #0F172A;">
            <thead>
              <tr>
                <th style="${thStyle} width: 10%; text-align: center;">Rev.</th>
                <th style="${thStyle} width: 22%;">Issue Purpose</th>
                <th style="${thStyle} width: 14%;">Date</th>
                <th style="${thStyle} width: 13.5%;">Initiated</th>
                <th style="${thStyle} width: 13.5%;">Checked</th>
                <th style="${thStyle} width: 13.5%;">Verified</th>
                <th style="${thStyle} width: 13.5%;">Approved</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="${tdStyle} font-family: monospace; font-weight: bold; text-align: center; background-color: #F8FAFC;">
                  ${formatRevisionLabel(doc.contractorRevisionNo || currentRev)}
                </td>
                <td style="${tdStyle} color: #047857; font-weight: bold;">
                  ${issueReason}
                </td>
                <td style="${tdStyle} font-family: monospace; color: #475569;">
                  ${issueDate}
                </td>
                <td style="${tdStyle}">
                  <strong style="color: #0F172A; display: block;">${initPerson?.name || authorName}</strong>
                  <span style="font-size: 8pt; color: #64748B; display: block;">${initPerson?.position || 'Author'}</span>
                  <span style="font-size: 8pt; color: #047857; font-weight: bold;">✓ Signed</span>
                </td>
                <td style="${tdStyle}">
                  <strong style="color: #0F172A; display: block;">${chkPerson?.name || 'Discipline Reviewer'}</strong>
                  <span style="font-size: 8pt; color: #64748B; display: block;">${chkPerson?.position || 'Technical Specialist'}</span>
                  <span style="font-size: 8pt; color: #047857; font-weight: bold;">✓ Checked</span>
                </td>
                <td style="${tdStyle}">
                  <strong style="color: #0F172A; display: block;">${verPerson?.name || 'QA/QC Coordinator'}</strong>
                  <span style="font-size: 8pt; color: #64748B; display: block;">${verPerson?.position || 'Quality Manager'}</span>
                  <span style="font-size: 8pt; color: #047857; font-weight: bold;">✓ Verified</span>
                </td>
                <td style="${tdStyle}">
                  <strong style="color: #1E3A8A; display: block;">${appPerson?.name || 'Managing Director'}</strong>
                  <span style="font-size: 8pt; color: #64748B; display: block;">${appPerson?.position || 'Project Director'}</span>
                  <span style="font-size: 8pt; color: #1E3A8A; font-weight: bold;">✓ Approved</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- PAGE 3: REVISION HISTORY & HOLD POINTS ---
  let page3Html = '';
  if (cfg.showPage3RevisionHoldPoints) {
    page3Html = `
      <div class="dossier-page page-3" style="${isWord ? 'page-break-after: always; mso-break-type: page-break;' : 'page-break-after: always; break-after: page; min-height: 980px;'} padding: 10px 0;">
        ${renderLetterheadHtml('Page 3 of Dossier: History & HOLD Register')}

        ${cfg.showRevisionHistory ? `
          <div style="margin-bottom: 24px;">
            <div style="background-color: #0B1E36; color: #FFFFFF; padding: 8px 12px; font-weight: bold; font-size: 9.5pt; text-transform: uppercase;">
              Revision Change Log
            </div>
            <table style="${tableStyle} border: 1px solid #0B1E36; margin-top: 0;">
              <thead>
                <tr style="background-color: #F1F5F9;">
                  <th style="${thStyle} background-color: #F1F5F9; color: #0F172A; border-color: #CBD5E1; width: 14%;">Revision</th>
                  <th style="${thStyle} background-color: #F1F5F9; color: #0F172A; border-color: #CBD5E1; width: 22%;">Section</th>
                  <th style="${thStyle} background-color: #F1F5F9; color: #0F172A; border-color: #CBD5E1;">Change Description</th>
                </tr>
              </thead>
              <tbody>
                ${(doc.revisionHistoryItems && doc.revisionHistoryItems.length > 0)
                  ? doc.revisionHistoryItems.map((item) => `
                    <tr>
                      <td style="${tdStyle} font-family: monospace; font-weight: bold;">${formatRevisionLabel(item.revision)}</td>
                      <td style="${tdStyle} font-weight: 600;">${item.section || 'All'}</td>
                      <td style="${tdStyle}">${item.changeDescription}</td>
                    </tr>
                  `).join('')
                  : `
                    <tr>
                      <td style="${tdStyle} font-family: monospace; font-weight: bold;">${formatRevisionLabel(currentRev)}</td>
                      <td style="${tdStyle} font-weight: 600;">All</td>
                      <td style="${tdStyle}">Initial issue for review and technical evaluation</td>
                    </tr>
                  `
                }
              </tbody>
            </table>
          </div>
        ` : ''}

        ${cfg.showHoldPoints ? `
          <div style="margin-top: 20px;">
            <div style="background-color: #0B1E36; color: #FFFFFF; padding: 8px 12px; font-weight: bold; font-size: 9.5pt; text-transform: uppercase;">
              Engineering HOLD Point Register
            </div>
            <table style="${tableStyle} border: 1px solid #0B1E36; margin-top: 0;">
              <thead>
                <tr style="background-color: #F1F5F9;">
                  <th style="${thStyle} background-color: #F1F5F9; color: #0F172A; border-color: #CBD5E1; width: 10%; text-align: center;">Nr.</th>
                  <th style="${thStyle} background-color: #F1F5F9; color: #0F172A; border-color: #CBD5E1; width: 50%;">Description / HOLD Reference</th>
                  <th style="${thStyle} background-color: #F1F5F9; color: #0F172A; border-color: #CBD5E1; width: 25%;">Responsible Party</th>
                  <th style="${thStyle} background-color: #F1F5F9; color: #0F172A; border-color: #CBD5E1; width: 15%; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${(doc.holdPoints && doc.holdPoints.length > 0)
                  ? doc.holdPoints.map((hp) => `
                    <tr>
                      <td style="${tdStyle} font-family: monospace; font-weight: bold; text-align: center;">${hp.nr}</td>
                      <td style="${tdStyle} font-weight: 600;">${hp.description}</td>
                      <td style="${tdStyle}">${hp.responsibleParty}</td>
                      <td style="${tdStyle} text-align: center;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; text-transform: uppercase; ${
                          hp.status === 'Closed'
                            ? 'background-color: #DCFCE7; color: #166534;'
                            : hp.status === 'Pending'
                            ? 'background-color: #FEF3C7; color: #92400E;'
                            : 'background-color: #FFE4E6; color: #9F1239;'
                        }">
                          ${hp.status}
                        </span>
                      </td>
                    </tr>
                  `).join('')
                  : `
                    <tr>
                      <td style="${tdStyle} font-family: monospace; font-weight: bold; text-align: center;">1</td>
                      <td style="${tdStyle} font-weight: 600;">Design verification and baseline technical submittal review</td>
                      <td style="${tdStyle}">Client Representative / Lead Engineer</td>
                      <td style="${tdStyle} text-align: center;"><span style="background-color: #DCFCE7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold;">CLOSED</span></td>
                    </tr>
                  `
                }
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  }

  // --- PAGE 4+: PREPARED DOCUMENT CONTENT ---
  const bodyContent = formatImportedWordHtml(doc.bodyHtml || `
    <p>This document presents the principal technical specifications, methodology, and engineering execution requirements in accordance with project baseline agreements.</p>
    <h4>1.1 Purpose of Document</h4>
    <p>The purpose of this deliverable is to establish formal engineering parameters, operational procedures, and compliance standards for review and approval.</p>
  `);

  const pageContentHtml = `
    <div class="dossier-page page-content" style="${isWord ? 'page-break-before: always; mso-break-type: page-break;' : 'page-break-before: always; break-before: page;'}">
      <table class="flow-layout-table" style="width: 100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
        <thead style="display: table-header-group;">
          <tr>
            <th style="border: none; padding: 0 0 16px 0; margin: 0; font-weight: normal; text-align: left;">
              ${renderLetterheadHtml('Document Body & Technical Content')}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: none; padding: 0; vertical-align: top;">
              <div class="document-body" style="font-size: 10.5pt; line-height: 1.65; color: #1E293B;">
                ${bodyContent}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot style="display: table-footer-group;">
          <tr>
            <td style="border: none; padding: 14px 0 0 0;">
              <div style="padding-top: 8px; border-top: 1px solid #CBD5E1; color: #94A3B8; font-size: 8.5pt; font-family: monospace;">
                <table style="width: 100%; border-collapse: collapse; border: none;">
                  <tr>
                    <td style="border: none; padding: 0; color: #64748B;">PJMAK Engineering • ${doc.projectName}</td>
                    <td style="border: none; padding: 0; text-align: right; color: #64748B;">Doc Ref: ${contractorDocNum} | Rev: ${formatRevisionLabel(doc.contractorRevisionNo || currentRev)}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  return `
    ${page1Html}
    ${page2Html}
    ${page3Html}
    ${pageContentHtml}
  `;
}

/**
 * Direct Word Export (.doc compatible format) preserving the whole multi-page dossier.
 */
export function exportTechnicalDocumentToWord(
  doc: TechnicalDocument,
  cfg: FrontPageConfig,
  currentUser: User
): void {
  const content = buildDossierHtml(doc, cfg, currentUser, { forWord: true });

  const wordDocumentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${doc.title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 210mm 297mm;
            margin: 15mm 15mm 15mm 15mm;
            mso-header-margin: 10mm;
            mso-footer-margin: 10mm;
            mso-paper-source: 0;
          }
          div.Section1 { page: Section1; }
          body {
            font-family: Calibri, "Segoe UI", Arial, sans-serif;
            font-size: 11pt;
            color: #1e293b;
            line-height: 1.5;
            background: #ffffff;
          }
          h1, h2, h3, h4 { color: #0f172a; font-family: Arial, sans-serif; }
          h1 { font-size: 20pt; margin-top: 18pt; margin-bottom: 8pt; }
          h2 { font-size: 15pt; margin-top: 14pt; margin-bottom: 6pt; }
          h3 { font-size: 12.5pt; margin-top: 12pt; margin-bottom: 4pt; }
          h4 { font-size: 11pt; margin-top: 10pt; margin-bottom: 4pt; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 14pt; }
          th { background-color: #0F172A; color: #FFFFFF; padding: 6pt 8pt; font-weight: bold; text-align: left; }
          td { padding: 6pt 8pt; border: 1px solid #CBD5E1; vertical-align: top; }
          .page-break {
            page-break-after: always;
            mso-break-type: page-break;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${content}
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([wordDocumentHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeDocNum = (doc.contractorDocumentNumber || doc.documentNumber).replace(/[\/\\]/g, '_');
  const safeTitle = (doc.title || 'Deliverable').replace(/[\/\\]/g, '_').slice(0, 35);
  link.href = url;
  link.download = `${safeDocNum}_${safeTitle}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Isolated browser print-to-PDF engine.
 * Renders the complete multi-page dossier in a clean hidden iframe so parent scrollbars,
 * modals, and app shells are NEVER printed or truncated.
 */
export function printTechnicalDocumentDossier(
  doc: TechnicalDocument,
  cfg: FrontPageConfig,
  currentUser: User
): void {
  const content = buildDossierHtml(doc, cfg, currentUser, { forWord: false });

  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${doc.contractorDocumentNumber || doc.documentNumber} - ${doc.title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0; /* Completely eliminates browser URL headers and footers (e.g. localhost:3000, date) */
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 10.5pt;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          .dossier-page {
            box-sizing: border-box;
            padding: 12mm 15mm 12mm 15mm;
            width: 100%;
          }
          .letterhead-container {
            width: 100%;
            margin-bottom: 20px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          h1, h2, h3, h4, h5 {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            page-break-after: avoid;
            break-after: avoid;
          }
          .document-body h1, h1 { font-size: 18pt; font-weight: 800; color: #0B1E36; margin: 22px 0 10px 0; border-bottom: 2px solid #0B1E36; padding-bottom: 4px; }
          .document-body h2, h2 { font-size: 14pt; font-weight: 700; color: #1E40AF; margin: 18px 0 8px 0; }
          .document-body h3, h3 { font-size: 12pt; font-weight: 700; color: #0F172A; margin: 14px 0 6px 0; }
          .document-body h4, h4 { font-size: 10.5pt; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 4px 0; }
          p { margin: 0 0 12px 0; line-height: 1.65; text-align: justify; }
          ul, ol { margin: 0 0 14px 0; padding-left: 24px; }
          li { margin-bottom: 5px; line-height: 1.55; }
          .page-1, .page-2, .page-3 {
            page-break-after: always !important;
            break-after: page !important;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .flow-layout-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
          }
          .flow-layout-table thead, thead {
            display: table-header-group !important;
          }
          .flow-layout-table tfoot, tfoot {
            display: table-footer-group !important;
          }
          .document-body table th {
            background-color: #0B1E36 !important;
            color: #ffffff !important;
            font-weight: bold;
            padding: 8px 10px;
            border: 1px solid #0B1E36;
          }
          .document-body table td {
            padding: 7px 10px;
            border: 1px solid #CBD5E1;
            vertical-align: top;
          }
          .document-body table tr:nth-child(even) td {
            background-color: #F8FAFC;
          }
          blockquote {
            background-color: #F8FAFC;
            border-left: 4px solid #0B1E36;
            padding: 10px 16px;
            margin: 14px 0;
            border-radius: 0 6px 6px 0;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;

  // Create an invisible iframe for pristine print output
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '1000px';
  iframe.style.height = '1000px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const docFrame = iframe.contentWindow?.document || iframe.contentDocument;
  if (!docFrame) {
    // Fallback to standard window print
    window.print();
    return;
  }

  docFrame.open();
  docFrame.write(printHtml);
  docFrame.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }
  }, 400);
}

/**
 * Direct PDF Download generator using jsPDF.
 * Creates an exact multi-page PDF document containing all 3 front sheets + document content.
 */
export function generateTechnicalDocumentPdf(
  doc: TechnicalDocument,
  cfg: FrontPageConfig,
  currentUser: User,
  saveToFile: boolean = true
): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  const contractorDocNum = doc.contractorDocumentNumber || doc.documentNumber;
  const currentRev = doc.currentRevision || 'Rev 0';
  const issueDate = doc.revisionDate || new Date().toISOString().slice(0, 10);
  const authorName = doc.createdByUserName || currentUser?.name || 'Lead Engineer';

  // Helper for letterhead on each page (matches exact 2-tier design with dark blue PJMAK, blue client, and sub-bar)
  const drawLetterhead = (_pageLabel?: string) => {
    // PJMAK Bold Title (Dark blue rather than black)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(11, 30, 54); // #0B1E36 (Dark Blue)
    pdf.text('PJMAK', margin, margin + 4.5);

    // Client company in blue on right
    const clientName = doc.clientCompany || 'Case Services';
    const clientRole = doc.clientRoleLabel || cfg.clientRoleLabel || 'CLIENT / OPERATOR';

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175); // #1E40AF (Blue)
    pdf.text(clientName, pageWidth - margin, margin + 4, { align: 'right' });

    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139); // Slate-500
    pdf.text(clientRole.toUpperCase(), pageWidth - margin, margin + 8.5, { align: 'right' });

    // Primary Dark Blue Divider Bar (thickness 0.65mm)
    pdf.setDrawColor(11, 30, 54);
    pdf.setLineWidth(0.65);
    pdf.line(margin, margin + 11, pageWidth - margin, margin + 11);

    // Sub-bar: Document Title on left, Doc Ref & Rev on right
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);
    pdf.setTextColor(11, 30, 54);
    const titleText = (doc.title || '').toUpperCase();
    const titleShort = pdf.splitTextToSize(titleText, contentWidth - 65)[0] || '';
    pdf.text(titleShort, margin, margin + 15.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    const refRevText = `Doc Ref: ${contractorDocNum} | Rev: ${formatRevisionLabel(doc.contractorRevisionNo || currentRev)}`;
    pdf.text(refRevText, pageWidth - margin, margin + 15.5, { align: 'right' });

    // Subtle bottom divider line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(margin, margin + 18, pageWidth - margin, margin + 18);
  };

  // --- PAGE 1: CONTROL SHEET ---
  let pageCount = 1;
  drawLetterhead('Page 1 of Dossier: Document Control');

  let curY = margin + 26;

  // Header Banner
  pdf.setFillColor(11, 30, 54);
  pdf.rect(margin, curY, contentWidth, 9, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text('DOCUMENT CONTROL SHEET — FORMAL TRANSMITTAL METADATA', margin + 4, curY + 6);
  curY += 13;

  // Title box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.4);
  pdf.rect(margin, curY, contentWidth, 18, 'FD');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('DOCUMENT TITLE', margin + 4, curY + 5);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(2, 6, 23);
  const splitTitle = pdf.splitTextToSize(doc.title, contentWidth - 8);
  pdf.text(splitTitle, margin + 4, curY + 11);
  curY += 22;

  // Control details grid (4 rows)
  const rows = [
    [
      { label: 'Client Name:', val: doc.clientCompany || 'Case Services' },
      { label: 'Contract Ref:', val: cfg.showContractNumber && doc.contractNumber ? doc.contractNumber : 'N/A (Proposal / Tender)' },
    ],
    [
      { label: 'Document Type:', val: `${doc.documentType} — ${doc.documentType === 'PRP' ? 'Proposal' : doc.documentType}` },
      { label: 'Client Doc Number:', val: cfg.showClientDocNumber && doc.clientDocumentNumber ? doc.clientDocumentNumber : 'N/A' },
    ],
    [
      { label: 'Contractor Doc Number:', val: contractorDocNum },
      { label: 'Contractor Revision:', val: formatRevisionLabel(doc.contractorRevisionNo || currentRev) },
    ],
    [
      { label: 'Originator / Authority:', val: doc.originator || 'PJMAK' },
      { label: 'PO / Work Order:', val: cfg.showPoNumber && doc.poNumber ? doc.poNumber : 'N/A' },
    ],
  ];

  const colW = contentWidth / 2;
  const rowH = 9.5;

  rows.forEach((pair) => {
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.2);

    // Left col
    pdf.rect(margin, curY, 35, rowH, 'FD');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(pair[0].label, margin + 2, curY + 6);

    pdf.rect(margin + 35, curY, colW - 35, rowH, 'D');
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(pair[0].val, colW - 39)[0] || '', margin + 37, curY + 6);

    // Right col
    pdf.rect(margin + colW, curY, 35, rowH, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.text(pair[1].label, margin + colW + 2, curY + 6);

    pdf.rect(margin + colW + 35, curY, colW - 35, rowH, 'D');
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(pair[1].val, colW - 39)[0] || '', margin + colW + 37, curY + 6);

    curY += rowH;
  });

  curY += 8;

  // Revision table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('DOCUMENT REVISION RECORD & ISSUE LOG', margin, curY);
  curY += 3;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, curY, contentWidth, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('Rev', margin + 3, curY + 5);
  pdf.text('Reason for Issue', margin + 20, curY + 5);
  pdf.text('Issue Date', margin + 85, curY + 5);
  pdf.text('Author', margin + 115, curY + 5);
  pdf.text('Status', margin + 145, curY + 5);
  curY += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  const revList = doc.revisions && doc.revisions.length > 0 ? doc.revisions : [{ revision: currentRev, reasonForIssue: doc.reasonForIssue || 'For Review', issueDate }];
  revList.forEach((r) => {
    pdf.rect(margin, curY, contentWidth, 7, 'D');
    pdf.text(formatRevisionLabel(r.revision), margin + 3, curY + 5);
    pdf.text(pdf.splitTextToSize(r.reasonForIssue || '', 60)[0] || '', margin + 20, curY + 5);
    pdf.text(r.issueDate || issueDate, margin + 85, curY + 5);
    pdf.text(authorName, margin + 115, curY + 5);
    pdf.setTextColor(4, 120, 87);
    pdf.text('Approved', margin + 145, curY + 5);
    pdf.setTextColor(15, 23, 42);
    curY += 7;
  });

  // --- PAGE 2: TITLE SHEET & SIGN-OFF APPROVAL MATRIX ---
  pdf.addPage();
  pageCount++;
  drawLetterhead('Page 2 of Dossier: Formal Cover');
  curY = margin + 26;

  // Huge Bold Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(2, 6, 23);
  const wrappedCoverTitle = pdf.splitTextToSize(doc.title.toUpperCase(), contentWidth - 10);
  pdf.text(wrappedCoverTitle, pageWidth / 2, curY, { align: 'center' });
  curY += wrappedCoverTitle.length * 8 + 4;

  if (cfg.showScopeOfWorks && (doc.documentScope || doc.description)) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const wrappedScope = pdf.splitTextToSize(doc.documentScope || doc.description || '', contentWidth - 30);
    pdf.text(wrappedScope, pageWidth / 2, curY, { align: 'center' });
    curY += wrappedScope.length * 5 + 8;
  }

  // Graphic Dark Banner (Project name deliverable banner - PRJ26 Discipline line removed)
  pdf.setFillColor(11, 30, 54);
  pdf.roundedRect(margin, curY, contentWidth, 20, 3, 3, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(doc.projectName, pageWidth / 2, curY + 9, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text('Official High-Reliability Engineering & Commercial Deliverable', pageWidth / 2, curY + 15, { align: 'center' });
  curY += 28;

  // Sign-off Matrix Table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('FORMAL SIGN-OFF & VERIFICATION MATRIX', margin, curY);
  curY += 4;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, curY, contentWidth, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('Rev', margin + 3, curY + 5);
  pdf.text('Purpose', margin + 18, curY + 5);
  pdf.text('Date', margin + 45, curY + 5);
  pdf.text('Initiated', margin + 70, curY + 5);
  pdf.text('Checked', margin + 100, curY + 5);
  pdf.text('Verified', margin + 130, curY + 5);
  pdf.text('Approved', margin + 155, curY + 5);
  curY += 7;

  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, curY, contentWidth, 16, 'FD');
  pdf.setTextColor(15, 23, 42);
  pdf.text(formatRevisionLabel(doc.contractorRevisionNo || currentRev), margin + 3, curY + 6);
  pdf.setTextColor(4, 120, 87);
  pdf.text(pdf.splitTextToSize(doc.reasonForIssue || 'For Review', 25)[0] || '', margin + 18, curY + 6);
  pdf.setTextColor(100, 116, 139);
  pdf.text(issueDate, margin + 45, curY + 6);

  // Signatories
  const init = doc.signOffTeam?.find((s) => s.role === 'initiated');
  const chk = doc.signOffTeam?.find((s) => s.role === 'checked');
  const ver = doc.signOffTeam?.find((s) => s.role === 'verified');
  const app = doc.signOffTeam?.find((s) => s.role === 'approved');

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.text(pdf.splitTextToSize(init?.name || authorName, 26)[0] || '', margin + 70, curY + 5);
  pdf.text(pdf.splitTextToSize(chk?.name || 'Reviewer', 26)[0] || '', margin + 100, curY + 5);
  pdf.text(pdf.splitTextToSize(ver?.name || 'QA Lead', 26)[0] || '', margin + 130, curY + 5);
  pdf.text(pdf.splitTextToSize(app?.name || 'Director', 26)[0] || '', margin + 155, curY + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(4, 120, 87);
  pdf.text('✓ Signed', margin + 70, curY + 11);
  pdf.text('✓ Checked', margin + 100, curY + 11);
  pdf.text('✓ Verified', margin + 130, curY + 11);
  pdf.text('✓ Approved', margin + 155, curY + 11);

  // --- PAGE 3: REVISION HISTORY & HOLD POINTS ---
  pdf.addPage();
  pageCount++;
  drawLetterhead('Page 3 of Dossier: History & HOLD Register');
  curY = margin + 26;

  // Revision change log
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('REVISION CHANGE LOG', margin, curY);
  curY += 3;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, curY, contentWidth, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('Rev', margin + 3, curY + 5);
  pdf.text('Section', margin + 25, curY + 5);
  pdf.text('Description of Change', margin + 65, curY + 5);
  curY += 7;

  const revHist = doc.revisionHistoryItems && doc.revisionHistoryItems.length > 0
    ? doc.revisionHistoryItems
    : [{ revision: currentRev, section: 'All', changeDescription: 'Initial issue for review and technical evaluation' }];

  revHist.forEach((item) => {
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(margin, curY, contentWidth, 8, 'D');
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatRevisionLabel(item.revision), margin + 3, curY + 5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.section || 'All', margin + 25, curY + 5.5);
    pdf.text(pdf.splitTextToSize(item.changeDescription, contentWidth - 70)[0] || '', margin + 65, curY + 5.5);
    curY += 8;
  });

  curY += 10;

  // HOLD points
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('ENGINEERING HOLD POINT REGISTER', margin, curY);
  curY += 3;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin, curY, contentWidth, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text('Nr.', margin + 3, curY + 5);
  pdf.text('Description / HOLD Reference', margin + 18, curY + 5);
  pdf.text('Responsible Party', margin + 115, curY + 5);
  pdf.text('Status', margin + 155, curY + 5);
  curY += 7;

  const hpList = doc.holdPoints && doc.holdPoints.length > 0
    ? doc.holdPoints
    : [{ nr: 1, description: 'Design verification and baseline technical submittal review', responsibleParty: 'Client Representative', status: 'Closed' as const }];

  hpList.forEach((hp) => {
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(margin, curY, contentWidth, 8, 'D');
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(hp.nr), margin + 4, curY + 5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(hp.description, 90)[0] || '', margin + 18, curY + 5.5);
    pdf.text(pdf.splitTextToSize(hp.responsibleParty, 35)[0] || '', margin + 115, curY + 5.5);

    if (hp.status === 'Closed') {
      pdf.setTextColor(4, 120, 87);
    } else {
      pdf.setTextColor(180, 83, 9);
    }
    pdf.setFont('helvetica', 'bold');
    pdf.text(hp.status, margin + 155, curY + 5.5);
    curY += 8;
  });

  // --- PAGE 4+: DOCUMENT CONTENT ---
  pdf.addPage();
  pageCount++;
  drawLetterhead('Document Body & Technical Content');
  curY = margin + 26;

  // Parse HTML into text paragraphs
  const cleanBodyText = (doc.bodyHtml || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n\n### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  const lines = cleanBodyText.split('\n');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      curY += 3;
      continue;
    }

    if (curY > pageHeight - margin - 15) {
      pdf.addPage();
      pageCount++;
      drawLetterhead('Document Body & Technical Content');
      curY = margin + 26;
    }

    if (trimmed.startsWith('### ')) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(2, 6, 23);
      curY += 4;
      pdf.text(trimmed.replace('### ', ''), margin, curY);
      curY += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
    } else {
      const split = pdf.splitTextToSize(trimmed, contentWidth);
      split.forEach((sLine: string) => {
        if (curY > pageHeight - margin - 15) {
          pdf.addPage();
          pageCount++;
          drawLetterhead('Document Body & Technical Content');
          curY = margin + 26;
        }
        pdf.text(sLine, margin, curY);
        curY += 5.2;
      });
    }
  }

  // Footer on each page
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `PJMAK Engineering • ${contractorDocNum} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  if (saveToFile) {
    const safeDocNum = contractorDocNum.replace(/[\/\\]/g, '_');
    const safeTitle = (doc.title || 'Deliverable').replace(/[\/\\]/g, '_').slice(0, 35);
    pdf.save(`${safeDocNum}_${safeTitle}.pdf`);
  }

  return pdf;
}
