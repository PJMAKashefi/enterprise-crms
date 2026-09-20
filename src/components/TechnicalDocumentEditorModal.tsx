import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Save,
  Printer,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Tag,
  Hash,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  HelpCircle,
  FileSpreadsheet,
  Check,
  Copy,
  ChevronDown,
  Sparkles,
  Shield,
  Eye,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  TechnicalDocument,
  DocumentRevision,
  DocumentDiscipline,
  DocumentTypeCode,
  DocumentReviewStatus,
  User,
  Attachment,
} from '../types';
import { PjmakLogo } from './PjmakLogo';

interface TechnicalDocumentEditorModalProps {
  document: TechnicalDocument;
  currentUser: User;
  onClose: () => void;
  onSave: (updatedDoc: TechnicalDocument) => Promise<void>;
  onRefreshData?: () => void;
}

export const TechnicalDocumentEditorModal: React.FC<TechnicalDocumentEditorModalProps> = ({
  document: initialDoc,
  currentUser,
  onClose,
  onSave,
  onRefreshData,
}) => {
  const [doc, setDoc] = useState<TechnicalDocument>({
    ...initialDoc,
    documentMode: initialDoc.documentMode || 'generated',
    documentScope: initialDoc.documentScope || initialDoc.description || 'Boskalis Offshore Export Cable Installation',
    clientDocumentNumber: initialDoc.clientDocumentNumber || '02488566',
    clientRevisionCode: initialDoc.clientRevisionCode || 'C',
    contractorDocumentNumber: initialDoc.contractorDocumentNumber || initialDoc.documentNumber,
    contractorRevisionNo: initialDoc.contractorRevisionNo || '0',
    poNumber: initialDoc.poNumber || 'P0036341',
    contractNumber: initialDoc.contractNumber || '0049',
    rdsPpCode: initialDoc.rdsPpCode || '#HOW02=X01AAD12WB002-WB001&CDB',
    fileFormat: initialDoc.fileFormat || (initialDoc.documentType === 'DWG' ? 'dwg' : 'docx'),
    bodyHtml:
      initialDoc.bodyHtml ||
      `<h3>1. INTRODUCTION</h3>
<p>For a general overview of the project and its scope, reference is made to the Project Introduction. For a general overview of all available project documentation, reference is made to the Project Master Document Register. For an overview of all starting points used for project preparation, reference is made to the Project Design Basis.</p>

<h4>1.1 Purpose of Document</h4>
<p>The purpose of this document is to describe the principal methodology envisioned by the contractor for the installation of the project export cable system, including seabed preparation, cable pull-in, cable lay, cable burial, testing, and demobilization.</p>
<p><em>Note: This document is an overall technical description of the operations undertaken during the project and does not substitute each individual procedure as per the Master Document Register.</em></p>

<h4>1.2 Interface with Other Documents</h4>
<p>The works described herein interface with the Project Execution Plan, Basis of Design, Environmental Management Plan, and Health & Safety Plan.</p>

<h3>2. SCOPE OF SUPPLY & WORK METHOD</h3>
<p>Contractor's works consist of detailed engineering, vessel mobilization, route preparation, cable installation, post-installation testing, and demobilization.</p>`,
    holdPoints: initialDoc.holdPoints && initialDoc.holdPoints.length > 0
      ? initialDoc.holdPoints
      : [
          { nr: 1, description: 'Pre-lay route survey verification and boulder clearance approval', responsibleParty: 'Client / Marine Warranty Surveyor', status: 'Closed' },
          { nr: 2, description: 'Landfall pull-in winch load test and anchor spread clearance', responsibleParty: 'Contractor Lead Engineer', status: 'Closed' },
          { nr: 3, description: 'Offshore inline jointing readiness and fiber OTDR baseline test', responsibleParty: 'Client Inspector & Contractor QA', status: 'Pending' },
        ],
    revisionHistoryItems: initialDoc.revisionHistoryItems && initialDoc.revisionHistoryItems.length > 0
      ? initialDoc.revisionHistoryItems
      : [
          { revision: 'A', section: 'All', changeDescription: 'First issue for client technical review' },
          { revision: 'B', section: 'Section 4.2', changeDescription: 'Updated according to comment sheet; revised trenching depth' },
          { revision: 'C', section: 'Section 7.4', changeDescription: 'All comments implemented according to latest Code 1 client comments' },
        ],
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'sheet1' | 'sheet2' | 'sheet3' | 'attachments'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfUploadName, setPdfUploadName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editor content with doc.bodyHtml on mount or change
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== doc.bodyHtml) {
      editorRef.current.innerHTML = doc.bodyHtml || '';
    }
  }, [activeTab]);

  const handleContentInput = () => {
    if (editorRef.current) {
      setDoc((prev) => ({ ...prev, bodyHtml: editorRef.current?.innerHTML || '' }));
    }
  };

  // Rich text formatting commands
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setDoc((prev) => ({ ...prev, bodyHtml: editorRef.current?.innerHTML || '' }));
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Item</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Description</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Specification / Value</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">01</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Operating Depth</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">0 - 500 m</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Standard offshore criteria</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">02</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">Maximum Tow Force</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">200 tonnes continuous</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">250 Te peak capability</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    executeCommand('insertHTML', tableHtml);
  };

  const handleInsertCallout = (type: 'note' | 'warning') => {
    const calloutHtml =
      type === 'warning'
        ? `<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; margin: 12px 0; border-radius: 4px; font-size: 12px;">
            <strong style="color: #b45309;">IMPORTANT SAFETY / ENGINEERING NOTE:</strong>
            <p style="margin: 4px 0 0 0; color: #92400e;">Ensure all operations adhere strictly to project specifications and Marine Warranty Surveyor requirements before proceeding with execution.</p>
           </div><p><br></p>`
        : `<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 14px; margin: 12px 0; border-radius: 4px; font-size: 12px;">
            <strong style="color: #1d4ed8;">TECHNICAL SPECIFICATION REFERENCE:</strong>
            <p style="margin: 4px 0 0 0; color: #1e40af;">All references and technical requirements correspond to the approved Master Document Register and Contract Agreement.</p>
           </div><p><br></p>`;
    executeCommand('insertHTML', calloutHtml);
  };

  const handleInsertTemplate = (templateType: 'method_statement' | 'proposal' | 'specification') => {
    let content = '';
    if (templateType === 'method_statement') {
      content = `
        <h3>1. INTRODUCTION</h3>
        <p>For a general overview of the project and its scope, reference is made to the Project Introduction. For a general overview of all available project documentation, reference is made to the Project Master Document Register. For an overview of all starting points used for project preparation, reference is made to the Project Design Basis.</p>
        <h4>1.1 Purpose of Document</h4>
        <p>The purpose of this document is to describe the principal methodology envisioned by the contractor for the installation of the export cable system, including seabed preparation, cable pull-in, cable lay, cable burial, testing, and demobilization.</p>
        <h4>1.2 Scope of Works</h4>
        <p>Contractor's works consist of detailed engineering, vessel mobilization, route preparation, cable installation, post-installation survey, and demobilization.</p>
        <h3>2. EQUIPMENT & RESOURCES</h3>
        <p>The operational spread incorporates specialized cable lay vessels, dynamically positioned fallpipe vessels, and remote trenching tooling qualified to the highest offshore standards.</p>
      `;
    } else if (templateType === 'proposal') {
      content = `
        <h3>1. EXECUTIVE SUMMARY & COMMERCIAL OFFER</h3>
        <p>We are pleased to present our comprehensive Technical and Commercial Proposal in accordance with the tender requirements. This document outlines our execution strategy, milestone billing schedule, resource allocation, and quality management protocols.</p>
        <h3>2. SCOPE OF SERVICES</h3>
        <p>The proposed scope encompasses full engineering design, procurement of specialized equipment, site installation, and formal commissioning support.</p>
        <h3>3. COMMERCIAL BREAKDOWN & PAYMENT MILESTONES</h3>
        <p>All pricing is structured around agreed project deliverables and verified milestone sign-offs. Billing is tied directly to cost code <strong>${doc.costCode || 'CC-GEN-2026'}</strong> and revenue code <strong>${doc.revenueCode || 'REV-GEN-01'}</strong>.</p>
      `;
    } else {
      content = `
        <h3>1. TECHNICAL SPECIFICATIONS & COMPLIANCE</h3>
        <p>This specification establishes the minimum mandatory technical, environmental, and performance criteria for the procurement, fabrication, and testing of materials and equipment.</p>
        <h3>2. APPLICABLE CODES & STANDARDS</h3>
        <ul>
          <li>ISO 9001 / ISO 14001 / ISO 45001</li>
          <li>Lloyd's Register of Shipping Factors & DNV-GL Rules</li>
          <li>Client Technical Requirements Document Ref: ${doc.clientDocumentNumber || '02488566'}</li>
        </ul>
      `;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
      setDoc((prev) => ({ ...prev, bodyHtml: content }));
    }
  };

  const handleAddHoldPoint = () => {
    const nextNr = (doc.holdPoints?.length || 0) + 1;
    const newHoldPoint = {
      nr: nextNr,
      description: 'New engineering milestone verification point',
      responsibleParty: doc.clientCompany || 'Client Representative',
      status: 'Open' as const,
    };
    setDoc((prev) => ({
      ...prev,
      holdPoints: [...(prev.holdPoints || []), newHoldPoint],
    }));
  };

  const handleRemoveHoldPoint = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      holdPoints: (prev.holdPoints || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddRevisionHistory = () => {
    const nextRev = doc.currentRevision || 'Rev 1';
    const newRevItem = {
      revision: nextRev,
      section: 'All',
      changeDescription: 'Updated technical details and client remarks',
    };
    setDoc((prev) => ({
      ...prev,
      revisionHistoryItems: [...(prev.revisionHistoryItems || []), newRevItem],
    }));
  };

  const handleRemoveRevisionHistory = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      revisionHistoryItems: (prev.revisionHistoryItems || []).filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfUploadName(file.name);
    const newAttachment: Attachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      fileName: file.name,
      type: file.type || 'application/pdf',
      fileType: file.type || 'application/pdf',
      fileSize: file.size,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    };

    setDoc((prev) => ({
      ...prev,
      fileFormat: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.dwg') ? 'dwg' : 'docx',
      attachments: [...(prev.attachments || []), newAttachment],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: TechnicalDocument = {
        ...doc,
        bodyHtml: editorRef.current ? editorRef.current.innerHTML : doc.bodyHtml,
        updatedAt: new Date().toISOString(),
      };
      await onSave(payload);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to save document:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        className={`bg-slate-100 rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-300 transition-all ${
          isFullscreen ? 'fixed inset-2 z-50' : 'max-w-6xl max-h-[94vh] h-[92vh]'
        }`}
      >
        {/* 1. TOP HEADER BAR */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {doc.contractorDocumentNumber || doc.documentNumber}
                </span>
                {doc.clientDocumentNumber && (
                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Client Ref: {doc.clientDocumentNumber}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                  {doc.currentRevision || 'Rev 0'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                  {doc.documentType} • {doc.documentType === 'PRP' ? 'Proposal' : doc.documentType === 'MST' ? 'Method Statement' : doc.documentType}
                </span>
              </div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 truncate mt-0.5">
                {doc.title}
              </h2>
            </div>
          </div>

          {/* Mode Switcher & Top Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDoc((prev) => ({ ...prev, documentMode: 'generated' }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  doc.documentMode === 'generated'
                    ? 'bg-white text-blue-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Author in Word-Style Workspace"
              >
                <Edit3 className="h-3.5 w-3.5 text-blue-800" />
                <span>Word Authoring</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDoc((prev) => ({ ...prev, documentMode: 'received' }));
                  setActiveTab('attachments');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  doc.documentMode === 'received'
                    ? 'bg-white text-blue-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Register External Received PDF"
              >
                <Paperclip className="h-3.5 w-3.5 text-blue-800" />
                <span>External Received PDF</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Print or Export 3-Page Engineering Dossier to PDF"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Document'}</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. NAVIGATION SUB-HEADER: TABS */}
        <div className="bg-slate-50 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 py-1.5">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Word Document Editor</span>
            </button>

            <button
              onClick={() => setActiveTab('sheet1')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'sheet1'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Page 1: Control & Revision Record</span>
            </button>

            <button
              onClick={() => setActiveTab('sheet2')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'sheet2'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Page 2: Title & Sign-Off Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('sheet3')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'sheet3'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Page 3: Revision History & HOLD Points</span>
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'attachments'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span>PDF Files & Attachments ({doc.attachments?.length || 0})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span>Cost: <strong className="text-slate-700">{doc.costCode || 'N/A'}</strong></span>
            <span>Rev: <strong className="text-slate-700">{doc.revenueCode || 'N/A'}</strong></span>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-200/60 print:bg-white print:p-0">
          {/* TAB 1: WORD-STYLE DOCUMENT EDITOR */}
          {activeTab === 'editor' && (
            <div className="w-full max-w-4xl space-y-4">
              {/* Word Formatting Toolbar */}
              <div className="sticky top-0 z-20 bg-white p-2 rounded-xl border border-slate-300 shadow-sm flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Style selector */}
                  <select
                    onChange={(e) => executeCommand('formatBlock', e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium"
                    defaultValue="p"
                  >
                    <option value="p">Normal Text</option>
                    <option value="h3">Heading 1</option>
                    <option value="h4">Heading 2</option>
                    <option value="h5">Heading 3</option>
                    <option value="pre">Code / Monospace</option>
                  </select>

                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Formatting Buttons */}
                  <button
                    type="button"
                    onClick={() => executeCommand('bold')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Bold (Ctrl+B)"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('italic')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Italic (Ctrl+I)"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('underline')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Underline (Ctrl+U)"
                  >
                    <Underline className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('strikeThrough')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Strikethrough"
                  >
                    <Strikethrough className="h-4 w-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Alignment Buttons */}
                  <button
                    type="button"
                    onClick={() => executeCommand('justifyLeft')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Align Left"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('justifyCenter')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Align Center"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('justifyRight')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Align Right"
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('justifyFull')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Justify"
                  >
                    <AlignJustify className="h-4 w-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Lists */}
                  <button
                    type="button"
                    onClick={() => executeCommand('insertUnorderedList')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Bullet List"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('insertOrderedList')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Numbered List"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Table & Callout */}
                  <button
                    type="button"
                    onClick={handleInsertTable}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700"
                    title="Insert Formatted Engineering Table"
                  >
                    <TableIcon className="h-3.5 w-3.5 text-blue-900" />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCallout('warning')}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold text-amber-800"
                    title="Insert Engineering Safety Warning"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Warning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCallout('note')}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold text-blue-800"
                    title="Insert Technical Note"
                  >
                    <Info className="h-3.5 w-3.5 text-blue-600" />
                    <span>Note</span>
                  </button>
                </div>

                {/* Quick Templates Dropdown */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <div className="relative group">
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                      <span>Insert Template</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 hidden group-hover:block z-30">
                      <button
                        type="button"
                        onClick={() => handleInsertTemplate('method_statement')}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 font-medium"
                      >
                        Outlined Method Statement (PDF standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertTemplate('proposal')}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 font-medium"
                      >
                        Technical & Commercial Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertTemplate('specification')}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 font-medium"
                      >
                        Engineering Technical Specification
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical A4 Paper Canvas */}
              <div className="bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 min-h-[780px] font-sans text-slate-800 space-y-6">
                {/* Running Header on Paper */}
                <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <div>
                    <span className="font-bold text-slate-900 block">{doc.title.toUpperCase()}</span>
                    <span>Proj. Doc. Ref: <strong className="text-slate-900">{doc.contractorDocumentNumber || doc.documentNumber}</strong></span>
                  </div>
                  <div className="text-right">
                    <span>Client Doc. Ref: <strong className="text-slate-900">{doc.clientDocumentNumber || 'N/A'}</strong></span>
                    <span className="ml-3">Rev: <strong className="text-slate-900">{doc.currentRevision}</strong></span>
                  </div>
                </div>

                {/* Editable Rich Document Content */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleContentInput}
                  className="outline-none min-h-[500px] prose prose-slate max-w-none text-sm leading-relaxed focus:ring-0"
                />

                {/* Running Footer on Paper */}
                <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>PJMAK Enterprise Document Management System (EDMS)</span>
                  <span>Confidential & Proprietary • Project {doc.projectCode}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAGE 1 - PROJECT DOCUMENT CONTROL SHEET & REVISION RECORD */}
          {activeTab === 'sheet1' && (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-6 print:shadow-none print:border-none">
              {/* Top Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div className="space-y-1 text-xs">
                  <div>Project Name: <strong className="text-sm font-bold text-slate-900">{doc.projectName}</strong></div>
                  <div>Document Title: <strong className="text-sm font-bold text-slate-900">{doc.title}</strong></div>
                  <div>Document Number: <strong className="font-mono font-bold text-slate-900">{doc.clientDocumentNumber || doc.documentNumber}</strong></div>
                  <div>Document Revision: <strong className="font-mono font-bold text-slate-900">{doc.clientRevisionCode || doc.currentRevision}</strong></div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xl font-extrabold text-blue-900 tracking-tight">
                    {doc.clientCompany || 'Ørsted'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Client / Operator</span>
                </div>
              </div>

              {/* Main Document Control Box (Matches Page 1 of PDF) */}
              <div className="border-2 border-slate-900 divide-y-2 divide-slate-900 text-xs">
                <div className="p-2.5 bg-slate-100 font-bold text-sm">
                  Document title: <span className="font-extrabold">{doc.title}</span>
                </div>
                <div className="p-2.5 bg-slate-50 font-semibold">
                  Operator: <span className="font-bold">{doc.clientCompany}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Contract: <span className="font-mono font-bold">{doc.contractNumber || '0049'}</span>
                  </div>
                  <div className="p-2.5 font-semibold">
                    Scope: <span className="font-bold">{doc.documentScope}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Document Type: <span className="font-bold">{doc.documentType} - {doc.documentType === 'PRP' ? 'Proposal' : doc.documentType === 'MST' ? 'Report / Method Statement' : doc.documentType}</span>
                  </div>
                  <div className="p-2.5 font-semibold">
                    Client Document Number: <span className="font-mono font-bold">{doc.clientDocumentNumber || '02488566'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Contractor Document Number: <span className="font-mono font-bold">{doc.contractorDocumentNumber || doc.documentNumber}</span>
                  </div>
                  <div className="p-2.5 font-semibold">
                    Contractor Revision No: <span className="font-mono font-bold">{doc.contractorRevisionNo || '0'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Originator: <span className="font-bold">{doc.originator || 'PJMAK'}</span>
                  </div>
                  <div className="p-2.5 font-semibold">
                    PO Number: <span className="font-mono font-bold">{doc.poNumber || 'P0036341'}</span>
                  </div>
                </div>

                <div className="p-2.5 space-y-1">
                  <div className="font-bold text-slate-700">Cost Code & Revenue Code / Work Breakdown (RDS-PP):</div>
                  <div className="font-mono text-[11px] text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">
                    <div>Cost Code: <strong>{doc.costCode || 'CC-MEC-2026-01'}</strong></div>
                    <div>Revenue Code: <strong>{doc.revenueCode || 'REV-CLIENT-001'}</strong></div>
                    <div className="text-slate-500 mt-1">{doc.rdsPpCode}</div>
                  </div>
                </div>
              </div>

              {/* Revision Record Table (Matches Page 1 of PDF) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                    Revision Record
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddRevisionHistory}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Revision Row</span>
                  </button>
                </div>

                <div className="border-2 border-slate-900 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 font-bold">
                        <th className="p-2 border-r-2 border-slate-900 w-20">Rev code</th>
                        <th className="p-2 border-r-2 border-slate-900">Reasons for Issue</th>
                        <th className="p-2 border-r-2 border-slate-900 w-28">Date</th>
                        <th className="p-2 border-r-2 border-slate-900 w-24">Author</th>
                        <th className="p-2 border-r-2 border-slate-900 w-24">Checked</th>
                        <th className="p-2 w-24">Accepted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {doc.revisions && doc.revisions.length > 0 ? (
                        doc.revisions.map((rev, idx) => (
                          <tr key={rev.id || idx}>
                            <td className="p-2 border-r-2 border-slate-900 font-mono font-bold">{rev.revision}</td>
                            <td className="p-2 border-r-2 border-slate-900">{rev.reasonForIssue}</td>
                            <td className="p-2 border-r-2 border-slate-900 font-mono">{rev.issueDate}</td>
                            <td className="p-2 border-r-2 border-slate-900 font-semibold">{rev.signOff?.preparedBy?.name || rev.issuedByUserName || 'EBA'}</td>
                            <td className="p-2 border-r-2 border-slate-900 font-semibold">{rev.signOff?.checkedBy?.name || 'YKA'}</td>
                            <td className="p-2 font-semibold text-emerald-800">{rev.signOff?.approvedByInternal?.name || 'SMA'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-2 border-r-2 border-slate-900 font-mono font-bold">{doc.currentRevision}</td>
                          <td className="p-2 border-r-2 border-slate-900">{doc.reasonForIssue}</td>
                          <td className="p-2 border-r-2 border-slate-900 font-mono">{doc.revisionDate}</td>
                          <td className="p-2 border-r-2 border-slate-900 font-semibold">{currentUser.name}</td>
                          <td className="p-2 border-r-2 border-slate-900 font-semibold">Lead Reviewer</td>
                          <td className="p-2 font-semibold text-emerald-800">Approved</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAGE 2 - FORMAL COVER TITLE SHEET & SIGN-OFF MATRIX */}
          {activeTab === 'sheet2' && (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-8 print:shadow-none print:border-none">
              {/* Top Logos */}
              <div className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white border border-blue-100 shadow-2xs flex items-center justify-center p-1 overflow-hidden">
                    <PjmakLogo variant="compact" size="md" />
                  </div>
                  <div>
                    <span className="font-black text-xl text-blue-950 tracking-tight">PJMAK</span>
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold">Engineering Contractor</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-2xl text-blue-900 tracking-tight block">
                    {doc.clientCompany || 'Ørsted'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Operator / Client</span>
                </div>
              </div>

              {/* Huge Bold Title (Matches Page 2 of PDF) */}
              <div className="py-12 text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
                  {doc.title}
                </h1>
                <p className="text-sm font-semibold text-slate-600 max-w-xl mx-auto">
                  {doc.documentScope}
                </p>
              </div>

              {/* Graphic / Technical Schematic Visual Block */}
              <div className="h-44 bg-gradient-to-r from-blue-950 via-slate-900 to-sky-950 rounded-2xl flex items-center justify-center text-white p-6 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="relative text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-mono font-bold">
                    <Layers className="h-3.5 w-3.5 text-sky-400" />
                    <span>Project Code: {doc.projectCode} • Discipline: {doc.discipline}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{doc.projectName}</h3>
                  <p className="text-xs text-sky-200">High Reliability Engineering & Commercial Dossier</p>
                </div>
              </div>

              {/* Bottom Reference & Formal Sign-Off Table (Matches Page 2 of PDF) */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>Project Name: <strong className="text-slate-900 font-bold">{doc.projectName}</strong></div>
                  <div>Project Document Reference: <strong className="text-blue-950 font-mono font-bold">{doc.contractorDocumentNumber || doc.documentNumber}</strong></div>
                  <div>Client Document Reference: <strong className="text-slate-900 font-mono font-bold">{doc.clientDocumentNumber || '02488566'}</strong></div>
                  <div>Client Rev Code: <strong className="text-slate-900 font-bold font-mono">{doc.clientRevisionCode || 'C'}</strong></div>
                </div>

                {/* Sign-Off Approval Matrix with signatures */}
                <div className="border-2 border-slate-900 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold">
                        <th className="p-2.5 w-16">Rev.</th>
                        <th className="p-2.5">Issue Purpose</th>
                        <th className="p-2.5 w-28">Date</th>
                        <th className="p-2.5">Initiated</th>
                        <th className="p-2.5">Checked</th>
                        <th className="p-2.5">Verified</th>
                        <th className="p-2.5">Approved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      <tr>
                        <td className="p-3 font-mono font-bold text-center bg-slate-50">
                          {doc.contractorRevisionNo || '0'}
                        </td>
                        <td className="p-3 font-semibold text-emerald-800">
                          {doc.reasonForIssue || 'Approved'}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {doc.revisionDate || '27-Apr-20'}
                        </td>
                        <td className="p-3 font-medium">
                          <div>{currentUser.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">Digital ID: #PJMAK-01</span>
                        </td>
                        <td className="p-3 font-medium">
                          <div>E. Basso</div>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        </td>
                        <td className="p-3 font-medium">
                          <div>K. Yannoulis</div>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        </td>
                        <td className="p-3 font-bold text-blue-950">
                          <div>S. Marshall</div>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Signed & Sealed
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAGE 3 - REVISION HISTORY, HOLD POINTS & SECTIONS */}
          {activeTab === 'sheet3' && (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-6 print:shadow-none print:border-none">
              {/* Running Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between text-xs text-slate-600 font-mono">
                <div>
                  <span className="font-bold text-slate-900 block">{doc.title.toUpperCase()}</span>
                  <span>Proj. Doc. Ref: <strong className="text-slate-900">{doc.contractorDocumentNumber || doc.documentNumber}</strong></span>
                </div>
                <div className="text-right">
                  <span>Cl. Doc. Ref: <strong className="text-slate-900">{doc.clientDocumentNumber || '02488566'}</strong></span>
                  <span className="ml-3">Cl. Rev Code: <strong className="text-slate-900">{doc.clientRevisionCode || 'C'}</strong></span>
                  <span className="ml-3">Rev: <strong className="text-slate-900">{doc.currentRevision}</strong></span>
                </div>
              </div>

              {/* Revision History Table (Matches Page 3 of PDF) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white bg-blue-950 px-3 py-1.5 rounded-t">
                    Revision History
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddRevisionHistory}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Change Record</span>
                  </button>
                </div>

                <div className="border-2 border-blue-950 text-xs overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-2 border-r border-slate-300 w-24">Revision</th>
                        <th className="p-2 border-r border-slate-300 w-32">Section</th>
                        <th className="p-2">Change Description</th>
                        <th className="p-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(doc.revisionHistoryItems || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-300 font-mono font-bold">{item.revision}</td>
                          <td className="p-2 border-r border-slate-300 font-medium">{item.section}</td>
                          <td className="p-2 text-slate-700">{item.changeDescription}</td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRevisionHistory(idx)}
                              className="text-slate-400 hover:text-rose-600"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HOLD Point Register Table (Matches Page 3 of PDF) */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white bg-blue-950 px-3 py-1.5 rounded-t">
                    HOLD Point Register
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddHoldPoint}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add HOLD Point</span>
                  </button>
                </div>

                <div className="border-2 border-blue-950 text-xs overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-2 border-r border-slate-300 w-16 text-center">Nr.</th>
                        <th className="p-2 border-r border-slate-300">Description / Ref of HOLD Point</th>
                        <th className="p-2 border-r border-slate-300 w-44">Responsible Party</th>
                        <th className="p-2 w-28">Status</th>
                        <th className="p-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(doc.holdPoints || []).map((hp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-300 font-mono font-bold text-center">{hp.nr}</td>
                          <td className="p-2 border-r border-slate-300 text-slate-800 font-medium">{hp.description}</td>
                          <td className="p-2 border-r border-slate-300 text-slate-600">{hp.responsibleParty}</td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                hp.status === 'Closed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : hp.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {hp.status}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveHoldPoint(idx)}
                              className="text-slate-400 hover:text-rose-600"
                              title="Remove HOLD point"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ATTACHMENTS & PDF VIEWER */}
          {activeTab === 'attachments' && (
            <div className="w-full max-w-4xl space-y-6">
              {/* External stakeholder details if mode is received */}
              {doc.documentMode === 'received' && (
                <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                    <Paperclip className="h-4 w-4 text-blue-800" />
                    <span>Received External Document Registration</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Document received from external client, subcontractor, or vendor with formal tracking references.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">External Client Doc Number</label>
                      <input
                        type="text"
                        value={doc.clientDocumentNumber}
                        onChange={(e) => setDoc({ ...doc, clientDocumentNumber: e.target.value })}
                        placeholder="e.g. 02488566"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Client Revision Code</label>
                      <input
                        type="text"
                        value={doc.clientRevisionCode}
                        onChange={(e) => setDoc({ ...doc, clientRevisionCode: e.target.value })}
                        placeholder="e.g. C"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Contractor Number Allocated</label>
                      <input
                        type="text"
                        value={doc.contractorDocumentNumber}
                        onChange={(e) => setDoc({ ...doc, contractorDocumentNumber: e.target.value })}
                        placeholder="e.g. P0036341-BSCF-GEN-RP-1014"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-blue-50/40 space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.dwg,.xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-900 mx-auto flex items-center justify-center border border-blue-200">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drag and drop document PDF / DOCX
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports official PDF submittals, DOCX specifications, and CAD drawings (Max 50MB)
                  </p>
                </div>
              </div>

              {/* Attached Files List */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Attached Files ({doc.attachments?.length || 0})
                </h4>

                {(!doc.attachments || doc.attachments.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No files attached yet. Upload the primary document PDF above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {doc.attachments.map((att) => (
                      <div key={att.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{att.name || att.fileName}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {att.size || 'PDF'} • Uploaded by {att.uploadedBy || 'User'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {att.url && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg font-semibold border border-blue-200 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </a>
                          )}
                          <a
                            href={att.url || '#'}
                            download={att.name || 'document.pdf'}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
