import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Clock,
  Lock,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Send,
  User,
  Building,
  RefreshCw,
  LogOut,
  FileText,
  AlertCircle,
  HelpCircle,
  CornerDownRight,
  Sparkles,
} from 'lucide-react';
import {
  DocumentShare,
  DocumentComment,
  TechnicalDocument,
  ExtensionRequest,
  ExternalAccessStatus,
} from '../types';
import { evaluateClientAccessStatus, getClientTimeInZone } from '../utils/accessSchedule';

interface ExternalDocumentViewerProps {
  shareToken?: string;
  shareId?: string;
  onExit?: () => void;
}

export const ExternalDocumentViewer: React.FC<ExternalDocumentViewerProps> = ({
  shareToken,
  shareId: initialShareId,
  onExit,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication & session
  const [authRequired, setAuthRequired] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Loaded Share & Document state
  const [share, setShare] = useState<DocumentShare | null>(null);
  const [document, setDocument] = useState<TechnicalDocument | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Live schedule evaluation
  const [accessEvaluation, setAccessEvaluation] = useState<{
    allowed: boolean;
    status: ExternalAccessStatus;
    reason: string;
    nextActiveTime?: string;
    timeZone: string;
  } | null>(null);

  // Comments panel & new comment
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(true);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentLocation, setCommentLocation] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Extension request modal
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionDays, setExtensionDays] = useState(5);
  const [extensionReason, setExtensionReason] = useState('');
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);
  const [extensionSuccessMsg, setExtensionSuccessMsg] = useState<string | null>(null);

  // Watermark details
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('');

  // Update clock display every 30 seconds
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeDisplay(
        now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      // Re-evaluate schedule locally if share exists
      if (share) {
        const evalResult = evaluateClientAccessStatus(share, now);
        setAccessEvaluation(evalResult);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [share]);

  // Initial Load: check token or shareId
  useEffect(() => {
    fetchShareInfo();
  }, [shareToken, initialShareId]);

  const fetchShareInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      if (shareToken) {
        // Look up by token
        const res = await fetch(`/api/external/shares/${shareToken}`);
        if (!res.ok) {
          throw new Error('Share link is invalid, expired, or was revoked.');
        }
        const data = await res.json();
        setShare(data.share);
        setUsernameInput(data.share.recipientUsername || '');

        // Prompt user to verify password / credentials
        setAuthRequired(true);
        setLoading(false);
      } else if (initialShareId) {
        // Direct share load
        await loadDocumentData(initialShareId);
      } else {
        // No token or ID provided, show login
        setAuthRequired(true);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document share');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/external/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: usernameInput.trim(),
          password: passwordInput,
          shareToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Authentication failed');
      }

      const data = await res.json();
      setAuthRequired(false);

      // Find the relevant share
      let targetShareId = initialShareId;
      if (!targetShareId && share) {
        targetShareId = share.id;
      } else if (!targetShareId && data.authorizedShares && data.authorizedShares.length > 0) {
        targetShareId = data.authorizedShares[0].id;
      }

      if (targetShareId) {
        await loadDocumentData(targetShareId);
      } else {
        setError('No active documents currently assigned to your account.');
        setLoading(false);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadDocumentData = async (shareId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/external/documents/${shareId}`);
      const data = await res.json();

      if (!res.ok) {
        // Could be schedule blocked (403)
        if (data.evaluation) {
          setAccessEvaluation(data.evaluation);
        }
        if (data.share) {
          setShare(data.share);
        }
        setError(data.error || 'Access to this document is currently restricted.');
        setLoading(false);
        return;
      }

      setDocument(data.document);
      setShare(data.share);
      setComments(data.comments || []);
      setSelectedRevision(data.share.selectedRevision || data.document.currentRevision);
      setAccessEvaluation(data.evaluation);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error communicating with secure document server.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!share || !commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/external/documents/${share.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: selectedRevision,
          pageNumber: currentPage,
          locationAnnotation: commentLocation.trim(),
          commentText: commentText.trim(),
          authorName: share.recipientName,
          authorCompany: share.recipientCompany,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit review comment');
      }

      const newCmt = await res.json();
      setComments([...comments, newCmt]);
      setCommentText('');
      setCommentLocation('');
      setIsAddingComment(false);
    } catch (err: any) {
      alert(`Error submitting comment: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim() || !share) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/external/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: replyText.trim(),
          authorName: share.recipientName,
          authorRole: 'external',
          authorCompany: share.recipientCompany,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reply');
      }

      const updatedComment = await res.json();
      setComments(comments.map((c) => (c.id === commentId ? updatedComment : c)));
      setReplyText('');
      setActiveReplyId(null);
    } catch (err: any) {
      alert(`Reply error: ${err.message}`);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!share || !extensionReason.trim()) return;

    setIsSubmittingExtension(true);
    try {
      const res = await fetch(`/api/external/documents/${share.id}/extension-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedWorkingDays: extensionDays,
          reason: extensionReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit extension request');
      }

      const data = await res.json();
      setShare(data.share);
      setExtensionSuccessMsg('Extension request has been submitted to PJMAK Document Control for review.');
      setTimeout(() => {
        setShowExtensionModal(false);
        setExtensionSuccessMsg(null);
        setExtensionReason('');
      }, 3000);
    } catch (err: any) {
      alert(`Extension error: ${err.message}`);
    } finally {
      setIsSubmittingExtension(false);
    }
  };

  // Prevent copying or right-click if copy permission is disabled
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!share?.permissions.canCopy) {
      e.preventDefault();
    }
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    if (!share?.permissions.canCopy) {
      e.preventDefault();
    }
  };

  // 1. Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-semibold tracking-wide text-slate-200">
          PJMAK Controlled Document Management System
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Verifying secure authorization schedule & encryption tokens...
        </p>
      </div>
    );
  }

  // 2. Authentication Screen (if login required)
  if (authRequired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-950 text-teal-400 border border-teal-800 shadow-xs mb-1">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              PJMAK Controlled Document Access
            </h1>
            <p className="text-xs text-slate-400">
              Authorized External Review Portal • Official Security Boundary
            </p>
          </div>

          {share && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Requested Document:</span>
                <span className="font-mono font-bold text-teal-300">{share.documentNumber}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Intended Reviewer:</span>
                <span className="font-medium text-slate-200">{share.recipientName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Organization:</span>
                <span className="font-medium text-slate-300">{share.recipientCompany}</span>
              </div>
            </div>
          )}

          {loginError && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Username or Official Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. reza.npc"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Review Access Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-white placeholder-slate-500"
                />
              </div>
              <p className="text-2xs text-slate-500 mt-1">
                Default reviewer credentials were provided in your official invitation transmittal.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-teal-950/50 flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <span>Validating Session & Schedule...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate & Open Controlled Viewer</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            {onExit && (
              <button
                onClick={onExit}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Return to PJMAK Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Access Blocked State (Outside Working Hours / Expired / Revoked)
  if (accessEvaluation && !accessEvaluation.allowed) {
    const isOutsideHours = accessEvaluation.status === 'outside_working_hours';
    const isExpired = accessEvaluation.status === 'expired' || accessEvaluation.status === 'extension_requested';
    const isRevoked = accessEvaluation.status === 'revoked';

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6 text-center">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto shadow-md ${
              isRevoked
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : isExpired
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-blue-950 text-blue-400 border border-blue-800'
            }`}
          >
            {isRevoked ? (
              <Lock className="w-8 h-8" />
            ) : isExpired ? (
              <Calendar className="w-8 h-8" />
            ) : (
              <Clock className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isRevoked
                ? 'Document Access Revoked'
                : isExpired
                ? 'Access Authorization Expired'
                : 'Access Currently Inactive (Outside Working Hours)'}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{accessEvaluation.reason}</p>
          </div>

          {/* Schedule specifics */}
          {share && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-xs text-left space-y-2.5">
              <div className="flex justify-between text-slate-400">
                <span>Document:</span>
                <span className="font-mono font-bold text-slate-200">{share.documentNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Authorized Schedule:</span>
                <span className="font-medium text-slate-200">
                  {share.schedule.dailyStartTime} – {share.schedule.dailyEndTime} ({share.schedule.timeZone})
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Validity Period:</span>
                <span className="font-medium text-slate-200">
                  {share.schedule.startDate} to {share.schedule.expiryDate}
                </span>
              </div>
              {accessEvaluation.nextActiveTime && (
                <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-teal-400">
                  <span className="font-medium">Access Resumes:</span>
                  <span className="font-bold">{accessEvaluation.nextActiveTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {isExpired && share?.permissions.canRequestExtension && (
              <button
                id="request-extension-btn"
                onClick={() => setShowExtensionModal(true)}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/50"
              >
                <Calendar className="w-4 h-4" />
                <span>Request Review Period Extension</span>
              </button>
            )}

            <div className="flex items-center justify-center space-x-4 pt-2">
              <button
                onClick={() => {
                  if (share) loadDocumentData(share.id);
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
              {onExit && (
                <button
                  onClick={onExit}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Exit Viewer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Extension Request Modal */}
        {showExtensionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full space-y-4 text-left shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Request Review Extension</span>
                </h3>
                <button
                  onClick={() => setShowExtensionModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {extensionSuccessMsg ? (
                <div className="p-4 bg-teal-950/60 border border-teal-700 rounded-lg text-teal-300 text-xs text-center">
                  {extensionSuccessMsg}
                </div>
              ) : (
                <form onSubmit={handleRequestExtension} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Additional Working Days Needed
                    </label>
                    <select
                      value={extensionDays}
                      onChange={(e) => setExtensionDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value={3}>+3 Working Days</option>
                      <option value={5}>+5 Working Days (1 Week)</option>
                      <option value={10}>+10 Working Days (2 Weeks)</option>
                      <option value={15}>+15 Working Days (3 Weeks)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Reason / Justification *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      placeholder="e.g. Additional technical clarification required from process engineering team regarding nozzle ratings."
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowExtensionModal(false)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingExtension}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-medium"
                    >
                      {isSubmittingExtension ? 'Submitting...' : 'Submit Extension Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. Authorized Document Viewer View
  if (!document || !share) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />
        <h2 className="text-base font-semibold">Document Not Loaded</h2>
        <p className="text-xs text-slate-400 mt-1">{error || 'Please contact document administrator.'}</p>
      </div>
    );
  }

  const activeComments = comments.filter((c) => c.revision === selectedRevision);

  return (
    <div
      id="pjmak-controlled-viewer"
      onContextMenu={handleContextMenu}
      onCopy={handleCopy}
      className={`min-h-screen bg-slate-900 text-slate-100 flex flex-col ${
        !share.permissions.canCopy ? 'select-none' : ''
      }`}
    >
      {/* Inject print blocking style if printing not allowed */}
      {!share.permissions.canPrint && (
        <style dangerouslySetInnerHTML={{ __html: `@media print { body { display: none !important; } }` }} />
      )}

      {/* Top Security & Navigation Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            PJ
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono text-teal-400">
                {document.documentNumber}
              </span>
              <span className="text-2xs bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.2 rounded font-mono">
                {selectedRevision}
              </span>
              <span className="text-2xs bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                CONTROLLED COPY
              </span>
            </div>
            <h1 className="text-xs text-slate-300 font-medium truncate max-w-md hidden sm:block">
              {document.title}
            </h1>
          </div>
        </div>

        {/* Schedule & Reviewer Badge */}
        <div className="flex items-center space-x-3">
          {/* Active Schedule status */}
          <div className="hidden md:flex items-center space-x-2 text-2xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">
              Active: {share.schedule.dailyStartTime}–{share.schedule.dailyEndTime} ({share.schedule.timeZone})
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Expires {share.schedule.expiryDate}</span>
          </div>

          {/* Reviewer identity */}
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-200">{share.recipientName}</div>
            <div className="text-2xs text-slate-400 truncate max-w-[160px]">{share.recipientCompany}</div>
          </div>

          {/* Comments Toggle Button */}
          <button
            id="toggle-comments-drawer-btn"
            onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              showCommentsDrawer
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments</span>
            <span className="ml-1 bg-teal-900/60 text-teal-200 px-1.5 py-0.2 rounded-full text-2xs">
              {activeComments.length}
            </span>
          </button>

          {/* Exit / Sign out */}
          {onExit && (
            <button
              onClick={onExit}
              title="Close viewer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Viewer Canvas Panel */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
          {/* Viewer Toolbar */}
          <div className="h-10 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400 shrink-0">
            {/* Revision selector (if allowed) */}
            <div className="flex items-center space-x-2">
              <span className="text-2xs uppercase tracking-wider text-slate-500">Revision:</span>
              {share.permissions.allowLaterRevisions && document.revisions.length > 1 ? (
                <select
                  value={selectedRevision}
                  onChange={(e) => setSelectedRevision(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                >
                  {document.revisions.map((r) => (
                    <option key={r.id} value={r.revision}>
                      {r.revision} ({r.issueDate}) - {r.reasonForIssue}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-mono font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                  {selectedRevision}
                </span>
              )}
            </div>

            {/* Page & Zoom controls */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-2xs text-slate-300 font-mono">
                  Sheet {currentPage} of 3
                </span>
                <button
                  disabled={currentPage >= 3}
                  onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="h-4 w-px bg-slate-800" />

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-2xs font-mono w-10 text-center">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(180, z + 10))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Security restrictions flags */}
            <div className="hidden lg:flex items-center space-x-3 text-2xs text-slate-500">
              <span className={share.permissions.canDownload ? 'text-teal-400' : 'text-slate-600 line-through'}>
                Download Raw
              </span>
              <span>•</span>
              <span className={share.permissions.canPrint ? 'text-teal-400' : 'text-slate-600 line-through'}>
                Print
              </span>
              <span>•</span>
              <span className={share.permissions.canCopy ? 'text-teal-400' : 'text-slate-600 line-through'}>
                Clipboard Copy
              </span>
            </div>
          </div>

          {/* Document Sheet Canvas with Dynamic Security Watermarking Overlay */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950/80 relative">
            {/* The Document Sheet */}
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="w-[920px] min-h-[640px] bg-white text-slate-900 rounded-sm shadow-2xl border border-slate-300 p-8 relative overflow-hidden flex flex-col justify-between"
            >
              {/* DYNAMIC WATERMARK OVERLAY */}
              <div
                className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-around overflow-hidden select-none"
                style={{ opacity: 0.14 }}
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="transform -rotate-25 whitespace-nowrap text-center text-slate-800 font-mono font-extrabold uppercase text-sm tracking-widest leading-relaxed"
                  >
                    PJMAK ENGINEERING • CONTROLLED DOCUMENT • {share.recipientName} ({share.recipientCompany}) •{' '}
                    {currentTimeDisplay} • UNAUTHORIZED DUPLICATION PROHIBITED
                  </div>
                ))}
              </div>

              {/* SHEET CONTENT: Title Block & Engineering Technical Drawing */}
              <div className="relative z-10 space-y-6">
                {/* Engineering Title Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                  <div>
                    <div className="text-xl font-bold text-slate-950 tracking-wider font-mono">
                      PJMAK PROCESS & ENERGY ENGINEERING
                    </div>
                    <div className="text-xs text-slate-600">
                      Project: <span className="font-semibold text-slate-900">{document.projectName} ({document.projectCode})</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Client: <span className="font-semibold text-slate-900">{document.clientCompany}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-500 uppercase">Document Number</div>
                    <div className="text-base font-bold text-slate-950">{document.documentNumber}</div>
                    <div className="text-xs font-semibold text-teal-800">
                      Revision: {selectedRevision} | Sheet {currentPage}/3
                    </div>
                  </div>
                </div>

                {/* Technical Drawing Canvas / Specification Body */}
                {currentPage === 1 && (
                  <div className="space-y-4">
                    <div className="border border-slate-400 bg-slate-50/50 p-4 rounded-sm">
                      <div className="flex justify-between items-center mb-2 border-b border-slate-300 pb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                          Equipment General Assembly & Nozzle Elevation (Section B-B)
                        </span>
                        <span className="text-2xs text-slate-500 font-mono">Scale: 1:25 • Dim: mm</span>
                      </div>

                      {/* Schematic Visual Box */}
                      <div className="h-64 border border-dashed border-slate-400 rounded-sm bg-white p-4 relative flex items-center justify-center font-mono">
                        {/* Technical CAD Diagram Wireframe */}
                        <svg className="w-full h-full text-slate-700" viewBox="0 0 800 240">
                          {/* Tank Shell */}
                          <rect x="250" y="30" width="300" height="170" fill="none" stroke="currentColor" strokeWidth="2" />
                          {/* Top Head */}
                          <path d="M 250 30 C 250 10, 550 10, 550 30" fill="none" stroke="currentColor" strokeWidth="2" />
                          {/* Bottom Head */}
                          <path d="M 250 200 C 250 220, 550 220, 550 200" fill="none" stroke="currentColor" strokeWidth="2" />
                          {/* Centerline */}
                          <line x1="400" y1="5" x2="400" y2="235" stroke="#94a3b8" strokeDasharray="6 4" strokeWidth="1" />
                          <line x1="220" y1="115" x2="580" y2="115" stroke="#94a3b8" strokeDasharray="6 4" strokeWidth="1" />
                          {/* Nozzle N1 (Top) */}
                          <rect x="380" y="10" width="40" height="20" fill="#f8fafc" stroke="currentColor" strokeWidth="1.5" />
                          <text x="375" y="0" fontSize="10" fill="#0f172a" fontWeight="bold">N1 (Vapor Outlet 8" 300#)</text>
                          {/* Nozzle N2 (Inlet Left) */}
                          <rect x="230" y="70" width="20" height="30" fill="#f8fafc" stroke="currentColor" strokeWidth="1.5" />
                          <text x="140" y="88" fontSize="10" fill="#0f172a" fontWeight="bold">N2 (Process Inlet 6")</text>
                          {/* Nozzle N3 (Liquid Level Right) */}
                          <rect x="550" y="140" width="20" height="25" fill="#f8fafc" stroke="currentColor" strokeWidth="1.5" />
                          <text x="575" y="155" fontSize="10" fill="#0f172a" fontWeight="bold">N3 (Level Instrument Class 300#)</text>
                          {/* Bottom Drain N4 */}
                          <rect x="385" y="200" width="30" height="20" fill="#f8fafc" stroke="currentColor" strokeWidth="1.5" />
                          <text x="370" y="235" fontSize="10" fill="#0f172a" fontWeight="bold">N4 (Drain 4" 150#)</text>
                          {/* Skirt / Base Ring */}
                          <line x1="240" y1="215" x2="240" y2="235" stroke="currentColor" strokeWidth="3" />
                          <line x1="560" y1="215" x2="560" y2="235" stroke="currentColor" strokeWidth="3" />
                        </svg>

                        <div className="absolute top-2 right-2 text-2xs bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-300">
                          Design Code: ASME Sec VIII Div 1
                        </div>
                      </div>
                    </div>

                    {/* Nozzle Schedule Table */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono mb-1.5">
                        Nozzle & Connection Schedule
                      </div>
                      <table className="w-full text-xs border border-slate-300 text-left">
                        <thead className="bg-slate-100 font-semibold border-b border-slate-300">
                          <tr>
                            <th className="p-1.5 border-r border-slate-300">Mark</th>
                            <th className="p-1.5 border-r border-slate-300">Service</th>
                            <th className="p-1.5 border-r border-slate-300">Size</th>
                            <th className="p-1.5 border-r border-slate-300">Rating</th>
                            <th className="p-1.5 border-r border-slate-300">Facing</th>
                            <th className="p-1.5">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-2xs">
                          <tr>
                            <td className="p-1.5 font-bold border-r border-slate-200">N1</td>
                            <td className="p-1.5 border-r border-slate-200 font-sans">Vapor Discharge Outlet</td>
                            <td className="p-1.5 border-r border-slate-200">8" (DN200)</td>
                            <td className="p-1.5 border-r border-slate-200">Class 300#</td>
                            <td className="p-1.5 border-r border-slate-200">RF</td>
                            <td className="p-1.5 font-sans">Vortex Breaker Included</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 font-bold border-r border-slate-200">N2</td>
                            <td className="p-1.5 border-r border-slate-200 font-sans">Feed Inlet</td>
                            <td className="p-1.5 border-r border-slate-200">6" (DN150)</td>
                            <td className="p-1.5 border-r border-slate-200">Class 300#</td>
                            <td className="p-1.5 border-r border-slate-200">RF</td>
                            <td className="p-1.5 font-sans">With Internal Deflector Baffle</td>
                          </tr>
                          <tr className="bg-teal-50/50">
                            <td className="p-1.5 font-bold border-r border-slate-200 text-teal-900">N3</td>
                            <td className="p-1.5 border-r border-slate-200 font-sans">Level Bridle Upper Connection</td>
                            <td className="p-1.5 border-r border-slate-200">2" (DN50)</td>
                            <td className="p-1.5 border-r border-slate-200 font-bold text-teal-900">Class 300#</td>
                            <td className="p-1.5 border-r border-slate-200">RF</td>
                            <td className="p-1.5 font-sans">Subject to External Review Check</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 font-bold border-r border-slate-200">N4</td>
                            <td className="p-1.5 border-r border-slate-200 font-sans">Vessel Cleanout / Drain</td>
                            <td className="p-1.5 border-r border-slate-200">4" (DN100)</td>
                            <td className="p-1.5 border-r border-slate-200">Class 150#</td>
                            <td className="p-1.5 border-r border-slate-200">RF</td>
                            <td className="p-1.5 font-sans">Flush with Bottom Head</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {currentPage === 2 && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono mb-2">
                      Design Conditions & Material Specification Sheet
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="border border-slate-300 p-3 rounded-sm space-y-2 bg-slate-50">
                        <div className="font-bold border-b border-slate-200 pb-1 text-slate-800">Process Design Data</div>
                        <div className="flex justify-between"><span>Design Pressure:</span><span className="font-mono font-semibold">18.5 bar(g)</span></div>
                        <div className="flex justify-between"><span>Operating Pressure:</span><span className="font-mono font-semibold">12.0 bar(g)</span></div>
                        <div className="flex justify-between"><span>Design Temp (Max):</span><span className="font-mono font-semibold">+185 °C</span></div>
                        <div className="flex justify-between"><span>MDMT:</span><span className="font-mono font-semibold">-29 °C</span></div>
                        <div className="flex justify-between"><span>Corrosion Allowance:</span><span className="font-mono font-semibold">3.2 mm</span></div>
                      </div>
                      <div className="border border-slate-300 p-3 rounded-sm space-y-2 bg-slate-50">
                        <div className="font-bold border-b border-slate-200 pb-1 text-slate-800">Material Selection</div>
                        <div className="flex justify-between"><span>Shell & Heads:</span><span className="font-mono font-semibold">SA-516 Gr. 70N</span></div>
                        <div className="flex justify-between"><span>Nozzle Necks:</span><span className="font-mono font-semibold">SA-106 Gr. B (Seamless)</span></div>
                        <div className="flex justify-between"><span>Flanges:</span><span className="font-mono font-semibold">SA-105N</span></div>
                        <div className="flex justify-between"><span>Internal Bolting:</span><span className="font-mono font-semibold">SS 316 / A193 B8M</span></div>
                        <div className="flex justify-between"><span>PWHT:</span><span className="font-mono font-semibold">Required per NACE MR0175</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {currentPage === 3 && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono mb-2">
                      Inspection, Non-Destructive Testing (NDT) & Coating Notes
                    </div>
                    <div className="border border-slate-300 p-4 rounded-sm text-xs space-y-2 font-mono leading-relaxed bg-slate-50">
                      <div>1. ALL BUTT WELDED JOINTS SHALL BE 100% RADIOGRAPHICALLY EXAMINED (RT) AS PER ASME SEC VIII UW-51.</div>
                      <div>2. NOZZLE-TO-SHELL ATTACHMENT WELDS SHALL BE 100% MAGNETIC PARTICLE INSPECTED (MPI) PRIOR TO HYDROTEST.</div>
                      <div>3. HYDROSTATIC TEST PRESSURE SHALL BE 24.1 BAR(G) AND HELD FOR A MINIMUM OF 2 HOURS.</div>
                      <div>4. INTERNAL LINING: COAL TAR EPOXY 2 COATS (MINIMUM 350 MICRONS DFT).</div>
                      <div>5. THIRD PARTY INSPECTION AGENCY (TPIA) WITNESS POINTS IDENTIFIED PER ITP-PJMAK-MEC-001 REV 1.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Title Block & Revision Signoff Grid */}
              <div className="relative z-10 mt-6 pt-4 border-t-2 border-slate-900">
                <div className="grid grid-cols-4 border border-slate-400 text-2xs divide-x divide-slate-400 font-mono">
                  <div className="p-2">
                    <span className="text-slate-400 block">PREPARED BY</span>
                    <span className="font-bold text-slate-800">PJMAK Lead Mech Eng</span>
                  </div>
                  <div className="p-2">
                    <span className="text-slate-400 block">CHECKED BY</span>
                    <span className="font-bold text-slate-800">Tech Services Head</span>
                  </div>
                  <div className="p-2">
                    <span className="text-slate-400 block">APPROVED BY</span>
                    <span className="font-bold text-slate-800">Managing Director</span>
                  </div>
                  <div className="p-2 bg-slate-50">
                    <span className="text-slate-400 block">CONTROLLED STATUS</span>
                    <span className="font-bold text-teal-800 uppercase">OFFICIAL REVIEW COPY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Review Comments & Revision Threads */}
        {showCommentsDrawer && (
          <aside
            id="review-comments-sidebar"
            className="w-80 md:w-96 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 z-20"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-teal-400" />
                  <span>Review Comments</span>
                </h3>
                <span className="text-2xs text-slate-400">
                  Linked to {selectedRevision} (Sheet {currentPage})
                </span>
              </div>

              {share.permissions.canComment && (
                <button
                  id="open-add-comment-btn"
                  onClick={() => setIsAddingComment(!isAddingComment)}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-2xs font-semibold transition-colors flex items-center space-x-1"
                >
                  <span>+ New Comment</span>
                </button>
              )}
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* New Comment Form */}
              {isAddingComment && (
                <form
                  onSubmit={handleAddComment}
                  className="bg-slate-900 border border-teal-800/80 rounded-xl p-3.5 space-y-3 shadow-lg"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-teal-300">Add Technical Review Comment</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingComment(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-2xs text-slate-400 block mb-1">
                      Drawing Location / Tag Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={commentLocation}
                      onChange={(e) => setCommentLocation(e.target.value)}
                      placeholder="e.g. Nozzle N3, Flange Rating"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-2xs text-slate-400 block mb-1">
                      Comment / Clarification / Correction *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Specify required modifications or technical clarifications..."
                      className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-slate-400">Sheet {currentPage} • {selectedRevision}</span>
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-medium transition-colors"
                    >
                      {isSubmittingComment ? 'Posting...' : 'Submit Comment'}
                    </button>
                  </div>
                </form>
              )}

              {/* List Comments */}
              {activeComments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">No comments recorded for {selectedRevision}.</p>
                  {share.permissions.canComment && (
                    <button
                      onClick={() => setIsAddingComment(true)}
                      className="text-xs text-teal-400 hover:underline"
                    >
                      Add first review comment
                    </button>
                  )}
                </div>
              ) : (
                activeComments.map((cmt) => (
                  <div
                    key={cmt.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs hover:border-slate-700 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-200">{cmt.authorName}</div>
                        <div className="text-2xs text-slate-400">
                          {cmt.authorCompany} • {new Date(cmt.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`text-2xs px-2 py-0.5 rounded-full font-medium uppercase ${
                          cmt.status === 'resolved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : cmt.status === 'accepted'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : cmt.status === 'rejected'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {cmt.status.replace('_', ' ')}
                      </span>
                    </div>

                    {cmt.locationAnnotation && (
                      <div className="text-2xs font-mono text-teal-400 bg-teal-950/40 border border-teal-900 px-2 py-0.5 rounded inline-block">
                        📍 {cmt.locationAnnotation}
                        {cmt.pageNumber ? ` (Sheet ${cmt.pageNumber})` : ''}
                      </div>
                    )}

                    <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-wrap">
                      {cmt.commentText}
                    </p>

                    {/* Resulting revision if resolved */}
                    {cmt.resultingRevision && (
                      <div className="p-2 bg-emerald-950/50 border border-emerald-800/80 rounded text-2xs text-emerald-300 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>
                          Applied into EDMS revision: <strong className="font-mono">{cmt.resultingRevision}</strong>
                        </span>
                      </div>
                    )}

                    {/* Threaded Replies */}
                    {cmt.replies && cmt.replies.length > 0 && (
                      <div className="pl-3 border-l-2 border-slate-700 space-y-2 mt-2 pt-1">
                        {cmt.replies.map((r) => (
                          <div key={r.id} className="text-2xs space-y-0.5">
                            <div className="flex items-center space-x-1 font-semibold text-slate-300">
                              <span>{r.authorName}</span>
                              <span className="text-slate-500">
                                ({r.authorRole === 'internal' ? 'PJMAK Engineering' : r.authorCompany})
                              </span>
                            </div>
                            <p className="text-slate-400 whitespace-pre-wrap">{r.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply button / box */}
                    <div className="pt-1 flex items-center justify-between border-t border-slate-800/60">
                      {activeReplyId === cmt.id ? (
                        <div className="w-full space-y-2 pt-1">
                          <textarea
                            rows={2}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write reply..."
                            className="w-full p-2 text-xs bg-slate-800 border border-slate-700 rounded text-white"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setActiveReplyId(null)}
                              className="text-2xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingReply}
                              onClick={() => handleAddReply(cmt.id)}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-2xs font-medium"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveReplyId(cmt.id);
                            setReplyText('');
                          }}
                          className="text-2xs text-slate-400 hover:text-teal-400 flex items-center space-x-1"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Reply to discussion</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
