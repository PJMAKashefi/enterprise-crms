import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Share2,
  Calendar,
  Clock,
  Shield,
  User,
  Building,
  Mail,
  Key,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  Lock,
  Eye,
  MessageSquare,
  Download,
  Printer,
  FileCheck,
  FileText,
  AlertCircle,
  FolderOpen,
  Upload,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import type { TechnicalDocument, DocumentShare, User as AppUser } from '../types';
import { EditTechnicalDocumentModal } from './EditTechnicalDocumentModal';
import {
  getNextTechnicalDocumentNumber,
  normalizeDocumentNumber,
  formatProjectCodePrefix,
} from '../utils/documentNumbering';

interface ShareDocumentModalProps {
  document?: TechnicalDocument | null;
  documents?: TechnicalDocument[];
  currentUser?: AppUser | null;
  isOpen?: boolean;
  onClose: () => void;
  onShareCreated?: (newShare?: DocumentShare) => void;
  onRefreshData?: () => void;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  document,
  documents: initialDocuments = [],
  currentUser,
  onClose,
  onShareCreated,
  onRefreshData,
}) => {
  const [internalDocs, setInternalDocs] = useState<TechnicalDocument[]>(() => {
    if (initialDocuments && initialDocuments.length > 0) return initialDocuments;
    if (document) return [document];
    return [];
  });

  // Keep internalDocs synced if props update
  useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      setInternalDocs(initialDocuments);
    } else if (document) {
      setInternalDocs([document]);
    }
  }, [initialDocuments, document]);

  const [selectedDocId, setSelectedDocId] = useState<string>(
    document?.id || (initialDocuments && initialDocuments[0]?.id) || ''
  );

  const [showEditModal, setShowEditModal] = useState(false);

  // Sync selectedDocId when document or documents list updates
  useEffect(() => {
    if (document?.id) {
      setSelectedDocId(document.id);
    } else if (internalDocs && internalDocs.length > 0 && !selectedDocId) {
      setSelectedDocId(internalDocs[0].id);
    }
  }, [document?.id, internalDocs]);

  const activeDoc = useMemo(() => {
    if (selectedDocId && internalDocs.length > 0) {
      const found = internalDocs.find((d) => d.id === selectedDocId);
      if (found) return found;
    }
    return document || (internalDocs && internalDocs[0]) || null;
  }, [selectedDocId, internalDocs, document]);

  const [selectedRevision, setSelectedRevision] = useState<string>(
    activeDoc?.currentRevision || (activeDoc?.revisions?.[0]?.revision ?? 'Rev 0')
  );

  // Recipient details
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState(activeDoc?.clientCompany || '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [recipientPassword, setRecipientPassword] = useState('Review2026!');

  // Local file browser upload state
  const [isUploadingLocalFile, setIsUploadingLocalFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleQuickUploadProposal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLocalFile(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: cleanTitle,
              documentType: 'PRP',
              discipline: 'TEC',
              originator: 'PJMAK',
              projectCode: 'PRJ-2026-01',
              projectName: 'Engineering Project',
              clientCompany: recipientCompany || 'External Client',
              currentRevision: 'Rev 0',
              reasonForIssue: 'Tender / Proposal Submission',
              reviewStatus: 'under_review',
              fileName: file.name,
              fileFormat: ext,
              fileUrl: typeof reader.result === 'string' ? reader.result : '',
            }),
          });
          if (res.ok) {
            const newDoc: TechnicalDocument = await res.json();
            setSelectedDocId(newDoc.id);
            setUploadedFileName(file.name);
            setSelectedRevision('Rev 0');
            if (newDoc.clientCompany) setRecipientCompany(newDoc.clientCompany);
          }
        } catch (uploadErr) {
          console.error('Failed to create proposal from file', uploadErr);
        } finally {
          setIsUploadingLocalFile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('Failed to read proposal file: ' + err.message);
      setIsUploadingLocalFile(false);
    }
  };

  // Sync revision and company when activeDoc changes
  useEffect(() => {
    if (activeDoc) {
      setSelectedRevision(
        activeDoc.currentRevision || (activeDoc.revisions?.[0]?.revision ?? 'Rev 0')
      );
      if (activeDoc.clientCompany) {
        setRecipientCompany(activeDoc.clientCompany);
      }
    }
  }, [activeDoc?.id]);

  // Quick Switch between Technical and Commercial before sending share
  const handleQuickSwitchDiscipline = async (targetDiscipline: 'TEC' | 'COM') => {
    if (!activeDoc) return;
    
    let newDocNumber = activeDoc.documentNumber;
    let newSeqNumber = activeDoc.sequenceNumber;

    if (internalDocs && internalDocs.length > 0) {
      const next = getNextTechnicalDocumentNumber({
        projectCode: activeDoc.projectCode,
        originator: activeDoc.originator,
        discipline: targetDiscipline,
        documentType: 'PRP',
        existingDocuments: internalDocs,
        currentDocIdToExclude: activeDoc.id,
      });
      newDocNumber = next.documentNumber;
      newSeqNumber = next.sequenceNumber;
    } else {
      newDocNumber = normalizeDocumentNumber(activeDoc.documentNumber, targetDiscipline, 'PRP');
    }

    const updated: TechnicalDocument = {
      ...activeDoc,
      discipline: targetDiscipline,
      documentNumber: newDocNumber,
      sequenceNumber: newSeqNumber || activeDoc.sequenceNumber,
      contractorDocumentNumber: newDocNumber,
      projectCode: formatProjectCodePrefix(activeDoc.projectCode),
      documentType: 'PRP',
      reasonForIssue: targetDiscipline === 'COM' ? 'Commercial Proposal Offer' : 'Technical Review & Approval',
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/documents/${activeDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const savedDoc: TechnicalDocument = await res.json();
        setInternalDocs((prev) => prev.map((d) => (d.id === savedDoc.id ? savedDoc : d)));
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Failed to quick switch discipline', err);
    }
  };

  const handleSaveEditedDoc = async (updatedDoc: TechnicalDocument) => {
    try {
      const res = await fetch(`/api/documents/${updatedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDoc),
      });
      if (res.ok) {
        const savedDoc: TechnicalDocument = await res.json();
        setInternalDocs((prev) => prev.map((d) => (d.id === savedDoc.id ? savedDoc : d)));
        if (savedDoc.clientCompany) setRecipientCompany(savedDoc.clientCompany);
        setShowEditModal(false);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Failed to save edited document', err);
    }
  };

  // Schedule details
  const todayStr = new Date().toISOString().slice(0, 10);
  const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('08:30');
  const [expiryDate, setExpiryDate] = useState(twoWeeksLater);
  const [expiryTime, setExpiryTime] = useState('17:30');
  const [dailyStartTime, setDailyStartTime] = useState('08:30');
  const [dailyEndTime, setDailyEndTime] = useState('17:30');
  const [timeZone, setTimeZone] = useState('Europe/Amsterdam');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri

  // Permissions
  const [canView, setCanView] = useState(true);
  const [canComment, setCanComment] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [canPrint, setCanPrint] = useState(false);
  const [canCopy, setCanCopy] = useState(false);
  const [canRequestExtension, setCanRequestExtension] = useState(true);
  const [allowLaterRevisions, setAllowLaterRevisions] = useState(false);

  // Watermark
  const [watermarkCustomText, setWatermarkCustomText] = useState(
    'CONFIDENTIAL & PROPRIETARY • CONTROLLED COPY'
  );

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    share: DocumentShare;
    accessUrl: string;
    credentials: { username: string; password?: string };
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const toggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter((d) => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleEmailBlur = () => {
    if (recipientEmail && !recipientUsername) {
      setRecipientUsername(recipientEmail.split('@')[0].toLowerCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc) {
      setError('Please select a proposal or technical document to share.');
      return;
    }
    if (!recipientName.trim() || !recipientEmail.trim()) {
      setError('Please provide recipient name and a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/external-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: activeDoc.id,
          selectedRevision,
          recipientName: recipientName.trim(),
          recipientCompany: recipientCompany.trim(),
          recipientEmail: recipientEmail.trim(),
          recipientUsername: (recipientUsername || recipientEmail.split('@')[0]).trim(),
          recipientPassword: recipientPassword || undefined,
          startDate,
          startTime,
          expiryDate,
          expiryTime,
          workingDays,
          dailyStartTime,
          dailyEndTime,
          timeZone,
          canView,
          canComment,
          canDownload,
          canPrint,
          canCopy,
          canRequestExtension,
          allowLaterRevisions,
          watermarkCustomText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create controlled share invitation');
      }

      const resData = await response.json();
      setCreatedResult({
        share: resData.share,
        accessUrl: window.location.origin + resData.accessUrl,
        credentials: {
          username: resData.externalUser.username,
          password: resData.externalUser.password,
        },
      });
      if (onShareCreated) {
        onShareCreated(resData.share);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating document share.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const daysList = [
    { label: 'Mon', val: 1 },
    { label: 'Tue', val: 2 },
    { label: 'Wed', val: 3 },
    { label: 'Thu', val: 4 },
    { label: 'Fri', val: 5 },
    { label: 'Sat', val: 6 },
    { label: 'Sun', val: 0 },
  ];

  return (
    <div
      id="share-document-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="share-document-modal-container"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Share Document for Controlled External Review
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {activeDoc ? `${activeDoc.documentNumber} • ${activeDoc.title}` : 'Select Proposal or Technical Document'}
              </p>
            </div>
          </div>
          <button
            id="close-share-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!activeDoc ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Technical Document or Proposal Available</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Please create or register a proposal or document in the Technical Register first before issuing an external share invitation.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : createdResult ? (
            /* Success State */
            <div className="space-y-6 py-2">
              <div className="p-5 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto" />
                <h3 className="text-base font-semibold text-teal-900">
                  Controlled Share Invitation Created Successfully
                </h3>
                <p className="text-sm text-teal-700">
                  The document is now shared under strict schedule authorization with{' '}
                  <span className="font-semibold">{createdResult.share.recipientName}</span> (
                  {createdResult.share.recipientCompany}).
                </p>
              </div>

              {/* Share Link Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Direct Controlled Access URL</span>
                  <span className="text-teal-600 lowercase font-normal text-xs">
                    Protected by schedule validation
                  </span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={createdResult.accessUrl}
                    className="flex-1 text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 select-all"
                  />
                  <button
                    id="copy-access-link-btn"
                    onClick={() => copyToClipboard(createdResult.accessUrl)}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reviewer Authentication Credentials
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <span className="text-xs text-slate-400 block mb-0.5">Username / Login ID</span>
                    <span className="font-mono font-medium text-slate-800">
                      {createdResult.credentials.username}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <span className="text-xs text-slate-400 block mb-0.5">Assigned Password</span>
                    <span className="font-mono font-medium text-slate-800">
                      {createdResult.credentials.password || 'Pre-existing'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 flex items-center space-x-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    When the reviewer accesses the link, the server verifies both credentials and schedule before serving any document data.
                  </span>
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <a
                  href={createdResult.accessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Preview as Reviewer</span>
                </a>
                <button
                  id="done-share-modal-btn"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center space-x-2">
                  <Info className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* 0. Document Selection & Local File Browser */}
              <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span>Select Proposal / Technical Document to Share</span>
                  </label>
                  
                  {/* Local File Browser Button */}
                  <label className="flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-white border border-teal-300 hover:bg-teal-100/60 px-3 py-1.5 rounded-lg cursor-pointer shadow-2xs transition-colors">
                    <FolderOpen className="w-4 h-4 text-teal-600" />
                    <span>Browse & Upload File from Computer (.pdf, .docx)...</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.dwg"
                      className="hidden"
                      onChange={handleQuickUploadProposal}
                      disabled={isUploadingLocalFile}
                    />
                  </label>
                </div>

                {isUploadingLocalFile && (
                  <div className="p-2.5 bg-white rounded-lg border border-teal-300 text-xs text-teal-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-teal-600 shrink-0" />
                    <span>Uploading and attaching proposal file from your computer...</span>
                  </div>
                )}

                {uploadedFileName && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Uploaded & Selected: <strong>{uploadedFileName}</strong> (Registered in EDMS)</span>
                  </div>
                )}

                {/* Dropdown if multiple documents exist */}
                {internalDocs && internalDocs.length > 0 ? (
                  <div>
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-teal-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {internalDocs.map((d, index) => (
                        <option key={d.id || `doc-${d.documentNumber || index}`} value={d.id}>
                          {d.documentNumber} — {d.title} ({d.clientCompany || 'External Client'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : activeDoc ? (
                  <div className="p-3 bg-white rounded-lg border border-teal-200">
                    <span className="font-mono text-xs font-bold text-slate-900 block">{activeDoc.documentNumber}</span>
                    <span className="text-xs text-slate-600 block">{activeDoc.title}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    No proposals found in database. Click "Browse & Upload File from Computer" above to select a PDF or Word proposal!
                  </div>
                )}

                {activeDoc && (
                  <div className="pt-3 border-t border-teal-200/80 flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-lg border border-teal-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">Classification:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase border ${
                        activeDoc.discipline === 'COM'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          : 'bg-blue-100 text-blue-950 border-blue-300'
                      }`}>
                        {activeDoc.discipline === 'COM' ? '💼 Commercial Proposal (COM)' : '🛠️ Technical Document (TEC)'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {activeDoc.documentType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleQuickSwitchDiscipline(activeDoc.discipline === 'COM' ? 'TEC' : 'COM')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded border shadow-2xs cursor-pointer transition-colors ${
                          activeDoc.discipline === 'COM'
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                        title="Change classification before sending share invitation"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Switch to {activeDoc.discipline === 'COM' ? 'Technical (TEC)' : 'Commercial (COM)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
                        title="Edit full classification and metadata before sending"
                      >
                        <Edit3 className="w-3 h-3 text-slate-600" />
                        <span>Edit Details...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 1. Revision Selection */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                    <span>Select Revision for Review</span>
                  </label>
                  <span className="text-xs text-slate-500">
                    Current EDMS Status:{' '}
                    <span className="font-semibold text-slate-700">
                      {(activeDoc.reviewStatus || 'under_review').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeDoc.revisions && activeDoc.revisions.length > 0 ? (
                    activeDoc.revisions.map((rev, revIdx) => (
                      <button
                        key={rev.id || `rev-${rev.revision || 'unknown'}-${revIdx}`}
                        type="button"
                        onClick={() => setSelectedRevision(rev.revision)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          selectedRevision === rev.revision
                            ? 'border-teal-600 bg-teal-50/70 text-teal-900 shadow-2xs ring-1 ring-teal-600'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold font-mono">{rev.revision}</div>
                        <div className="text-xs text-slate-500 truncate">{rev.reasonForIssue}</div>
                        <div className="text-2xs text-slate-400 mt-1">{rev.issueDate}</div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full p-2 text-xs text-slate-500">
                      Single Revision: {activeDoc.currentRevision || 'Rev 0'}
                    </div>
                  )}
                </div>
                <div className="pt-1 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowLaterRevisions"
                    checked={allowLaterRevisions}
                    onChange={(e) => setAllowLaterRevisions(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="allowLaterRevisions" className="text-xs text-slate-600 cursor-pointer">
                    Automatically grant access to future revisions if re-issued during this review window
                  </label>
                </div>
              </div>

              {/* 2. Recipient Information */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>External Reviewer Details</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Recipient Full Name *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. Eng. Reza Mohammadi"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Company / Organization *</label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={recipientCompany}
                        onChange={(e) => setRecipientCompany(e.target.value)}
                        placeholder="e.g. National Petrochemical Co."
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Work Email Address *</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        onBlur={handleEmailBlur}
                        placeholder="e.g. reviewer@client.com"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Assigned Temporary Password</label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={recipientPassword}
                        onChange={(e) => setRecipientPassword(e.target.value)}
                        placeholder="e.g. Review2026!"
                        className="w-full pl-8 pr-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Access Schedule & Permitted Working Hours */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>Controlled Schedule & Working Hours</span>
                  </label>
                  <span className="text-2xs bg-teal-100 text-teal-800 font-medium px-2 py-0.5 rounded-full">
                    Server Enforced
                  </span>
                </div>

                {/* Validity Window */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Valid From (Start Date & Time)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Valid Until (Expiry Date & Time)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <input
                        type="time"
                        value={expiryTime}
                        onChange={(e) => setExpiryTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Working Days & Daily Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Permitted Days of Week</label>
                    <div className="flex items-center space-x-1">
                      {daysList.map((d) => {
                        const active = workingDays.includes(d.val);
                        return (
                          <button
                            key={`day-${d.val}`}
                            type="button"
                            onClick={() => toggleDay(d.val)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                              active
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Daily Authorized Hours</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={dailyStartTime}
                        onChange={(e) => setDailyStartTime(e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="time"
                        value={dailyEndTime}
                        onChange={(e) => setDailyEndTime(e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Time Zone Reference</label>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Europe/Amsterdam">Europe/Amsterdam (CET / CEST - UTC+1 / UTC+2)</option>
                    <option value="Asia/Tehran">Asia/Tehran (IRST - UTC+3:30)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST - UTC+4)</option>
                    <option value="Europe/London">Europe/London (GMT / BST - UTC+0 / UTC+1)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                  </select>
                </div>
              </div>

              {/* 4. Permissions & Security Safeguards */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>Security & Action Permissions</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canView}
                      disabled
                      className="rounded border-slate-300 text-teal-600"
                    />
                    <Eye className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>View Controlled Document</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canComment}
                      onChange={(e) => setCanComment(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <MessageSquare className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Allow Review Comments</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canRequestExtension}
                      onChange={(e) => setCanRequestExtension(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Allow Extension Request</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDownload}
                      onChange={(e) => setCanDownload(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <Download className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Allow Raw PDF Download</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canPrint}
                      onChange={(e) => setCanPrint(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <Printer className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Allow Browser Printing</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canCopy}
                      onChange={(e) => setCanCopy(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Allow Text/Drawing Copy</span>
                  </label>
                </div>

                {/* Watermark preview note */}
                <div className="pt-2">
                  <label className="text-xs text-slate-500 mb-1 block">Dynamic Watermark Overlay Text</label>
                  <input
                    type="text"
                    value={watermarkCustomText}
                    onChange={(e) => setWatermarkCustomText(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-700"
                  />
                  <span className="text-2xs text-slate-400 mt-1 block">
                    Will be rendered diagonally across the controlled viewer with recipient name, company, and access timestamp.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-create-share-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <span>Generating Security Token...</span>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Generate & Issue Controlled Access Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Edit Classification & Details Modal (Allowing change between Technical & Commercial before sending) */}
      {showEditModal && activeDoc && (
        <EditTechnicalDocumentModal
          isOpen={showEditModal}
          doc={activeDoc}
          existingDocuments={internalDocs}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEditedDoc}
        />
      )}
    </div>
  );
};
