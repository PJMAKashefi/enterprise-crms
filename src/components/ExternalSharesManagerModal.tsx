import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Calendar,
  Clock,
  Shield,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  ExternalLink,
  MessageSquare,
  FileText,
  Trash2,
  RefreshCw,
  Plus,
  CornerDownRight,
  ArrowRight,
  Check,
  Ban,
  FileCheck,
} from 'lucide-react';
import {
  DocumentShare,
  DocumentComment,
  TechnicalDocument,
  ExternalAccessAuditLog,
  ExtensionRequest,
} from '../types';
import { formatScheduleDisplay } from '../utils/accessSchedule';

interface ExternalSharesManagerModalProps {
  onClose: () => void;
  onOpenNewShare: () => void;
  onSelectDocumentForViewer?: (shareId: string) => void;
  technicalDocuments: TechnicalDocument[];
  onRefreshDocuments?: () => void;
}

export const ExternalSharesManagerModal: React.FC<ExternalSharesManagerModalProps> = ({
  onClose,
  onOpenNewShare,
  onSelectDocumentForViewer,
  technicalDocuments,
  onRefreshDocuments,
}) => {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Selected share for comment or extension review
  const [selectedShare, setSelectedShare] = useState<any | null>(null);
  const [shareComments, setShareComments] = useState<DocumentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'extensions' | 'comments'>('all');

  // Comment action state
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [applyingRevisionCmtId, setApplyingRevisionCmtId] = useState<string | null>(null);
  const [newRevisionNotes, setNewRevisionNotes] = useState('');

  // Extension decision state
  const [reviewingExtension, setReviewingExtension] = useState<{
    share: any;
    req: ExtensionRequest;
  } | null>(null);
  const [extensionDaysDecision, setExtensionDaysDecision] = useState(7);
  const [adminExtensionNote, setAdminExtensionNote] = useState('');

  // Revoke state
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [revocationReason, setRevocationReason] = useState('');

  // Audit logs modal
  const [selectedShareAuditLogs, setSelectedShareAuditLogs] = useState<ExternalAccessAuditLog[] | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/external-shares');
      const data = await res.json();
      setShares(data);
      if (data.length > 0 && !selectedShare) {
        setSelectedShare(data[0]);
        loadCommentsForShare(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching shares:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentsForShare = async (shareId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/external/documents/${shareId}/comments`);
      const data = await res.json();
      setShareComments(data);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSelectShare = (s: any) => {
    setSelectedShare(s);
    loadCommentsForShare(s.id);
  };

  const copyShareLink = (s: any) => {
    const url = `${window.location.origin}/?ext_share=${s.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(s.id);
    setTimeout(() => setCopiedShareId(null), 2500);
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const res = await fetch(`/api/external-shares/${shareId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revocationReason || 'Access terminated by document controller' }),
      });
      if (!res.ok) throw new Error('Failed to revoke access');
      setRevokingShareId(null);
      setRevocationReason('');
      fetchShares();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewExtension = async (shareId: string, extId: string, decision: 'approved' | 'rejected') => {
    try {
      let newDateStr: string | undefined;
      if (decision === 'approved') {
        const d = new Date(Date.now() + extensionDaysDecision * 24 * 60 * 60 * 1000);
        newDateStr = d.toISOString().slice(0, 10);
      }

      const res = await fetch(`/api/external-shares/${shareId}/extension/${extId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          newExpiryDate: newDateStr,
          adminComment: adminExtensionNote,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit extension review');
      setReviewingExtension(null);
      setAdminExtensionNote('');
      fetchShares();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateCommentStatus = async (commentId: string, status: string) => {
    try {
      const res = await fetch(`/api/external-comments/${commentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      if (selectedShare) loadCommentsForShare(selectedShare.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendInternalReply = async (commentId: string) => {
    const text = replyText[commentId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`/api/external/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          authorRole: 'internal',
          authorCompany: 'PJMAK Engineering & Document Control',
        }),
      });

      if (!res.ok) throw new Error('Failed to send reply');
      setReplyText({ ...replyText, [commentId]: '' });
      if (selectedShare) loadCommentsForShare(selectedShare.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApplyFeedbackToNewRevision = async (commentId: string) => {
    try {
      const res = await fetch(`/api/external-comments/${commentId}/apply-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: newRevisionNotes || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create new revision');
      const data = await res.json();
      alert(`Success: Created new EDMS revision ${data.newRevision.revision} incorporating review feedback.`);
      setApplyingRevisionCmtId(null);
      setNewRevisionNotes('');
      if (selectedShare) loadCommentsForShare(selectedShare.id);
      if (onRefreshDocuments) onRefreshDocuments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const viewAuditLogs = async (shareId: string) => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/external-audit-logs?shareId=${shareId}`);
      const data = await res.json();
      setSelectedShareAuditLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const filteredShares = shares.filter((s) => {
    if (activeTab === 'active') return s.liveStatus === 'active' || s.liveStatus === 'outside_working_hours';
    if (activeTab === 'extensions') return s.pendingExtension;
    if (activeTab === 'comments') return s.totalComments > 0;
    return true;
  });

  return (
    <div
      id="external-shares-manager-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto"
    >
      <div
        id="external-shares-manager-container"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Controlled External Document Access & Review Manager
                </h2>
                <span className="text-2xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">
                  EDMS Security Extension
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage external reviewer invitations, strict schedules, live authorization status, and review comments
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="new-external-share-btn"
              onClick={onOpenNewShare}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Share Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Filters & Stats Bar */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Invitations ({shares.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Active / Scheduled ({shares.filter((s) => s.liveStatus === 'active' || s.liveStatus === 'outside_working_hours').length})
            </button>
            <button
              onClick={() => setActiveTab('extensions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'extensions'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Pending Extensions</span>
              {shares.some((s) => s.pendingExtension) && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'comments'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              With Review Comments ({shares.filter((s) => s.totalComments > 0).length})
            </button>
          </div>

          <button
            onClick={fetchShares}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Main Content Area: Split View (List of Shares on Left, Selected Share Details & Comments on Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Shares List Table */}
          <div className="w-full md:w-1/2 lg:w-5/12 border-r border-slate-200 overflow-y-auto bg-slate-50/50 p-4 space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading external document shares...</div>
            ) : filteredShares.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Share2 className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">No controlled shares matching criteria.</p>
                <button
                  onClick={onOpenNewShare}
                  className="text-xs text-teal-600 hover:underline font-medium"
                >
                  Create a new external share invitation
                </button>
              </div>
            ) : (
              filteredShares.map((s) => {
                const isSelected = selectedShare?.id === s.id;
                const status = s.liveStatus;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectShare(s)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-white shadow-sm ring-1 ring-teal-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    {/* Top row: Document number + status badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-900 block">
                          {s.documentNumber}
                        </span>
                        <span className="text-2xs text-slate-500 font-medium">
                          {s.selectedRevision} • {s.documentTitle}
                        </span>
                      </div>

                      {/* Live evaluated status badge */}
                      <span
                        className={`text-2xs px-2 py-0.5 rounded-full font-medium uppercase shrink-0 ${
                          status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : status === 'outside_working_hours'
                            ? 'bg-blue-100 text-blue-800'
                            : status === 'revoked'
                            ? 'bg-rose-100 text-rose-800'
                            : status === 'extension_requested'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {(status || 'active').replace('_', ' ')}
                      </span>
                    </div>

                    {/* Recipient info */}
                    <div className="flex items-center space-x-2 text-xs text-slate-600 mb-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{s.recipientName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="truncate text-slate-500">{s.recipientCompany}</span>
                    </div>

                    {/* Schedule summary */}
                    <div className="text-2xs font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between">
                      <span>{s.schedule.startDate} to {s.schedule.expiryDate}</span>
                      <span>{s.schedule.dailyStartTime}–{s.schedule.dailyEndTime} ({s.schedule.timeZone.split('/')[1] || 'CET'})</span>
                    </div>

                    {/* Pending Extension Notice */}
                    {s.pendingExtension && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-2xs text-amber-800 flex items-center justify-between">
                        <span className="flex items-center space-x-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Extension Requested ({s.pendingExtension.requestedWorkingDays ? `+${s.pendingExtension.requestedWorkingDays} days` : 'Custom'})</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShare(s);
                            setReviewingExtension({ share: s, req: s.pendingExtension });
                          }}
                          className="px-2 py-0.5 bg-amber-600 text-white rounded font-bold hover:bg-amber-700"
                        >
                          Review
                        </button>
                      </div>
                    )}

                    {/* Bottom actions strip */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.totalComments || 0} comments</span>
                        </span>
                        {s.lastAccessAt && (
                          <span>Last viewed: {new Date(s.lastAccessAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyShareLink(s);
                        }}
                        className="text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedShareId === s.id ? 'Copied' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected Share Details & Review Comments Feed */}
          <div className="hidden md:flex flex-1 flex-col overflow-y-auto bg-white p-6 space-y-6">
            {selectedShare ? (
              <>
                {/* Share Overview Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {selectedShare.documentNumber} ({selectedShare.selectedRevision})
                        </h3>
                        <span className="text-2xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full uppercase">
                          {(selectedShare.liveStatus || 'active').replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{selectedShare.documentTitle}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyShareLink(selectedShare)}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>{copiedShareId === selectedShare.id ? 'Copied!' : 'Copy Review Link'}</span>
                      </button>

                      {onSelectDocumentForViewer && (
                        <button
                          onClick={() => onSelectDocumentForViewer(selectedShare.id)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Viewer</span>
                        </button>
                      )}

                      {selectedShare.liveStatus !== 'revoked' && (
                        <button
                          onClick={() => setRevokingShareId(selectedShare.id)}
                          className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Revoke Access</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reviewer & Schedule Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Reviewer Name</span>
                      <span className="font-semibold text-slate-800">{selectedShare.recipientName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Organization</span>
                      <span className="font-semibold text-slate-800">{selectedShare.recipientCompany}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Permitted Schedule</span>
                      <span className="font-mono text-slate-700">
                        {selectedShare.schedule.dailyStartTime}–{selectedShare.schedule.dailyEndTime} ({selectedShare.schedule.timeZone.split('/')[1]})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Validity Window</span>
                      <span className="font-mono text-slate-700">
                        {selectedShare.schedule.startDate} to {selectedShare.schedule.expiryDate}
                      </span>
                    </div>
                  </div>

                  {/* Security permissions row */}
                  <div className="flex items-center justify-between text-2xs text-slate-500 pt-2 border-t border-slate-200">
                    <div className="flex items-center space-x-3">
                      <span>Permissions:</span>
                      <span className={selectedShare.permissions.canComment ? 'text-teal-700 font-semibold' : 'text-slate-400'}>
                        Comments: {selectedShare.permissions.canComment ? 'Allowed' : 'Disabled'}
                      </span>
                      <span>•</span>
                      <span className={selectedShare.permissions.canDownload ? 'text-teal-700 font-semibold' : 'text-slate-400'}>
                        Download: {selectedShare.permissions.canDownload ? 'Yes' : 'Protected'}
                      </span>
                      <span>•</span>
                      <span className={selectedShare.permissions.canPrint ? 'text-teal-700 font-semibold' : 'text-slate-400'}>
                        Print: {selectedShare.permissions.canPrint ? 'Yes' : 'Protected'}
                      </span>
                      <span>•</span>
                      <span className={selectedShare.permissions.canCopy ? 'text-teal-700 font-semibold' : 'text-slate-400'}>
                        Copy: {selectedShare.permissions.canCopy ? 'Yes' : 'Protected'}
                      </span>
                    </div>

                    <button
                      onClick={() => viewAuditLogs(selectedShare.id)}
                      className="text-teal-600 hover:text-teal-700 font-semibold flex items-center space-x-1"
                    >
                      <span>View Access Audit Trail</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Revoke confirmation box */}
                {revokingShareId === selectedShare.id && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Immediate Access Revocation</span>
                    </div>
                    <p className="text-xs text-rose-700">
                      Revoking access takes effect immediately on the server. The external reviewer will be blocked from accessing this document.
                    </p>
                    <input
                      type="text"
                      value={revocationReason}
                      onChange={(e) => setRevocationReason(e.target.value)}
                      placeholder="Enter reason for revocation (e.g. Contract completed, revision superseded)..."
                      className="w-full px-3 py-1.5 text-xs border border-rose-300 rounded bg-white"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setRevokingShareId(null)}
                        className="px-3 py-1 bg-white border border-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRevokeShare(selectedShare.id)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                      >
                        Confirm Revoke Access
                      </button>
                    </div>
                  </div>
                )}

                {/* Extension Review Modal / Drawer */}
                {reviewingExtension && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>Review Access Extension Request</span>
                      </div>
                      <button onClick={() => setReviewingExtension(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs space-y-1 text-slate-700">
                      <div>
                        <strong>Reviewer:</strong> {reviewingExtension.share.recipientName} ({reviewingExtension.share.recipientCompany})
                      </div>
                      <div>
                        <strong>Reason:</strong> "{reviewingExtension.req.reason}"
                      </div>
                      <div>
                        <strong>Requested Duration:</strong>{' '}
                        {reviewingExtension.req.requestedWorkingDays ? `+${reviewingExtension.req.requestedWorkingDays} working days` : reviewingExtension.req.requestedExpiryDate}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-2xs text-slate-500 block mb-1">Approved Extension Duration</label>
                        <select
                          value={extensionDaysDecision}
                          onChange={(e) => setExtensionDaysDecision(Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value={3}>+3 Working Days</option>
                          <option value={5}>+5 Working Days</option>
                          <option value={7}>+7 Days (1 Week)</option>
                          <option value={14}>+14 Days (2 Weeks)</option>
                          <option value={30}>+30 Days (1 Month)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-2xs text-slate-500 block mb-1">Administrator Note</label>
                        <input
                          type="text"
                          value={adminExtensionNote}
                          onChange={(e) => setAdminExtensionNote(e.target.value)}
                          placeholder="e.g. Approved per project manager authorization"
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-amber-200">
                      <button
                        onClick={() => handleReviewExtension(reviewingExtension.share.id, reviewingExtension.req.id, 'rejected')}
                        className="px-3 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold"
                      >
                        Reject Extension
                      </button>
                      <button
                        onClick={() => handleReviewExtension(reviewingExtension.share.id, reviewingExtension.req.id, 'approved')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                      >
                        Approve Extension
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Comments & Revision Linkage Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                        <MessageSquare className="w-4 h-4 text-teal-600" />
                        <span>External Review Comments ({shareComments.length})</span>
                      </h4>
                      <span className="text-2xs text-slate-500">
                        Directly linked to revision {selectedShare.selectedRevision}
                      </span>
                    </div>

                    <span className="text-2xs text-slate-500">
                      Comments do not automatically alter EDMS files until formally applied
                    </span>
                  </div>

                  {loadingComments ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading review comments...</div>
                  ) : shareComments.length === 0 ? (
                    <div className="py-8 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                      No review comments posted by external reviewers for this document yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shareComments.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          {/* Comment Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900">{cmt.authorName}</span>
                                <span className="text-2xs text-slate-400">({cmt.authorCompany})</span>
                                <span className="text-2xs bg-slate-100 text-slate-600 font-mono px-1.5 py-0.2 rounded">
                                  {cmt.revision}
                                </span>
                              </div>
                              <div className="text-2xs text-slate-400 mt-0.5">
                                Posted {new Date(cmt.createdAt).toLocaleString()}
                              </div>
                            </div>

                            {/* Status Selector */}
                            <div className="flex items-center space-x-1">
                              <select
                                value={cmt.status}
                                onChange={(e) => handleUpdateCommentStatus(cmt.id, e.target.value)}
                                className={`text-2xs px-2 py-1 rounded font-semibold border ${
                                  cmt.status === 'resolved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : cmt.status === 'accepted'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : cmt.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <option value="open">Open</option>
                                <option value="in_discussion">In Discussion</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </div>
                          </div>

                          {cmt.locationAnnotation && (
                            <div className="text-2xs font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded inline-block">
                              📍 Location: {cmt.locationAnnotation}
                              {cmt.pageNumber ? ` (Sheet/Page ${cmt.pageNumber})` : ''}
                            </div>
                          )}

                          <p className="text-xs text-slate-800 bg-slate-50/70 p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                            {cmt.commentText}
                          </p>

                          {/* Resulting Revision Banner if already resolved */}
                          {cmt.resultingRevision && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                Feedback incorporated into official EDMS revision: <strong>{cmt.resultingRevision}</strong>
                              </span>
                            </div>
                          )}

                          {/* Threaded replies */}
                          {cmt.replies && cmt.replies.length > 0 && (
                            <div className="pl-4 border-l-2 border-slate-200 space-y-2 pt-1">
                              {cmt.replies.map((r) => (
                                <div key={r.id} className="text-2xs bg-slate-50 p-2 rounded border border-slate-100 space-y-0.5">
                                  <div className="font-semibold text-slate-800 flex justify-between">
                                    <span>
                                      {r.authorName} ({r.authorRole === 'internal' ? 'PJMAK Engineering' : r.authorCompany})
                                    </span>
                                    <span className="text-slate-400 font-normal">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-slate-600">{r.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Actions: Reply & Apply Feedback to New Revision */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            {/* Apply Feedback to Revision button */}
                            {cmt.status !== 'resolved' ? (
                              <button
                                onClick={() => setApplyingRevisionCmtId(cmt.id)}
                                className="px-3 py-1 bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                                <span>Apply Feedback into New Revision</span>
                              </button>
                            ) : (
                              <span className="text-2xs text-emerald-700 font-medium flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>Revision Created</span>
                              </span>
                            )}

                            {/* Reply Input */}
                            <div className="flex items-center space-x-2 w-1/2">
                              <input
                                type="text"
                                value={replyText[cmt.id] || ''}
                                onChange={(e) => setReplyText({ ...replyText, [cmt.id]: e.target.value })}
                                placeholder="Reply to reviewer..."
                                className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                              />
                              <button
                                onClick={() => handleSendInternalReply(cmt.id)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium"
                              >
                                Reply
                              </button>
                            </div>
                          </div>

                          {/* Apply Feedback Modal / Form */}
                          {applyingRevisionCmtId === cmt.id && (
                            <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2 text-xs">
                              <div className="font-semibold text-teal-900 flex items-center space-x-1.5">
                                <FileCheck className="w-4 h-4 text-teal-700" />
                                <span>Issue Next Revision in EDMS Applying This Feedback</span>
                              </div>
                              <p className="text-2xs text-teal-700">
                                This will officially increment the document revision in PJMAK EDMS, record the reviewer's feedback in revision notes, and resolve this comment thread.
                              </p>
                              <textarea
                                rows={2}
                                value={newRevisionNotes}
                                onChange={(e) => setNewRevisionNotes(e.target.value)}
                                placeholder="Revision change description (e.g. Revised Nozzle N3 flange rating to Class 300 per NPC comments)..."
                                className="w-full p-2 text-xs border border-teal-300 rounded bg-white"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setApplyingRevisionCmtId(null)}
                                  className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-600"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleApplyFeedbackToNewRevision(cmt.id)}
                                  className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-bold"
                                >
                                  Issue New Revision Now
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Select a controlled share from the left to inspect details, manage schedules, and review comments.
              </div>
            )}
          </div>
        </div>

        {/* Audit Logs Sub-Modal */}
        {selectedShareAuditLogs && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>Access & Review Audit Trail</span>
                </h3>
                <button
                  onClick={() => setSelectedShareAuditLogs(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100 text-xs space-y-2">
                {selectedShareAuditLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No audit events recorded yet.</div>
                ) : (
                  selectedShareAuditLogs.map((log) => (
                    <div key={log.id} className="pt-2 pb-1 space-y-1">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="font-semibold text-slate-800 uppercase font-mono">
                          {(log.eventType || '').replace('_', ' ')}
                        </span>
                        <span className="text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs">{log.details}</p>
                      <div className="flex items-center space-x-2 text-2xs text-slate-400">
                        <span>Actor: {log.actorType}</span>
                        {log.result && (
                          <span
                            className={`px-1.5 py-0.2 rounded font-medium ${
                              log.result === 'allowed' || log.result === 'success'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {log.result}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedShareAuditLogs(null)}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
