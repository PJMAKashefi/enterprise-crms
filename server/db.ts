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
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'correspondence_db.json');

// In-memory cache synced with disk
let db: DatabaseSchema;

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

  const technicalDocuments: TechnicalDocument[] = [];

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
        documentId: 'doc-mec-001',
        documentNumber: 'PRJ-PJMAK-MEC-DWG-0001',
        documentTitle: 'Atmospheric Storage Tank General Assembly & Nozzle Schedule',
        selectedRevision: 'Rev A',
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
        documentId: 'doc-mec-001',
        documentNumber: 'PRJ-PJMAK-MEC-DWG-0001',
        revision: 'Rev A',
        pageNumber: 2,
        locationAnnotation: 'Section B-B, Nozzle N3 Flange Rating',
        commentText: 'Please verify if the flange rating for Nozzle N3 meets ASME B16.5 Class 300 requirement for high-temperature sour water service.',
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
        documentId: 'doc-mec-001',
        documentNumber: 'PRJ-PJMAK-MEC-DWG-0001',
        revision: 'Rev A',
        externalUserId: 'ext-usr-1',
        externalUserName: 'Eng. Reza Mohammadi',
        externalUserCompany: 'National Petrochemical Co. (NPC)',
        performedByUserId: 'usr-admin-1',
        performedByUserName: 'Ali Kashefi',
        actorType: 'internal',
        eventType: 'invitation_created',
        timestamp: '2026-09-12T08:30:00.000Z',
        result: 'success',
        details: 'Shared PRJ-PJMAK-MEC-DWG-0001 (Rev A) with Eng. Reza Mohammadi under controlled schedule Mon-Fri 08:30-17:30',
      },
      {
        id: 'ext-log-2',
        shareId: 'share-sample-1',
        documentId: 'doc-mec-001',
        documentNumber: 'PRJ-PJMAK-MEC-DWG-0001',
        revision: 'Rev A',
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
        documentId: 'doc-mec-001',
        documentNumber: 'PRJ-PJMAK-MEC-DWG-0001',
        revision: 'Rev A',
        externalUserId: 'ext-usr-1',
        externalUserName: 'Eng. Reza Mohammadi',
        externalUserCompany: 'National Petrochemical Co. (NPC)',
        actorType: 'external',
        eventType: 'document_opened',
        timestamp: '2026-09-14T09:16:00.000Z',
        result: 'allowed',
        details: 'Opened Controlled Document Viewer for Rev A with dynamic watermark overlay',
      },
      {
        id: 'ext-log-4',
        shareId: 'share-sample-1',
        documentId: 'doc-mec-001',
        documentNumber: 'PRJ-PJMAK-MEC-DWG-0001',
        revision: 'Rev A',
        externalUserId: 'ext-usr-1',
        externalUserName: 'Eng. Reza Mohammadi',
        externalUserCompany: 'National Petrochemical Co. (NPC)',
        actorType: 'external',
        eventType: 'comment_created',
        timestamp: '2026-09-14T09:30:00.000Z',
        result: 'success',
        details: 'Added review comment on Section B-B, Nozzle N3 Flange Rating (Page 2)',
      },
    ],
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

      // If database contains old mock items or missing users, cleanly reset to the initial production state
      const hasMockCorrespondence = db.correspondence && db.correspondence.some((c) => c.id.startsWith('cor-mock-') || c.id === 'cor-1');
      const hasOldUsers = db.users && db.users.some((u) => u.name === 'Robert Vance');

      if (hasMockCorrespondence || hasOldUsers || !db.users || db.users.length === 0) {
        db = getInitialData();
        saveDatabase();
        return db;
      }

      if (!db.users) db.users = initial.users;
      if (!db.departments) db.departments = initial.departments;
      if (!db.contacts) db.contacts = [];
      if (!db.correspondence) db.correspondence = [];
      if (!db.tasks) db.tasks = [];
      if (!db.auditLogs) db.auditLogs = initial.auditLogs;
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
      if (!db.archiveFolders || db.archiveFolders.length === 0) db.archiveFolders = initial.archiveFolders;
      // Clean out sample technical documents so EDMS is pristine for real production document producing & sharing
      if (db.technicalDocuments) {
        db.technicalDocuments = db.technicalDocuments.filter(
          (d) => !d.id.startsWith('doc-tech-')
        );
      } else {
        db.technicalDocuments = [];
      }
      if (db.documentShares) {
        db.documentShares = db.documentShares.filter(
          (s) => !s.documentId.startsWith('doc-tech-')
        );
      } else {
        db.documentShares = [];
      }
      if (db.documentComments) {
        db.documentComments = db.documentComments.filter(
          (c) => !c.documentId.startsWith('doc-tech-')
        );
      } else {
        db.documentComments = [];
      }
      if (!db.emailTemplates || db.emailTemplates.length === 0) db.emailTemplates = initial.emailTemplates;
      if (!db.externalUsers || db.externalUsers.length === 0) db.externalUsers = initial.externalUsers;
      if (!db.externalAuditLogs || db.externalAuditLogs.length === 0) db.externalAuditLogs = initial.externalAuditLogs;

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
  const cleanedTechDocs = (db?.technicalDocuments || initial.technicalDocuments || []).map((doc) => ({
    ...doc,
    linkedCorrespondenceIds: [],
    linkedCorrespondenceNumbers: [],
    revisions: (doc.revisions || []).map((rev) => ({
      ...rev,
      transmittalLetterNumber: undefined,
    })),
  }));
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
  } catch (e) {
    console.error('Failed to persist database:', e);
  }
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

