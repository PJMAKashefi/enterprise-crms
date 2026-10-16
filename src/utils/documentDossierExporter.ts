import { jsPDF } from 'jspdf';
import { TechnicalDocument, FrontPageConfig, User } from '../types';
import { normalizeDocumentNumber } from './documentNumbering';

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
  const displayDocNumber = normalizeDocumentNumber(doc.documentNumber || doc.contractorDocumentNumber || 'PRJ26-PJMAK-COM-PRP-0001');
  const contractorDocNum = displayDocNumber;
  const currentRev = doc.currentRevision || 'Rev 0';
  const issueReason = doc.reasonForIssue || 'For Review & Approval';
  const issueDate = doc.revisionDate || new Date().toISOString().slice(0, 10);
  const authorName = doc.createdByUserName || currentUser?.name || 'Lead Author';

  // Common styles
  const tableStyle = 'width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;';
  const thStyle = 'background-color: #0F172A; color: #FFFFFF; font-weight: bold; font-size: 10pt; text-align: left; padding: 8px 10px; border: 1px solid #0F172A;';
  const tdStyle = 'font-size: 9.5pt; padding: 7px 10px; border: 1px solid #CBD5E1; color: #1E293B; vertical-align: top;';
  const tdHeaderStyle = 'background-color: #F1F5F9; font-weight: bold; color: #0F172A; width: 22%; border: 1px solid #94A3B8; font-size: 9.5pt; padding: 7px 10px;';
  const tdValueStyle = 'color: #0F172A; border: 1px solid #94A3B8; font-size: 9.5pt; padding: 7px 10px;';

  // Helper: Standard Page Top Header containing PJMAK Letterhead + Document Title & Reference Bar (Identical across ALL pages)
  const renderPageHeaderHtml = (pageSubLabel?: string) => `
    <div class="page-top-letterhead" style="margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2.5px solid #0B1E36; padding-bottom: 12px; margin-bottom: 8px;">
        <tr>
          <td style="vertical-align: middle; width: 50%;">
            <div style="display: inline-block; vertical-align: middle;">
              <span style="font-size: 22pt; font-weight: 900; color: #0B1E36; letter-spacing: -0.5px; font-family: Arial, sans-serif;">PJMAK</span>
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right; width: 50%;">
            ${clientCompany ? `
              <div style="font-size: 15pt; font-weight: 800; color: #1E3A8A; font-family: Arial, sans-serif;">${clientCompany}</div>
              <div style="font-size: 8.5pt; color: #64748B; font-weight: 600; text-transform: uppercase;">${clientRole}</div>
            ` : `
              <div style="font-size: 13pt; font-weight: 700; color: #0F172A;">${doc.projectName}</div>
              <div style="font-size: 8.5pt; color: #64748B; font-family: monospace;">${doc.projectCode}${pageSubLabel ? ` • ${pageSubLabel}` : ''}</div>
            `}
          </td>
        </tr>
      </table>

      <!-- Document Name and Document Reference Number sub-bar (Matching Page 4 on ALL Pages) -->
      <div style="border-bottom: 1.5px solid #E2E8F0; padding-bottom: 6px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="font-size: 10.5pt; font-weight: bold; color: #0F172A; text-transform: uppercase; font-family: Arial, sans-serif;">
              ${doc.title.toUpperCase()}
            </td>
            <td style="text-align: right; font-size: 9pt; color: #475569; font-family: monospace; white-space: nowrap;">
              Doc Ref: <strong style="color: #0F172A;">${displayDocNumber}</strong> | Rev: <strong style="color: #0F172A;">${currentRev}</strong>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  // --- PAGE 1: CONTROL SHEET ---
  let page1Html = '';
  if (cfg.showPage1ControlSheet) {
    page1Html = `
      <div class="dossier-page page-1" style="${isWord ? 'page-break-after: always; mso-break-type: page-break;' : 'page-break-after: always; break-after: page; min-height: 980px;'} padding: 10px 0;">
        ${renderPageHeaderHtml('Page 1 of Dossier: Document Control')}

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
            <td style="${tdHeaderStyle}">Contract Ref:</td>
            <td style="${tdValueStyle}"><strong>${cfg.showContractNumber && doc.contractNumber ? doc.contractNumber : 'N/A (Proposal / Tender)'}</strong></td>
            <td style="${tdHeaderStyle}">Document Scope:</td>
            <td style="${tdValueStyle}"><strong>${cfg.showScopeOfWorks ? (doc.documentScope || doc.projectName) : doc.projectName}</strong></td>
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
            <td style="${tdValueStyle} font-family: monospace; font-weight: bold;">${doc.contractorRevisionNo || currentRev}</td>
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
                    <td style="${tdStyle} font-family: monospace; font-weight: bold; background-color: #F8FAFC; text-align: center;">${rev.revision}</td>
                    <td style="${tdStyle} font-weight: 600;">${rev.reasonForIssue}</td>
                    <td style="${tdStyle} font-family: monospace;">${rev.issueDate || issueDate}</td>
                    <td style="${tdStyle}">${rev.signOff?.preparedBy?.name || rev.issuedByUserName || authorName}</td>
                    <td style="${tdStyle}">${rev.signOff?.checkedBy?.name || 'Lead Specialist'}</td>
                    <td style="${tdStyle} color: #047857; font-weight: bold;">Approved</td>
                  </tr>
                `).join('')
                : `
                  <tr>
                    <td style="${tdStyle} font-family: monospace; font-weight: bold; background-color: #F8FAFC; text-align: center;">${currentRev}</td>
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
        ${renderPageHeaderHtml('Page 2 of Dossier: Formal Cover')}

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
            <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #38BDF8; margin-bottom: 6px;">
              Project: ${doc.projectCode} • Discipline: ${doc.discipline}
            </div>
            <div style="font-size: 16pt; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">
              ${doc.projectName}
            </div>
            <div style="font-size: 9.5pt; color: #94A3B8;">
              Official PJMAK Commercial & Advisory Deliverable
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
            <td style="${tdStyle} border: none; width: 50%;">Revision: <strong style="color: #0F172A; font-family: monospace;">${currentRev}</strong></td>
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
                  ${doc.contractorRevisionNo || currentRev}
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
        ${renderPageHeaderHtml('Page 3 of Dossier: History & HOLD Register')}

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
                      <td style="${tdStyle} font-family: monospace; font-weight: bold;">${item.revision}</td>
                      <td style="${tdStyle} font-weight: 600;">${item.section}</td>
                      <td style="${tdStyle}">${item.changeDescription}</td>
                    </tr>
                  `).join('')
                  : `
                    <tr>
                      <td style="${tdStyle} font-family: monospace; font-weight: bold;">${currentRev}</td>
                      <td style="${tdStyle} font-weight: 600;">All</td>
                      <td style="${tdStyle}">Initial issue for review and commercial alignment</td>
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
              Project HOLD Point Register
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
                      <td style="${tdStyle} font-weight: 600;">Baseline commercial proposal review and scope alignment</td>
                      <td style="${tdStyle}">Client Representative / Project Manager</td>
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
  const bodyContent = doc.bodyHtml || `
    <p>This document presents the strategic business proposal, methodology, and commercial execution requirements in accordance with project baseline agreements.</p>
    <h4>1.1 Purpose of Document</h4>
    <p>The purpose of this deliverable is to establish formal commercial parameters, operational procedures, and compliance standards for review and approval.</p>
  `;

  const pageContentHtml = `
    <div class="dossier-page page-content" style="padding: 10px 0;">
      ${renderPageHeaderHtml('Document Body & Technical Content')}

      <div class="document-body" style="font-size: 11pt; line-height: 1.65; color: #1E293B;">
        ${bodyContent}
      </div>

      <div style="margin-top: 40px; padding-top: 14px; border-top: 1px solid #CBD5E1; color: #94A3B8; font-size: 8.5pt; font-family: monospace;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td>PJMAK • ${doc.projectName}</td>
            <td style="text-align: right;">End of Deliverable</td>
          </tr>
        </table>
      </div>
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
        <title></title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0 !important; /* Strips browser header (date, title) and footer (localhost:3000 URL) */
          }
          @page :left {
            margin: 0 !important;
          }
          @page :right {
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 10.5pt;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          h1, h2, h3, h4, h5 {
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            page-break-after: avoid;
            break-after: avoid;
          }
          h1 { font-size: 22pt; font-weight: 900; margin: 16px 0 8px 0; }
          h2 { font-size: 16pt; font-weight: 800; margin: 14px 0 6px 0; }
          h3 { font-size: 13pt; font-weight: 700; margin: 12px 0 4px 0; }
          h4 { font-size: 11pt; font-weight: 700; margin: 10px 0 4px 0; }
          p { margin: 0 0 10px 0; line-height: 1.6; }
          ul, ol { margin: 0 0 12px 0; padding-left: 24px; }
          li { margin-bottom: 4px; line-height: 1.5; }
          .dossier-page {
            padding: 12mm 15mm 12mm 15mm !important;
            box-sizing: border-box !important;
          }
          .page-1, .page-2, .page-3 {
            page-break-after: always !important;
            break-after: page !important;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
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

  const contractorDocNum = normalizeDocumentNumber(doc.documentNumber || doc.contractorDocumentNumber || 'PRJ26-PJMAK-COM-PRP-0001');
  const currentRev = doc.currentRevision || 'Rev 0';
  const issueDate = doc.revisionDate || new Date().toISOString().slice(0, 10);
  const authorName = doc.createdByUserName || currentUser?.name || 'Lead Author';

  // Helper for letterhead on each page (Includes PJMAK Letterhead + Document Title & Reference Bar)
  const drawLetterhead = (pageLabel: string) => {
    // PJMAK Bold Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(11, 30, 54); // #0B1E36
    pdf.text('PJMAK', margin, margin + 4);

    // Amber Accent Crown
    pdf.setFillColor(245, 158, 11);
    pdf.triangle(margin + 33, margin + 2, margin + 35, margin - 1, margin + 37, margin + 2, 'F');

    // Client or Project info on right
    if (doc.clientCompany) {
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text(doc.clientCompany, pageWidth - margin, margin + 4, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(doc.clientRoleLabel || cfg.clientRoleLabel || 'Client / Operator', pageWidth - margin, margin + 9, { align: 'right' });
    } else {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(doc.projectName, pageWidth - margin, margin + 4, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(doc.projectCode, pageWidth - margin, margin + 9, { align: 'right' });
    }

    // Border divider for letterhead
    pdf.setDrawColor(11, 30, 54);
    pdf.setLineWidth(0.8);
    pdf.line(margin, margin + 12, pageWidth - margin, margin + 12);

    // Document Name and Document Reference Number Sub-bar on ALL Pages (matching Page 4)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    const shortTitle = pdf.splitTextToSize(doc.title.toUpperCase(), contentWidth - 62)[0] || doc.title.toUpperCase();
    pdf.text(shortTitle, margin, margin + 17);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Doc Ref: ${contractorDocNum} | Rev: ${currentRev}`, pageWidth - margin, margin + 17, { align: 'right' });

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, margin + 19.5, pageWidth - margin, margin + 19.5);
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
      { label: 'Contract Ref:', val: cfg.showContractNumber && doc.contractNumber ? doc.contractNumber : 'N/A (Proposal / Tender)' },
      { label: 'Document Scope:', val: cfg.showScopeOfWorks ? (doc.documentScope || doc.projectName) : doc.projectName },
    ],
    [
      { label: 'Document Type:', val: `${doc.documentType} — ${doc.documentType === 'PRP' ? 'Proposal' : doc.documentType}` },
      { label: 'Client Doc Number:', val: cfg.showClientDocNumber && doc.clientDocumentNumber ? doc.clientDocumentNumber : 'N/A' },
    ],
    [
      { label: 'Contractor Doc Number:', val: contractorDocNum },
      { label: 'Contractor Revision:', val: doc.contractorRevisionNo || currentRev },
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
    pdf.text(r.revision, margin + 3, curY + 5);
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
  curY = margin + 28;

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

  // Graphic Dark Banner
  pdf.setFillColor(11, 30, 54);
  pdf.roundedRect(margin, curY, contentWidth, 24, 3, 3, 'F');
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(56, 189, 248);
  pdf.text(`PROJECT: ${doc.projectCode} • DISCIPLINE: ${doc.discipline}`, pageWidth / 2, curY + 7, { align: 'center' });
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.text(doc.projectName, pageWidth / 2, curY + 14, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Official PJMAK Commercial & Advisory Deliverable', pageWidth / 2, curY + 20, { align: 'center' });
  curY += 32;

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
  pdf.text(currentRev, margin + 3, curY + 6);
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
    pdf.text(item.revision, margin + 3, curY + 5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.section, margin + 25, curY + 5.5);
    pdf.text(pdf.splitTextToSize(item.changeDescription, contentWidth - 70)[0] || '', margin + 65, curY + 5.5);
    curY += 8;
  });

  curY += 10;

  // HOLD points
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('PROJECT HOLD POINT REGISTER', margin, curY);
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
      `PJMAK • ${contractorDocNum} • Page ${i} of ${totalPages}`,
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
