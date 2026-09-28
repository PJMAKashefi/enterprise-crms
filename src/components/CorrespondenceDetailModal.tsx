import React, { useState } from 'react';
import {
  X,
  Download,
  Send,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  GitBranch,
  Calendar,
  Building2,
  Shield,
  UserCheck,
  History,
  Lock,
  Edit,
  Trash2,
  Ban,
  Printer,
  ChevronDown,
  ChevronRight,
  Paperclip,
  Users,
  Plus,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Tag,
  CornerDownRight,
  Check,
  Eye,
  Archive,
  Copy,
  Edit3,
  Info,
} from 'lucide-react';
import {
  Correspondence,
  Task,
  AuditLog,
  User,
  CompanySettings,
  LetterTemplate,
  HistoryEvent,
  Attachment,
  ArchiveFolder,
} from '../types';
import { generateCorrespondencePdf } from '../utils/pdfGenerator';
import { PjmakLogo } from './PjmakLogo';

interface DetailModalProps {
  correspondence: Correspondence;
  allCorrespondence: Correspondence[];
  currentUser: User;
  users?: User[];
  settings: CompanySettings;
  templates: LetterTemplate[];
  tasks: Task[];
  auditLogs: AuditLog[];
  archiveFolders?: ArchiveFolder[];
  initialTab?: 'workspace' | 'history' | 'document' | 'tasks' | 'versions' | 'audit' | 'admin_date';
  onClose: () => void;
  onOpenForwardModal: () => void;
  onOpenEmailModal: () => void;
  onReply?: (item: Correspondence) => void;
  onEditCorrespondence?: (item: Correspondence) => void;
  onTransitionStatus: (newStatus: string, notes?: string) => Promise<void>;
  onUpdateOfficialDate: (newDate: string, reason: string) => Promise<void>;
  onVoidNumber: (reason: string) => Promise<void>;
  onDeleteCorrespondence?: (item: Correspondence) => Promise<void> | void;
  onSelectRelated: (item: Correspondence) => void;
  onRefreshData?: () => void;
}

export const CorrespondenceDetailModal: React.FC<DetailModalProps> = ({
  correspondence,
  allCorrespondence,
  currentUser,
  users = [],
  settings,
  templates,
  tasks,
  auditLogs,
  archiveFolders = [],
  initialTab = 'workspace',
  onClose,
  onOpenForwardModal,
  onOpenEmailModal,
  onReply,
  onEditCorrespondence,
  onTransitionStatus,
  onUpdateOfficialDate,
  onVoidNumber,
  onDeleteCorrespondence,
  onSelectRelated,
  onRefreshData,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExecuteDelete = async () => {
    setDeleting(true);
    try {
      if (onDeleteCorrespondence) {
        await onDeleteCorrespondence(correspondence);
      } else {
        const res = await fetch(`/api/correspondence/${correspondence.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete correspondence');
        }
        if (onRefreshData) onRefreshData();
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error deleting correspondence');
      setDeleting(false);
    }
  };
  const [activeTab, setActiveTab] = useState<
    'document' | 'history' | 'attachments' | 'tasks' | 'versions' | 'audit' | 'admin_date' | 'workspace'
  >(initialTab === 'workspace' || !initialTab ? 'document' : (initialTab as any));

  // Selected history item to display in the Document/Message pane
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryEvent | null>(null);

  // Expanded history items (set of item IDs)
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());

  // Inline Communication / Response Composer State
  const [showAddCommunication, setShowAddCommunication] = useState(false);
  const [commMessage, setCommMessage] = useState('');
  const [commActivityType, setCommActivityType] = useState<
    'request_response' | 'response' | 'reply' | 'instruction' | 'internal_message'
  >('response');
  const [commResponsibleUserId, setCommResponsibleUserId] = useState(
    correspondence.assignedUserId || users[0]?.id || ''
  );
  const [commCcUserIds, setCommCcUserIds] = useState<string[]>([]);
  const [commDueDate, setCommDueDate] = useState('');
  const [commAttachmentName, setCommAttachmentName] = useState('');
  const [commSubmitting, setCommSubmitting] = useState(false);

  // Quick Link Search Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkRelationshipType, setLinkRelationshipType] = useState<'response_to' | 'reply_to' | 'related_to' | 'followup_to'>('related_to');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  // Quick Add Attachment Modal
  const [showAddAttachmentModal, setShowAddAttachmentModal] = useState(false);
  const [attFileName, setAttFileName] = useState('');
  const [attNote, setAttNote] = useState('');
  const [attSubmitting, setAttSubmitting] = useState(false);

  // Admin date change states
  const [newDateValue, setNewDateValue] = useState(correspondence.officialDate);
  const [adminDateReason, setAdminDateReason] = useState('');
  const [dateLoading, setDateLoading] = useState(false);
  const [dateMessage, setDateMessage] = useState<string | null>(null);

  // Void modal state
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Approval modal state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Archive modal state
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveTargetFolderId, setArchiveTargetFolderId] = useState<string>(correspondence.archiveFolderId || '');
  const [archiveNotesInput, setArchiveNotesInput] = useState<string>(correspondence.archiveNotes || '');
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const isManager = ['admin', 'manager'].includes(currentUser.role);
  const isOfficer = ['admin', 'officer'].includes(currentUser.role);

  // Linked tasks for this letter
  const linkedTasks = tasks.filter((t) => t.correspondenceId === correspondence.id);

  // Audit logs for this letter
  const itemLogs = auditLogs.filter((l) => l.correspondenceId === correspondence.id);

  // Sort history chronologically (latest first or earliest first depending on timeline orientation)
  const historyList = correspondence.history || [];

  const toggleHistoryItemExpand = (id: string) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllHistory = () => {
    setExpandedHistoryIds(new Set(historyList.map((h) => h.id)));
  };

  const collapseAllHistory = () => {
    setExpandedHistoryIds(new Set());
  };

  const handleDownloadPdf = () => {
    generateCorrespondencePdf(correspondence, settings, true);
  };

  const handleDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminDateReason.trim()) {
      alert('Administrator justification is required to modify official correspondence date.');
      return;
    }
    setDateLoading(true);
    try {
      await onUpdateOfficialDate(newDateValue, adminDateReason);
      setDateMessage('Official date updated and recorded in audit log.');
      setTimeout(() => setDateMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update date');
    } finally {
      setDateLoading(false);
    }
  };

  const handleVoidSubmit = async () => {
    if (!voidReason.trim()) {
      alert('Please provide a justification for voiding this official number.');
      return;
    }
    try {
      await onVoidNumber(voidReason);
      setShowVoidDialog(false);
    } catch (err: any) {
      alert(err.message || 'Failed to void number');
    }
  };

  const handleApproveSubmit = async () => {
    try {
      await onTransitionStatus('approved', approvalNotes);
      setShowApproveDialog(false);
    } catch (err: any) {
      alert(err.message || 'Failed to approve letter');
    }
  };

  const handleArchiveSubmit = async (shouldArchive: boolean) => {
    setArchiveSubmitting(true);
    try {
      const res = await fetch(`/api/correspondence/${correspondence.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isArchived: shouldArchive,
          folderId: shouldArchive ? (archiveTargetFolderId || null) : null,
          archiveNotes: archiveNotesInput.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update archive status');
      }

      setShowArchiveDialog(false);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update archive');
    } finally {
      setArchiveSubmitting(false);
    }
  };

  // Submit Internal Communication / Response
  const handleAddCommunicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commMessage.trim()) return;

    setCommSubmitting(true);
    try {
      const attachmentsToSend = commAttachmentName.trim()
        ? [
            {
              id: `att-${Date.now()}`,
              fileName: commAttachmentName.trim(),
              fileType: 'application/pdf',
              fileSize: 'Internal Attachment',
              url: '#',
              isInternal: true,
              uploadedBy: currentUser.name,
              uploadedAt: new Date().toISOString(),
            },
          ]
        : [];

      const res = await fetch(`/api/correspondence/${correspondence.id}/communication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commMessage.trim(),
          activityType: commActivityType,
          responsibleUserId: commResponsibleUserId || undefined,
          ccUserIds: commCcUserIds,
          dueDate: commDueDate || undefined,
          attachments: attachmentsToSend,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to post communication');
      }

      setCommMessage('');
      setCommAttachmentName('');
      setShowAddCommunication(false);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to post message');
    } finally {
      setCommSubmitting(false);
    }
  };

  // Submit Link Correspondence
  const handleLinkSubmit = async (targetId: string) => {
    setLinkSubmitting(true);
    try {
      const res = await fetch(`/api/correspondence/${correspondence.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          relationshipType: linkRelationshipType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to link correspondence');
      }
      setShowLinkModal(false);
      setLinkSearchQuery('');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to link correspondence');
    } finally {
      setLinkSubmitting(false);
    }
  };

  // Submit Add Attachment
  const handleAddAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attFileName.trim()) return;

    setAttSubmitting(true);
    try {
      const res = await fetch(`/api/correspondence/${correspondence.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: attFileName.trim(),
          fileType: 'application/pdf',
          fileSize: 102400,
          url: '#',
          isInternal: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add attachment');
      }
      setShowAddAttachmentModal(false);
      setAttFileName('');
      setAttNote('');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to add attachment');
    } finally {
      setAttSubmitting(false);
    }
  };

  const isInternal = correspondence.type === 'internal';
  const isIncoming = correspondence.type === 'incoming';
  const isOutgoing = correspondence.type === 'outgoing';

  // Attachment indicator counts
  const attachmentsList = correspondence.attachments || [];
  const officialAttachments = attachmentsList.filter((a) => !a.isInternal);
  const totalAttachments = attachmentsList.length;

  const isAlreadySent = correspondence.status === 'sent' || correspondence.status === 'issued';
  const todayStr = new Date().toISOString().split('T')[0];
  const effectiveDate = isAlreadySent
    ? (correspondence.dateSent || correspondence.officialDate || todayStr)
    : (correspondence.officialDate && correspondence.officialDate > todayStr
        ? correspondence.officialDate
        : todayStr);

  return (
    <div id="correspondence-detail-workspace-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:z-auto">
      <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:bg-white print:w-full print:h-auto print:max-w-none print:overflow-visible">
        {/* TOP BAR: Context, Numbering, Status & Primary Actions */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span
              className={`p-2 rounded-lg ${
                isInternal
                  ? 'bg-purple-100 text-purple-800'
                  : isIncoming
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-bold text-slate-900">
                  {correspondence.correspondenceNumber}
                </span>

                {/* Type Badge */}
                <span
                  className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    isInternal
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : isIncoming
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {isInternal
                    ? 'Internal Correspondence (IC)'
                    : isIncoming
                    ? 'Incoming External'
                    : 'Outgoing External'}
                </span>

                {/* Workflow Status */}
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {(correspondence.status || 'draft').replace(/_/g, ' ')}
                </span>

                {/* Confidentiality */}
                {correspondence.confidentiality !== 'normal' && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    {correspondence.confidentiality.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Subject Title */}
              <p className="text-xs text-slate-600 font-medium line-clamp-1 mt-0.5">
                {correspondence.subject}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Send Internally / Distribute Button */}
            <button
              onClick={onOpenForwardModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Send internally to responsible officer and CC recipients"
            >
              <Share2 className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Send Internally</span>
            </button>

            {/* Reply Button */}
            {onReply && correspondence.status !== 'voided' && (
              <button
                onClick={() => onReply(correspondence)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Create formal response or reply"
              >
                <CornerDownRight className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Reply</span>
              </button>
            )}

            {/* Outgoing Email Send */}
            {isOutgoing && (
              <button
                onClick={onOpenEmailModal}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs ${
                  correspondence.emailStatus === 'drafted'
                    ? 'text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                    : 'text-white bg-blue-900 hover:bg-blue-950 border border-blue-900'
                }`}
              >
                {correspondence.emailStatus === 'drafted' ? (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                    <span>Review & Send Email Draft</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 text-blue-200" />
                    <span className="hidden sm:inline">Dispatch / Draft Email</span>
                  </>
                )}
              </button>
            )}

            {/* Edit Letter Button (Available until sending) */}
            {!isAlreadySent && onEditCorrespondence && (
              <button
                type="button"
                onClick={() => onEditCorrespondence(correspondence)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Edit letter content, recipient, references, and date until dispatch"
              >
                <Edit3 className="h-3.5 w-3.5 text-blue-200" />
                <span>Edit Letter</span>
              </button>
            )}

            {/* Download Official PDF */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Download official document PDF with genuine letterhead"
            >
              <Download className="h-3.5 w-3.5 text-slate-200" />
              <span>PDF</span>
            </button>

            {/* Archive / Folder Categorization Button */}
            <button
              onClick={() => {
                setArchiveTargetFolderId(correspondence.archiveFolderId || '');
                setArchiveNotesInput(correspondence.archiveNotes || '');
                setShowArchiveDialog(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                correspondence.isArchived || correspondence.archiveFolderId
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title={
                correspondence.isArchived || correspondence.archiveFolderId
                  ? 'Archived record - click to view or change category folder'
                  : 'Archive and allocate to category folder'
              }
            >
              <Archive
                className={`h-3.5 w-3.5 ${
                  correspondence.isArchived || correspondence.archiveFolderId
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}
              />
              <span className="hidden sm:inline">
                {correspondence.isArchived || correspondence.archiveFolderId
                  ? (archiveFolders.find((f) => f.id === correspondence.archiveFolderId)?.name || 'Archived')
                  : 'Archive'}
              </span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer className="h-4 w-4" />
            </button>

            {/* Delete Letter Button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-rose-500 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
              title="Delete Letter Permanently (Rolls back sequence counter)"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-1"
              title="Close Workspace"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 overflow-x-auto print:hidden">
          <div className="flex items-center gap-6 text-xs font-medium">
            <button
              onClick={() => {
                setSelectedHistoryItem(null);
                setActiveTab('document');
              }}
              className={`py-3 border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
                (activeTab === 'document' || activeTab === 'workspace') && !selectedHistoryItem
                  ? 'border-amber-500 text-blue-950 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4 text-blue-900" />
              <span>Official Letter</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-amber-500 text-blue-950 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <History className="h-4 w-4 text-slate-600" />
              <span>Internal Routing & Notes</span>
              {historyList.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 font-semibold text-slate-700">
                  {historyList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`py-3 border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
                activeTab === 'attachments'
                  ? 'border-amber-500 text-blue-950 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Paperclip className="h-4 w-4 text-slate-600" />
              <span>Attachments & Links</span>
              {totalAttachments > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 font-bold">
                  {totalAttachments}
                </span>
              )}
            </button>

            {linkedTasks.length > 0 && (
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-3 border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
                  activeTab === 'tasks'
                    ? 'border-amber-500 text-blue-950 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Clock className="h-4 w-4 text-slate-600" />
                <span>Tasks</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 font-semibold text-slate-700">
                  {linkedTasks.length}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'border-amber-500 text-blue-950 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="h-4 w-4 text-slate-600" />
              <span>Audit Trail</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 font-semibold text-slate-700">
                {itemLogs.length}
              </span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin_date')}
                className={`py-3 border-b-2 cursor-pointer transition-all flex items-center gap-2 ${
                  activeTab === 'admin_date'
                    ? 'border-amber-600 text-amber-900 font-bold'
                    : 'border-transparent text-amber-700 hover:text-amber-900'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Admin Controls</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span>Date: <strong className="text-slate-700">{correspondence.officialDate}</strong></span>
          </div>
        </div>

        {/* Email Draft Notice Banner */}
        {correspondence.emailStatus === 'drafted' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-950 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                <strong>Email Draft Pending:</strong> This letter was prepared and saved in{' '}
                {correspondence.emailProvider === 'yahoo' ? 'Yahoo Mail' : 'Gmail'} drafts.
                PJMAK end-of-day reminder is active to ask again 1 hour before work ends.
              </span>
            </div>
            <button
              onClick={onOpenEmailModal}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-2xs text-[11px] transition-colors cursor-pointer"
            >
              Review & Send Now
            </button>
          </div>
        )}

        {/* Email Sent Notice Banner */}
        {correspondence.emailStatus === 'sent' && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs text-emerald-950 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Official Email Dispatched via {correspondence.emailProvider === 'yahoo' ? 'Yahoo' : 'Gmail'}:</strong>{' '}
                Delivered on {correspondence.sentAt ? new Date(correspondence.sentAt).toLocaleString() : 'recently'}.
              </span>
            </div>
          </div>
        )}

        {/* WORKSPACE MAIN BODY: Clean Centered Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-8 flex justify-center print:bg-white print:p-0 print:m-0 print:overflow-visible">
          {/* TAB 1: OFFICIAL LETTER DOCUMENT (Clean, Uncluttered, No Duplicate Data) */}
          {(activeTab === 'document' || activeTab === 'workspace') && (
            <div className="w-full flex justify-center print:w-full print:block">
              {selectedHistoryItem ? (
                /* Selected Internal Message View */
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-md max-w-3xl w-full space-y-6 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                        Communication Activity Record
                      </span>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">
                        {selectedHistoryItem.title}
                      </h2>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-500">
                      {new Date(selectedHistoryItem.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">Sender</span>
                      <span className="font-semibold text-slate-800">
                        {selectedHistoryItem.senderName || selectedHistoryItem.actorName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">Recipient</span>
                      <span className="font-semibold text-slate-800">
                        {selectedHistoryItem.recipientName || selectedHistoryItem.responsibleUser || 'Internal Team'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Message / Communication
                    </span>
                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedHistoryItem.fullMessage || selectedHistoryItem.description}
                    </div>
                  </div>

                  {selectedHistoryItem.attachments && selectedHistoryItem.attachments.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Attachments for this communication
                      </span>
                      <div className="space-y-1.5">
                        {selectedHistoryItem.attachments.map((att, idx) => (
                          <div key={idx} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800">{att.fileName || att.name}</span>
                            <span className="text-slate-400 text-[10px]">Attached with message</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => setSelectedHistoryItem(null)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg cursor-pointer"
                    >
                      Return to Official Letter
                    </button>
                  </div>
                </div>
              ) : (
                /* OFFICIAL LETTER SHEET CONTAINER */
                <div className="w-full max-w-4xl space-y-4 print:max-w-none print:w-full print:space-y-0">
                  {/* EDITABLE DRAFT HELPER BANNER (Visible until sending) */}
                  {!isAlreadySent && onEditCorrespondence && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/90 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-950 print:hidden shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <Info className="h-4 w-4 text-blue-700 shrink-0" />
                        <div>
                          <span className="font-bold">Editable Draft: </span>
                          <span>You can edit this letter draft anytime until sending. When dispatched, it will automatically be dated with the sending day ({effectiveDate}).</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditCorrespondence(correspondence)}
                        className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 self-start sm:self-center"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-blue-200" />
                        <span>Edit Letter Draft</span>
                      </button>
                    </div>
                  )}

                  {/* OFFICIAL LETTER SHEET */}
                  <div id="official-letter-sheet" className="bg-white p-8 sm:p-14 rounded-xl border border-slate-300 shadow-md w-full font-serif text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none">
                    {/* Top of Letter: Clean PJMAK Logo & Document Reference (NO address/KvK at top) */}
                    {isInternal ? (
                      <div className="border-b-2 border-slate-900 pb-5 mb-6 font-sans">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="h-12 w-44 mb-1.5">
                              <PjmakLogo variant="full" size="md" />
                            </div>
                            <p className="text-xs font-bold text-purple-900 uppercase tracking-widest mt-1">
                              INTERNAL MEMORANDUM (IC)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Reference Number
                            </div>
                            <div className="font-mono text-sm font-bold text-slate-900">
                              {correspondence.correspondenceNumber}
                            </div>
                            <div className="text-xs text-slate-700 font-medium mt-0.5">
                              <span className="font-bold">Date: </span>
                              <span>{effectiveDate}</span>
                              {!isAlreadySent && (
                                <span className="ml-1 text-[10px] text-amber-800 font-normal print:hidden">
                                  (Send: {effectiveDate})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Internal Memo From / To */}
                        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <p className="text-slate-500 font-semibold">
                              <strong>FROM:</strong> {correspondence.originDepartmentName || correspondence.senderDept || 'Engineering Department'}
                            </p>
                            <p className="text-slate-700">
                              <strong>Originating Officer:</strong> {correspondence.senderPerson || correspondence.createdByUserName}
                            </p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-slate-500 font-semibold">
                              <strong>TO:</strong> {correspondence.destinationDepartmentName || correspondence.recipientDept || 'Project Controls Department'}
                            </p>
                            <p className="text-slate-700">
                              <strong>Action Officer:</strong> {correspondence.recipientPerson || correspondence.assignedUserName || 'Designated Officer'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* External Letterhead (Incoming or Outgoing) */
                      <div className="border-b-2 border-slate-900 pb-5 mb-6 font-sans">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <div className="h-12 w-44">
                              <PjmakLogo variant="full" size="md" />
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-sans space-y-1">
                            <div className="text-xs">
                              <span className="font-bold text-slate-700">Our Ref: </span>
                              <span className="font-mono font-bold text-slate-900">{correspondence.correspondenceNumber}</span>
                            </div>
                            <div className="text-xs text-slate-700">
                              <span className="font-bold">Date: </span>
                              <span className="font-medium text-slate-900">{effectiveDate}</span>
                              {!isAlreadySent && (
                                <span className="ml-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium print:hidden">
                                  (Sending date: {effectiveDate})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-700">
                              <span className="font-bold">Attachment: </span>
                              <span className={totalAttachments > 0 ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                                {totalAttachments > 0 ? `Yes (${totalAttachments})` : 'No'}
                              </span>
                            </div>
                            {correspondence.externalRefNumber && (
                              <div className="text-xs text-slate-600 font-mono">
                                <span className="font-bold font-sans text-slate-700">Your Ref: </span>
                                <span>{correspondence.externalRefNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>

                      {/* Addressee Info: Left top side with larger recipient font matching company name size */}
                      <div className="mt-5 pt-3 border-t border-slate-200 text-xs space-y-1">
                        <div className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          {isIncoming ? 'From:' : 'To:'}
                        </div>
                        <div className="text-base sm:text-lg font-bold text-slate-900">
                          {isIncoming ? correspondence.senderOrg : correspondence.recipientOrg}
                        </div>
                        {(correspondence.recipientPerson || correspondence.senderPerson) && (
                          <div className="text-slate-700 font-medium text-xs">
                            <span className="font-bold text-slate-800">Attention: </span>
                            <span>{isIncoming ? correspondence.senderPerson : correspondence.recipientPerson}</span>
                            {correspondence.recipientPosition && (
                              <span className="text-slate-500"> ({correspondence.recipientPosition})</span>
                            )}
                          </div>
                        )}
                        {(correspondence.recipientEmail || correspondence.senderEmail) && (
                          <div className="text-slate-600 text-xs">
                            <span className="font-bold text-slate-800">Email: </span>
                            <span>{isIncoming ? correspondence.senderEmail : correspondence.recipientEmail}</span>
                          </div>
                        )}

                        {/* Additional Recipients (Multiple Addressees) */}
                        {correspondence.additionalRecipients && correspondence.additionalRecipients.length > 0 && (
                          <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Additional Addressees:
                            </div>
                            {correspondence.additionalRecipients.map((addl, idx) => (
                              <div key={addl.id || idx} className="text-xs text-slate-800 pl-2 border-l-2 border-slate-300">
                                <span className="font-bold text-slate-900">{addl.orgName}</span>
                                {addl.contactPerson && (
                                  <span className="text-slate-600 ml-1.5">
                                    — Attn: {addl.contactPerson} {addl.position ? `(${addl.position})` : ''}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subject Banner */}
                  <div className="font-sans bg-slate-50 p-3.5 rounded-md mb-6 border-l-4 border-slate-900">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      SUBJECT: {correspondence.subject}
                    </span>
                  </div>

                  {/* Document Body */}
                  <div
                    className="prose prose-slate max-w-none text-sm leading-relaxed mb-10 text-slate-800 font-serif"
                    dangerouslySetInnerHTML={{ __html: correspondence.bodyHtml }}
                  />

                  {/* Official Signature Block */}
                  <div className="font-sans pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Yours faithfully,</p>
                      <p className="text-xs font-bold text-slate-900">{settings.companyName}</p>

                      {correspondence.signatureIncluded && (
                        <div className="my-2.5 max-w-xs">
                          <div className="py-1">
                            <img
                              src={
                                settings.signature?.signatureImageUrl ||
                                '/assets/signature_kashefi.svg'
                              }
                              alt={`Signature of ${correspondence.signatoryName || settings.signature.signatoryName}`}
                              className="h-16 w-auto object-contain pointer-events-none select-none"
                            />
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            Digitally authenticated • Registry Seal
                          </div>
                        </div>
                      )}

                      <div className="mt-1">
                        <p className="text-xs font-bold text-slate-900">
                          {correspondence.signatoryName || settings.signature.signatoryName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {correspondence.signatoryPosition || settings.signature.position}
                        </p>
                      </div>
                    </div>

                    {correspondence.approverUserName && (
                      <div className="text-right text-xs text-slate-500 font-sans">
                        <div className="text-emerald-700 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approved by {correspondence.approverUserName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {correspondence.approvalDate?.split('T')[0]}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CC distribution list on official letter if enabled */}
                  {correspondence.showCcOnLetter !== false &&
                    ((correspondence.externalCcRecipients && correspondence.externalCcRecipients.length > 0) ||
                      (correspondence.ccEmails && correspondence.ccEmails.length > 0) ||
                      (correspondence.internalCcUserNames && correspondence.internalCcUserNames.length > 0)) && (
                      <div className="font-sans pt-4 mt-4 border-t border-slate-200 text-xs text-slate-700">
                        <span className="font-bold text-slate-900">cc: </span>
                        <span>
                          {[
                            ...(correspondence.externalCcRecipients || []).map((e) => `${e.name}${e.orgName ? ` (${e.orgName})` : ''}`),
                            ...(correspondence.internalCcUserNames || []),
                            ...(correspondence.ccEmails || []).filter(
                              (em) => !(correspondence.externalCcRecipients || []).some((ext) => ext.email === em)
                            ),
                          ].join(', ')}
                        </span>
                      </div>
                    )}

                  {/* Letterhead Footer: Official Company Information at the bottom */}
                  <div className="font-sans text-[10px] text-slate-400 text-center pt-8 mt-8 border-t border-slate-200">
                    {settings.footerText || "PJMAK Company • KvK 91081289 • Van Grobbendoncklaan 179, 5213 AV 's-Hertogenbosch, the Netherlands • Tel: +31 610 26 95 54"}
                  </div>
                </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERNAL ROUTING & NOTES */}
          {activeTab === 'history' && (
            <div className="w-full max-w-3xl space-y-5 font-sans">
              {/* Participants & Responsibility */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-900" />
                    <span>Participants & Roles</span>
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-blue-800" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                          Responsible Responder
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {correspondence.currentResponsibleUserName || correspondence.assignedUserName || 'Unassigned'}
                      </p>
                      <p className="text-[10px] text-blue-800">Expected to respond or take required action</p>
                    </div>
                    {correspondence.dueDate && (
                      <span className="text-[11px] font-mono text-slate-700 bg-white px-2.5 py-1 rounded border border-blue-200 font-semibold">
                        Due: {correspondence.dueDate}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      CC Recipients (Information Only)
                    </span>
                    {correspondence.ccEmails && correspondence.ccEmails.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {correspondence.ccEmails.map((email, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs"
                          >
                            {email}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-xs mt-1">No CC recipients specified</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Chronological Communication History */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <History className="h-4 w-4 text-slate-600" />
                      <span>Internal Routing & Timeline</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Chronological log of internal forwardings, comments, and instructions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={expandAllHistory}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Expand all
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={collapseAllHistory}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Collapse
                    </button>
                  </div>
                </div>

                {/* The Timeline */}
                <div className="space-y-2.5">
                  {historyList.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-slate-200">
                      No internal communication events recorded yet.
                    </div>
                  ) : (
                    historyList.map((event) => {
                      const isExpanded = expandedHistoryIds.has(event.id);
                      const isCommunication =
                        event.type === 'comment' ||
                        event.type === 'response_received' ||
                        event.type === 'forwarded' ||
                        event.type === 'instruction_given';

                      return (
                        <div
                          key={event.id}
                          className={`rounded-lg border transition-all ${
                            isExpanded
                              ? 'bg-slate-50/80 border-slate-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            onClick={() => toggleHistoryItemExpand(event.id)}
                            className="p-3 flex items-start justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="mt-0.5 text-slate-400">
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </span>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-xs text-slate-900">
                                    {event.title}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                    {event.actorName}
                                  </span>
                                  {event.activityType && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                      {(event.activityType || '').replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {event.description}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-mono text-slate-400 block">
                                {new Date(event.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(event.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-3.5 pt-1 text-xs text-slate-700 border-t border-slate-200/70 space-y-2">
                              {event.fullMessage && (
                                <div className="p-3 bg-white rounded border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                                  {event.fullMessage}
                                </div>
                              )}

                              {isCommunication && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => {
                                      setSelectedHistoryItem(event);
                                      setActiveTab('document');
                                    }}
                                    className="text-xs font-semibold text-blue-900 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View message details
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Internal Note / Response Form */}
                <div className="pt-3 border-t border-slate-200">
                  {!showAddCommunication ? (
                    <button
                      type="button"
                      onClick={() => setShowAddCommunication(true)}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4 text-slate-600" />
                      <span>Add Internal Note, Instruction or Response</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddCommunicationSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Post Internal Communication
                        </span>
                        <select
                          value={commActivityType}
                          onChange={(e: any) => setCommActivityType(e.target.value)}
                          className="text-xs p-1 rounded border border-slate-300 bg-white"
                        >
                          <option value="response">Official Response</option>
                          <option value="instruction">Internal Instruction</option>
                          <option value="internal_message">Internal Note</option>
                          <option value="request_response">Request for Response</option>
                        </select>
                      </div>

                      <div>
                        <textarea
                          rows={3}
                          required
                          value={commMessage}
                          onChange={(e) => setCommMessage(e.target.value)}
                          placeholder="e.g. Please review this variation order and verify contractor calculations..."
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-900 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                            Optional Due Date
                          </label>
                          <input
                            type="date"
                            value={commDueDate}
                            onChange={(e) => setCommDueDate(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                            Optional Attached File Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Review_Checklist.pdf"
                            value={commAttachmentName}
                            onChange={(e) => setCommAttachmentName(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddCommunication(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={commSubmitting || !commMessage.trim()}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          {commSubmitting ? 'Posting...' : 'Post Communication'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS & LINKS */}
          {activeTab === 'attachments' && (
            <div className="w-full max-w-3xl space-y-5 font-sans">
              {/* Attachments Section */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-blue-900" />
                      <span>Document Attachments</span>
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {totalAttachments} {totalAttachments === 1 ? 'file' : 'files'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddAttachmentModal(true)}
                    className="text-xs font-semibold text-blue-900 hover:text-blue-700 cursor-pointer flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> Attach File
                  </button>
                </div>

                {totalAttachments > 0 ? (
                  <div className="space-y-2">
                    {attachmentsList.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-900 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {att.fileName || att.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {att.isInternal ? 'Internal attachment' : 'Official correspondence attachment'} •{' '}
                              {att.uploadedBy || 'User'}
                            </span>
                          </div>
                        </div>
                        <a
                          href={att.url || '#'}
                          download={att.fileName || 'attachment.pdf'}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs flex items-center gap-1"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-slate-200">
                    No files attached to this correspondence yet.
                  </div>
                )}
              </div>

              {/* Related Correspondence */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4 text-slate-600" />
                    <span>Related Correspondence</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(true)}
                    className="text-xs font-semibold text-blue-900 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Link Letter
                  </button>
                </div>

                {correspondence.relatedLinks && correspondence.relatedLinks.length > 0 ? (
                  <div className="space-y-2">
                    {correspondence.relatedLinks.map((rel) => {
                      const linkedItem = allCorrespondence.find((c) => c.id === rel.targetCorrespondenceId);
                      return (
                        <div
                          key={rel.id}
                          onClick={() => {
                            if (linkedItem) onSelectRelated(linkedItem);
                          }}
                          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200">
                                {(rel.relationshipType || 'relates_to').replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {rel.targetCorrespondenceNumber}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                              {rel.targetSubject}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">No related correspondence linked</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 max-w-3xl w-full font-sans">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Internal Routing Tasks</h3>
                  <p className="text-xs text-slate-500">Personnel assigned to take action or review this correspondence</p>
                </div>
                <button
                  onClick={onOpenForwardModal}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
                >
                  + Assign New Action
                </button>
              </div>

              {linkedTasks.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                  No internal tasks created for this correspondence yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedTasks.map((t) => (
                    <div key={t.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          {t.assignedUserName} ({t.assignedDepartmentName})
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" /> Due: {t.dueDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                        {t.instructions}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4 max-w-3xl w-full font-sans">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
                <p className="text-xs text-slate-500">Official sequential timeline and event logs for this correspondence</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {itemLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    No audit logs recorded.
                  </div>
                ) : (
                  itemLogs.map((log) => (
                    <div key={log.id} className="p-3.5 text-xs flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px] text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {log.action}
                          </span>
                          <span className="text-slate-800 font-medium">{log.newValue || log.previousValue}</span>
                        </div>
                        {log.reason && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">Justification: "{log.reason}"</p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400 shrink-0">
                        <div className="font-medium text-slate-600">{log.performedByUserName}</div>
                        <div>{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ADMIN DATE MODIFICATION & VOID */}
          {activeTab === 'admin_date' && isAdmin && (
            <div className="p-6 bg-white rounded-xl border border-amber-200 shadow-2xs max-w-xl w-full mx-auto space-y-4 font-sans">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Lock className="h-4 w-4 text-amber-600" />
                <span>Administrator Official Date Modification</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Official correspondence dates are recorded upon registration. As Administrator, you may alter the official date under audit regulations. A permanent audit log entry will be created.
              </p>

              {dateMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                  {dateMessage}
                </div>
              )}

              <form onSubmit={handleDateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Official Date</label>
                  <input
                    type="text"
                    disabled
                    value={correspondence.officialDate}
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Official Date *</label>
                  <input
                    type="date"
                    required
                    value={newDateValue}
                    onChange={(e) => setNewDateValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Justification *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide specific reason for altering the official correspondence date..."
                    value={adminDateReason}
                    onChange={(e) => setAdminDateReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={dateLoading}
                  className="w-full py-2 px-4 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {dateLoading ? 'Saving...' : 'Authorize & Record Date Change'}
                </button>
              </form>

              {/* Void option */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs text-slate-500">Need to cancel this correspondence number?</span>
                <button
                  type="button"
                  onClick={() => setShowVoidDialog(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                >
                  Void Official Number
                </button>
              </div>
            </div>
          )}
        </div>
        {/* MODAL: LINK CORRESPONDENCE SEARCH */}
        {showLinkModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-lg w-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <GitBranch className="h-4 w-4 text-sky-600" />
                  <span>Link Related Correspondence</span>
                </div>
                <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship Type</label>
                <select
                  value={linkRelationshipType}
                  onChange={(e: any) => setLinkRelationshipType(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                >
                  <option value="response_to">Response to</option>
                  <option value="reply_to">Reply to</option>
                  <option value="followup_to">Follow-up to</option>
                  <option value="related_to">Related to</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Search Correspondence Number or Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. IN-2026-1 or Change Order..."
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {allCorrespondence
                  .filter(
                    (c) =>
                      c.id !== correspondence.id &&
                      (c.correspondenceNumber.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                        c.subject.toLowerCase().includes(linkSearchQuery.toLowerCase()))
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLinkSubmit(item.id)}
                      className="p-2.5 hover:bg-sky-50 cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900">{item.correspondenceNumber}</span>
                        <p className="text-slate-600 line-clamp-1">{item.subject}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{item.type}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD ATTACHMENT */}
        {showAddAttachmentModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
            <form onSubmit={handleAddAttachmentSubmit} className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Paperclip className="h-4 w-4 text-sky-600" />
                  <span>Attach Document to Correspondence</span>
                </div>
                <button type="button" onClick={() => setShowAddAttachmentModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">File Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Approved_Variation_Order_02.pdf"
                  value={attFileName}
                  onChange={(e) => setAttFileName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="Optional brief description"
                  value={attNote}
                  onChange={(e) => setAttNote(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAttachmentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attSubmitting || !attFileName.trim()}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-2xs"
                >
                  {attSubmitting ? 'Attaching...' : 'Add Attachment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Void confirmation dialog */}
        {showVoidDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-xl shadow-xl border border-rose-200 p-6 max-w-md w-full space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Void Correspondence Number</span>
              </div>
              <p className="text-xs text-slate-600">
                You are about to void <strong>{correspondence.correspondenceNumber}</strong>. Once voided, this official number will never be reused or deleted, and will be visible in the voided register.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Cancellation / Voiding *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason (e.g. Inadvertent duplication, superseded by revised procurement package)..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowVoidDialog(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoidSubmit}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-2xs"
                >
                  Confirm Void
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval confirmation dialog */}
        {showApproveDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-xl shadow-xl border border-emerald-200 p-6 max-w-md w-full space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Authorize & Approve Outgoing Letter</span>
              </div>
              <p className="text-xs text-slate-600">
                You are authorizing the official issuance of{' '}
                <strong>{correspondence.correspondenceNumber}</strong> under your credentials as {currentUser.title}.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approval Notes / Endorsement
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional approval commentary (e.g. Approved following executive review)..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowApproveDialog(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveSubmit}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
                >
                  Grant Formal Approval
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive Category & Folder Dialog */}
        {showArchiveDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 text-xs animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#0B1E36] font-bold text-sm">
                  <Archive className="h-5 w-5 text-amber-600" />
                  <span>Archive & Categorize Correspondence</span>
                </div>
                <button
                  onClick={() => setShowArchiveDialog(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-slate-600">
                Manage archive status and select an archive category folder for <strong>{correspondence.correspondenceNumber}</strong>:
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Archive Category Folder
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  <label
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      !archiveTargetFolderId
                        ? 'bg-amber-50 border border-amber-300 text-amber-900 font-bold'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-slate-400" />
                      <span>General Uncategorized Archive</span>
                    </span>
                    <input
                      type="radio"
                      name="archiveFolder"
                      checked={!archiveTargetFolderId}
                      onChange={() => setArchiveTargetFolderId('')}
                      className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>

                  {archiveFolders.map((f) => (
                    <label
                      key={f.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        archiveTargetFolderId === f.id
                          ? 'bg-amber-50 border border-amber-300 text-amber-900 font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-600 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <input
                        type="radio"
                        name="archiveFolder"
                        checked={archiveTargetFolderId === f.id}
                        onChange={() => setArchiveTargetFolderId(f.id)}
                        className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Archive Notes / Classification Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Contract signed, archived per project handover schedule..."
                  value={archiveNotesInput}
                  onChange={(e) => setArchiveNotesInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {correspondence.isArchived ? (
                  <button
                    type="button"
                    onClick={() => handleArchiveSubmit(false)}
                    disabled={archiveSubmitting}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    Restore to Active Register
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowArchiveDialog(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchiveSubmit(true)}
                    disabled={archiveSubmitting}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0B1E36] hover:bg-[#08182b] rounded-lg shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {archiveSubmitting ? 'Saving...' : 'Save to Archive'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-80 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Delete Correspondence Record?
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Are you sure you want to permanently delete this letter? The system will automatically roll back the sequence counter so that your numbering sequence remains uninterrupted and consecutive.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                    <span>Reference Number:</span>
                    <span className="text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {correspondence.correspondenceNumber}
                    </span>
                  </div>
                  <div className="text-slate-700">
                    <span className="font-semibold text-slate-500">Subject: </span>
                    <span className="font-medium">{correspondence.subject}</span>
                  </div>
                  <div className="text-slate-500 flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                    <span>Type: <strong className="uppercase text-slate-700">{correspondence.type}</strong></span>
                    <span>Date: <strong className="text-slate-700">{correspondence.officialDate}</strong></span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleExecuteDelete}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
                >
                  {deleting ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Letter Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
