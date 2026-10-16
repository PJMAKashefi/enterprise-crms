import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import {
  X,
  Save,
  Printer,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Layers,
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
  Check,
  Copy,
  ChevronDown,
  Sparkles,
  Shield,
  Eye,
  Info,
  Maximize2,
  Minimize2,
  Sliders,
  Search,
  Replace,
  Undo2,
  Redo2,
  BookOpen,
  Subscript,
  Superscript,
  FileCode,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  TechnicalDocument,
  DocumentRevision,
  DocumentDiscipline,
  DocumentTypeCode,
  DocumentReviewStatus,
  User,
  Attachment,
  FrontPageConfig,
  DocumentSignOffPerson,
  Contact,
} from '../types';
import { PjmakLogo } from './PjmakLogo';
import { FrontPageConfigModal } from './FrontPageConfigModal';
import { EditTechnicalDocumentModal } from './EditTechnicalDocumentModal';
import {
  exportTechnicalDocumentToWord,
  printTechnicalDocumentDossier,
  generateTechnicalDocumentPdf,
  formatRevisionLabel,
  formatImportedWordHtml,
} from '../utils/documentDossierExporter';
import {
  getNextTechnicalDocumentNumber,
  normalizeDocumentNumber,
  formatProjectCodePrefix,
} from '../utils/documentNumbering';

interface TechnicalDocumentEditorModalProps {
  document: TechnicalDocument;
  currentUser: User;
  contacts?: Contact[];
  existingDocuments?: TechnicalDocument[];
  isOpen?: boolean;
  onClose: () => void;
  onSave: (updatedDoc: TechnicalDocument) => Promise<void>;
  onRefreshData?: () => void;
  onShareDocument?: (doc: TechnicalDocument) => void;
}

export const TechnicalDocumentEditorModal: React.FC<TechnicalDocumentEditorModalProps> = ({
  document: initialDoc,
  currentUser,
  contacts = [],
  existingDocuments = [],
  onClose,
  onSave,
  onRefreshData,
  onShareDocument,
}) => {
  // Document state with clean, non-hardcoded defaults
  const [doc, setDoc] = useState<TechnicalDocument>(() => {
    const isProposal = initialDoc.documentType === 'PRP';
    const defaultConfig: FrontPageConfig = {
      showPage1ControlSheet: initialDoc.frontPageConfig?.showPage1ControlSheet ?? true,
      showPage2CoverSheet: initialDoc.frontPageConfig?.showPage2CoverSheet ?? true,
      showPage3RevisionHoldPoints: initialDoc.frontPageConfig?.showPage3RevisionHoldPoints ?? true,
      showContractNumber: initialDoc.frontPageConfig?.showContractNumber ?? (!isProposal && Boolean(initialDoc.contractNumber)),
      showPoNumber: initialDoc.frontPageConfig?.showPoNumber ?? Boolean(initialDoc.poNumber),
      showClientDocNumber: initialDoc.frontPageConfig?.showClientDocNumber ?? Boolean(initialDoc.clientDocumentNumber),
      showScopeOfWorks: initialDoc.frontPageConfig?.showScopeOfWorks ?? true,
      showGraphicBanner: initialDoc.frontPageConfig?.showGraphicBanner ?? true,
      showHoldPoints: initialDoc.frontPageConfig?.showHoldPoints ?? true,
      showRevisionHistory: initialDoc.frontPageConfig?.showRevisionHistory ?? true,
      showMilestone: initialDoc.frontPageConfig?.showMilestone ?? true,
      customHeaderTitle: initialDoc.frontPageConfig?.customHeaderTitle || '',
      customSubtitle: initialDoc.frontPageConfig?.customSubtitle || '',
      customFooterText: initialDoc.frontPageConfig?.customFooterText || '',
    };

    const defaultSignOffTeam: DocumentSignOffPerson[] = initialDoc.signOffTeam && initialDoc.signOffTeam.length > 0
      ? initialDoc.signOffTeam
      : [
          {
            id: 'so-init',
            role: 'initiated',
            name: initialDoc.createdByUserName || currentUser.name || 'Author',
            position: 'Lead Engineer',
            company: 'PJMAK',
            date: initialDoc.revisionDate || new Date().toISOString().slice(0, 10),
            digitalId: '#PJMAK-01',
            status: 'signed',
          },
          {
            id: 'so-chk',
            role: 'checked',
            name: 'Discipline Reviewer',
            position: 'Technical Specialist',
            company: 'PJMAK',
            date: initialDoc.revisionDate || new Date().toISOString().slice(0, 10),
            digitalId: '#PJMAK-02',
            status: 'verified',
          },
          {
            id: 'so-ver',
            role: 'verified',
            name: 'QA/QC Coordinator',
            position: 'Quality Manager',
            company: 'PJMAK',
            date: initialDoc.revisionDate || new Date().toISOString().slice(0, 10),
            digitalId: '#PJMAK-03',
            status: 'verified',
          },
          {
            id: 'so-app',
            role: 'approved',
            name: 'Managing Director',
            position: 'Project Director',
            company: 'PJMAK',
            date: initialDoc.revisionDate || new Date().toISOString().slice(0, 10),
            digitalId: '#PJMAK-04',
            status: 'approved',
          },
        ];

    const cleanDocNumber = normalizeDocumentNumber(initialDoc.documentNumber);
    const cleanProjectCode = formatProjectCodePrefix(initialDoc.projectCode);

    return {
      ...initialDoc,
      documentNumber: cleanDocNumber,
      projectCode: cleanProjectCode,
      documentMode: initialDoc.documentMode || 'generated',
      documentScope: initialDoc.documentScope || initialDoc.description || '',
      clientDocumentNumber: initialDoc.clientDocumentNumber || '',
      clientRevisionCode: initialDoc.clientRevisionCode || '0',
      contractorDocumentNumber: normalizeDocumentNumber(initialDoc.contractorDocumentNumber || cleanDocNumber),
      contractorRevisionNo: initialDoc.contractorRevisionNo || '0',
      poNumber: initialDoc.poNumber || '',
      contractNumber: isProposal ? '' : (initialDoc.contractNumber || ''), // Blank for proposals as requested
      rdsPpCode: '',
      fileFormat: initialDoc.fileFormat || 'docx',
      frontPageConfig: defaultConfig,
      signOffTeam: defaultSignOffTeam,
      bodyHtml:
        initialDoc.bodyHtml ||
        `<h3>1. INTRODUCTION</h3>
<p>This document presents the principal technical specifications, methodology, and engineering execution requirements in accordance with project baseline agreements.</p>
<h4>1.1 Purpose of Document</h4>
<p>The purpose of this deliverable is to establish formal engineering parameters, operational procedures, and compliance standards for review and approval.</p>
<h4>1.2 Interface with Other Project Documents</h4>
<p>The works described herein interface with the Project Execution Plan, Quality Assurance Framework, and Contract Agreement.</p>
<h3>2. SCOPE OF SERVICES & TECHNICAL SPECIFICATIONS</h3>
<p>The proposed scope encompasses detailed engineering design, analysis, verification, resource planning, and formal commissioning protocols.</p>`,
      holdPoints: initialDoc.holdPoints && initialDoc.holdPoints.length > 0
        ? initialDoc.holdPoints
        : [
            { nr: 1, description: 'Design verification and baseline technical submittal review', responsibleParty: 'Client Representative / Lead Engineer', status: 'Closed' },
            { nr: 2, description: 'Material certificate and quality assurance validation', responsibleParty: 'QA/QC Manager', status: 'Closed' },
            { nr: 3, description: 'Final site inspection and commissioning sign-off', responsibleParty: 'Client Inspector & Contractor Director', status: 'Pending' },
          ],
      revisionHistoryItems: initialDoc.revisionHistoryItems && initialDoc.revisionHistoryItems.length > 0
        ? initialDoc.revisionHistoryItems
        : [
            { revision: '0', section: 'All', changeDescription: 'Initial issue for review and technical evaluation' },
          ],
    };
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'wholeDoc' | 'sheet1' | 'sheet2' | 'sheet3' | 'attachments'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [isImportingWord, setIsImportingWord] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Search and replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  // Real-time text statistics
  const [stats, setStats] = useState({
    words: 0,
    chars: 0,
    pages: 1,
    readingTimeMin: 1,
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const wordImportInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update real-time word count & document statistics
  const calculateStats = (text: string) => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const pages = Math.max(1, Math.ceil(words / 450));
    const readingTimeMin = Math.max(1, Math.ceil(words / 200));
    setStats({ words, chars, pages, readingTimeMin });
  };

  // Sync editor content on mount or tab change
  useEffect(() => {
    if (editorRef.current && activeTab === 'editor') {
      if (editorRef.current.innerHTML !== doc.bodyHtml) {
        editorRef.current.innerHTML = doc.bodyHtml || '';
      }
      calculateStats(editorRef.current.innerText || '');
    }
  }, [activeTab]);

  const handleContentInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setDoc((prev) => ({ ...prev, bodyHtml: html }));
      calculateStats(editorRef.current.innerText || '');
    }
  };

  // Rich text formatting commands
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setDoc((prev) => ({ ...prev, bodyHtml: editorRef.current?.innerHTML || '' }));
      calculateStats(editorRef.current?.innerText || '');
    }
  };

  // Insert Table
  const handleInsertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left; width: 60px;">Item</th>
            <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left;">Technical Parameter</th>
            <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left;">Specification / Value</th>
            <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left;">Verification Protocol</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">01</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 600;">Operational Rating</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">100% Continuous Duty Cycle</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">Factory Acceptance Test (FAT)</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">02</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 600;">Design Code Compliance</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">ISO 9001 / DNV Standards</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">Third-Party Independent Verification</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    executeCommand('insertHTML', tableHtml);
  };

  // Insert Table of Contents (TOC)
  const handleInsertTOC = () => {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4');
    let tocItems = '';

    if (headings.length === 0) {
      tocItems = `
        <li style="padding: 4px 0; border-bottom: 1px dotted #cbd5e1;">
          <span style="font-weight: bold; color: #1e3a8a;">1.0</span> Introduction & Project Overview ................................................................ Page 4
        </li>
        <li style="padding: 4px 0; border-bottom: 1px dotted #cbd5e1;">
          <span style="font-weight: bold; color: #1e3a8a;">2.0</span> Scope of Services & Technical Methodology ................................................. Page 5
        </li>
        <li style="padding: 4px 0; border-bottom: 1px dotted #cbd5e1;">
          <span style="font-weight: bold; color: #1e3a8a;">3.0</span> Quality Assurance & Compliance Standards ................................................ Page 6
        </li>
      `;
    } else {
      headings.forEach((h, idx) => {
        const text = h.textContent || `Section ${idx + 1}`;
        const level = h.tagName.toLowerCase();
        const indent = level === 'h4' ? '24px' : level === 'h3' ? '12px' : '0px';
        const isBold = level === 'h1' || level === 'h2' || level === 'h3';
        tocItems += `
          <li style="padding: 4px 0; padding-left: ${indent}; border-bottom: 1px dotted #e2e8f0; display: flex; justify-content: space-between;">
            <span style="${isBold ? 'font-weight: 600; color: #0f172a;' : 'color: #334155;'}">${text}</span>
            <span style="color: #94a3b8; font-family: monospace;">..........</span>
          </li>
        `;
      });
    }

    const tocHtml = `
      <div class="toc-card" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 18px 24px; margin: 24px 0; font-family: inherit;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
          <span style="font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.05em; text-transform: uppercase;">TABLE OF CONTENTS</span>
          <span style="font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase;">Doc Ref: ${doc.contractorDocumentNumber || doc.documentNumber}</span>
        </div>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 12px; line-height: 1.8;">
          ${tocItems}
        </ul>
      </div>
      <p><br></p>
    `;
    executeCommand('insertHTML', tocHtml);
  };

  // Insert Formal Page Break
  const handleInsertPageBreak = () => {
    const pageBreakHtml = `
      <div class="page-break" style="page-break-after: always; break-after: page; border-top: 2px dashed #94a3b8; margin: 28px 0; padding: 6px 0; text-align: center; color: #64748b; font-size: 11px; font-family: monospace; user-select: none;">
        ——— FORMAL PAGE BREAK (Section starts on fresh page) ———
      </div>
      <p><br></p>
    `;
    executeCommand('insertHTML', pageBreakHtml);
  };

  // Insert Callout Box
  const handleInsertCallout = (type: 'note' | 'warning' | 'commercial') => {
    let calloutHtml = '';
    if (type === 'warning') {
      calloutHtml = `
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 12px; color: #78350f;">
          <strong style="color: #b45309; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">⚠️ MANDATORY ENGINEERING & SAFETY NOTICE</strong>
          <p style="margin: 0; line-height: 1.6;">Ensure all operations strictly follow the project health and safety plan, client standards, and verified hold point procedures before executing this task.</p>
        </div><p><br></p>
      `;
    } else if (type === 'commercial') {
      calloutHtml = `
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 12px; color: #064e3b;">
          <strong style="color: #047857; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">💼 COMMERCIAL CLARIFICATION / MILESTONE CONDITION</strong>
          <p style="margin: 0; line-height: 1.6;">This deliverable directly links to verified completion milestones and billing schedules as specified in the agreed project scope.</p>
        </div><p><br></p>
      `;
    } else {
      calloutHtml = `
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 12px; color: #1e3a8a;">
          <strong style="color: #1d4ed8; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">ℹ️ TECHNICAL CLARIFICATION & INTERFACE NOTE</strong>
          <p style="margin: 0; line-height: 1.6;">All technical criteria and references correspond to the latest approved revision of the Master Document Register and design basis specifications.</p>
        </div><p><br></p>
      `;
    }
    executeCommand('insertHTML', calloutHtml);
  };

  // Find and Replace Tool
  const handleFindReplace = (replaceAll: boolean = false) => {
    if (!findQuery || !editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;

    if (replaceAll) {
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const updatedHtml = currentHtml.replace(regex, replaceQuery);
      editorRef.current.innerHTML = updatedHtml;
      setDoc((prev) => ({ ...prev, bodyHtml: updatedHtml }));
      calculateStats(editorRef.current.innerText);
    } else {
      // Find next using window.find
      if ((window as any).find) {
        (window as any).find(findQuery);
      }
    }
  };

  // Import Word (.docx) file directly into editor using Mammoth and apply structured PDF criteria
  const handleWordFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.doc')) {
      alert('Please select a valid Word document (.docx).');
      return;
    }

    setIsImportingWord(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const convertedHtml = formatImportedWordHtml(result.value);

      if (editorRef.current) {
        editorRef.current.innerHTML = convertedHtml;
        setDoc((prev) => ({
          ...prev,
          bodyHtml: convertedHtml,
          fileFormat: 'docx',
        }));
        calculateStats(editorRef.current.innerText);
      }

      setImportNotification(`Successfully imported and formatted "${file.name}" with structured criteria!`);
      setTimeout(() => setImportNotification(null), 5000);
    } catch (err) {
      console.error('Failed to import Word file:', err);
      alert('Failed to parse the Word document. Please ensure it is a valid .docx file.');
    } finally {
      setIsImportingWord(false);
      if (wordImportInputRef.current) {
        wordImportInputRef.current.value = '';
      }
    }
  };

  // Re-apply structured PDF & corporate formatting criteria to editor body
  const handleBeautifyContent = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const formattedHtml = formatImportedWordHtml(currentHtml);
    editorRef.current.innerHTML = formattedHtml;
    setDoc((prev) => ({
      ...prev,
      bodyHtml: formattedHtml,
    }));
    calculateStats(editorRef.current.innerText);
    setImportNotification('Applied structured PDF formatting criteria (headings, tables, and spacing)!');
    setTimeout(() => setImportNotification(null), 4000);
  };

  // Export to Word (.doc formatted preserving entire 3-Page Front Dossier + Body Content)
  const handleExportWord = () => {
    const currentDoc: TechnicalDocument = {
      ...doc,
      bodyHtml: editorRef.current ? editorRef.current.innerHTML : doc.bodyHtml,
    };
    exportTechnicalDocumentToWord(currentDoc, doc.frontPageConfig || cfg, currentUser);
  };

  // Convert Whole Document to PDF (Triggers isolated print view of entire dossier: Pages 1, 2, 3 + Content)
  const handlePrintWholeDocument = () => {
    const currentDoc: TechnicalDocument = {
      ...doc,
      bodyHtml: editorRef.current ? editorRef.current.innerHTML : doc.bodyHtml,
    };
    printTechnicalDocumentDossier(currentDoc, doc.frontPageConfig || cfg, currentUser);
  };

  // Direct PDF Download (.pdf file via jsPDF)
  const handleDirectDownloadPdf = () => {
    const currentDoc: TechnicalDocument = {
      ...doc,
      bodyHtml: editorRef.current ? editorRef.current.innerHTML : doc.bodyHtml,
    };
    generateTechnicalDocumentPdf(currentDoc, doc.frontPageConfig || cfg, currentUser, true);
  };

  // Quick Switch between Technical and Commercial before sending
  const handleQuickSwitchDiscipline = async (targetDiscipline: DocumentDiscipline) => {
    let newDocNumber = doc.documentNumber;
    let newSeqNumber = doc.sequenceNumber;

    if (existingDocuments && existingDocuments.length > 0) {
      const next = getNextTechnicalDocumentNumber({
        projectCode: doc.projectCode,
        originator: doc.originator,
        discipline: targetDiscipline,
        documentType: 'PRP',
        existingDocuments,
        currentDocIdToExclude: doc.id,
      });
      newDocNumber = next.documentNumber;
      newSeqNumber = next.sequenceNumber;
    } else {
      newDocNumber = normalizeDocumentNumber(doc.documentNumber, targetDiscipline, 'PRP');
    }

    const updated: TechnicalDocument = {
      ...doc,
      discipline: targetDiscipline,
      documentNumber: newDocNumber,
      sequenceNumber: newSeqNumber || doc.sequenceNumber,
      contractorDocumentNumber: newDocNumber,
      projectCode: formatProjectCodePrefix(doc.projectCode),
      documentType: 'PRP',
      reasonForIssue: targetDiscipline === 'COM' ? 'Commercial Proposal Offer' : 'Technical Review & Approval',
      bodyHtml: editorRef.current ? editorRef.current.innerHTML : doc.bodyHtml,
      updatedAt: new Date().toISOString(),
    };

    setDoc(updated);
    await onSave(updated);
    if (onRefreshData) onRefreshData();
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

  const handleCopyText = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddHoldPoint = () => {
    const nextNr = (doc.holdPoints?.length || 0) + 1;
    const newHoldPoint = {
      nr: nextNr,
      description: 'Technical milestone verification point',
      responsibleParty: doc.clientCompany || 'Client Representative',
      status: 'Open' as const,
    };
    setDoc((prev) => ({
      ...prev,
      holdPoints: [...(prev.holdPoints || []), newHoldPoint],
    }));
  };

  const handleUpdateRevisionHistory = (
    index: number,
    field: 'revision' | 'section' | 'changeDescription',
    value: string
  ) => {
    setDoc((prev) => {
      const items = [...(prev.revisionHistoryItems || [])];
      if (items[index]) {
        items[index] = { ...items[index], [field]: value };
      }
      return { ...prev, revisionHistoryItems: items };
    });
  };

  const handleUpdateHoldPoint = (
    index: number,
    field: 'nr' | 'description' | 'responsibleParty' | 'status',
    value: any
  ) => {
    setDoc((prev) => {
      const list = [...(prev.holdPoints || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: field === 'nr' ? Number(value) || 1 : value };
      }
      return { ...prev, holdPoints: list };
    });
  };

  const handleAddRevisionHistory = () => {
    const currentItems = doc.revisionHistoryItems || [];
    const nextRev = currentItems.length === 0
      ? formatRevisionLabel(doc.contractorRevisionNo || doc.currentRevision)
      : String(currentItems.length);
    const newRevItem = {
      revision: nextRev,
      section: 'All',
      changeDescription: currentItems.length === 0
        ? 'Initial Issue for Client Review and Approval'
        : 'Incorporated Client Review Comments & Technical Updates',
    };
    setDoc((prev) => ({
      ...prev,
      revisionHistoryItems: [...currentItems, newRevItem],
    }));
  };

  const handleRemoveRevisionHistory = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      revisionHistoryItems: (prev.revisionHistoryItems || []).filter((_, i) => i !== index),
    }));
  };

  const handleRemoveHoldPoint = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      holdPoints: (prev.holdPoints || []).filter((_, i) => i !== index),
    }));
  };

  // Reusable 2-tier Letterhead matching the attached image on ALL pages
  const renderStandardLetterhead = (pageLabel?: string) => {
    const clientCompany = doc.clientCompany || 'Case Services';
    const clientRole = doc.clientRoleLabel || doc.frontPageConfig?.clientRoleLabel || 'CLIENT / OPERATOR';
    const docNum = doc.contractorDocumentNumber || doc.documentNumber;
    const revFormatted = formatRevisionLabel(doc.contractorRevisionNo || doc.currentRevision);

    return (
      <div className="w-full mb-6 print:mb-4 select-none">
        {/* Tier 1: PJMAK on left in dark blue, Client on right in bold blue */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white border border-blue-100 shadow-2xs flex items-center justify-center p-1 overflow-hidden shrink-0">
              <PjmakLogo variant="compact" size="md" />
            </div>
            <div>
              <span className="font-black text-2xl sm:text-3xl tracking-tight text-[#0B1E36] block">
                PJMAK
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="font-extrabold text-xl sm:text-2xl text-[#1E40AF] tracking-tight block">
              {clientCompany}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">
              {clientRole}
            </span>
          </div>
        </div>

        {/* Solid Dark Blue Divider */}
        <div className="h-[2.5px] bg-[#0B1E36] w-full" />

        {/* Tier 2: Sub-bar with Document Title & Reference Metadata */}
        <div className="flex items-center justify-between py-1.5 text-xs">
          <div className="font-bold text-xs sm:text-sm text-[#0B1E36] uppercase tracking-tight truncate max-w-[65%]">
            {doc.title}
          </div>
          <div className="text-right text-[11px] sm:text-xs text-slate-600 font-medium shrink-0 font-mono">
            <span>Doc Ref: <strong className="text-slate-900 font-bold">{docNum}</strong></span>
            <span className="mx-2 text-slate-300">|</span>
            <span>Rev: <strong className="text-slate-900 font-bold">{revFormatted}</strong></span>
          </div>
        </div>

        {/* Subtle bottom line */}
        <div className="h-px bg-slate-200 w-full" />
      </div>
    );
  };

  const cfg = doc.frontPageConfig || {
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs print:p-0 print:bg-white print:static print:block print:inset-auto print:z-auto">
      <div
        className={`bg-slate-100 rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-300 transition-all print:bg-white print:shadow-none print:border-none print:rounded-none print:w-full print:h-auto print:max-h-none print:overflow-visible ${
          isFullscreen ? 'fixed inset-2 z-50' : 'max-w-6xl max-h-[95vh] h-[93vh]'
        }`}
      >
        {/* 1. TOP HEADER BAR */}
        <div className="print:hidden bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {doc.contractorDocumentNumber || doc.documentNumber}
                </span>
                {doc.clientDocumentNumber && cfg.showClientDocNumber && (
                  <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Client Ref: {doc.clientDocumentNumber}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                  {doc.currentRevision || 'Rev 0'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditDetailsModal(true)}
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                    doc.discipline === 'COM'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200'
                  }`}
                  title="Click to edit document category (Technical vs Commercial)"
                >
                  <span>{doc.discipline === 'COM' ? '💼 COM' : '🛠️ TEC'}</span>
                  <span>•</span>
                  <span>{doc.documentType}</span>
                  <Edit3 className="h-2.5 w-2.5 ml-0.5" />
                </button>
              </div>
              <h2
                onClick={() => setShowEditDetailsModal(true)}
                className="font-extrabold text-sm sm:text-base text-slate-900 truncate mt-0.5 cursor-pointer hover:text-blue-900 transition-colors"
                title="Click to edit title and classification"
              >
                {doc.title}
              </h2>
            </div>
          </div>

          {/* Top Actions: Edit Classification, Front Pages Config, Word Export, Print Full PDF, Save, Share */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Edit Classification & Details Button */}
            <button
              type="button"
              onClick={() => setShowEditDetailsModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border shadow-2xs cursor-pointer ${
                doc.discipline === 'COM'
                  ? 'text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border-emerald-300'
                  : 'text-amber-950 bg-amber-100 hover:bg-amber-200 border-amber-300'
              }`}
              title="Edit document classification, toggle between Technical and Commercial before sending"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-800" />
              <span>
                Edit: <strong className="underline">{doc.discipline === 'COM' ? 'Commercial' : 'Technical'}</strong>
              </span>
            </button>

            {/* Front 3 Pages Setup Button */}
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 shadow-2xs cursor-pointer"
              title="Configure fields and visibility on Pages 1, 2, and 3"
            >
              <Sliders className="h-3.5 w-3.5 text-blue-900" />
              <span className="hidden lg:inline">Configure Front Pages</span>
            </button>

            {/* Word Document Direct Export (.doc preserving whole dossier) */}
            <button
              type="button"
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Export complete document dossier (Pages 1-3 + prepared content) to Word"
            >
              <Download className="h-3.5 w-3.5 text-blue-700" />
              <span>Export Word</span>
            </button>

            {/* Whole Document PDF Conversion (Print-to-PDF) */}
            <div className="inline-flex rounded-lg shadow-2xs border border-blue-300 overflow-hidden bg-blue-50">
              <button
                type="button"
                onClick={handlePrintWholeDocument}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-950 hover:bg-blue-100 transition-colors cursor-pointer"
                title="Convert entire document (First 3 pages + prepared content) to official PDF"
              >
                <Printer className="h-3.5 w-3.5 text-blue-800" />
                <span>Convert to PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDirectDownloadPdf}
                className="px-2 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-200 border-l border-blue-300 transition-colors cursor-pointer"
                title="Directly download .pdf file"
              >
                <Download className="h-3 w-3" />
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Share Securely Button */}
            {onShareDocument && (
              <button
                type="button"
                onClick={async () => {
                  await handleSave();
                  onShareDocument(doc);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-900 bg-teal-50 border border-teal-300 rounded-lg hover:bg-teal-100 transition-colors shadow-2xs cursor-pointer"
                title="Save and create secure external share invitation for this proposal"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-teal-700 stroke-[2.5]" />
                <span>Share Securely</span>
              </button>
            )}

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
        <div className="print:hidden bg-slate-50 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 overflow-x-auto">
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
              <span>Document Editor</span>
            </button>

            <button
              onClick={() => setActiveTab('wholeDoc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'wholeDoc'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
              title="View the whole stitched document: 3 Front Pages + All Content Pages"
            >
              <BookOpen className="h-3.5 w-3.5 text-sky-400" />
              <span>Whole Document Dossier (Pages 1-3 + Content)</span>
            </button>

            {cfg.showPage1ControlSheet && (
              <button
                onClick={() => setActiveTab('sheet1')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'sheet1'
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Page 1: Control Sheet</span>
              </button>
            )}

            {cfg.showPage2CoverSheet && (
              <button
                onClick={() => setActiveTab('sheet2')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'sheet2'
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Page 2: Title & Sign-Off</span>
              </button>
            )}

            {cfg.showPage3RevisionHoldPoints && (
              <button
                onClick={() => setActiveTab('sheet3')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'sheet3'
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Page 3: History & HOLD</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'attachments'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span>Attachments ({doc.attachments?.length || 0})</span>
            </button>
          </div>

          {/* Quick info in subheader */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-mono">
            {cfg.showContractNumber && doc.contractNumber ? (
              <span>Contract: <strong className="text-slate-700">{doc.contractNumber}</strong></span>
            ) : (
              <span className="text-slate-400 italic">No Contract (Proposal / Tender)</span>
            )}
            <span>Rev: <strong className="text-slate-700">{formatRevisionLabel(doc.contractorRevisionNo || doc.currentRevision)}</strong></span>
          </div>
        </div>

        {/* Notification banner for Word Import */}
        {importNotification && (
          <div className="bg-emerald-600 text-white px-5 py-2 text-xs font-semibold flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{importNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportNotification(null)}
              className="text-white hover:opacity-80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 3. MAIN WORKSPACE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-200/60 print:bg-white print:p-0">
          {/* TAB 1: WORD DOCUMENT EDITOR */}
          {activeTab === 'editor' && (
            <div className="w-full max-w-4xl space-y-3 flex flex-col">
              {/* Comprehensive Word-Style Formatting Toolbar */}
              <div className="sticky top-0 z-20 bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Undo / Redo */}
                  <button
                    type="button"
                    onClick={() => executeCommand('undo')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('redo')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="h-4 w-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Heading Style Selector */}
                  <select
                    onChange={(e) => executeCommand('formatBlock', e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium"
                    defaultValue="p"
                  >
                    <option value="p">Normal Text</option>
                    <option value="h1">Heading 1 (Main Chapter)</option>
                    <option value="h2">Heading 2 (Sub-chapter)</option>
                    <option value="h3">Heading 3 (Section)</option>
                    <option value="h4">Heading 4 (Subsection)</option>
                    <option value="pre">Code / Monospace</option>
                  </select>

                  {/* Font Size Selector */}
                  <select
                    onChange={(e) => executeCommand('fontSize', e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium"
                    defaultValue="3"
                  >
                    <option value="1">Small (10pt)</option>
                    <option value="2">Compact (11pt)</option>
                    <option value="3">Normal (12pt)</option>
                    <option value="4">Medium (14pt)</option>
                    <option value="5">Large (16pt)</option>
                    <option value="6">Heading (18pt)</option>
                  </select>

                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Bold, Italic, Underline, Strike */}
                  <button
                    type="button"
                    onClick={() => executeCommand('bold')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('italic')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('underline')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Underline"
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

                  {/* Superscript & Subscript (Vital for engineering units like m², m³, CO₂) */}
                  <button
                    type="button"
                    onClick={() => executeCommand('superscript')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Superscript (e.g. m², m³)"
                  >
                    <Superscript className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCommand('subscript')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                    title="Subscript (e.g. H₂O, CO₂)"
                  >
                    <Subscript className="h-4 w-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-200 mx-1" />

                  {/* Alignment */}
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

                  {/* Dynamic Table of Contents (TOC) */}
                  <button
                    type="button"
                    onClick={handleInsertTOC}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-50 text-blue-950 border border-slate-200 rounded text-xs font-bold"
                    title="Generate & insert automatic Table of Contents"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-blue-800" />
                    <span>Insert TOC</span>
                  </button>

                  {/* Insert Table */}
                  <button
                    type="button"
                    onClick={handleInsertTable}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700"
                    title="Insert Formatted Engineering Table"
                  >
                    <TableIcon className="h-3.5 w-3.5 text-blue-900" />
                    <span>Table</span>
                  </button>

                  {/* Page Break */}
                  <button
                    type="button"
                    onClick={handleInsertPageBreak}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700"
                    title="Insert Page Break (starts new chapter on fresh page)"
                  >
                    <Layers className="h-3.5 w-3.5 text-indigo-700" />
                    <span>Page Break</span>
                  </button>

                  {/* Callout Boxes */}
                  <button
                    type="button"
                    onClick={() => handleInsertCallout('warning')}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold text-amber-800"
                    title="Insert Safety Notice Box"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertCallout('note')}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold text-blue-800"
                    title="Insert Technical Clarification"
                  >
                    <Info className="h-3.5 w-3.5 text-blue-600" />
                    <span>Note</span>
                  </button>
                </div>

                {/* Right toolbar controls: Import Word (.docx), Find/Replace */}
                <div className="flex items-center gap-1.5">
                  {/* Find and Replace Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowFindReplace(!showFindReplace)}
                    className={`p-1.5 rounded transition-colors ${
                      showFindReplace ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                    title="Find and Replace in document"
                  >
                    <Search className="h-4 w-4" />
                  </button>

                  {/* Direct Word (.docx) Import */}
                  <input
                    ref={wordImportInputRef}
                    type="file"
                    accept=".docx,.doc"
                    className="hidden"
                    onChange={handleWordFileImport}
                  />
                  <button
                    type="button"
                    disabled={isImportingWord}
                    onClick={() => wordImportInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                    title="Open / Import Word document (.docx) from your laptop"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-700" />
                    <span>{isImportingWord ? 'Importing...' : 'Open Word (.docx)'}</span>
                  </button>

                  {/* Format & Beautify Structured PDF Criteria */}
                  <button
                    type="button"
                    onClick={handleBeautifyContent}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                    title="Apply structured PDF formatting criteria (headings, tables, and spacing)"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-800" />
                    <span>Format PDF Design</span>
                  </button>

                  {/* Copy Text */}
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Find and Replace Bar (Expandable) */}
              {showFindReplace && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 shadow-xs flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="font-semibold text-slate-600">Find:</span>
                      <input
                        type="text"
                        value={findQuery}
                        onChange={(e) => setFindQuery(e.target.value)}
                        placeholder="Search text..."
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="font-semibold text-slate-600">Replace:</span>
                      <input
                        type="text"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        placeholder="Replacement text..."
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFindReplace(false)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700"
                    >
                      Find Next
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFindReplace(true)}
                      className="px-2.5 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded font-bold"
                    >
                      Replace All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFindReplace(false)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Physical A4 Paper Canvas */}
              <div className="bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 min-h-[780px] font-sans text-slate-800 space-y-6 flex-1">
                {/* Standard Letterhead across all pages */}
                {renderStandardLetterhead('Technical Deliverable')}

                {/* Editable Rich Document Content */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleContentInput}
                  className="outline-none min-h-[520px] prose prose-slate max-w-none text-sm leading-relaxed focus:ring-0"
                />

                {/* Running Footer on Paper */}
                <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>PJMAK Enterprise Document Management System (EDMS)</span>
                  <span>Confidential & Proprietary • Project {doc.projectCode}</span>
                </div>
              </div>

              {/* Real-time Status Bar at bottom of editor (Word Count, Chars, Pages, Time) */}
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-300 shadow-xs flex items-center justify-between text-xs text-slate-600 font-mono">
                <div className="flex items-center gap-4">
                  <span>Words: <strong className="text-slate-900">{stats.words.toLocaleString()}</strong></span>
                  <span>Characters: <strong className="text-slate-900">{stats.chars.toLocaleString()}</strong></span>
                  <span>Estimated Pages: <strong className="text-slate-900">{stats.pages}</strong></span>
                  <span>Reading Time: <strong className="text-slate-900">~{stats.readingTimeMin} min</strong></span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span>Auto-synced with PDF & Word exporter</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WHOLE DOCUMENT DOSSIER (Pages 1-3 + Content stitched for preview & PDF export) */}
          {activeTab === 'wholeDoc' && (
            <div className="w-full max-w-4xl space-y-8 print:space-y-0">
              <div className="print:hidden bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 p-5 rounded-2xl border border-blue-200 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-blue-950 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-800" />
                      <span>Whole Document Dossier Preview (All Pages Stitched)</span>
                    </h4>
                    <p className="text-xs text-blue-900/80 mt-0.5">
                      Full multi-page document view: Page 1 Control Sheet, Page 2 Title & Verification Matrix, Page 3 Revision & HOLD Points, and prepared chapters.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={handlePrintWholeDocument}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="Convert whole document dossier to official PDF"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Convert to PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectDownloadPdf}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-blue-950 rounded-lg text-xs font-bold border border-blue-300 shadow-2xs transition-colors cursor-pointer"
                      title="Download direct compiled .pdf file"
                    >
                      <Download className="h-4 w-4 text-blue-700" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportWord}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                      title="Export whole document dossier to Word (.doc/.docx)"
                    >
                      <Download className="h-4 w-4 text-slate-600" />
                      <span>Export Word</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Classification Bar: Edit before sending */}
                <div className="pt-3 border-t border-blue-200/80 flex flex-wrap items-center justify-between gap-3 bg-white/70 p-3 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Classification:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                      doc.discipline === 'COM'
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                        : 'bg-blue-100 text-blue-950 border-blue-300'
                    }`}>
                      {doc.discipline === 'COM' ? '💼 Commercial Document (COM)' : '🛠️ Technical Document (TEC)'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                      ({doc.documentType} • {doc.currentRevision || 'Rev 0'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleQuickSwitchDiscipline(doc.discipline === 'COM' ? 'TEC' : 'COM')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer flex items-center gap-1 ${
                        doc.discipline === 'COM'
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                      title="Quickly switch document category before sending"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Switch to {doc.discipline === 'COM' ? 'Technical (TEC)' : 'Commercial (COM)'} before sending</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowEditDetailsModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3 text-slate-600" />
                      <span>Edit Full Details...</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PAGE 1: CONTROL SHEET (If toggled) */}
              {cfg.showPage1ControlSheet && (
                <div className="bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-6 print:shadow-none print:border-none print:break-after-page min-h-[900px]">
                  {renderStandardLetterhead('Page 1 of Dossier: Document Control')}

                  {/* Control Metadata Table */}
                  <div className="border-2 border-slate-900 divide-y-2 divide-slate-900 text-xs">
                    <div className="p-3 bg-slate-100 font-bold text-sm flex items-center justify-between">
                      <span>Document Title: <strong className="font-extrabold text-slate-950">{doc.title}</strong></span>
                      <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-300">
                        {doc.contractorDocumentNumber || doc.documentNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                      <div className="p-2.5 font-semibold">
                        Contract: <span className="font-mono font-bold">{cfg.showContractNumber ? (doc.contractNumber || '') : ''}</span>
                        {!cfg.showContractNumber && <span className="text-slate-400 font-normal italic ml-2">N/A (Proposal)</span>}
                      </div>
                      <div className="p-2.5 font-semibold">
                        Scope: <span className="font-bold">{cfg.showScopeOfWorks ? (doc.documentScope || doc.projectName) : doc.projectName}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                      <div className="p-2.5 font-semibold">
                        Document Type: <span className="font-bold">{doc.documentType} - {doc.documentType === 'PRP' ? 'Proposal' : doc.documentType === 'MST' ? 'Method Statement' : doc.documentType}</span>
                      </div>
                      <div className="p-2.5 font-semibold">
                        Client Document Number: <span className="font-mono font-bold">{cfg.showClientDocNumber ? (doc.clientDocumentNumber || '') : ''}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                      <div className="p-2.5 font-semibold">
                        Contractor Document Number: <span className="font-mono font-bold">{doc.contractorDocumentNumber || doc.documentNumber}</span>
                      </div>
                      <div className="p-2.5 font-semibold">
                        Contractor Revision No: <span className="font-mono font-bold">{doc.contractorRevisionNo || doc.currentRevision || '0'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                      <div className="p-2.5 font-semibold">
                        Originator: <span className="font-bold">{doc.originator || 'PJMAK'}</span>
                      </div>
                      <div className="p-2.5 font-semibold">
                        PO Number: <span className="font-mono font-bold">{cfg.showPoNumber ? (doc.poNumber || '') : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revision Record Table */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                      Document Revision Record
                    </h4>
                    <div className="border-2 border-slate-900 overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b-2 border-slate-900 font-bold">
                            <th className="p-2 border-r-2 border-slate-900 w-20">Rev Code</th>
                            <th className="p-2 border-r-2 border-slate-900">Reason for Issue</th>
                            <th className="p-2 border-r-2 border-slate-900 w-28">Issue Date</th>
                            <th className="p-2 border-r-2 border-slate-900 w-28">Author</th>
                            <th className="p-2 border-r-2 border-slate-900 w-28">Checked</th>
                            <th className="p-2 w-28">Approved</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {doc.revisions && doc.revisions.length > 0 ? (
                            doc.revisions.map((rev, idx) => (
                              <tr key={rev.id || idx}>
                                <td className="p-2 border-r-2 border-slate-900 font-mono font-bold">{rev.revision}</td>
                                <td className="p-2 border-r-2 border-slate-900">{rev.reasonForIssue}</td>
                                <td className="p-2 border-r-2 border-slate-900 font-mono">{rev.issueDate || rev.date}</td>
                                <td className="p-2 border-r-2 border-slate-900 font-semibold">{rev.signOff?.preparedBy?.name || rev.issuedByUserName || doc.createdByUserName || 'Author'}</td>
                                <td className="p-2 border-r-2 border-slate-900 font-semibold">{rev.signOff?.checkedBy?.name || 'Reviewer'}</td>
                                <td className="p-2 font-semibold text-emerald-800">{rev.signOff?.approvedByInternal?.name || 'Director'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="p-2 border-r-2 border-slate-900 font-mono font-bold">{doc.currentRevision}</td>
                              <td className="p-2 border-r-2 border-slate-900">{doc.reasonForIssue}</td>
                              <td className="p-2 border-r-2 border-slate-900 font-mono">{doc.revisionDate}</td>
                              <td className="p-2 border-r-2 border-slate-900 font-semibold">{doc.createdByUserName || currentUser.name}</td>
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

              {/* PAGE 2: TITLE SHEET & SIGN-OFF APPROVAL MATRIX (If toggled) */}
              {cfg.showPage2CoverSheet && (
                <div className="bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-8 print:shadow-none print:border-none print:break-after-page min-h-[900px]">
                  {renderStandardLetterhead('Page 2 of Dossier: Formal Cover')}

                  {/* Huge Bold Title */}
                  <div className="py-8 text-center space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
                      {doc.title}
                    </h1>
                    {cfg.showScopeOfWorks && (
                      <p className="text-sm font-semibold text-slate-600 max-w-xl mx-auto">
                        {doc.documentScope || doc.description || doc.projectName}
                      </p>
                    )}
                  </div>

                  {/* Graphic Visual Block (If toggled) */}
                  {cfg.showGraphicBanner && (
                    <div className="h-32 bg-gradient-to-r from-blue-950 via-slate-900 to-sky-950 rounded-2xl flex items-center justify-center text-white p-6 shadow-inner relative overflow-hidden">
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                      <div className="relative text-center space-y-1.5">
                        <h3 className="text-xl font-bold text-white">{doc.projectName}</h3>
                        <p className="text-xs text-sky-200">Official High-Reliability Engineering & Commercial Deliverable</p>
                      </div>
                    </div>
                  )}

                  {/* Reference & Formal Sign-Off Matrix */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>Project: <strong className="text-slate-900 font-bold">{doc.projectName}</strong></div>
                      <div>Document Ref: <strong className="text-blue-950 font-mono font-bold">{doc.contractorDocumentNumber || doc.documentNumber}</strong></div>
                      <div>Client Document Ref: <strong className="text-slate-900 font-mono font-bold">{cfg.showClientDocNumber && doc.clientDocumentNumber ? doc.clientDocumentNumber : 'N/A'}</strong></div>
                      <div>Revision: <strong className="text-slate-900 font-bold font-mono">{formatRevisionLabel(doc.contractorRevisionNo || doc.currentRevision)}</strong></div>
                    </div>

                    {/* Sign-Off Approval Matrix: Initiated, Checked, Verified, Approved */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          Formal Sign-Off & Verification Matrix
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowConfigModal(true)}
                          className="print:hidden text-xs font-semibold text-blue-900 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Users className="h-3 w-3" />
                          <span>Edit Signers</span>
                        </button>
                      </div>

                      <div className="border-2 border-slate-900 overflow-hidden text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-bold">
                              <th className="p-2.5 w-16">Rev.</th>
                              <th className="p-2.5">Issue Purpose</th>
                              <th className="p-2.5 w-24">Date</th>
                              <th className="p-2.5">Initiated</th>
                              <th className="p-2.5">Checked</th>
                              <th className="p-2.5">Verified</th>
                              <th className="p-2.5">Approved</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            <tr>
                              <td className="p-3 font-mono font-bold text-center bg-slate-50">
                                {formatRevisionLabel(doc.contractorRevisionNo || doc.currentRevision)}
                              </td>
                              <td className="p-3 font-semibold text-emerald-800">
                                {doc.reasonForIssue || 'For Review & Approval'}
                              </td>
                              <td className="p-3 font-mono text-slate-600">
                                {doc.revisionDate || new Date().toISOString().slice(0, 10)}
                              </td>
                              {/* Initiated */}
                              <td className="p-3">
                                {(() => {
                                  const init = doc.signOffTeam?.find((s) => s.role === 'initiated');
                                  return (
                                    <div>
                                      <div className="font-bold text-slate-900">{init?.name || doc.createdByUserName || currentUser.name}</div>
                                      <div className="text-[10px] text-slate-500">{init?.position || 'Author'}</div>
                                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                                        <Check className="h-2.5 w-2.5" /> Signed
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              {/* Checked */}
                              <td className="p-3">
                                {(() => {
                                  const chk = doc.signOffTeam?.find((s) => s.role === 'checked');
                                  return (
                                    <div>
                                      <div className="font-bold text-slate-900">{chk?.name || 'Discipline Lead'}</div>
                                      <div className="text-[10px] text-slate-500">{chk?.position || 'Reviewer'}</div>
                                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                                        <Check className="h-2.5 w-2.5" /> Checked
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              {/* Verified */}
                              <td className="p-3">
                                {(() => {
                                  const ver = doc.signOffTeam?.find((s) => s.role === 'verified');
                                  return (
                                    <div>
                                      <div className="font-bold text-slate-900">{ver?.name || 'QA Manager'}</div>
                                      <div className="text-[10px] text-slate-500">{ver?.position || 'Quality Lead'}</div>
                                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                                        <Check className="h-2.5 w-2.5" /> Verified
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              {/* Approved */}
                              <td className="p-3">
                                {(() => {
                                  const app = doc.signOffTeam?.find((s) => s.role === 'approved');
                                  return (
                                    <div>
                                      <div className="font-bold text-blue-950">{app?.name || 'Project Director'}</div>
                                      <div className="text-[10px] text-slate-500">{app?.position || 'Director'}</div>
                                      <span className="text-[10px] text-blue-800 font-semibold flex items-center gap-0.5 mt-0.5">
                                        <CheckCircle2 className="h-2.5 w-2.5 text-blue-800" /> Approved
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: REVISION HISTORY & HOLD POINTS (If toggled) */}
              {cfg.showPage3RevisionHoldPoints && (
                <div className="bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-6 print:shadow-none print:border-none print:break-after-page min-h-[900px]">
                  {renderStandardLetterhead('Page 3 of Dossier: History & HOLD Register')}

                  {/* Revision History */}
                  {cfg.showRevisionHistory && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-white bg-blue-950 px-3 py-1.5 rounded-t">
                          Revision Change Log
                        </h4>
                        <div className="flex items-center gap-2 print:hidden">
                          <button
                            type="button"
                            onClick={handleAddRevisionHistory}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Change Record</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('sheet3')}
                            className="text-xs font-semibold text-blue-900 hover:underline"
                          >
                            Sheet 3 Tab →
                          </button>
                        </div>
                      </div>
                      <div className="border-2 border-blue-950 text-xs overflow-hidden rounded-b">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                              <th className="p-2 border-r border-slate-300 w-24">Revision</th>
                              <th className="p-2 border-r border-slate-300 w-32">Section</th>
                              <th className="p-2 border-r border-slate-300 print:border-none">Change Description</th>
                              <th className="p-2 w-10 text-center print:hidden">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {(doc.revisionHistoryItems || []).map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="p-2 border-r border-slate-300 align-top">
                                  <input
                                    type="text"
                                    value={item.revision}
                                    onChange={(e) => handleUpdateRevisionHistory(idx, 'revision', e.target.value)}
                                    placeholder="0"
                                    className="w-full px-1.5 py-1 text-xs font-mono font-bold border border-slate-200 rounded bg-white print:border-none print:p-0 print:bg-transparent focus:border-blue-900 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2 border-r border-slate-300 align-top">
                                  <input
                                    type="text"
                                    value={item.section}
                                    onChange={(e) => handleUpdateRevisionHistory(idx, 'section', e.target.value)}
                                    placeholder="All, Sec 1..."
                                    className="w-full px-1.5 py-1 text-xs font-medium border border-slate-200 rounded bg-white print:border-none print:p-0 print:bg-transparent focus:border-blue-900 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2 border-r border-slate-300 print:border-none align-top">
                                  <div className="space-y-1">
                                    <div className="print:hidden">
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleUpdateRevisionHistory(idx, 'changeDescription', e.target.value);
                                          }
                                        }}
                                        className="w-full px-1.5 py-0.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 focus:outline-none cursor-pointer"
                                      >
                                        <option value="">⚡ Select standard reason / option...</option>
                                        <option value="Initial Issue for Client Review and Approval">Initial Issue for Client Review and Approval</option>
                                        <option value="Incorporated Client Comments & Clarifications">Incorporated Client Comments & Clarifications</option>
                                        <option value="Updated Engineering Design & Technical Calculations">Updated Engineering Design & Technical Calculations</option>
                                        <option value="Issued for Construction (IFC)">Issued for Construction (IFC)</option>
                                        <option value="Issued for Tender / Commercial Enquiry">Issued for Tender / Commercial Enquiry</option>
                                        <option value="Revised per HAZOP & Safety Review Actions">Revised per HAZOP & Safety Review Actions</option>
                                        <option value="General Document Revision & Scope Updates">General Document Revision & Scope Updates</option>
                                        <option value="As-Built / Final Approved Transmittal">As-Built / Final Approved Transmittal</option>
                                      </select>
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={item.changeDescription}
                                      onChange={(e) => handleUpdateRevisionHistory(idx, 'changeDescription', e.target.value)}
                                      placeholder="Enter change description..."
                                      className="w-full px-2 py-1 text-xs text-slate-800 border border-slate-200 rounded bg-white print:border-none print:p-0 print:bg-transparent print:resize-none focus:border-blue-900 focus:outline-none resize-y min-h-[38px]"
                                    />
                                  </div>
                                </td>
                                <td className="p-2 text-center align-top print:hidden">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRevisionHistory(idx)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                    title="Delete Change Record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {(!doc.revisionHistoryItems || doc.revisionHistoryItems.length === 0) && (
                              <tr>
                                <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                                  No revision records yet. Click "Add Change Record" above to add your change logs.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* HOLD Points */}
                  {cfg.showHoldPoints && (
                    <div className="space-y-2 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-white bg-blue-950 px-3 py-1.5 rounded-t">
                          Engineering HOLD Point Register
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActiveTab('sheet3')}
                          className="print:hidden text-xs font-semibold text-blue-900 hover:underline"
                        >
                          Edit HOLD Points →
                        </button>
                      </div>
                      <div className="border-2 border-blue-950 text-xs overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                              <th className="p-2 border-r border-slate-300 w-16 text-center">Nr.</th>
                              <th className="p-2 border-r border-slate-300">Description / HOLD Reference</th>
                              <th className="p-2 border-r border-slate-300 w-44">Responsible Party</th>
                              <th className="p-2 w-28">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(doc.holdPoints || []).map((hp, idx) => (
                              <tr key={idx}>
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
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAGE 4+: PREPARED DOCUMENT CONTENT (With official letterhead) */}
              <div className="bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-800 space-y-6 print:shadow-none print:border-none min-h-[900px]">
                {renderStandardLetterhead('Document Body & Technical Content')}

                {/* Rendered HTML Content */}
                <div
                  className="prose prose-slate max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: doc.bodyHtml || '' }}
                />

                <div className="pt-8 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>PJMAK Engineering • {doc.projectName}</span>
                  <span>End of Technical Deliverable</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INDIVIDUAL PAGE 1 (CONTROL SHEET) */}
          {activeTab === 'sheet1' && (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-6">
              {renderStandardLetterhead('Page 1 of Dossier: Document Control')}

              <div className="border-2 border-slate-900 divide-y-2 divide-slate-900 text-xs">
                <div className="p-3 bg-slate-100 font-bold text-sm flex items-center justify-between">
                  <span>Document Title: <strong className="font-extrabold text-slate-950">{doc.title}</strong></span>
                  <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-300">
                    {doc.contractorDocumentNumber || doc.documentNumber}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Contract: <span className="font-mono font-bold">{cfg.showContractNumber ? (doc.contractNumber || '') : ''}</span>
                    {!cfg.showContractNumber && <span className="text-slate-400 font-normal italic ml-2">N/A (Proposal)</span>}
                  </div>
                  <div className="p-2.5 font-semibold">
                    Scope: <span className="font-bold">{cfg.showScopeOfWorks ? (doc.documentScope || doc.projectName) : doc.projectName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Document Type: <span className="font-bold">{doc.documentType} - {doc.documentType === 'PRP' ? 'Proposal' : doc.documentType === 'MST' ? 'Method Statement' : doc.documentType}</span>
                  </div>
                  <div className="p-2.5 font-semibold">
                    Client Document Number: <span className="font-mono font-bold">{cfg.showClientDocNumber ? (doc.clientDocumentNumber || '') : ''}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Contractor Document Number: <span className="font-mono font-bold">{doc.contractorDocumentNumber || doc.documentNumber}</span>
                  </div>
                  <div className="p-2.5 font-semibold">
                    Contractor Revision No: <span className="font-mono font-bold">{doc.contractorRevisionNo || doc.currentRevision || '0'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900">
                  <div className="p-2.5 font-semibold">
                    Originator: <span className="font-bold">{doc.originator || 'PJMAK'}</span>
                  </div>
                  <div className="p-2.5 font-semibold">
                    PO Number: <span className="font-mono font-bold">{cfg.showPoNumber ? (doc.poNumber || '') : ''}</span>
                  </div>
                </div>
              </div>

              {/* Revision Record Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
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
                        <th className="p-2 border-r-2 border-slate-900 w-28">Author</th>
                        <th className="p-2 border-r-2 border-slate-900 w-28">Checked</th>
                        <th className="p-2 w-28">Accepted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {doc.revisions && doc.revisions.length > 0 ? (
                        doc.revisions.map((rev, idx) => (
                          <tr key={rev.id || idx}>
                            <td className="p-2 border-r-2 border-slate-900 font-mono font-bold">{rev.revision}</td>
                            <td className="p-2 border-r-2 border-slate-900">{rev.reasonForIssue}</td>
                            <td className="p-2 border-r-2 border-slate-900 font-mono">{rev.issueDate || rev.date}</td>
                            <td className="p-2 border-r-2 border-slate-900 font-semibold">{rev.signOff?.preparedBy?.name || rev.issuedByUserName || doc.createdByUserName || 'Author'}</td>
                            <td className="p-2 border-r-2 border-slate-900 font-semibold">{rev.signOff?.checkedBy?.name || 'Reviewer'}</td>
                            <td className="p-2 font-semibold text-emerald-800">{rev.signOff?.approvedByInternal?.name || 'Director'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-2 border-r-2 border-slate-900 font-mono font-bold">{doc.currentRevision}</td>
                          <td className="p-2 border-r-2 border-slate-900">{doc.reasonForIssue}</td>
                          <td className="p-2 border-r-2 border-slate-900 font-mono">{doc.revisionDate}</td>
                          <td className="p-2 border-r-2 border-slate-900 font-semibold">{doc.createdByUserName || currentUser.name}</td>
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

          {/* TAB 4: INDIVIDUAL PAGE 2 (COVER TITLE & SIGN-OFF) */}
          {activeTab === 'sheet2' && (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-8">
              {renderStandardLetterhead('Page 2 of Dossier: Formal Cover')}

              {/* Huge Bold Title */}
              <div className="py-8 text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
                  {doc.title}
                </h1>
                {cfg.showScopeOfWorks && (
                  <p className="text-sm font-semibold text-slate-600 max-w-xl mx-auto">
                    {doc.documentScope || doc.description || doc.projectName}
                  </p>
                )}
              </div>

              {/* Graphic Visual Block (If toggled) */}
              {cfg.showGraphicBanner && (
                <div className="h-32 bg-gradient-to-r from-blue-950 via-slate-900 to-sky-950 rounded-2xl flex items-center justify-center text-white p-6 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="relative text-center space-y-1.5">
                    <h3 className="text-xl font-bold text-white">{doc.projectName}</h3>
                    <p className="text-xs text-sky-200">High Reliability Engineering Deliverable</p>
                  </div>
                </div>
              )}

              {/* Sign-Off Approval Matrix */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>Project: <strong className="text-slate-900 font-bold">{doc.projectName}</strong></div>
                  <div>Document Ref: <strong className="text-blue-950 font-mono font-bold">{doc.contractorDocumentNumber || doc.documentNumber}</strong></div>
                  <div>Client Document Ref: <strong className="text-slate-900 font-mono font-bold">{cfg.showClientDocNumber && doc.clientDocumentNumber ? doc.clientDocumentNumber : 'N/A'}</strong></div>
                  <div>Revision: <strong className="text-slate-900 font-bold font-mono">{formatRevisionLabel(doc.contractorRevisionNo || doc.currentRevision)}</strong></div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Sign-Off Approval Matrix (Initiated, Checked, Verified, Approved)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="text-xs font-semibold text-blue-900 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Configure People</span>
                    </button>
                  </div>

                  <div className="border-2 border-slate-900 overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5 w-16">Rev.</th>
                          <th className="p-2.5">Issue Purpose</th>
                          <th className="p-2.5 w-24">Date</th>
                          <th className="p-2.5">Initiated</th>
                          <th className="p-2.5">Checked</th>
                          <th className="p-2.5">Verified</th>
                          <th className="p-2.5">Approved</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        <tr>
                          <td className="p-3 font-mono font-bold text-center bg-slate-50">
                            {formatRevisionLabel(doc.contractorRevisionNo || doc.currentRevision)}
                          </td>
                          <td className="p-3 font-semibold text-emerald-800">
                            {doc.reasonForIssue || 'For Review & Approval'}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {doc.revisionDate || new Date().toISOString().slice(0, 10)}
                          </td>
                          <td className="p-3">
                            {(() => {
                              const init = doc.signOffTeam?.find((s) => s.role === 'initiated');
                              return (
                                <div>
                                  <div className="font-bold text-slate-900">{init?.name || doc.createdByUserName || currentUser.name}</div>
                                  <div className="text-[10px] text-slate-500">{init?.position || 'Author'}</div>
                                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                                    <Check className="h-2.5 w-2.5" /> Signed
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-3">
                            {(() => {
                              const chk = doc.signOffTeam?.find((s) => s.role === 'checked');
                              return (
                                <div>
                                  <div className="font-bold text-slate-900">{chk?.name || 'Discipline Lead'}</div>
                                  <div className="text-[10px] text-slate-500">{chk?.position || 'Reviewer'}</div>
                                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                                    <Check className="h-2.5 w-2.5" /> Checked
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-3">
                            {(() => {
                              const ver = doc.signOffTeam?.find((s) => s.role === 'verified');
                              return (
                                <div>
                                  <div className="font-bold text-slate-900">{ver?.name || 'QA Manager'}</div>
                                  <div className="text-[10px] text-slate-500">{ver?.position || 'Quality Lead'}</div>
                                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                                    <Check className="h-2.5 w-2.5" /> Verified
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-3">
                            {(() => {
                              const app = doc.signOffTeam?.find((s) => s.role === 'approved');
                              return (
                                <div>
                                  <div className="font-bold text-blue-950">{app?.name || 'Project Director'}</div>
                                  <div className="text-[10px] text-slate-500">{app?.position || 'Director'}</div>
                                  <span className="text-[10px] text-blue-800 font-semibold flex items-center gap-0.5 mt-0.5">
                                    <CheckCircle2 className="h-2.5 w-2.5 text-blue-800" /> Approved
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INDIVIDUAL PAGE 3 (REVISION HISTORY & HOLD POINTS) */}
          {activeTab === 'sheet3' && (
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 font-sans text-slate-900 space-y-6">
              {renderStandardLetterhead('Page 3 of Dossier: History & HOLD Register')}

              {/* Revision History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white bg-blue-950 px-3 py-1.5 rounded-t">
                    Revision History Log
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddRevisionHistory}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Change Record</span>
                  </button>
                </div>

                <div className="border-2 border-blue-950 text-xs overflow-hidden rounded-b">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-2 border-r border-slate-300 w-24">Revision</th>
                        <th className="p-2 border-r border-slate-300 w-36">Section</th>
                        <th className="p-2 border-r border-slate-300">Change Description</th>
                        <th className="p-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(doc.revisionHistoryItems || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2 border-r border-slate-300">
                            <input
                              type="text"
                              value={item.revision}
                              onChange={(e) => handleUpdateRevisionHistory(idx, 'revision', e.target.value)}
                              placeholder="0"
                              className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded bg-white focus:border-blue-900 focus:ring-1 focus:ring-blue-900 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <input
                              type="text"
                              value={item.section}
                              onChange={(e) => handleUpdateRevisionHistory(idx, 'section', e.target.value)}
                              placeholder="All, Section 1..."
                              className="w-full px-2 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white focus:border-blue-900 focus:ring-1 focus:ring-blue-900 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <div className="space-y-1">
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleUpdateRevisionHistory(idx, 'changeDescription', e.target.value);
                                  }
                                }}
                                className="w-full px-1.5 py-0.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 focus:outline-none cursor-pointer"
                              >
                                <option value="">⚡ Select standard reason / option...</option>
                                <option value="Initial Issue for Client Review and Approval">Initial Issue for Client Review and Approval</option>
                                <option value="Incorporated Client Comments & Clarifications">Incorporated Client Comments & Clarifications</option>
                                <option value="Updated Engineering Design & Technical Calculations">Updated Engineering Design & Technical Calculations</option>
                                <option value="Issued for Construction (IFC)">Issued for Construction (IFC)</option>
                                <option value="Issued for Tender / Commercial Enquiry">Issued for Tender / Commercial Enquiry</option>
                                <option value="Revised per HAZOP & Safety Review Actions">Revised per HAZOP & Safety Review Actions</option>
                                <option value="General Document Revision & Scope Updates">General Document Revision & Scope Updates</option>
                                <option value="As-Built / Final Approved Transmittal">As-Built / Final Approved Transmittal</option>
                              </select>
                              <textarea
                                rows={2}
                                value={item.changeDescription}
                                onChange={(e) => handleUpdateRevisionHistory(idx, 'changeDescription', e.target.value)}
                                placeholder="Enter change description..."
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 focus:outline-none resize-y min-h-[42px]"
                              />
                            </div>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleRemoveRevisionHistory(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete Change Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!doc.revisionHistoryItems || doc.revisionHistoryItems.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                            No revision records yet. Click "Add Change Record" to document your revisions.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HOLD Point Register */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-white bg-blue-950 px-3 py-1.5 rounded-t">
                    HOLD Point Register
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddHoldPoint}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add HOLD Point</span>
                  </button>
                </div>

                <div className="border-2 border-blue-950 text-xs overflow-hidden rounded-b">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-2 border-r border-slate-300 w-16 text-center">Nr.</th>
                        <th className="p-2 border-r border-slate-300">Description / Ref of HOLD Point</th>
                        <th className="p-2 border-r border-slate-300 w-44">Responsible Party</th>
                        <th className="p-2 border-r border-slate-300 w-28">Status</th>
                        <th className="p-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(doc.holdPoints || []).map((hp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2 border-r border-slate-300 text-center">
                            <input
                              type="number"
                              value={hp.nr}
                              onChange={(e) => handleUpdateHoldPoint(idx, 'nr', e.target.value)}
                              className="w-12 text-center px-1 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded bg-white focus:border-blue-900 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <textarea
                              rows={2}
                              value={hp.description}
                              onChange={(e) => handleUpdateHoldPoint(idx, 'description', e.target.value)}
                              placeholder="Description / Ref of HOLD Point..."
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white focus:border-blue-900 focus:outline-none resize-y min-h-[42px]"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <input
                              type="text"
                              value={hp.responsibleParty}
                              onChange={(e) => handleUpdateHoldPoint(idx, 'responsibleParty', e.target.value)}
                              placeholder="e.g. Client Representative"
                              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white focus:border-blue-900 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <select
                              value={hp.status}
                              onChange={(e) => handleUpdateHoldPoint(idx, 'status', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white focus:border-blue-900 focus:outline-none"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Open">Open</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleRemoveHoldPoint(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete HOLD Point"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!doc.holdPoints || doc.holdPoints.length === 0) && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                            No HOLD points registered. Click "Add HOLD Point" above to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ATTACHMENTS & UPLOADS */}
          {activeTab === 'attachments' && (
            <div className="w-full max-w-4xl space-y-6">
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const newAtt: Attachment = {
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
                      attachments: [...(prev.attachments || []), newAtt],
                    }));
                  }}
                />
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-900 mx-auto flex items-center justify-center border border-blue-200">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drag and drop document PDF / DOCX / Drawings
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
                    No files attached yet. Upload supporting files or external PDFs above.
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

        {/* 4. MODAL FOR CONFIGURING FRONT 3 PAGES */}
        <FrontPageConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          config={doc.frontPageConfig || cfg}
          signOffTeam={doc.signOffTeam || []}
          document={doc}
          currentUser={currentUser}
          onSave={(newConfig, newSignOffTeam, metadataUpdates) => {
            setDoc((prev) => ({
              ...prev,
              frontPageConfig: newConfig,
              signOffTeam: newSignOffTeam,
              contractNumber: metadataUpdates.contractNumber,
              poNumber: metadataUpdates.poNumber,
              clientDocumentNumber: metadataUpdates.clientDocumentNumber,
              clientRevisionCode: metadataUpdates.clientRevisionCode,
              documentScope: metadataUpdates.documentScope,
              clientCompany: metadataUpdates.clientCompany,
              clientRoleLabel: metadataUpdates.clientRoleLabel,
              clientLogoUrl: metadataUpdates.clientLogoUrl !== undefined ? metadataUpdates.clientLogoUrl : prev.clientLogoUrl,
            }));
            setShowConfigModal(false);
          }}
        />

        {/* 5. MODAL FOR EDITING CLASSIFICATION & DETAILS (TECHNICAL VS COMMERCIAL) */}
        {showEditDetailsModal && (
          <EditTechnicalDocumentModal
            isOpen={showEditDetailsModal}
            doc={doc}
            contacts={contacts}
            existingDocuments={existingDocuments}
            onClose={() => setShowEditDetailsModal(false)}
            onSave={async (updatedDoc) => {
              setDoc(updatedDoc);
              await onSave(updatedDoc);
              if (onRefreshData) onRefreshData();
            }}
          />
        )}
      </div>
    </div>
  );
};
