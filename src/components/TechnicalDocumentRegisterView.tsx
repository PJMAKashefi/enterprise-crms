import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Layers,
  History,
  Tag,
  Calendar,
  Building2,
  DollarSign,
  Briefcase,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  ExternalLink,
  ChevronRight,
  Download,
  Share2,
  Edit3,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  Hash,
  UserCheck,
  Copy,
  Check,
  SlidersHorizontal,
  X,
  Maximize2,
  Eye,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react';
import {
  TechnicalDocument,
  DocumentRevision,
  DocumentDiscipline,
  DocumentTypeCode,
  DocumentReviewStatus,
  DocumentMilestone,
  User,
  Correspondence,
} from '../types';
import { ShareDocumentModal } from './ShareDocumentModal';
import { ExternalSharesManagerModal } from './ExternalSharesManagerModal';
import { TechnicalDrawingPreview } from './TechnicalDrawingPreview';

interface TechnicalDocumentRegisterViewProps {
  documents: TechnicalDocument[];
  correspondence: Correspondence[];
  currentUser: User;
  onOpenDocument?: (doc: TechnicalDocument) => void;
  onOpenCorrespondence?: (correspondenceNumber: string) => void;
  onRefreshData?: () => void;
  onOpenExternalViewer?: (shareId: string) => void;
  onBackToDashboard?: () => void;
  isFullPage?: boolean;
}

const DISCIPLINE_LABELS: Record<DocumentDiscipline, { label: string; bg: string; text: string; border: string }> = {
  TEC: { label: 'General Technical & Proposals', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  COM: { label: 'Commercial & Pricing', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  MEC: { label: 'Mechanical Engineering', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  ELE: { label: 'Electrical Engineering', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  INS: { label: 'Instrumentation & Control', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  CIV: { label: 'Civil & Structural', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  PIP: { label: 'Piping & Plant Layout', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  PRC: { label: 'Process Engineering', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  PM: { label: 'Project Management', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  HSE: { label: 'Health, Safety & Environment', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  QAC: { label: 'Quality Assurance & Control', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  CNT: { label: 'Subcontract & Legal', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  SUP: { label: 'Suppliers & Procurement', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
};

const DOC_TYPE_LABELS: Record<DocumentTypeCode, string> = {
  PRP: 'Proposal',
  BOQ: 'Bill of Quantities',
  DWG: 'Engineering Drawing',
  CAL: 'Calculation Sheet',
  SPC: 'Technical Specification',
  CTR: 'Contract Agreement',
  PIN: 'Proforma Invoice',
  MST: 'Method Statement',
  RPT: 'Technical Report',
  REQ: 'Material Inquiry / Requisition',
  CRT: 'Inspection Certificate',
};

const STATUS_BADGES: Record<DocumentReviewStatus, { label: string; bg: string; text: string; border: string; icon: any }> = {
  under_review: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', icon: Clock },
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: Clock },
  code_1_approved: { label: 'Code 1 - Approved', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', icon: CheckCircle2 },
  code_2_approved_with_comments: { label: 'Code 2 - Appvd w/ Comments', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: FileCheck },
  code_3_revise_resubmit: { label: 'Code 3 - Revise & Resubmit', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', icon: AlertTriangle },
  code_4_rejected: { label: 'Code 4 - Rejected', bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-300', icon: AlertTriangle },
  code_5_for_info: { label: 'Code 5 - For Info Only', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', icon: History },
};

export const TechnicalDocumentRegisterView: React.FC<TechnicalDocumentRegisterViewProps> = ({
  documents,
  correspondence,
  currentUser,
  onOpenDocument,
  onOpenCorrespondence,
  onRefreshData,
  onOpenExternalViewer,
  onBackToDashboard,
  isFullPage = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [viewDensity, setViewDensity] = useState<'spacious' | 'compact'>('spacious');
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  // Inspector State
  const [selectedDoc, setSelectedDoc] = useState<TechnicalDocument | null>(null);
  const [inspectorTab, setInspectorTab] = useState<
    'overview' | 'cad' | 'revisions' | 'transmittals' | 'external_shares' | 'commercial'
  >('overview');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Controlled External Share State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [documentToShare, setDocumentToShare] = useState<TechnicalDocument | null>(null);
  const [isExternalSharesModalOpen, setIsExternalSharesModalOpen] = useState(false);

  // New Document Form State
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    projectCode: 'PRJ-2026-01',
    projectName: 'Bandar Abbas Petrochemical Modernization',
    clientCompany: 'National Petrochemical Co.',
    clientContactPerson: 'Eng. Reza Mohammadi',
    clientEmail: 'r.mohammadi@npc-iran.ir',
    discipline: 'TEC' as DocumentDiscipline,
    documentType: 'PRP' as DocumentTypeCode,
    originator: 'PJMAK',
    currentRevision: 'Rev A',
    reasonForIssue: 'Tender / Technical Bid Submission',
    reviewStatus: 'under_review' as DocumentReviewStatus,
    milestoneStage: 'tender_bidding' as DocumentMilestone,
    commercialValue: '',
    currency: 'USD',
    costCode: 'CC-ENG-2026-01',
    revenueCode: 'REV-BANDAR-001',
    proformaInvoiceNumber: '',
    contractNumber: '',
    supplierName: '',
    transmittalLetterNumber: '',
  });

  // Revision Form State
  const [revisionForm, setRevisionForm] = useState({
    revision: 'Rev 1',
    reasonForIssue: 'For Approval',
    reviewStatus: 'under_review' as DocumentReviewStatus,
    transmittalLetterNumber: '',
    fileName: '',
    notes: '',
    preparedByName: currentUser?.name || 'Eng. Ali Kashefi',
    preparedByPosition: currentUser?.position || 'Project Engineer',
    checkedByName: 'Lead Discipline Engineer',
    checkedByPosition: 'Technical Reviewer',
    approvedByName: 'Managing Director',
    approvedByPosition: 'Executive Leadership',
    thirdPartyRequired: false,
    thirdPartyOrg: '',
    thirdPartyReviewer: '',
    thirdPartyStatus: 'pending' as 'pending' | 'approved' | 'approved_with_comments' | 'rejected',
  });

  // Unique projects for filtering
  const projectList = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.projectCode) set.add(d.projectCode);
    });
    return Array.from(set);
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedDiscipline !== 'ALL' && doc.discipline !== selectedDiscipline) return false;
      if (selectedType !== 'ALL' && doc.documentType !== selectedType) return false;
      if (selectedStatus !== 'ALL' && doc.reviewStatus !== selectedStatus) return false;
      if (selectedProject !== 'ALL' && doc.projectCode !== selectedProject) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        doc.documentNumber.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        doc.projectName.toLowerCase().includes(q) ||
        doc.clientCompany.toLowerCase().includes(q) ||
        (doc.costCode && doc.costCode.toLowerCase().includes(q)) ||
        (doc.revenueCode && doc.revenueCode.toLowerCase().includes(q)) ||
        (doc.supplierName && doc.supplierName.toLowerCase().includes(q)) ||
        (doc.proformaInvoiceNumber && doc.proformaInvoiceNumber.toLowerCase().includes(q)) ||
        (doc.contractNumber && doc.contractNumber.toLowerCase().includes(q)) ||
        doc.currentRevision.toLowerCase().includes(q)
      );
    });
  }, [documents, selectedDiscipline, selectedType, selectedStatus, selectedProject, searchQuery]);

  // Handle copy document number
  const handleCopyDocNumber = (e: React.MouseEvent, docNumber: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(docNumber);
    setCopiedDocId(docNumber);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  // Handle register document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForm,
          commercialValue: newForm.commercialValue ? Number(newForm.commercialValue) : undefined,
        }),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add revision
  const handleAddRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...revisionForm,
        signOff: {
          preparedBy: {
            name: revisionForm.preparedByName || currentUser.name,
            position: revisionForm.preparedByPosition || currentUser.position,
            date: new Date().toISOString().slice(0, 10),
          },
          checkedBy: {
            name: revisionForm.checkedByName || 'Lead Discipline Engineer',
            position: revisionForm.checkedByPosition || 'Technical Reviewer',
            date: new Date().toISOString().slice(0, 10),
          },
          approvedByInternal: {
            name: revisionForm.approvedByName || 'Managing Director',
            position: revisionForm.approvedByPosition || 'Executive Leadership',
            date: new Date().toISOString().slice(0, 10),
          },
          thirdPartyApproval: revisionForm.thirdPartyRequired
            ? {
                required: true,
                organizationName: revisionForm.thirdPartyOrg || 'Third-Party Inspection Agency',
                reviewerName: revisionForm.thirdPartyReviewer || '',
                status: revisionForm.thirdPartyStatus,
                date: new Date().toISOString().slice(0, 10),
              }
            : undefined,
        },
      };

      const res = await fetch(`/api/documents/${selectedDoc.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedDoc(updated);
        setIsRevisionModalOpen(false);
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Failed to add revision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Document Number',
      'Title',
      'Discipline',
      'Document Type',
      'Current Revision',
      'Revision Date',
      'Review Status',
      'Reason For Issue',
      'Project Code',
      'Project Name',
      'Client Company',
      'Commercial Value',
      'Currency',
      'Cost Code',
      'Revenue Code',
      'Contract Ref',
      'Revisions Count',
    ];

    const rows = filteredDocs.map((doc) => [
      `"${doc.documentNumber}"`,
      `"${doc.title.replace(/"/g, '""')}"`,
      doc.discipline,
      doc.documentType,
      doc.currentRevision,
      doc.revisionDate,
      doc.reviewStatus,
      `"${doc.reasonForIssue.replace(/"/g, '""')}"`,
      doc.projectCode,
      `"${doc.projectName.replace(/"/g, '""')}"`,
      `"${doc.clientCompany.replace(/"/g, '""')}"`,
      doc.commercialValue || '',
      doc.currency,
      doc.costCode || '',
      doc.revenueCode || '',
      doc.contractNumber || '',
      doc.revisions.length,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PJMAK_EDMS_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick stats
  const totalValue = useMemo(() => {
    return filteredDocs.reduce((acc, d) => acc + (d.commercialValue || 0), 0);
  }, [filteredDocs]);

  const approvedCount = useMemo(() => {
    return filteredDocs.filter((d) => d.reviewStatus === 'code_1_approved').length;
  }, [filteredDocs]);

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Top Banner / Navigation Bar (Shown when on dedicated page) */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          {!isFullPage && onBackToDashboard && (
            <>
              <button
                onClick={onBackToDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
                title="Return to Main Menu & Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            </>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Technical Documents (EDMS)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200">
                Aconex Compliant Register
              </span>
              <span className="text-xs font-semibold text-slate-500 hidden md:inline">
                • {filteredDocs.length} Documents
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Multi-discipline engineering drawings, calculations, specifications, revision log & controlled access
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="Export full register as CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            id="open-external-shares-manager-btn"
            onClick={() => setIsExternalSharesModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-50 border border-teal-200 text-teal-900 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="Manage controlled document shares, schedules, and external comments"
          >
            <ShieldCheck className="h-4 w-4 text-teal-600 stroke-[2.5]" />
            <span>Controlled External Access</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Register New Document</span>
          </button>
        </div>
      </div>

      {/* KPI & Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 bg-slate-100/60 border-b border-slate-200 shrink-0">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Documents
            </span>
            <span className="text-xl font-bold text-slate-900">{filteredDocs.length}</span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Code 1 Approved
            </span>
            <span className="text-xl font-bold text-emerald-700">{approvedCount}</span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Tracked Value
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              ${totalValue.toLocaleString()}
            </span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Projects
            </span>
            <span className="text-xl font-bold text-slate-900">{projectList.length}</span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Spacious Controls & Filters Bar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200 shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search document no, title, scope, client, cost code..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Doc Types</option>
              {Object.keys(DOC_TYPE_LABELS).map((k) => (
                <option key={k} value={k}>
                  {k} - {DOC_TYPE_LABELS[k as DocumentTypeCode]}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Review Statuses</option>
              {Object.keys(STATUS_BADGES).map((k) => (
                <option key={k} value={k}>
                  {STATUS_BADGES[k as DocumentReviewStatus].label}
                </option>
              ))}
            </select>

            {/* Project */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Projects</option>
              {projectList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* View Density Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewDensity('spacious')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  viewDensity === 'spacious' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Spacious rows with full multi-line details"
              >
                Spacious
              </button>
              <button
                onClick={() => setViewDensity('compact')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  viewDensity === 'compact' ? 'bg-white text-blue-950 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Compact rows for high density viewing"
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        {/* Fast Discipline Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs select-none">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 tracking-wider shrink-0">
            Discipline:
          </span>
          <button
            onClick={() => setSelectedDiscipline('ALL')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors shrink-0 cursor-pointer ${
              selectedDiscipline === 'ALL'
                ? 'bg-blue-950 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Disciplines ({documents.length})
          </button>
          {Object.entries(DISCIPLINE_LABELS).map(([code, disc]) => {
            const count = documents.filter((d) => d.discipline === code).length;
            if (count === 0) return null;
            const isSelected = selectedDiscipline === code;
            return (
              <button
                key={code}
                onClick={() => setSelectedDiscipline(code)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  isSelected
                    ? `${disc.bg} ${disc.text} ${disc.border} ring-2 ring-blue-500/20 shadow-2xs font-extrabold`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{code}</span>
                <span className="text-[9px] opacity-75 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Full-Width Spacious Table */}
      <div className="flex-1 overflow-auto bg-white">
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-slate-400">
            <Layers className="h-16 w-16 stroke-[1.2] mb-3 text-slate-300" />
            <p className="text-base font-bold text-slate-700">No technical documents match your criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting your filters or search keywords</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDiscipline('ALL');
                setSelectedType('ALL');
                setSelectedStatus('ALL');
                setSelectedProject('ALL');
              }}
              className="mt-4 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[1300px]">
            {/* Table Header */}
            <thead className="bg-slate-100/95 sticky top-0 border-b border-slate-200 z-10 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 min-w-[210px]">Document Number & Class</th>
                <th className="py-3 px-4 min-w-[340px]">Title & Engineering Scope</th>
                <th className="py-3 px-3 min-w-[170px]">Discipline</th>
                <th className="py-3 px-3 min-w-[120px]">Revision</th>
                <th className="py-3 px-3 min-w-[200px]">Review Status & Reason</th>
                <th className="py-3 px-3 min-w-[200px]">Client / Project</th>
                <th className="py-3 px-3 min-w-[160px]">Approvals & Sign-off</th>
                <th className="py-3 px-3 min-w-[150px] text-right">Value & Cost Code</th>
                <th className="py-3 px-3 min-w-[140px]">Transmittal</th>
                <th className="py-3 px-4 min-w-[140px] text-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 bg-white text-xs">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                const disc = DISCIPLINE_LABELS[doc.discipline] || DISCIPLINE_LABELS.TEC;
                const stat = STATUS_BADGES[doc.reviewStatus] || STATUS_BADGES.under_review;
                const StatIcon = stat.icon;

                // Find active revision sign-off
                const latestRev = doc.revisions[doc.revisions.length - 1];
                const signOff = latestRev?.signOff;

                return (
                  <tr
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setInspectorTab('overview');
                    }}
                    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/80 ring-1 ring-blue-500/20' : ''
                    } ${viewDensity === 'spacious' ? 'py-4' : 'py-2'}`}
                  >
                    {/* 1. Document Number & Classification */}
                    <td className={`px-4 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-slate-900 text-xs tracking-tight select-all">
                          {doc.documentNumber}
                        </span>
                        <button
                          onClick={(e) => handleCopyDocNumber(e, doc.documentNumber)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy Document Number"
                        >
                          {copiedDocId === doc.documentNumber ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.documentType} • {DOC_TYPE_LABELS[doc.documentType] || 'Doc'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                          {doc.fileFormat?.toUpperCase() || 'DWG'}
                        </span>
                      </div>
                    </td>

                    {/* 2. Title & Engineering Scope (Spacious, multi-line) */}
                    <td className={`px-4 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {doc.title}
                      </div>
                      {doc.description && (
                        <div className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {doc.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span>Milestone: <strong className="text-slate-600">{doc.milestoneStage.replace('_', ' ')}</strong></span>
                        {doc.drawingSheetNumber && (
                          <span>• Sheet: <strong className="text-slate-600">{doc.drawingSheetNumber}</strong></span>
                        )}
                      </div>
                    </td>

                    {/* 3. Discipline */}
                    <td className={`px-3 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${disc.bg} ${disc.text} ${disc.border}`}>
                        <span>{doc.discipline}</span>
                        <span className="text-[10px] font-medium hidden xl:inline">• {disc.label.split(' ')[0]}</span>
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Originator: {doc.originator}
                      </div>
                    </td>

                    {/* 4. Revision & History */}
                    <td className={`px-3 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono font-black text-xs shadow-2xs">
                          {doc.currentRevision}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {doc.revisions.length} revs
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{doc.revisionDate}</span>
                      </div>
                    </td>

                    {/* 5. Review Status & Reason */}
                    <td className={`px-3 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${stat.bg} ${stat.text} ${stat.border}`}>
                        <StatIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                        <span>{stat.label}</span>
                      </span>
                      <div className="text-[11px] font-semibold text-slate-600 mt-1.5">
                        {doc.reasonForIssue}
                      </div>
                    </td>

                    {/* 6. Client / Project */}
                    <td className={`px-3 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      <div className="font-bold text-slate-900 text-xs">
                        {doc.clientCompany}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {doc.projectName}
                      </div>
                      <div className="text-[10px] font-mono text-blue-900 mt-1">
                        {doc.projectCode}
                      </div>
                    </td>

                    {/* 7. Approvals & Sign-off */}
                    <td className={`px-3 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      {signOff ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Prep:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[90px]" title={signOff.preparedBy?.name}>
                              {signOff.preparedBy?.name ? '✓ ' + signOff.preparedBy.name.split(' ').pop() : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Chk:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[90px]" title={signOff.checkedBy?.name}>
                              {signOff.checkedBy?.name ? '✓ ' + signOff.checkedBy.name.split(' ').pop() : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Appr:</span>
                            <span className="font-bold text-slate-800 truncate max-w-[90px]" title={signOff.approvedByInternal?.name}>
                              {signOff.approvedByInternal?.name ? '✓ ' + signOff.approvedByInternal.name.split(' ').pop() : '—'}
                            </span>
                          </div>
                          {signOff.thirdPartyApproval?.required && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                              3rd Party: {signOff.thirdPartyApproval.status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Internal Sign-off Pending</span>
                      )}
                    </td>

                    {/* 8. Value & Cost Code */}
                    <td className={`px-3 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top text-right`}>
                      {doc.commercialValue ? (
                        <div className="font-mono font-black text-slate-900 text-xs">
                          ${doc.commercialValue.toLocaleString()} {doc.currency}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">-</span>
                      )}
                      {doc.costCode && (
                        <div className="font-mono text-[10px] font-bold text-blue-900 mt-1">
                          {doc.costCode}
                        </div>
                      )}
                    </td>

                    {/* 9. Transmittal Letters */}
                    <td className={`px-3 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top`}>
                      {doc.linkedCorrespondenceNumbers && doc.linkedCorrespondenceNumbers.length > 0 ? (
                        <div className="space-y-1">
                          {doc.linkedCorrespondenceNumbers.slice(0, 2).map((num) => (
                            <button
                              key={num}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenCorrespondence) onOpenCorrespondence(num);
                              }}
                              className="w-full flex items-center justify-between px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 font-mono text-[10px] font-bold border border-blue-200 transition-colors"
                              title="Open correspondence letter"
                            >
                              <span>{num}</span>
                              <ArrowUpRight className="h-3 w-3 text-blue-700" />
                            </button>
                          ))}
                          {doc.linkedCorrespondenceNumbers.length > 2 && (
                            <span className="text-[9px] text-slate-400 block text-center font-semibold">
                              +{doc.linkedCorrespondenceNumbers.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No Letter Linked</span>
                      )}
                    </td>

                    {/* 10. Actions */}
                    <td className={`px-4 ${viewDensity === 'spacious' ? 'py-4' : 'py-2.5'} align-top text-center`}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                            setInspectorTab('overview');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs transition-colors cursor-pointer border border-blue-200 shadow-2xs"
                          title="Open full inspector"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentToShare(doc);
                            setIsShareModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-800 hover:bg-teal-50 border border-transparent hover:border-teal-200 transition-colors cursor-pointer"
                          title="Controlled External Sharing"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DOCUMENT INSPECTOR: Spacious Slide-over Drawer with Backdrop Overlay */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setSelectedDoc(null)}
          />

          {/* Slide-over Drawer Container */}
          <div className="relative w-full max-w-3xl lg:max-w-4xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200">
            {/* Drawer Top Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-2xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-blue-950 text-base">
                      {selectedDoc.documentNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold text-xs">
                      {selectedDoc.currentRevision}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-900 border-blue-200">
                      {STATUS_BADGES[selectedDoc.reviewStatus]?.label}
                    </span>
                  </div>
                  <h2 className="text-xs text-slate-600 font-semibold mt-0.5 line-clamp-1">
                    {selectedDoc.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDocumentToShare(selectedDoc);
                    setIsShareModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Controlled External Sharing"
                >
                  <Share2 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-2 shrink-0 overflow-x-auto select-none">
              <button
                onClick={() => setInspectorTab('overview')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  inspectorTab === 'overview'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overview & Scope
              </button>
              <button
                onClick={() => setInspectorTab('cad')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'cad'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Maximize2 className="h-3.5 w-3.5 text-blue-700" />
                <span>CAD Vector Drawing</span>
              </button>
              <button
                onClick={() => setInspectorTab('revisions')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'revisions'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="h-3.5 w-3.5 text-amber-600" />
                <span>Revision Sign-offs ({selectedDoc.revisions.length})</span>
              </button>
              <button
                onClick={() => setInspectorTab('transmittals')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'transmittals'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Transmittals ({selectedDoc.linkedCorrespondenceNumbers.length})</span>
              </button>
              <button
                onClick={() => setInspectorTab('external_shares')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'external_shares'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                <span>Controlled Shares</span>
              </button>
              <button
                onClick={() => setInspectorTab('commercial')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'commercial'
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span>Cost & Commercial</span>
              </button>
            </div>

            {/* Inspector Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-slate-50/50">
              {/* TAB 1: OVERVIEW */}
              {inspectorTab === 'overview' && (
                <div className="space-y-5">
                  {/* Full Document Header Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Document Classification
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                        {DISCIPLINE_LABELS[selectedDoc.discipline]?.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {selectedDoc.title}
                    </h3>

                    {selectedDoc.description && (
                      <p className="text-slate-600 text-xs leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {selectedDoc.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Doc Type</span>
                        <span className="font-bold text-slate-900">{DOC_TYPE_LABELS[selectedDoc.documentType]}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Revision Date</span>
                        <span className="font-bold text-slate-900 font-mono">{selectedDoc.revisionDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Review Code</span>
                        <span className="font-bold text-slate-900">{STATUS_BADGES[selectedDoc.reviewStatus]?.label}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Reason for Issue</span>
                        <span className="font-bold text-slate-900">{selectedDoc.reasonForIssue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project & Client Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <Building2 className="h-4 w-4 text-blue-900" />
                      <span>Client & Project Association</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block">Client Organization:</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedDoc.clientCompany}</span>
                        {selectedDoc.clientContactPerson && (
                          <span className="text-slate-500 block text-[11px] mt-0.5">
                            Attn: {selectedDoc.clientContactPerson}
                          </span>
                        )}
                        {selectedDoc.clientEmail && (
                          <span className="text-blue-900 font-mono text-[10px] block">
                            {selectedDoc.clientEmail}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Project Name:</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedDoc.projectName}</span>
                        <span className="inline-block mt-1 font-mono font-bold text-xs text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {selectedDoc.projectCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick CAD Preview Teaser */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Engineering CAD Schematic</span>
                      <button
                        onClick={() => setInspectorTab('cad')}
                        className="text-blue-900 font-bold text-xs hover:underline flex items-center gap-1"
                      >
                        <span>Open Full Drawing Canvas</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div
                      onClick={() => setInspectorTab('cad')}
                      className="cursor-pointer hover:opacity-95 transition-opacity"
                    >
                      <TechnicalDrawingPreview document={selectedDoc} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CAD DRAWING CANVAS */}
              {inspectorTab === 'cad' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Interactive CAD Schematic Viewer</h3>
                      <p className="text-xs text-slate-500">Vector rendering with zoom, pan, grid, dimension toggles & ISO title block</p>
                    </div>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '#';
                        alert(`Downloading native CAD file: ${selectedDoc.documentNumber}.${selectedDoc.fileFormat || 'dwg'}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 text-white rounded-lg font-bold text-xs hover:bg-blue-800 shadow-2xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download DWG</span>
                    </button>
                  </div>

                  <TechnicalDrawingPreview document={selectedDoc} />
                </div>
              )}

              {/* TAB 3: REVISION HISTORY & SIGN-OFF BOXES */}
              {inspectorTab === 'revisions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Revision History & Formal Sign-offs</h3>
                      <p className="text-xs text-slate-500">Prepared By, Checked By, Internal Approval, and Third-Party certification</p>
                    </div>
                    <button
                      onClick={() => {
                        setRevisionForm({
                          revision: `Rev ${selectedDoc.revisions.length}`,
                          reasonForIssue: 'For Approval',
                          reviewStatus: selectedDoc.reviewStatus,
                          transmittalLetterNumber: '',
                          fileName: '',
                          notes: '',
                          preparedByName: currentUser?.name || 'Eng. Ali Kashefi',
                          preparedByPosition: currentUser?.position || 'Project Engineer',
                          checkedByName: 'Lead Discipline Engineer',
                          checkedByPosition: 'Technical Reviewer',
                          approvedByName: 'Managing Director',
                          approvedByPosition: 'Executive Leadership',
                          thirdPartyRequired: false,
                          thirdPartyOrg: '',
                          thirdPartyReviewer: '',
                          thirdPartyStatus: 'pending',
                        });
                        setIsRevisionModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 text-white rounded-lg font-bold text-xs hover:bg-blue-800 shadow-2xs cursor-pointer"
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                      <span>Issue Next Revision</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedDoc.revisions.map((rev, index) => (
                      <div
                        key={rev.id || index}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {rev.revision}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {rev.reasonForIssue}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{rev.issueDate}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block">Issued By:</span>
                            <span className="font-semibold text-slate-800">{rev.issuedByUserName}</span>
                          </div>
                          {rev.transmittalLetterNumber && (
                            <div>
                              <span className="text-slate-400 block">Transmittal Letter:</span>
                              <span className="font-mono font-bold text-blue-900">
                                {rev.transmittalLetterNumber}
                              </span>
                            </div>
                          )}
                        </div>

                        {rev.notes && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 text-xs italic">
                            "{rev.notes}"
                          </div>
                        )}

                        {/* Sign-off Boxes */}
                        {rev.signOff && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                              Formal Revision Sign-off Matrix
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <div className="border-r border-slate-200 pr-2">
                                <span className="text-slate-400 text-[10px] block font-medium">Prepared By:</span>
                                <span className="font-bold text-slate-900 text-xs block truncate">
                                  {rev.signOff.preparedBy?.name || '—'}
                                </span>
                                <span className="text-slate-500 text-[10px] block">
                                  {rev.signOff.preparedBy?.position || ''}
                                </span>
                                <span className="text-slate-400 text-[9px] font-mono block mt-0.5">
                                  {rev.signOff.preparedBy?.date || ''}
                                </span>
                              </div>

                              <div className="border-r border-slate-200 px-2">
                                <span className="text-slate-400 text-[10px] block font-medium">Checked By:</span>
                                <span className="font-bold text-slate-900 text-xs block truncate">
                                  {rev.signOff.checkedBy?.name || '—'}
                                </span>
                                <span className="text-slate-500 text-[10px] block">
                                  {rev.signOff.checkedBy?.position || ''}
                                </span>
                                <span className="text-slate-400 text-[9px] font-mono block mt-0.5">
                                  {rev.signOff.checkedBy?.date || ''}
                                </span>
                              </div>

                              <div className="pl-2">
                                <span className="text-slate-400 text-[10px] block font-medium">Approved By (Internal):</span>
                                <span className="font-bold text-slate-900 text-xs block truncate">
                                  {rev.signOff.approvedByInternal?.name || '—'}
                                </span>
                                <span className="text-slate-500 text-[10px] block">
                                  {rev.signOff.approvedByInternal?.position || ''}
                                </span>
                                <span className="text-slate-400 text-[9px] font-mono block mt-0.5">
                                  {rev.signOff.approvedByInternal?.date || ''}
                                </span>
                              </div>
                            </div>

                            {/* Third Party Box */}
                            {rev.signOff.thirdPartyApproval?.required && (
                              <div className="mt-2 bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 text-amber-950 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold uppercase tracking-wider block text-[10px]">
                                    Third-Party Inspection: {rev.signOff.thirdPartyApproval.organizationName}
                                  </span>
                                  {rev.signOff.thirdPartyApproval.reviewerName && (
                                    <span className="text-slate-600 block text-[11px]">
                                      Inspector: {rev.signOff.thirdPartyApproval.reviewerName}
                                    </span>
                                  )}
                                </div>
                                <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-200 text-amber-900 border border-amber-300">
                                  {rev.signOff.thirdPartyApproval.status?.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: TRANSMITTALS & CORRESPONDENCE */}
              {inspectorTab === 'transmittals' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Transmittal Letters & Ref Letters</h3>
                    <p className="text-xs text-slate-500">Official correspondence linking this engineering document to employer / client</p>
                  </div>

                  {selectedDoc.linkedCorrespondenceNumbers.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400">
                      <FileCheck className="h-10 w-10 stroke-[1.5] mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No transmittal letter linked yet</p>
                      <p className="text-xs text-slate-400 mt-1">Issue an outgoing transmittal from the Correspondence Register to link here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDoc.linkedCorrespondenceNumbers.map((num) => {
                        const linkedCorr = correspondence.find((c) => c.correspondenceNumber === num);
                        return (
                          <div
                            key={num}
                            onClick={() => onOpenCorrespondence && onOpenCorrespondence(num)}
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-blue-950 text-sm">{num}</span>
                                {linkedCorr && (
                                  <span className="px-2 py-0.2 rounded bg-blue-100 text-blue-900 text-[10px] font-bold uppercase">
                                    {linkedCorr.type}
                                  </span>
                                )}
                              </div>
                              {linkedCorr && (
                                <p className="text-slate-700 text-xs font-medium">
                                  {linkedCorr.subject}
                                </p>
                              )}
                              <span className="text-[10px] text-slate-400">
                                Click to open full official letter in correspondence register
                              </span>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-blue-800 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CONTROLLED EXTERNAL SHARES */}
              {inspectorTab === 'external_shares' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Controlled External Access & Reviews</h3>
                      <p className="text-xs text-slate-500">Security schedules, watermark tracking, and external reviewer comments</p>
                    </div>
                    <button
                      onClick={() => {
                        setDocumentToShare(selectedDoc);
                        setIsShareModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create New Share</span>
                    </button>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Manage All Shares</span>
                      <button
                        onClick={() => setIsExternalSharesModalOpen(true)}
                        className="text-teal-800 font-bold text-xs hover:underline flex items-center gap-1"
                      >
                        <span>Open Security Schedule Center</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Configure granular access windows (allowed days and working hours), dynamic watermark stamping, password protection, and comment collection for third-party engineering contractors.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 6: COMMERCIAL & COST */}
              {inspectorTab === 'commercial' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Commercial & Accounting Classification</h3>
                    <p className="text-xs text-slate-500">Contract reference, cost codes, revenue codes, and proforma invoices</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase block">Commercial Value</span>
                        <span className="text-lg font-black text-emerald-950 font-mono">
                          {selectedDoc.commercialValue
                            ? `$${selectedDoc.commercialValue.toLocaleString()} ${selectedDoc.currency}`
                            : 'Not Applicable'}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                        <span className="text-[10px] font-bold text-blue-900 uppercase block">Cost Code</span>
                        <span className="text-sm font-black text-blue-950 font-mono">
                          {selectedDoc.costCode || 'CC-ENG-2026-01'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Revenue Code:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedDoc.revenueCode || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Contract Ref:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedDoc.contractNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Proforma Invoice:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedDoc.proformaInvoiceNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Supplier / Vendor:</span>
                        <span className="font-bold text-slate-800">{selectedDoc.supplierName || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close Inspector
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDocumentToShare(selectedDoc);
                    setIsShareModalOpen(true);
                  }}
                  className="px-4 py-2 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Share Externally
                </button>
                <button
                  onClick={() => {
                    setRevisionForm({
                      revision: `Rev ${selectedDoc.revisions.length}`,
                      reasonForIssue: 'For Approval',
                      reviewStatus: selectedDoc.reviewStatus,
                      transmittalLetterNumber: '',
                      fileName: '',
                      notes: '',
                      preparedByName: currentUser?.name || 'Eng. Ali Kashefi',
                      preparedByPosition: currentUser?.position || 'Project Engineer',
                      checkedByName: 'Lead Discipline Engineer',
                      checkedByPosition: 'Technical Reviewer',
                      approvedByName: 'Managing Director',
                      approvedByPosition: 'Executive Leadership',
                      thirdPartyRequired: false,
                      thirdPartyOrg: '',
                      thirdPartyReviewer: '',
                      thirdPartyStatus: 'pending',
                    });
                    setIsRevisionModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  Issue Next Revision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register New Document */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-blue-900 text-white">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">Register Technical Document</h2>
                  <p className="text-xs text-slate-500">Aconex standard numbering schema & tracking</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Document Number Preview */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-blue-950/70 uppercase">
                  Automatic Sequential Format
                </span>
                <div className="font-mono font-bold text-blue-950 text-sm">
                  {newForm.projectCode.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()}-
                  {newForm.originator}-{newForm.discipline}-{newForm.documentType}-###
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="e.g., Gas Fractionation Unit P&ID Schematic"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scope / Description</label>
                <textarea
                  rows={2}
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="Detailed engineering scope, drawing sheet references, tag numbers..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs resize-none"
                />
              </div>

              {/* Classification Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discipline</label>
                  <select
                    value={newForm.discipline}
                    onChange={(e) => setNewForm({ ...newForm, discipline: e.target.value as DocumentDiscipline })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {Object.keys(DISCIPLINE_LABELS).map((k) => (
                      <option key={k} value={k}>
                        {k} - {DISCIPLINE_LABELS[k as DocumentDiscipline].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Type</label>
                  <select
                    value={newForm.documentType}
                    onChange={(e) => setNewForm({ ...newForm, documentType: e.target.value as DocumentTypeCode })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {Object.keys(DOC_TYPE_LABELS).map((k) => (
                      <option key={k} value={k}>
                        {k} - {DOC_TYPE_LABELS[k as DocumentTypeCode]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client & Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client Company</label>
                  <input
                    type="text"
                    value={newForm.clientCompany}
                    onChange={(e) => setNewForm({ ...newForm, clientCompany: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={newForm.projectName}
                    onChange={(e) => setNewForm({ ...newForm, projectName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Commercial & Cost Codes */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Value</label>
                  <input
                    type="number"
                    value={newForm.commercialValue}
                    onChange={(e) => setNewForm({ ...newForm, commercialValue: e.target.value })}
                    placeholder="e.g., 25000"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost Code</label>
                  <input
                    type="text"
                    value={newForm.costCode}
                    onChange={(e) => setNewForm({ ...newForm, costCode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Revenue Code</label>
                  <input
                    type="text"
                    value={newForm.revenueCode}
                    onChange={(e) => setNewForm({ ...newForm, revenueCode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Status and Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Issue</label>
                  <input
                    type="text"
                    value={newForm.reasonForIssue}
                    onChange={(e) => setNewForm({ ...newForm, reasonForIssue: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newForm.reviewStatus}
                    onChange={(e) => setNewForm({ ...newForm, reviewStatus: e.target.value as DocumentReviewStatus })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {Object.keys(STATUS_BADGES).map((k) => (
                      <option key={k} value={k}>
                        {STATUS_BADGES[k as DocumentReviewStatus].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Issue Next Revision with Sign-off & Approvals */}
      {isRevisionModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-blue-900 text-white">
                  <History className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">
                    Issue Revision for {selectedDoc.documentNumber}
                  </h2>
                  <p className="text-xs text-slate-500">Document sign-off and approval recording</p>
                </div>
              </div>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRevision} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Revision Identifier *</label>
                  <input
                    type="text"
                    required
                    value={revisionForm.revision}
                    onChange={(e) => setRevisionForm({ ...revisionForm, revision: e.target.value })}
                    placeholder="Rev 1, Rev B..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Issue *</label>
                  <input
                    type="text"
                    required
                    value={revisionForm.reasonForIssue}
                    onChange={(e) => setRevisionForm({ ...revisionForm, reasonForIssue: e.target.value })}
                    placeholder="For Approval / Client Review / IFC"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Review Status Code</label>
                <select
                  value={revisionForm.reviewStatus}
                  onChange={(e) => setRevisionForm({ ...revisionForm, reviewStatus: e.target.value as DocumentReviewStatus })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  {Object.keys(STATUS_BADGES).map((k) => (
                    <option key={k} value={k}>
                      {STATUS_BADGES[k as DocumentReviewStatus].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transmittal Letter Ref</label>
                <input
                  type="text"
                  value={revisionForm.transmittalLetterNumber}
                  onChange={(e) => setRevisionForm({ ...revisionForm, transmittalLetterNumber: e.target.value })}
                  placeholder="OUT-2026-X"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Revision Notes / Changes</label>
                <textarea
                  rows={2}
                  value={revisionForm.notes}
                  onChange={(e) => setRevisionForm({ ...revisionForm, notes: e.target.value })}
                  placeholder="Incorporated comments from consultant regarding..."
                  className="w-full p-2 border border-slate-300 rounded-lg resize-none"
                />
              </div>

              {/* Revision Sign-off Boxes (Internal Organization) */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Document Sign-off & Revision Approval Boxes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Prepared By</label>
                    <input
                      type="text"
                      value={revisionForm.preparedByName}
                      onChange={(e) => setRevisionForm({ ...revisionForm, preparedByName: e.target.value })}
                      placeholder="Engineer Name"
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={revisionForm.preparedByPosition}
                      onChange={(e) => setRevisionForm({ ...revisionForm, preparedByPosition: e.target.value })}
                      placeholder="Title / Role"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded text-[10px] text-slate-500 mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Checked By</label>
                    <input
                      type="text"
                      value={revisionForm.checkedByName}
                      onChange={(e) => setRevisionForm({ ...revisionForm, checkedByName: e.target.value })}
                      placeholder="Discipline Lead"
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={revisionForm.checkedByPosition}
                      onChange={(e) => setRevisionForm({ ...revisionForm, checkedByPosition: e.target.value })}
                      placeholder="Technical Reviewer"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded text-[10px] text-slate-500 mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Approved By (Internal)</label>
                    <input
                      type="text"
                      value={revisionForm.approvedByName}
                      onChange={(e) => setRevisionForm({ ...revisionForm, approvedByName: e.target.value })}
                      placeholder="Director / PM"
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={revisionForm.approvedByPosition}
                      onChange={(e) => setRevisionForm({ ...revisionForm, approvedByPosition: e.target.value })}
                      placeholder="Managing Director"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded text-[10px] text-slate-500 mt-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Outside Third-Party Approval Box */}
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revisionForm.thirdPartyRequired}
                    onChange={(e) => setRevisionForm({ ...revisionForm, thirdPartyRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-amber-400 text-amber-600"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    Requires Outside Third-Party Company Approval
                  </span>
                </label>

                {revisionForm.thirdPartyRequired && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">Third-Party Org</label>
                      <input
                        type="text"
                        value={revisionForm.thirdPartyOrg}
                        onChange={(e) => setRevisionForm({ ...revisionForm, thirdPartyOrg: e.target.value })}
                        placeholder="e.g., DNV / Lloyd's / NPC"
                        className="w-full px-2 py-1 border border-amber-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">Inspector / Reviewer</label>
                      <input
                        type="text"
                        value={revisionForm.thirdPartyReviewer}
                        onChange={(e) => setRevisionForm({ ...revisionForm, thirdPartyReviewer: e.target.value })}
                        placeholder="Inspector Name"
                        className="w-full px-2 py-1 border border-amber-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">Approval Status</label>
                      <select
                        value={revisionForm.thirdPartyStatus}
                        onChange={(e) => setRevisionForm({ ...revisionForm, thirdPartyStatus: e.target.value as any })}
                        className="w-full px-2 py-1 border border-amber-300 rounded text-xs bg-white"
                      >
                        <option value="pending">Pending Review</option>
                        <option value="approved">Approved</option>
                        <option value="approved_with_comments">Approved w/ Comments</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Revision...' : 'Save & Issue Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Controlled External Document Share */}
      {isShareModalOpen && documentToShare && (
        <ShareDocumentModal
          document={documentToShare}
          currentUser={currentUser}
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setDocumentToShare(null);
          }}
          onShareCreated={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* MODAL: External Shares Manager */}
      {isExternalSharesModalOpen && (
        <ExternalSharesManagerModal
          isOpen={isExternalSharesModalOpen}
          onClose={() => setIsExternalSharesModalOpen(false)}
          currentUser={currentUser}
          documents={documents}
          onRefreshData={onRefreshData}
          onOpenExternalViewer={onOpenExternalViewer}
        />
      )}
    </div>
  );
};
