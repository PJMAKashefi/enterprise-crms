import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Clock,
  User,
  Mail,
  Building,
  AlertTriangle,
  X,
  RefreshCw,
  Eye,
  Trash2,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { TechnicalDocument, ExternalAccessSession } from '../types';

interface SecureProposalAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: TechnicalDocument | null;
  onPreviewAsRecipient?: (token: string) => void;
}

export const SecureProposalAccessModal: React.FC<SecureProposalAccessModalProps> = ({
  isOpen,
  onClose,
  document,
  onPreviewAsRecipient,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [validityHours, setValidityHours] = useState<number>(48);
  const [internalNotes, setInternalNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<ExternalAccessSession | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Existing sessions for this document
  const [sessions, setSessions] = useState<ExternalAccessSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      // Pre-fill recipient info if available from document
      setRecipientName(document.clientContactPerson || '');
      setRecipientEmail(document.clientEmail || '');
      setRecipientCompany(document.clientCompany || '');
      setValidityHours(48);
      setInternalNotes('');
      setCreatedSession(null);
      setError(null);
      setCopiedLink(false);

      fetchSessions(document.id);
    }
  }, [isOpen, document]);

  const fetchSessions = async (documentId: string) => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/external-access/document/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load access sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  if (!isOpen || !document) return null;

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientEmail.trim()) {
      setError('Recipient Name and Email are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/external-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim(),
          recipientCompany: recipientCompany.trim() || document.clientCompany,
          validityHours: Number(validityHours) || 48,
          internalNotes: internalNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate secure access session');
      }

      setCreatedSession(data.session);
      // Refresh list
      fetchSessions(document.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create access link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (token: string) => {
    if (!window.confirm('Are you sure you want to revoke this access link? The external recipient will immediately lose access.')) {
      return;
    }

    setRevokingToken(token);
    try {
      const res = await fetch(`/api/external-access/${token}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Revoked by internal document controller' }),
      });

      if (res.ok) {
        if (createdSession && createdSession.token === token) {
          setCreatedSession((prev) => prev ? { ...prev, status: 'revoked' } : null);
        }
        fetchSessions(document.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to revoke link');
      }
    } catch (err: any) {
      alert(err.message || 'Error revoking link');
    } finally {
      setRevokingToken(null);
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/?ext_access_token=${token}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Secure External Proposal Access
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-900 text-teal-200 border border-teal-700">
                  48-HR CONTROLLED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Grant dedicated, watermarked, non-downloadable browser access to client reviewers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          {/* Document Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-slate-900 text-xs">{document.documentNumber}</span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">
                  {document.currentRevision}
                </span>
                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">
                  {document.documentType}
                </span>
              </div>
              <p className="font-semibold text-slate-800 text-xs">{document.title}</p>
              <p className="text-[11px] text-slate-500">
                Project: <strong className="text-slate-700">{document.projectName} ({document.projectCode})</strong> • Client:{' '}
                <strong className="text-slate-700">{document.clientCompany}</strong>
              </p>
            </div>
          </div>

          {/* Security Safeguards Banner */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex items-start space-x-3 text-teal-950">
            <Shield className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
            <div className="space-y-1 text-xs">
              <span className="font-bold block text-teal-900">Enforced Security Protections</span>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                The recipient opens a dedicated, protected viewer. PDF download is strictly disabled, printing and text copying are intercepted and logged, and every page is stamped with a dynamic diagonal watermark featuring the recipient's identity, timestamp, and unique access ID.
              </p>
            </div>
          </div>

          {/* Success Created Link Section */}
          {createdSession && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  <span className="font-bold text-emerald-900 text-xs">
                    Secure Access Link Generated Successfully!
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  ID: {createdSession.accessId}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Recipient Access Link (Direct Secure Browser Access)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl(createdSession.token)}
                    className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getShareUrl(createdSession.token))}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1">
                <span>
                  Valid for <strong>{createdSession.validityHours} hours</strong> (Expires:{' '}
                  {new Date(createdSession.expiresAt).toLocaleString()})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (onPreviewAsRecipient) {
                      onPreviewAsRecipient(createdSession.token);
                      onClose();
                    } else {
                      window.open(getShareUrl(createdSession.token), '_blank');
                    }
                  }}
                  className="font-bold underline hover:text-emerald-950 flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview as External Recipient</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form to Create New Access */}
          <form onSubmit={handleCreateAccess} className="space-y-4 border-t border-slate-200 pt-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Generate New Recipient Access Session
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Recipient Full Name *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Henrik Vestergaard"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Recipient Official Email *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. h.vestergaard@orsted.com"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Company / Organization</label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={recipientCompany}
                    onChange={(e) => setRecipientCompany(e.target.value)}
                    placeholder="e.g. Ørsted Wind Power"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Access Duration Validity</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <select
                    value={validityHours}
                    onChange={(e) => setValidityHours(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>48 Hours (2 Days — Recommended)</option>
                    <option value={72}>72 Hours (3 Days)</option>
                    <option value={168}>7 Days (1 Week)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Internal Reference / Tracking Notes</label>
              <input
                type="text"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="e.g. Formal tender evaluation access for commercial & technical committee."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center space-x-2 transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Secure Link...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Create Secure External Access</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Active & Historical Sessions Table */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Active & Historical Access Links ({sessions.length})
              </h3>
              <button
                type="button"
                onClick={() => fetchSessions(document.id)}
                className="text-slate-500 hover:text-slate-800 text-[11px] flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSessions ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                <p>No external access links created yet for this proposal.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Recipient</th>
                      <th className="p-2.5">Access ID</th>
                      <th className="p-2.5">Expires</th>
                      <th className="p-2.5">Views</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {sessions.map((sess) => {
                      const isExpired = new Date(sess.expiresAt).getTime() < Date.now();
                      const isRevoked = sess.status === 'revoked';
                      const isActive = sess.status === 'active' && !isExpired;

                      return (
                        <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{sess.recipientName}</div>
                            <div className="text-[11px] text-slate-500">{sess.recipientEmail}</div>
                            <div className="text-[10px] text-slate-400">{sess.recipientCompany}</div>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-teal-800 font-semibold">
                            {sess.accessId}
                          </td>
                          <td className="p-2.5 text-[11px]">
                            <div>{new Date(sess.expiresAt).toLocaleDateString()}</div>
                            <div className="text-slate-400 text-[10px]">
                              {new Date(sess.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-600">
                            {sess.accessCount || 0} times
                          </td>
                          <td className="p-2.5">
                            {isRevoked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Revoked
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(getShareUrl(sess.token))}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                              title="Copy Access URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onPreviewAsRecipient) {
                                  onPreviewAsRecipient(sess.token);
                                  onClose();
                                } else {
                                  window.open(getShareUrl(sess.token), '_blank');
                                }
                              }}
                              className="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-50 transition-colors"
                              title="Preview as External Recipient"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            {isActive && (
                              <button
                                type="button"
                                disabled={revokingToken === sess.token}
                                onClick={() => handleRevoke(sess.token)}
                                className="px-2 py-1 rounded text-rose-700 hover:bg-rose-100 font-bold text-[10px] transition-colors"
                              >
                                {revokingToken === sess.token ? 'Revoking...' : 'Revoke'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Complies with PJMAK Controlled External Sharing Protocol</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
