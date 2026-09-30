// Shared TypeScript interfaces and types for Organizational Correspondence Management System

export type CorrespondenceType = 'incoming' | 'outgoing' | 'internal';

export type ActionPurpose =
  | 'new_correspondence'
  | 'reply'
  | 'forward'
  | 'for_information'
  | 'for_review'
  | 'for_observation'
  | 'for_action'
  | 'for_approval'
  | 'for_comment'
  | 'for_followup'
  | 'for_response'
  | 'request_for_response'
  | 'request_for_information'
  | 'internal_memo'
  | 'internal_instruction'
  | 'other';

export type ConfidentialityLevel = 'normal' | 'internal' | 'confidential' | 'highly_confidential';

export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export type OutgoingStatus =
  | 'draft'
  | 'under_review'
  | 'awaiting_approval'
  | 'approved'
  | 'issued'
  | 'sent'
  | 'archived'
  | 'voided';

export type IncomingStatus =
  | 'registered'
  | 'assigned'
  | 'in_progress'
  | 'replied'
  | 'completed'
  | 'archived'
  | 'voided';

export type InternalStatus =
  | 'draft'
  | 'under_review'
  | 'awaiting_approval'
  | 'approved'
  | 'in_circulation'
  | 'action_required'
  | 'replied'
  | 'completed'
  | 'archived'
  | 'voided';

export type CorrespondenceStatus = OutgoingStatus | IncomingStatus | InternalStatus;

export type DeliveryChannel =
  | 'email'
  | 'physical_mail'
  | 'courier'
  | 'hand_delivery'
  | 'portal'
  | 'other';

export type RelationshipType =
  | 'response_to'
  | 'reply_to'
  | 'forwarded_from'
  | 'followup_to'
  | 'reference_to'
  | 'supersedes'
  | 'related_to'
  | 'preceded_by'
  | 'attachment_to';

export type TaskStatus =
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'waiting_for_info'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'overdue';

export type UserRole = 'admin' | 'officer' | 'manager' | 'employee' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  departmentId: string;
  departmentName: string;
  title: string;
  avatarUrl?: string;
  active: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headUserId?: string;
}

export interface Contact {
  id: string;
  orgName: string;
  contactCode?: string; // Standard unique code e.g. "SBM", "NPC", "IOOC"
  contactPerson: string;
  position: string;
  department?: string;
  email: string;
  ccEmails: string[];
  phone: string;
  address: string;
  country: string;
  notes?: string;
  contactType:
    | 'company'
    | 'government'
    | 'client'
    | 'contractor'
    | 'supplier'
    | 'consultant'
    | 'individual'
    | 'other';
  active: boolean;
  createdAt: string;

  // Integrated Financial & EDMS Traceability Codes
  defaultCostCode?: string; // e.g. "CC-SBM-2026"
  defaultRevenueCode?: string; // e.g. "REV-SBM-001"
  industrySector?: string; // e.g. "Offshore EPC", "Refining & Petrochemical"
}

export interface RelatedLink {
  id: string;
  targetCorrespondenceId: string;
  targetCorrespondenceNumber: string;
  targetSubject: string;
  relationshipType: RelationshipType;
  direction?: 'incoming' | 'outgoing' | 'internal';
  date?: string;
}

export type RelatedCorrespondenceLink = RelatedLink;

export interface Attachment {
  id: string;
  fileName?: string;
  name?: string;
  fileType?: string;
  type?: string;
  fileSize?: number | string;
  size?: string;
  url?: string;
  dataUrl?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  isInternal?: boolean;
  description?: string;
}

export interface InternalDistribution {
  id: string;
  sentAt: string;
  sentByUserId: string;
  sentByUserName: string;
  responsibleUserId: string;
  responsibleUserName: string;
  responsibleDepartmentId?: string;
  responsibleDepartmentName?: string;
  ccUserIds: string[];
  ccUserNames: string[];
  ccDepartmentNames?: string[];
  instructions: string;
  actionPurpose: ActionPurpose;
  dueDate?: string;
  note?: string;
  attachments?: Attachment[];
}

export interface HistoryEvent {
  id: string;
  timestamp: string;
  type:
    | 'registered'
    | 'sent_internally'
    | 'response_drafted'
    | 'approved'
    | 'rejected'
    | 'dispatched'
    | 'dispatched_externally'
    | 'linked'
    | 'attachment_added'
    | 'due_date_updated'
    | 'status_changed'
    | 'status_transition'
    | 'linked_correspondence'
    | 'date_modified'
    | 'voided'
    | 'internal_message'
    | 'internal_response'
    | 'internal_reply'
    | 'instruction'
    | 'note_added';
  title: string;
  description: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  fullMessage?: string;
  senderName?: string;
  recipientName?: string;
  responsibleUser?: string;
  ccUsers?: string[];
  parentId?: string;
  attachments?: Attachment[];
  relatedNumber?: string;
  metadata?: {
    responsibleUser?: string;
    ccUsers?: string[];
    linkedNumber?: string;
    linkedSubject?: string;
    attachmentName?: string;
    previousValue?: string;
    newValue?: string;
    notes?: string;
    fullMessage?: string;
  };
}

export interface CorrespondenceVersion {
  id: string;
  versionNumber: string;
  subject: string;
  bodyHtml: string;
  modifiedBy: string;
  modifiedAt: string;
  comment: string;
}

export interface Correspondence {
  id: string;
  type: CorrespondenceType;
  correspondenceNumber: string;
  sequenceNumber: number;
  officialDate: string; // YYYY-MM-DD
  createdDateTime: string; // ISO
  lastModifiedDateTime: string; // ISO
  actionPurpose: ActionPurpose;
  subject: string;
  bodyHtml: string;
  
  // External correspondence details
  externalRefNumber?: string;
  externalDate?: string;
  receivedThrough?: DeliveryChannel;

  // External Contact Parties
  senderOrg: string;
  senderPerson: string;
  senderEmail: string;
  recipientOrg: string;
  recipientPerson: string;
  recipientPosition?: string;
  recipientEmail: string;
  additionalRecipients?: {
    id?: string;
    orgName: string;
    contactPerson: string;
    position?: string;
    email?: string;
  }[];
  ccEmails: string[];
  externalCcRecipients?: {
    id?: string;
    name: string;
    orgName?: string;
    position?: string;
    email?: string;
  }[];
  showCcOnLetter?: boolean; // Whether CC appears on the official letterhead / PDF
  internalCcUserIds?: string[]; // Internal team members CC'd (reflected in forwarding history)
  internalCcUserNames?: string[];
  bccEmails?: string[];

  // Internal Correspondence & Distribution details
  originDepartmentId?: string;
  originDepartmentName?: string;
  destinationDepartmentId?: string;
  destinationDepartmentName?: string;
  currentResponsibleUserId?: string;
  currentResponsibleUserName?: string;
  internalDistributions?: InternalDistribution[];

  // Chronological History Timeline
  history?: HistoryEvent[];

  // Internal routing & classification
  confidentiality: ConfidentialityLevel;
  priority: PriorityLevel;
  status: CorrespondenceStatus;
  assignedDepartmentId?: string;
  assignedDepartmentName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  dueDate?: string;

  // Authorship & Approvals
  createdByUserId: string;
  createdByUserName: string;
  approverUserId?: string;
  approverUserName?: string;
  approvalNotes?: string;
  approvalDate?: string;

  // Letterhead and Signature
  signatureIncluded: boolean;
  signatoryName?: string;
  signatoryPosition?: string;
  signatureImageUrl?: string;
  fontFamily?: string;
  fontSize?: string;
  templateId?: string;

  // Links, Attachments & Versions
  relatedLinks: RelatedLink[];
  attachments: Attachment[];
  versions: CorrespondenceVersion[];

  // Sending metadata & Email Integration
  dateSent?: string; // YYYY-MM-DD - exact date when the letter was dispatched/sent
  autoUpdateDateOnSend?: boolean;
  sentAt?: string;
  sentVia?: 'email' | 'manual' | 'courier' | 'internal';
  emailStatus?: 'none' | 'drafted' | 'sent';
  emailProvider?: 'gmail' | 'yahoo' | 'custom';
  emailDraftId?: string;
  emailDraftUrl?: string;
  emailDraftCreatedAt?: string;
  emailSentAt?: string;
  emailSenderAccount?: string;
  emailDeliveryRecord?: {
    sentTo: string[];
    sentCc: string[];
    sentSubject: string;
    sentBody: string;
    timestamp: string;
  };

  isArchived: boolean;
  archivedAt?: string;
  archiveFolderId?: string;
  archiveFolderIds?: string[];
  archiveNotes?: string;
  voidedReason?: string;

  // Integrated Technical & Commercial Documents (Aconex EDMS)
  linkedDocumentIds?: string[];
  linkedDocumentNumbers?: string[];

  // Commercial & Financial Traceability
  clientCode?: string; // Standard client identifier e.g. "SBM", "NPC"
  costCode?: string; // e.g. "CC-SBM-2026"
  revenueCode?: string; // e.g. "REV-SBM-001"
  contractNumber?: string; // e.g. "CTR-SBM-2026-01"
  proformaInvoiceNumber?: string; // e.g. "PI-SBM-001"
  commercialValue?: number; // monetary value if applicable
  currency?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface Task {
  id: string;
  correspondenceId: string;
  correspondenceNumber: string;
  correspondenceSubject: string;
  correspondenceType: CorrespondenceType;
  assignedUserId: string;
  assignedUserName: string;
  assignedDepartmentId: string;
  assignedDepartmentName: string;
  taskType: ActionPurpose;
  instructions: string;
  priority: PriorityLevel;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  completionComment?: string;
  createdByUserId: string;
  createdByUserName: string;
  comments: TaskComment[];
}

export interface AuditLog {
  id: string;
  correspondenceId?: string;
  correspondenceNumber?: string;
  documentId?: string;
  documentNumber?: string;
  taskId?: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  performedByUserId: string;
  performedByUserName: string;
  timestamp: string;
  ipAddress?: string;
  reason?: string;
}

export interface VoidedNumberRecord {
  number: string;
  type: 'incoming' | 'outgoing' | 'internal';
  voidedAt: string;
  reason: string;
  voidedBy: string;
}

export interface NumberSequenceConfig {
  prefix: string;
  digits: number;
  useLeadingZeros?: boolean;
  separator: string;
  currentSeq: number;
  year: number;
  includeDepartment?: boolean;
}

export interface NumberingSequences {
  incoming: NumberSequenceConfig;
  outgoing: NumberSequenceConfig;
  internal: NumberSequenceConfig;
  voidedNumbers: VoidedNumberRecord[];
}

export interface NumberSequenceRules {
  prefix: string;
  year: number;
  digits: number;
  useLeadingZeros?: boolean;
  separator: string;
  currentSeq: number;
  resetAnnually: boolean;
  departmentCodePrefix: boolean;
}

export interface CompanySettings {
  companyName: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  footerText: string;
  defaultTemplateId: string;
  signature: {
    signatoryName: string;
    position: string;
    signatureImageUrl: string;
    department: string;
    enabled: boolean;
    presetId?: 'sign_2_black' | 'sign_1_blue' | 'custom' | string;
  };
  reminderRules: {
    daysBeforeDue: number[];
    notifyOnDueDate: boolean;
    notifyWhenOverdue: boolean;
  };
  workHours?: {
    start: string; // e.g. "08:30"
    end: string;   // e.g. "17:00"
    reminderMinutesBeforeEnd: number; // e.g. 60
  };
  emailSettings: {
    provider: 'gmail' | 'yahoo' | 'custom';
    senderEmail?: string;
    gmailEmail?: string;
    yahooEmail?: string;
    connected?: boolean;
    defaultAction?: 'ask_every_time' | 'always_draft' | 'always_send';
    oneHourReminderEnabled?: boolean;
  };
}

export interface LetterTemplate {
  id: string;
  name: string;
  description: string;
  headerLayout: 'centered' | 'left_aligned' | 'split';
  fontFamily: string;
  primaryColor: string;
  defaultGreeting: string;
  defaultClosing: string;
}

export interface ArchiveFolder {
  id: string;
  name: string;
  description?: string;
  color?: string; // e.g., 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'sky' | 'indigo' | 'slate'
  icon?: string;
  createdByUserId: string;
  createdByUserName: string;
  isGlobal?: boolean;
  createdAt: string;
  updatedAt?: string;
  correspondenceIds?: string[];
}

// -------------------------------------------------------------
// ACONEX-STYLE TECHNICAL & COMMERCIAL DOCUMENT REGISTER (EDMS)
// -------------------------------------------------------------

export type DocumentDiscipline =
  | 'COM' // Commercial & Proposals
  | 'TEC' // Technical Proposals & General Engineering
  | 'MEC' // Mechanical
  | 'ELE' // Electrical
  | 'CIV' // Civil & Structural
  | 'PIP' // Piping
  | 'INS' // Instrumentation & Control
  | 'PRC' // Process Engineering
  | 'PM'  // Project Management
  | 'HSE' // Health, Safety & Environment
  | 'QAC' // Quality Assurance & Control
  | 'CNT' // Contracts & Legal
  | 'SUP'; // Suppliers & Procurement

export type DocumentTypeCode =
  | 'PRP' // Technical / Commercial Proposal
  | 'DWG' // Engineering Drawing
  | 'SPC' // Technical Specification
  | 'CAL' // Calculation Sheet / Engineering Design
  | 'BOQ' // Bill of Quantities / Cost Breakdown
  | 'PIN' // Proforma Invoice
  | 'CTR' // Contract Agreement
  | 'MST' // Method Statement
  | 'RPT' // Technical / Inspection Report
  | 'REQ' // Requisition / Material Inquiry
  | 'CRT'; // Certificate / Inspection Release

export type DocumentReviewStatus =
  | 'code_1_approved'           // Code 1: Approved / Accepted
  | 'code_2_approved_with_comments' // Code 2: Approved with Comments
  | 'code_3_revise_resubmit'    // Code 3: Revise and Resubmit
  | 'code_4_rejected'           // Code 4: Rejected
  | 'code_5_for_info'           // Code 5: For Information Only
  | 'under_review'              // Under Review
  | 'draft';                    // Draft / In Preparation

export type DocumentMilestone =
  | 'tender_bidding'
  | 'award_contracting'
  | 'detailed_engineering'
  | 'procurement_fabrication'
  | 'inspection_testing'
  | 'commissioning_closing';

export interface DocumentSignOffParty {
  name: string;
  position?: string;
  date?: string;
  signatureUrl?: string;
}

export interface DocumentThirdPartyApproval {
  required: boolean;
  organizationName?: string;
  reviewerName?: string;
  date?: string;
  status?: 'pending' | 'approved' | 'approved_with_comments' | 'rejected';
  comments?: string;
}

export interface DocumentRevisionSignOff {
  preparedBy?: DocumentSignOffParty;
  checkedBy?: DocumentSignOffParty;
  approvedByInternal?: DocumentSignOffParty;
  thirdPartyApproval?: DocumentThirdPartyApproval;
}

export interface DocumentRevision {
  id?: string;
  revision: string; // 'Rev 0', 'Rev A', 'Rev 1', etc.
  issueDate?: string; // YYYY-MM-DD
  date?: string; // Alternative date field
  issuedByUserId?: string;
  issuedByUserName?: string;
  reasonForIssue: string; // 'For Review', 'For Approval', 'Tender Submission', etc.
  reviewStatus: DocumentReviewStatus;
  transmittalLetterNumber?: string;
  transmittalLetterId?: string;
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  notes?: string;
  signOff?: DocumentRevisionSignOff;
  dccUserId?: string;
  dccUserName?: string;
  checkedByName?: string;
  checkedByPosition?: string;
  approvedByName?: string;
  approvedByPosition?: string;
  wordCount?: number;
  pageCount?: number;
  createdAt?: string;
}

export interface FrontPageConfig {
  showPage1ControlSheet: boolean;
  showPage2CoverSheet: boolean;
  showPage3RevisionHoldPoints: boolean;
  showContractNumber: boolean;
  showPoNumber: boolean;
  showClientDocNumber: boolean;
  showScopeOfWorks: boolean;
  showGraphicBanner: boolean;
  showHoldPoints: boolean;
  showRevisionHistory: boolean;
  showMilestone: boolean;
  customHeaderTitle?: string;
  customSubtitle?: string;
  customFooterText?: string;
  clientLogoUrl?: string;
  clientRoleLabel?: string;
}

export interface DocumentSignOffPerson {
  id: string;
  role: 'initiated' | 'checked' | 'verified' | 'approved';
  name: string;
  position?: string;
  company?: string;
  date?: string;
  digitalId?: string;
  status: 'pending' | 'verified' | 'approved' | 'signed';
}

export interface TechnicalDocument {
  id: string;
  documentNumber: string; // Multi-discipline formatted number: PRJ-PJMAK-MEC-DWG-0001
  title: string;
  description?: string;
  chapters?: any[];
  
  // Project & Client identification
  projectCode: string; // e.g., 'PRJ-2026-01'
  projectName: string; // e.g., 'South Pars Refinery Modernization'
  clientCompany: string; // e.g., 'Client Company'
  clientRoleLabel?: string; // e.g., 'Client / Operator', 'Employer', 'Owner'
  clientContactPerson?: string; // e.g., 'John Miller'
  clientEmail?: string;

  // Multi-discipline Classification
  discipline: DocumentDiscipline;
  documentType: DocumentTypeCode;
  originator: string; // 'PJMAK', 'ENG', 'SUB', etc.
  sequenceNumber: number;

  // Aconex Revision Control & Review
  currentRevision: string; // 'Rev 0', 'Rev A', 'Rev 1'
  revisionDate: string; // YYYY-MM-DD
  reasonForIssue: string; // 'For Review', 'For Approval', 'For Construction', 'Commercial Offer', etc.
  reviewStatus: DocumentReviewStatus;

  // Multi-Discipline Cost & Revenue Planning (Future-ready)
  costCode?: string; // e.g., 'CC-MEC-401'
  revenueCode?: string; // e.g., 'REV-CLIENT-09'
  commercialValue?: number; // e.g., 150000
  currency?: 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD';
  proformaInvoiceNumber?: string;
  contractNumber?: string;
  supplierName?: string; // Supplier / Vendor name for equipment / materials
  milestoneStage?: DocumentMilestone;
  plannedClosingDate?: string;

  // Integrated Correspondence & Transmittals Linkage
  linkedCorrespondenceIds: string[];
  linkedCorrespondenceNumbers: string[];

  // Revisions & Attachments
  revisions: DocumentRevision[];
  attachments?: Attachment[];

  // Document Origin & Word-Style Engineering Workspace (Pages 1-3)
  documentMode?: 'generated' | 'received'; // 'generated' = created in-house (Word-style), 'received' = received from external stakeholder
  documentScope?: string;
  clientDocumentNumber?: string;
  clientRevisionCode?: string;
  contractorDocumentNumber?: string;
  contractorRevisionNo?: string;
  poNumber?: string;
  rdsPpCode?: string;
  fileFormat?: string; // 'docx' | 'pdf' | 'dwg' | 'xlsx'
  bodyHtml?: string; // Rich HTML / Word-style document content or review commentary
  clientLogoUrl?: string; // Base64 or image URL for client organization logo on Page 2 and letterheads
  frontPageConfig?: FrontPageConfig;
  signOffTeam?: DocumentSignOffPerson[];
  holdPoints?: {
    nr: number;
    description: string;
    responsibleParty: string;
    status: 'Open' | 'Closed' | 'Pending';
  }[];
  revisionHistoryItems?: {
    revision: string;
    section: string;
    changeDescription: string;
  }[];

  // Metadata
  createdByUserId: string;
  createdByUserName: string;
  departmentId?: string;
  departmentName?: string;
  confidentiality?: ConfidentialityLevel;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// EMAIL TRANSMITTAL TEMPLATES
// -------------------------------------------------------------
export interface EmailTemplateItem {
  id: string;
  name: string;
  description: string;
  category: 'transmittal' | 'proposal' | 'commercial' | 'urgent' | 'general';
  defaultSalutation: 'Dear Mr.' | 'Dear Ms.' | 'Dear Dr.' | 'Dear Eng.' | 'Dear Sir / Madam' | 'Dear';
  subjectFormat: string; // e.g., "{subject} - {letterNumber}"
  bodyFormat: string;
  isSystem?: boolean;
}

// -------------------------------------------------------------
// CONTROLLED EXTERNAL DOCUMENT ACCESS & REVIEW EXTENSION
// -------------------------------------------------------------

export interface ExternalUser {
  id: string;
  name: string;
  company: string;
  email: string;
  username: string;
  password?: string;
  status: 'active' | 'suspended' | 'revoked' | 'inactive';
  createdAt: string;
  lastLoginAt?: string;
}

export interface AccessSchedule {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  expiryDate: string; // YYYY-MM-DD
  expiryTime: string; // HH:mm
  workingDays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun. Default: [1, 2, 3, 4, 5]
  dailyStartTime: string; // e.g., "09:00"
  dailyEndTime: string; // e.g., "17:00"
  timeZone: string; // e.g., "Europe/Amsterdam", "Asia/Tehran", "UTC", "Asia/Dubai"
  publicHolidays?: string[]; // Array of YYYY-MM-DD strings treated as non-working days
}

export interface AccessPermissions {
  canView: boolean;
  canComment: boolean;
  canDownload: boolean;
  canPrint: boolean;
  canCopy: boolean;
  canRequestExtension: boolean;
  allowLaterRevisions: boolean; // if true, reviewer can also access subsequent revisions
}

export type ExternalAccessStatus =
  | 'pending'
  | 'active'
  | 'outside_working_hours'
  | 'expired'
  | 'extension_requested'
  | 'extension_approved'
  | 'extension_rejected'
  | 'revoked'
  | 'suspended';

export interface ExtensionRequest {
  id: string;
  shareId: string;
  requestedAt: string;
  requestedByUserName: string;
  requestedWorkingDays?: number;
  requestedExpiryDate?: string;
  requestedExpiryTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  adminComment?: string;
  approvedExpiryDate?: string;
  approvedExpiryTime?: string;
}

export type DocumentCommentStatus = 'open' | 'in_discussion' | 'accepted' | 'rejected' | 'resolved';

export interface CommentReply {
  id: string;
  commentId: string;
  authorId: string;
  authorName: string;
  authorRole: 'internal' | 'external';
  authorCompany?: string;
  text: string;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  shareId?: string;
  documentId: string;
  documentNumber: string;
  revision: string; // Strictly associated with the revision on which it was made
  pageNumber?: number;
  locationAnnotation?: string; // e.g. "Section 4.1, Table 2"
  commentText: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorCompany?: string;
  authorRole: 'internal' | 'external';
  createdAt: string;
  status: DocumentCommentStatus;
  internalResponse?: string;
  internalDecision?: string; // e.g., "Accepted for next revision"
  resultingRevision?: string; // If feedback was applied to a revision
  replies: CommentReply[];
}

export interface DocumentShare {
  id: string;
  shareToken: string; // Unique, non-guessable access token
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  selectedRevision: string; // The baseline revision shared (or 'LATEST')
  externalUserId: string;
  recipientName: string;
  recipientCompany: string;
  recipientEmail: string;
  recipientUsername: string;
  schedule: AccessSchedule;
  permissions: AccessPermissions;
  status: ExternalAccessStatus;
  revokedAt?: string;
  revokedByUserId?: string;
  revokedByUserName?: string;
  revocationReason?: string;
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
  lastAccessAt?: string;
  watermarkConfig?: {
    enabled: boolean;
    customText?: string;
  };
  extensionRequests: ExtensionRequest[];
}

export type ExternalAuditEventType =
  | 'invitation_created'
  | 'invitation_sent'
  | 'access_created'
  | 'first_opened'
  | 'subsequent_access'
  | 'login'
  | 'failed_login'
  | 'document_opened'
  | 'document_viewed'
  | 'comment_created'
  | 'comment_replied'
  | 'comment_accepted'
  | 'comment_rejected'
  | 'comment_resolved'
  | 'extension_requested'
  | 'extension_approved'
  | 'extension_rejected'
  | 'permission_changed'
  | 'revision_accessed'
  | 'download_attempted'
  | 'print_attempted'
  | 'copy_attempted'
  | 'failed_access_attempt'
  | 'access_revoked'
  | 'access_expired';

export interface ExternalAccessAuditLog {
  id: string;
  shareId?: string;
  accessId?: string;
  documentId?: string;
  documentNumber?: string;
  revision?: string;
  externalUserId?: string;
  externalUserName?: string;
  externalUserCompany?: string;
  recipientEmail?: string;
  performedByUserId?: string;
  performedByUserName?: string;
  actorType: 'internal' | 'external' | 'system';
  eventType: ExternalAuditEventType;
  timestamp: string;
  result: 'allowed' | 'denied' | 'success' | 'failed' | 'info';
  details: string;
  metadata?: Record<string, any>;
}

// -------------------------------------------------------------
// SECURE EXTERNAL PROPOSAL ACCESS SESSION
// -------------------------------------------------------------
export interface ExternalAccessSession {
  id: string;
  token: string;              // Non-guessable random token
  accessId: string;           // Human-readable unique access ID e.g. ACC-8921-4192
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  selectedRevision: string;
  recipientName: string;
  recipientEmail: string;
  recipientCompany?: string;
  createdAt: string;
  expiresAt: string;          // ISO timestamp (default: +48 hours)
  durationHours: number;      // e.g. 48
  status: 'active' | 'expired' | 'revoked';
  revokedAt?: string;
  revokedByUserId?: string;
  revokedByUserName?: string;
  revocationReason?: string;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  accessCount: number;
  createdByUserId: string;
  createdByUserName: string;
  notes?: string;
}
