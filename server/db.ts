import fs from 'fs';
import path from 'path';
import {
  Correspondence,
  Contact,
  Task,
  AuditLog,
  User,
  Department,
  NumberSequenceRules,
  CompanySettings,
  LetterTemplate,
  CorrespondenceVersion,
  ArchiveFolder,
  TechnicalDocument,
  EmailTemplateItem,
  ExternalUser,
  DocumentShare,
  DocumentComment,
  ExternalAccessAuditLog,
  ExternalAccessSession,
} from '../src/types';

interface DatabaseSchema {
  users: User[];
  departments: Department[];
  contacts: Contact[];
  correspondence: Correspondence[];
  tasks: Task[];
  auditLogs: AuditLog[];
  archiveFolders: ArchiveFolder[];
  technicalDocuments: TechnicalDocument[];
  emailTemplates: EmailTemplateItem[];
  numberSequences: {
    incoming: NumberSequenceRules;
    outgoing: NumberSequenceRules;
    internal: NumberSequenceRules;
    voidedNumbers: {
      number: string;
      type: 'incoming' | 'outgoing' | 'internal';
      voidedAt: string;
      reason: string;
      voidedBy: string;
    }[];
  };
  companySettings: CompanySettings;
  templates: LetterTemplate[];
  // Controlled External Document Access & Review Extension
  externalUsers: ExternalUser[];
  documentShares: DocumentShare[];
  documentComments: DocumentComment[];
  externalAuditLogs: ExternalAccessAuditLog[];
  externalAccessSessions: ExternalAccessSession[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'correspondence_db.json');

// In-memory cache synced with disk
let db: DatabaseSchema;

export const INITIAL_CONFIDENTIAL_PROPOSAL: TechnicalDocument = {
  id: 'doc-prop-001',
  documentNumber: 'PRJ26-PJMAK-COM-PRP-001',
  title: 'Confidential Commercial & Technical Proposal — Offshore Subsea Export Cable Engineering, Pull-in & Protection Services',
  description: 'Confidential technical methodology, dynamic riser simulation, pull-in engineering execution, HSE DNV-ST-N001 compliance, milestone pricing schedule, and client acceptance questionnaire for North Sea Grid Connection.',
  discipline: 'COM',
  documentType: 'PRP',
  originator: 'PJMAK',
  sequenceNumber: 1,
  projectCode: 'PRJ26',
  projectName: 'North Sea Wind Export Cable Grid Connection (Hub 4)',
  clientCompany: 'Offshore Energy Operator',
  clientContactPerson: 'Marcus Van Dijk',
  clientEmail: 'm.vandijk@energy-operator.eu',
  createdByUserId: 'usr-admin-1',
  createdByUserName: 'Ali Kashefi',
  currentRevision: 'Rev 0',
  revisionDate: '2026-09-15',
  reasonForIssue: 'Confidential Commercial & Technical Proposal for Client Evaluation',
  reviewStatus: 'under_review',
  commercialValue: 485000,
  currency: 'EUR',
  costCode: 'CC-PRP-2026-01',
  revenueCode: 'REV-PRP-001',
  contractNumber: '', // Proposal has no contract number - kept blank
  confidentiality: 'confidential',
  frontPageConfig: {
    showPage1ControlSheet: true,
    showPage2CoverSheet: true,
    showPage3RevisionHoldPoints: true,
    showContractNumber: false,
    showPoNumber: false,
    showClientDocNumber: true,
    showScopeOfWorks: true,
    showGraphicBanner: true,
    showHoldPoints: true,
    showRevisionHistory: true,
    showMilestone: true,
  },
  signOffTeam: [
    { id: 'so-1', role: 'initiated', name: 'Ali Kashefi', position: 'Lead Author', company: 'PJMAK', date: '2026-09-15', digitalId: '#PJMAK-01', status: 'signed' },
    { id: 'so-2', role: 'checked', name: 'Technical Lead', position: 'Discipline Lead Engineer', company: 'PJMAK', date: '2026-09-16', digitalId: '#PJMAK-02', status: 'verified' },
    { id: 'so-3', role: 'verified', name: 'QA Coordinator', position: 'QA/QC Manager', company: 'PJMAK', date: '2026-09-17', digitalId: '#PJMAK-03', status: 'verified' },
    { id: 'so-4', role: 'approved', name: 'Ali Kashefi', position: 'Managing Director', company: 'PJMAK', date: '2026-09-18', digitalId: '#PJMAK-04', status: 'approved' },
  ],
  revisions: [
    {
      revision: 'Rev 0',
      date: '2026-09-15',
      reasonForIssue: 'Issued for Client Commercial & Technical Review',
      reviewStatus: 'under_review',
      dccUserId: 'usr-admin-1',
      dccUserName: 'Ali Kashefi',
      checkedByName: 'Technical Lead',
      checkedByPosition: 'Discipline Lead Engineer',
      approvedByName: 'Ali Kashefi',
      approvedByPosition: 'Managing Director',
      wordCount: 4120,
      pageCount: 5,
    },
  ],
  chapters: [
    {
      id: 'ch-1',
      number: 1,
      title: 'Chapter 1: Executive Summary & Corporate Qualifications',
      content:
        'PJMAK Company is pleased to present this comprehensive Technical and Commercial Proposal to the Client Evaluation Committee for the turnkey engineering, simulation, pull-in execution, and pre-commissioning of the 220kV HVAC Subsea Export Cable System.\n\nKey Highlights:\n• Proven methodology for North Sea dynamic seabed and trenching conditions.\n• Turnkey engineering package including dynamic riser analyses, pull-in winch sizing, and route bathymetry surveys.\n• ISO 9001, ISO 14001, and DNV-ST-N001 certified execution framework.\n• Fixed-price commercial commitment of EUR 485,000 covering all primary engineering, vessel interface verification, and mobilization phases.',
    },
    {
      id: 'ch-2',
      number: 2,
      title: 'Chapter 2: Scope of Work & Subsea Technical Methodology',
      content:
        '2.1 Cable Route Optimization & Metocean Assessment:\nDetailed analysis of seabed geotechnical conditions, sand wave mobility, and hydrodynamic drag coefficients.\n\n2.2 Subsea Pull-In & J-Tube Interface Engineering:\nRigging calculation, hold-back winch tensions, bellmouth entrance geometry, and seal assembly validation in accordance with client platform specifications.\n\n2.3 Dynamic Cable Protection System (CPS) Installation Plan:\nPolyurethane split-pipe articulated protectors and concrete mattress placement sequence at touchdown zones.\n\n2.4 Post-Lay Inspection & Remote ROV Survey Validation:\nMultibeam echosounder (MBES) verification and depth-of-lowering (DOL) acoustic survey protocol.',
    },
    {
      id: 'ch-3',
      number: 3,
      title: 'Chapter 3: HSE, Environmental Management & DNV Compliance',
      content:
        '3.1 Zero-Harm Marine Environmental Charter:\nStrict adherence to North Sea maritime environmental directives, acoustic mammal monitoring during vessel positioning, and zero marine discharge.\n\n3.2 Risk Assessments (HAZID & HAZOP Protocol):\nFull hazard identification sessions covering vessel craneage, diver/ROV intervention, weather window limitations, and emergency cable abandonment procedures.\n\n3.3 DNV-ST-N001 Marine Operations Compliance:\nThird-party Marine Warranty Surveyor (MWS) certificate of approval will be coordinated for all seafastening and offshore rigging packages.',
    },
    {
      id: 'ch-4',
      number: 4,
      title: 'Chapter 4: Commercial Pricing Breakdown & Milestone Schedule',
      content:
        'Commercial Schedule (Fixed-Fee Engineering & Operational Supervision):\n\n• Milestone 1: Mobilization & Detailed Route Engineering — EUR 120,000 (Month 1)\n• Milestone 2: Pull-In Spread Deployment & J-Tube Operations — EUR 215,000 (Month 2)\n• Milestone 3: Fiber-Optic & High-Voltage Testing & Pre-Commissioning — EUR 150,000 (Month 3)\n\nTotal Contract Value: EUR 485,000 net.\nPayment Terms: Net 30 days upon submission of milestone acceptance certificate.\nValidity: 60 calendar days from date of issuance.',
    },
    {
      id: 'ch-5',
      number: 5,
      title: 'Chapter 5: Clarifications, Commercial Acceptance & Questionnaire',
      questionnaireUrl: 'https://form.jotform.com/242500000000000',
      content:
        'To complete the formal evaluation and commercial alignment for this proposal, please complete the official client evaluation questionnaire.\n\nThe questionnaire enables your engineering and procurement teams to confirm technical parameters, cable specifications, vessel availability windows, and formal commercial clarifications directly.\n\nPlease click "Open Questionnaire" below to access the secure form.',
    },
  ],
  linkedCorrespondenceIds: [],
  linkedCorrespondenceNumbers: [],
  createdAt: '2026-09-15T09:00:00.000Z',
  updatedAt: '2026-09-15T09:00:00.000Z',
};

function getInitialData(): DatabaseSchema {
  const users: User[] = [
    {
      id: 'usr-admin-1',
      name: 'Ali Kashefi',
      email: 'mamadalikashefi@gmail.com',
      username: 'ali.kashefi',
      password: 'Pjmak2026!',
      role: 'admin',
      departmentId: 'dept-1',
      departmentName: 'Executive Leadership',
      title: 'Managing Director & Administrator',
      active: true,
      createdAt: '2026-09-10T00:00:00.000Z',
    },
  ];

  const departments: Department[] = [
    { id: 'dept-1', name: 'Executive Leadership', code: 'EX', headUserId: 'usr-admin-1' },
    { id: 'dept-2', name: 'Engineering & Technical Services', code: 'ENG' },
    { id: 'dept-3', name: 'Project Operations', code: 'OPS' },
    { id: 'dept-4', name: 'Document Control & Registry', code: 'REG' },
    { id: 'dept-5', name: 'Commercial & Legal', code: 'COM' },
  ];

  // Completely clean data as requested by user
  const contacts: Contact[] = [];
  const correspondence: Correspondence[] = [];
  const tasks: Task[] = [];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-init-1',
      action: 'SYSTEM_INITIALIZED',
      newValue: 'Clean PJMAK correspondence database initialized for production use',
      performedByUserId: 'usr-admin-1',
      performedByUserName: 'Ali Kashefi',
      timestamp: new Date().toISOString(),
      reason: 'Fresh production start with zero correspondence data',
    },
  ];

  const numberSequences = {
    incoming: {
      prefix: 'IN',
      year: 2026,
      digits: 0,
      useLeadingZeros: false,
      separator: '-',
      currentSeq: 0,
      resetAnnually: true,
      departmentCodePrefix: false,
    },
    outgoing: {
      prefix: 'OUT',
      year: 2026,
      digits: 0,
      useLeadingZeros: false,
      separator: '-',
      currentSeq: 0,
      resetAnnually: true,
      departmentCodePrefix: false,
    },
    internal: {
      prefix: 'IC',
      year: 2026,
      digits: 0,
      useLeadingZeros: false,
      separator: '-',
      currentSeq: 0,
      resetAnnually: true,
      departmentCodePrefix: false,
    },
    voidedNumbers: [],
  };

  const companySettings: CompanySettings = {
    companyName: 'PJMAK',
    registrationNumber: 'KvK 91081289',
    address: "Van Grobbendoncklaan 179, 5213 AV 's-Hertogenbosch, the Netherlands",
    phone: '+31 610 26 95 54',
    email: 'mamadalikashefi@gmail.com',
    website: 'https://www.pjmak.nl',
    logoUrl: '/assets/pjmak_logo.svg',
    footerText: "PJMAK Company • KvK 91081289 • Van Grobbendoncklaan 179, 5213 AV 's-Hertogenbosch, the Netherlands • Tel: +31 610 26 95 54",
    defaultTemplateId: 'tmpl-1',
    signature: {
      signatoryName: 'Ali Kashefi',
      position: 'Founder & Managing Director',
      signatureImageUrl: '', // renders corporate vector signature
      department: 'Executive Leadership',
      enabled: true,
    },
    reminderRules: {
      daysBeforeDue: [7, 3, 1],
      notifyOnDueDate: true,
      notifyWhenOverdue: true,
    },
    emailSettings: {
      provider: 'gmail',
      senderEmail: 'mamadalikashefi@gmail.com',
      connected: false,
    },
  };

  const templates: LetterTemplate[] = [
    {
      id: 'tmpl-1',
      name: 'Executive Corporate Standard',
      description: 'Official corporate correspondence with crest header, right-aligned reference metadata, and dual-party signature block.',
      headerLayout: 'split',
      fontFamily: 'font-serif',
      primaryColor: '#0b1e36',
      defaultGreeting: 'Dear Sir / Madam,',
      defaultClosing: 'Yours faithfully,',
    },
    {
      id: 'tmpl-2',
      name: 'Technical & Engineering Transmittal',
      description: 'Structured layout with prominent drawing/submittal metadata table and revision indices.',
      headerLayout: 'left_aligned',
      fontFamily: 'font-sans',
      primaryColor: '#0369a1',
      defaultGreeting: 'Attention: Engineering Lead,',
      defaultClosing: 'Respectfully submitted,',
    },
    {
      id: 'tmpl-3',
      name: 'Strict Confidential Legal',
      description: 'High-security legal notice with bordered watermark banner and compliance disclaimer.',
      headerLayout: 'centered',
      fontFamily: 'font-serif',
      primaryColor: '#991b1b',
      defaultGreeting: 'Dear Colleague,',
      defaultClosing: 'Sincerely,',
    },
  ];

  const archiveFolders: ArchiveFolder[] = [
    {
      id: 'fld-contracts',
      name: 'Contracts & Agreements',
      description: 'Official contracts, MOUs, variations, and binding agreements',
      color: 'blue',
      createdByUserId: 'usr-admin-1',
      createdByUserName: 'Ali Kashefi',
      isGlobal: true,
      createdAt: '2026-09-10T00:00:00.000Z',
      correspondenceIds: [],
    },
    {
      id: 'fld-permits',
      name: 'Permits & Regulatory Clearances',
      description: 'Government approvals, municipal licenses, and authority clearances',
      color: 'emerald',
      createdByUserId: 'usr-admin-1',
      createdByUserName: 'Ali Kashefi',
      isGlobal: true,
      createdAt: '2026-09-10T00:00:00.000Z',
      correspondenceIds: [],
    },
    {
      id: 'fld-claims',
      name: 'Claims, Notices & Disputes',
      description: 'Formal notices of claim, time extension requests, and commercial letters',
      color: 'amber',
      createdByUserId: 'usr-admin-1',
      createdByUserName: 'Ali Kashefi',
      isGlobal: true,
      createdAt: '2026-09-10T00:00:00.000Z',
      correspondenceIds: [],
    },
    {
      id: 'fld-financial',
      name: 'Financial & Invoices',
      description: 'Payment certificates, invoices, bank guarantees, and tax filings',
      color: 'purple',
      createdByUserId: 'usr-admin-1',
      createdByUserName: 'Ali Kashefi',
      isGlobal: true,
      createdAt: '2026-09-10T00:00:00.000Z',
      correspondenceIds: [],
    },
    {
      id: 'fld-technical',
      name: 'Technical Submittals & RFI',
      description: 'Engineering transmittals, shop drawings, RFIs, and technical memos',
      color: 'indigo',
      createdByUserId: 'usr-admin-1',
      createdByUserName: 'Ali Kashefi',
      isGlobal: true,
      createdAt: '2026-09-10T00:00:00.000Z',
      correspondenceIds: [],
    },
  ];

  const technicalDocuments: TechnicalDocument[] = [INITIAL_CONFIDENTIAL_PROPOSAL];

  const emailTemplates: EmailTemplateItem[] = [
    {
      id: 'tpl-std-transmittal',
      name: 'Standard Official Transmittal',
      description: 'Formal letter dispatch with explicit attachment notice and acknowledgement request.',
      category: 'transmittal',
      defaultSalutation: 'Dear Mr.',
      subjectFormat: '{subject} - {letterNumber}',
      bodyFormat:
        'Dear {salutation} {recipientName},\n\nKindly please find the attached file regarding "{subject}" (Official Letter Ref: {letterNumber}).\n\nPlease let us know if you require any additional information or have any comments.\n\nKindly acknowledge receipt of this email.\n\nYours sincerely,\n{signatoryName}\n{signatoryPosition}\n{companyName}',
      isSystem: true,
    },
    {
      id: 'tpl-tech-proposal',
      name: 'Technical & Commercial Proposal Transmittal',
      description: 'High-level transmittal for submitting engineering proposals, BOQs, and commercial terms.',
      category: 'proposal',
      defaultSalutation: 'Dear Mr.',
      subjectFormat: '{subject} - {letterNumber}',
      bodyFormat:
        'Dear {salutation} {recipientName},\n\nKindly please find the attached file containing our formal Technical & Commercial Proposal regarding "{subject}" (Letter Reference: {letterNumber}).\n\nThis submission details our comprehensive scope of work, technical methodology, project schedule, and commercial breakdown. We remain confident that our proposal meets the highest engineering standards and delivers optimal value for your project.\n\nWe look forward to scheduling a clarification meeting at your earliest convenience to review the submission together.\n\nYours sincerely,\n{signatoryName}\n{signatoryPosition}\n{companyName}',
      isSystem: true,
    },
    {
      id: 'tpl-commercial-proforma',
      name: 'Proforma Invoice & Milestone Payment',
      description: 'Official dispatch of proforma invoices, contract billing milestones, and payment terms.',
      category: 'commercial',
      defaultSalutation: 'Dear Ms.',
      subjectFormat: '{subject} - {letterNumber}',
      bodyFormat:
        'Dear {salutation} {recipientName},\n\nKindly please find the attached file regarding "{subject}" (Official Ref: {letterNumber}), including the relevant Proforma Invoice and commercial documentation.\n\nPlease arrange for the necessary commercial clearance and advance payment issuance according to the agreed milestone schedule.\n\nShould your finance or procurement team require any clarifications, please feel free to reach out.\n\nYours sincerely,\n{signatoryName}\n{signatoryPosition}\n{companyName}',
      isSystem: true,
    },
    {
      id: 'tpl-urgent-review',
      name: 'Urgent Engineering Review & Approval',
      description: 'Expedited request for client approval code or critical-path technical response.',
      category: 'urgent',
      defaultSalutation: 'Dear Eng.',
      subjectFormat: '{subject} - {letterNumber} [URGENT REVIEW]',
      bodyFormat:
        'Dear {salutation} {recipientName},\n\nKindly please find the attached file regarding "{subject}" (Letter Ref: {letterNumber}).\n\nIn order to adhere to the project timeline and milestone delivery dates, your expedited review and formal feedback / Code Approval (Code 1 / Code 2) is kindly requested by the required date.\n\nThank you for your prompt attention to this matter.\n\nYours sincerely,\n{signatoryName}\n{signatoryPosition}\n{companyName}',
      isSystem: true,
    },
    {
      id: 'tpl-formal-clarification',
      name: 'Formal Clarification & Response',
      description: 'Official reply to technical inquiries, site queries, or commercial clarifications.',
      category: 'general',
      defaultSalutation: 'Dear Sir / Madam',
      subjectFormat: '{subject} - {letterNumber}',
      bodyFormat:
        'Dear {salutation},\n\nKindly please find the attached file regarding "{subject}" (Reference: {letterNumber}) containing our official technical response and clarifications.\n\nWe remain at your disposal for any further discussions.\n\nYours sincerely,\n{signatoryName}\n{signatoryPosition}\n{companyName}',
      isSystem: true,
    },
  ];

  return {
    users,
    departments,
    contacts,
    correspondence,
    tasks,
    auditLogs,
    archiveFolders,
    technicalDocuments,
    emailTemplates,
    numberSequences,
    companySettings,
    templates,
    externalUsers: [
      {
        id: 'ext-usr-1',
        name: 'Eng. Reza Mohammadi',
        company: 'National Petrochemical Co. (NPC)',
        email: 'r.mohammadi@npc-iran.ir',
        username: 'reza.npc',
        password: 'Review2026!',
        status: 'active',
        createdAt: '2026-09-12T08:00:00.000Z',
        lastLoginAt: '2026-09-14T09:15:00.000Z',
      },
      {
        id: 'ext-usr-2',
        name: 'Dr. Sarah Al-Mansouri',
        company: 'Pars Oil & Gas Company (POGC)',
        email: 's.mansouri@pogc.ir',
        username: 'sarah.pogc',
        password: 'Review2026!',
        status: 'active',
        createdAt: '2026-09-13T10:00:00.000Z',
      },
    ],
    documentShares: [
      {
        id: 'share-sample-1',
        shareToken: 'token-npc-mec-dwg-4921',
        documentId: 'doc-initial-prop-001',
        documentNumber: 'PRJ26-PJMAK-COM-PRP-001',
        documentTitle: 'Turnkey Pipeline System Engineering & Construction Commercial & Technical Proposal',
        selectedRevision: 'Rev 0',
        externalUserId: 'ext-usr-1',
        recipientName: 'Eng. Reza Mohammadi',
        recipientCompany: 'National Petrochemical Co. (NPC)',
        recipientEmail: 'r.mohammadi@npc-iran.ir',
        recipientUsername: 'reza.npc',
        schedule: {
          startDate: '2026-09-12',
          startTime: '08:00',
          expiryDate: '2026-09-28',
          expiryTime: '17:00',
          workingDays: [1, 2, 3, 4, 5],
          dailyStartTime: '08:30',
          dailyEndTime: '17:30',
          timeZone: 'Europe/Amsterdam',
          publicHolidays: ['2026-09-25'],
        },
        permissions: {
          canView: true,
          canComment: true,
          canDownload: false,
          canPrint: false,
          canCopy: false,
          canRequestExtension: true,
          allowLaterRevisions: true,
        },
        status: 'active',
        createdAt: '2026-09-12T08:30:00.000Z',
        createdByUserId: 'usr-admin-1',
        createdByUserName: 'Ali Kashefi',
        lastAccessAt: '2026-09-14T09:15:00.000Z',
        watermarkConfig: {
          enabled: true,
          customText: 'CONFIDENTIAL • FOR OFFICIAL REVIEW ONLY',
        },
        extensionRequests: [],
      },
    ],
    documentComments: [
      {
        id: 'cmt-sample-1',
        shareId: 'share-sample-1',
        documentId: 'doc-initial-prop-001',
        documentNumber: 'PRJ26-PJMAK-COM-PRP-001',
        revision: 'Rev 0',
        pageNumber: 2,
        locationAnnotation: 'Section 2.1, Scope of Services & Commercial Schedule',
        commentText: 'Please verify the delivery timeline and commercial milestones in Section 2.1 for compliance with tender requirements.',
        authorId: 'ext-usr-1',
        authorName: 'Eng. Reza Mohammadi',
        authorEmail: 'r.mohammadi@npc-iran.ir',
        authorCompany: 'National Petrochemical Co. (NPC)',
        authorRole: 'external',
        createdAt: '2026-09-14T09:30:00.000Z',
        status: 'open',
        replies: [],
      },
    ],
    externalAuditLogs: [
      {
        id: 'ext-log-1',
        shareId: 'share-sample-1',
        documentId: 'doc-initial-prop-001',
        documentNumber: 'PRJ26-PJMAK-COM-PRP-001',
        revision: 'Rev 0',
        externalUserId: 'ext-usr-1',
        externalUserName: 'Eng. Reza Mohammadi',
        externalUserCompany: 'National Petrochemical Co. (NPC)',
        performedByUserId: 'usr-admin-1',
        performedByUserName: 'Ali Kashefi',
        actorType: 'internal',
        eventType: 'invitation_created',
        timestamp: '2026-09-12T08:30:00.000Z',
        result: 'success',
        details: 'Shared PRJ26-PJMAK-COM-PRP-001 (Rev 0) with Eng. Reza Mohammadi under controlled schedule Mon-Fri 08:30-17:30',
      },
      {
        id: 'ext-log-2',
        shareId: 'share-sample-1',
        documentId: 'doc-initial-prop-001',
        documentNumber: 'PRJ26-PJMAK-COM-PRP-001',
        revision: 'Rev 0',
        externalUserId: 'ext-usr-1',
        externalUserName: 'Eng. Reza Mohammadi',
        externalUserCompany: 'National Petrochemical Co. (NPC)',
        actorType: 'external',
        eventType: 'login',
        timestamp: '2026-09-14T09:15:00.000Z',
        result: 'allowed',
        details: 'Authenticated successfully into PJMAK Secure Document Portal',
      },
      {
        id: 'ext-log-3',
        shareId: 'share-sample-1',
        documentId: 'doc-initial-prop-001',
        documentNumber: 'PRJ26-PJMAK-COM-PRP-001',
        revision: 'Rev 0',
        externalUserId: 'ext-usr-1',
        externalUserName: 'Eng. Reza Mohammadi',
        externalUserCompany: 'National Petrochemical Co. (NPC)',
        actorType: 'external',
        eventType: 'document_opened',
        timestamp: '2026-09-14T09:16:00.000Z',
        result: 'allowed',
        details: 'Opened Controlled Document Viewer for Rev 0 with dynamic watermark overlay',
      },
      {
        id: 'ext-log-4',
        shareId: 'share-sample-1',
        documentId: 'doc-initial-prop-001',
        documentNumber: 'PRJ26-PJMAK-COM-PRP-001',
        revision: 'Rev 0',
        externalUserId: 'ext-usr-1',
        externalUserName: 'Eng. Reza Mohammadi',
        externalUserCompany: 'National Petrochemical Co. (NPC)',
        actorType: 'external',
        eventType: 'comment_created',
        timestamp: '2026-09-14T09:30:00.000Z',
        result: 'success',
        details: 'Added review comment on Section 2.1 Commercial Milestones',
      },
    ],
    externalAccessSessions: [],
  };
}

// Clean number formatting without leading zeros (e.g. IN-2026-0001 -> IN-2026-1)
function normalizeRefNumber(numStr: string): string {
  if (!numStr) return numStr;
  return numStr.replace(/^([A-Za-z]+)-(\d{4})-0*(\d+)$/, '$1-$2-$3');
}

// Ensure database file and directory exist & migrate to current format
export function initDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      const initial = getInitialData();

      // Non-destructive initialization: NEVER wipe or filter out user created correspondence or documents
      if (!db.users || db.users.length === 0) db.users = initial.users;
      if (!db.departments) db.departments = initial.departments;
      if (!db.contacts) db.contacts = [];
      if (!db.correspondence) db.correspondence = [];
      if (!db.tasks) db.tasks = [];
      if (!db.auditLogs) db.auditLogs = initial.auditLogs || [];
      if (!db.numberSequences) db.numberSequences = initial.numberSequences;
      if (!db.companySettings) db.companySettings = initial.companySettings;
      if (db.companySettings) {
        if (db.companySettings.footerText?.includes('Project Management Key')) {
          db.companySettings.footerText = "PJMAK Company • KvK 91081289 • Van Grobbendoncklaan 179, 5213 AV 's-Hertogenbosch, the Netherlands • Tel: +31 610 26 95 54";
        }
        if (db.companySettings.phone === '(+31) 610 26 95 54') {
          db.companySettings.phone = '+31 610 26 95 54';
        }
      }
      if (!db.templates) db.templates = initial.templates;
      if (!db.archiveFolders) db.archiveFolders = initial.archiveFolders;
      if (!db.technicalDocuments) db.technicalDocuments = [];
      // Ensure the confidential commercial & technical proposal exists if technicalDocuments is empty
      if (db.technicalDocuments.length === 0 && !db.technicalDocuments.some((d) => d.documentNumber === 'PRJ26-PJMAK-COM-PRP-001')) {
        db.technicalDocuments.unshift(INITIAL_CONFIDENTIAL_PROPOSAL);
      }
      if (!db.externalAccessSessions) db.externalAccessSessions = [];
      if (!db.documentShares) db.documentShares = [];
      if (!db.documentComments) db.documentComments = [];
      if (!db.emailTemplates) db.emailTemplates = initial.emailTemplates || [];
      if (!db.externalUsers) db.externalUsers = initial.externalUsers || [];
      if (!db.externalAuditLogs) db.externalAuditLogs = initial.externalAuditLogs || [];

      // Ensure Ali Kashefi exists as primary administrator with credentials
      const ali = db.users.find((u) => u.email === 'mamadalikashefi@gmail.com');
      if (ali) {
        ali.role = 'admin';
        if (!ali.password) ali.password = 'Pjmak2026!';
        if (!ali.username) ali.username = 'ali.kashefi';
        if (!ali.title) ali.title = 'Managing Director & Administrator';
      } else {
        db.users.unshift(initial.users[0]);
      }

      saveDatabase();
      return db;
    } catch (e) {
      console.error('Error reading database file, reinitializing with default:', e);
    }
  }

  db = getInitialData();
  saveDatabase();
  return db;
}

export function wipeDatabaseToClean(): DatabaseSchema {
  const initial = getInitialData();
  // Preserve existing users (especially their passwords/credentials) if any exist
  const existingUsers = db?.users && db.users.length > 0 ? db.users : initial.users;
  const existingFolders =
    db?.archiveFolders && db.archiveFolders.length > 0
      ? db.archiveFolders.map((f) => ({ ...f, correspondenceIds: [] }))
      : initial.archiveFolders;
  db = {
    ...initial,
    users: existingUsers,
    archiveFolders: existingFolders,
    technicalDocuments: [],
    correspondence: [],
    tasks: [],
    contacts: [],
    auditLogs: [
      {
        id: `aud-wipe-${Date.now()}`,
        action: 'DATABASE_CLEANED',
        newValue: 'All correspondence, tasks, contacts, and technical documents wiped clean for production operation',
        performedByUserId: existingUsers[0].id,
        performedByUserName: existingUsers[0].name,
        timestamp: new Date().toISOString(),
        reason: 'Administrator requested fresh clean slate',
      },
    ],
  };
  saveDatabase();
  return db;
}

export function clearAllTechnicalDocuments(): void {
  const currentDb = getDb();
  currentDb.technicalDocuments = [];
  currentDb.documentShares = [];
  currentDb.documentComments = [];
  saveDatabase();
}

export function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');

    // Also write a rolling safety backup
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, 'correspondence_db_latest.json');
    fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist database:', e);
  }
}

export function exportDatabaseJson(): DatabaseSchema {
  return getDb();
}

export function restoreDatabaseFromJson(data: any): { success: boolean; message: string } {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file format');
  }

  const currentDb = getDb();

  // Merge non-destructively: restore collections provided in the backup
  if (Array.isArray(data.correspondence)) currentDb.correspondence = data.correspondence;
  if (Array.isArray(data.technicalDocuments)) currentDb.technicalDocuments = data.technicalDocuments;
  if (Array.isArray(data.tasks)) currentDb.tasks = data.tasks;
  if (Array.isArray(data.contacts)) currentDb.contacts = data.contacts;
  if (Array.isArray(data.documentShares)) currentDb.documentShares = data.documentShares;
  if (Array.isArray(data.documentComments)) currentDb.documentComments = data.documentComments;
  if (Array.isArray(data.externalUsers)) currentDb.externalUsers = data.externalUsers;
  if (Array.isArray(data.externalAuditLogs)) currentDb.externalAuditLogs = data.externalAuditLogs;
  if (Array.isArray(data.archiveFolders)) currentDb.archiveFolders = data.archiveFolders;
  if (Array.isArray(data.emailTemplates)) currentDb.emailTemplates = data.emailTemplates;
  if (Array.isArray(data.auditLogs)) currentDb.auditLogs = data.auditLogs;
  if (data.companySettings) currentDb.companySettings = { ...currentDb.companySettings, ...data.companySettings };
  if (data.numberSequences) currentDb.numberSequences = { ...currentDb.numberSequences, ...data.numberSequences };

  saveDatabase();
  return { success: true, message: 'Database successfully restored from backup' };
}

export function getDb(): DatabaseSchema {
  if (!db) {
    initDatabase();
  }
  return db;
}

// Transaction-Safe Sequential Number Generation without leading zeros
export function generateCorrespondenceNumber(
  type: 'incoming' | 'outgoing' | 'internal',
  departmentCode?: string
): { number: string; sequence: number } {
  const currentDb = getDb();
  let rule =
    type === 'incoming'
      ? currentDb.numberSequences.incoming
      : type === 'outgoing'
      ? currentDb.numberSequences.outgoing
      : currentDb.numberSequences.internal;

  if (!rule) {
    rule = {
      prefix: type === 'incoming' ? 'IN' : type === 'outgoing' ? 'OUT' : 'IC',
      year: 2026,
      digits: 0,
      useLeadingZeros: false,
      separator: '-',
      currentSeq: 0,
      resetAnnually: true,
      departmentCodePrefix: false,
    };
    if (type === 'internal') {
      currentDb.numberSequences.internal = rule;
    }
  }

  // Increment sequence naturally: 1, 2, 3...
  rule.currentSeq += 1;
  const seqNumber = rule.currentSeq;

  // Format naturally without leading zeros unless useLeadingZeros is explicitly true and digits > 1
  const seqStr =
    rule.useLeadingZeros && rule.digits && rule.digits > 1
      ? String(seqNumber).padStart(rule.digits, '0')
      : String(seqNumber);

  const sep = rule.separator || '-';
  const prefix = rule.prefix || (type === 'incoming' ? 'IN' : type === 'outgoing' ? 'OUT' : 'IC');
  const yearStr = String(rule.year || new Date().getFullYear());

  let fullNumber = `${prefix}${sep}${yearStr}${sep}${seqStr}`;
  if (rule.departmentCodePrefix && departmentCode) {
    fullNumber = `${prefix}${sep}${departmentCode}${sep}${yearStr}${sep}${seqStr}`;
  }

  saveDatabase();
  return { number: fullNumber, sequence: seqNumber };
}

// Recalculate sequence counter to reflect actual registered correspondence
export function recalculateSequence(type: 'incoming' | 'outgoing' | 'internal'): number {
  const currentDb = getDb();
  const list = currentDb.correspondence.filter((c) => c.type === type);
  const maxSeq = list.reduce((max, c) => Math.max(max, c.sequenceNumber || 0), 0);

  if (type === 'incoming' && currentDb.numberSequences?.incoming) {
    currentDb.numberSequences.incoming.currentSeq = maxSeq;
  } else if (type === 'outgoing' && currentDb.numberSequences?.outgoing) {
    currentDb.numberSequences.outgoing.currentSeq = maxSeq;
  } else if (type === 'internal' && currentDb.numberSequences?.internal) {
    currentDb.numberSequences.internal.currentSeq = maxSeq;
  }
  saveDatabase();
  return maxSeq;
}

// Delete correspondence and re-calibrate numbering sequence
export function deleteCorrespondenceFromDb(
  idOrNumber: string,
  userId: string,
  userName: string,
  reason?: string
): { success: boolean; deletedItem?: Correspondence; newCurrentSeq?: number } {
  const currentDb = getDb();
  const index = currentDb.correspondence.findIndex(
    (c) => c.id === idOrNumber || c.correspondenceNumber === idOrNumber
  );
  if (index === -1) {
    return { success: false };
  }

  const [deleted] = currentDb.correspondence.splice(index, 1);

  // Remove linked tasks
  currentDb.tasks = (currentDb.tasks || []).filter((t) => t.correspondenceId !== deleted.id);

  // Remove related links from other correspondence
  currentDb.correspondence.forEach((c) => {
    if (c.relatedLinks) {
      c.relatedLinks = c.relatedLinks.filter(
        (r) => r.targetCorrespondenceId !== deleted.id && r.targetCorrespondenceNumber !== deleted.correspondenceNumber
      );
    }
  });

  // Remove references in technical documents
  if (currentDb.technicalDocuments) {
    currentDb.technicalDocuments.forEach((doc) => {
      if (doc.linkedCorrespondenceIds) {
        doc.linkedCorrespondenceIds = doc.linkedCorrespondenceIds.filter((cid) => cid !== deleted.id);
      }
      if (doc.linkedCorrespondenceNumbers) {
        doc.linkedCorrespondenceNumbers = doc.linkedCorrespondenceNumbers.filter(
          (cnum) => cnum !== deleted.correspondenceNumber
        );
      }
      if (doc.revisions) {
        doc.revisions.forEach((rev) => {
          if (rev.transmittalLetterNumber === deleted.correspondenceNumber) {
            rev.transmittalLetterNumber = undefined;
          }
        });
      }
    });
  }

  // Recalculate sequence counter
  const newSeq = recalculateSequence(deleted.type);

  recordAuditLog({
    action: 'CORRESPONDENCE_DELETED',
    previousValue: `${deleted.correspondenceNumber} (${deleted.subject})`,
    newValue: `Deleted. Counter adjusted to ${newSeq}.`,
    performedByUserId: userId,
    performedByUserName: userName,
    reason: reason || 'Deleted by user',
  });

  saveDatabase();
  return { success: true, deletedItem: deleted, newCurrentSeq: newSeq };
}

// Record an audit entry
export function recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
  const currentDb = getDb();
  const entry: AuditLog = {
    ...log,
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
  };
  currentDb.auditLogs.unshift(entry);
  saveDatabase();
  return entry;
}

// Aconex-Style Multi-Discipline Sequential Document Number Generator
// Format: [PROJECT_CODE]-[ORIGINATOR]-[DISCIPLINE]-[DOC_TYPE]-[SEQ]
// e.g., PRJ01-PJMAK-MEC-DWG-001
export function generateTechnicalDocumentNumber(params: {
  projectCode: string;
  originator?: string;
  discipline: string;
  documentType: string;
}): { documentNumber: string; sequenceNumber: number } {
  const currentDb = getDb();
  if (!currentDb.technicalDocuments) {
    currentDb.technicalDocuments = [];
  }

  const proj = (params.projectCode || 'PRJ01').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'PRJ01';
  const orig = (params.originator || 'PJMAK').toUpperCase();
  const disc = (params.discipline || 'TEC').toUpperCase();
  const type = (params.documentType || 'PRP').toUpperCase();

  // Find highest existing sequence for this discipline and project
  const matchingDocs = currentDb.technicalDocuments.filter(
    (d) => d.discipline === disc && d.documentType === type
  );

  let nextSeq = 1;
  if (matchingDocs.length > 0) {
    const maxSeq = Math.max(...matchingDocs.map((d) => d.sequenceNumber || 0));
    nextSeq = maxSeq + 1;
  }

  const seqStr = String(nextSeq).padStart(3, '0');
  const documentNumber = `${proj}-${orig}-${disc}-${type}-${seqStr}`;

  return { documentNumber, sequenceNumber: nextSeq };
}

