import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Send,
  Inbox,
  FileText,
  GitBranch,
  Building2,
  Calendar,
  Shield,
  HelpCircle,
  Plus,
  Wand2,
  Check,
  Eye,
  Edit3,
  Copy,
  ChevronDown,
  Info,
  Search,
  ArrowLeftRight,
  Link2,
  Unlink,
  Paperclip,
  Trash2,
  CornerDownRight,
  Briefcase,
  CreditCard,
  ChevronUp,
  BadgeDollarSign,
} from 'lucide-react';
import {
  generateClientCode,
  generateDefaultCostCode,
  generateDefaultRevenueCode,
} from '../utils/clientCodeGenerator';
import {
  Correspondence,
  CorrespondenceType,
  ActionPurpose,
  ConfidentialityLevel,
  PriorityLevel,
  Contact,
  Department,
  CompanySettings,
  LetterTemplate,
  RelatedLink,
  Attachment,
} from '../types';
import { PjmakLogo } from './PjmakLogo';
import { SignatureEnhancerModal } from './SignatureEnhancerModal';

interface EditorModalProps {
  initialType: CorrespondenceType;
  allCorrespondence: Correspondence[];
  contacts: Contact[];
  departments: Department[];
  settings: CompanySettings;
  templates: LetterTemplate[];
  replyToItem?: Correspondence | null;
  onClose: () => void;
  onSave: (data: Partial<Correspondence>) => Promise<void>;
  onCreateContact: (contact: Partial<Contact>) => Promise<Contact>;
}

export const LetterEditorModal: React.FC<EditorModalProps> = ({
  initialType,
  allCorrespondence,
  contacts,
  departments,
  settings,
  templates,
  replyToItem,
  onClose,
  onSave,
  onCreateContact,
}) => {
  const [type, setType] = useState<CorrespondenceType>(initialType);
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');

  // Internal correspondence routing states
  const [originDeptId, setOriginDeptId] = useState(
    departments[0]?.id || ''
  );
  const [destinationDeptId, setDestinationDeptId] = useState(
    departments[1]?.id || departments[0]?.id || ''
  );

  // Searchable Reply / Related Correspondence states
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [showRelatedSearch, setShowRelatedSearch] = useState(false);
  const [linkedCorrespondence, setLinkedCorrespondence] = useState<Correspondence | null>(
    replyToItem || null
  );

  // Form states
  const [subject, setSubject] = useState(
    replyToItem ? `RE: ${replyToItem.subject}` : ''
  );
  const [actionPurpose, setActionPurpose] = useState<ActionPurpose>(
    replyToItem ? 'reply' : initialType === 'internal' ? 'internal_memo' : 'new_correspondence'
  );
  const [bodyHtml, setBodyHtml] = useState(
    replyToItem
      ? `<p>Dear Sirs,</p><p>We acknowledge receipt of your letter ref <strong>${
          replyToItem.externalRefNumber || replyToItem.correspondenceNumber
        }</strong> dated ${replyToItem.officialDate}.</p><p>Having reviewed your submission...</p>`
      : initialType === 'internal'
      ? '<p><strong>INTERNAL MEMORANDUM</strong></p><p>Please note the following internal directive for your attention and execution:</p><p></p>'
      : '<p>Dear Sirs,</p><p>We are writing to formally submit...</p>'
  );

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');

  // Correspondent
  const [recipientOrg, setRecipientOrg] = useState(
    replyToItem
      ? replyToItem.senderOrg
      : initialType === 'internal'
      ? settings.companyName
      : ''
  );
  const [recipientPerson, setRecipientPerson] = useState(
    replyToItem ? replyToItem.senderPerson : ''
  );
  const [recipientEmail, setRecipientEmail] = useState(
    replyToItem ? replyToItem.senderEmail : ''
  );
  const [senderOrg, setSenderOrg] = useState(
    initialType === 'incoming' ? '' : settings.companyName
  );
  const [senderPerson, setSenderPerson] = useState(
    initialType === 'internal' ? settings.signature.signatoryName : ''
  );
  const [senderEmail, setSenderEmail] = useState('');

  // Classification & Routing
  const [confidentiality, setConfidentiality] =
    useState<ConfidentialityLevel>('normal');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [assignedDeptId, setAssignedDeptId] = useState(departments[0]?.id || '');
  const [dueDate, setDueDate] = useState('');

  // Incoming specific
  const [externalRefNumber, setExternalRefNumber] = useState(
    replyToItem?.externalRefNumber || replyToItem?.correspondenceNumber || ''
  );
  const [externalDate, setExternalDate] = useState('');
  const [receivedThrough, setReceivedThrough] = useState<
    'courier' | 'email' | 'registered_post' | 'hand_delivery' | 'portal'
  >('email');

  // Related correspondence links
  const [relatedLinks, setRelatedLinks] = useState<RelatedLink[]>(
    replyToItem
      ? [
          {
            id: `rel-${Date.now()}`,
            targetCorrespondenceId: replyToItem.id,
            targetCorrespondenceNumber: replyToItem.correspondenceNumber,
            targetSubject: replyToItem.subject,
            relationshipType: 'response_to',
            direction: replyToItem.type,
            date: replyToItem.officialDate,
          },
        ]
      : []
  );

  // Signatory
  const [signatureIncluded, setSignatureIncluded] = useState(true);
  const [signatoryName, setSignatoryName] = useState(
    settings.signature.signatoryName
  );
  const [signatoryPosition, setSignatoryPosition] = useState(
    settings.signature.position
  );
  const [activeSignatureUrl, setActiveSignatureUrl] = useState(
    settings.signature?.signatureImageUrl || '/assets/signature_kashefi.svg'
  );
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);

  // AI Assistant drawer
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'improve' | 'draft_reply' | 'extract'>(
    replyToItem ? 'draft_reply' : 'improve'
  );
  const [aiStyle, setAiStyle] = useState<
    'professional' | 'diplomatic' | 'concise' | 'grammar'
  >('diplomatic');
  const [aiInputText, setAiInputText] = useState('');
  const [aiOutputResult, setAiOutputResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Quick contact modal
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactOrg, setNewContactOrg] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  // Commercial & Financial Traceability
  const [clientCode, setClientCode] = useState(replyToItem?.clientCode || '');
  const [costCode, setCostCode] = useState(replyToItem?.costCode || '');
  const [revenueCode, setRevenueCode] = useState(replyToItem?.revenueCode || '');
  const [contractNumber, setContractNumber] = useState(replyToItem?.contractNumber || '');
  const [proformaInvoiceNumber, setProformaInvoiceNumber] = useState(replyToItem?.proformaInvoiceNumber || '');
  const [commercialValue, setCommercialValue] = useState<string>(
    replyToItem?.commercialValue !== undefined ? String(replyToItem.commercialValue) : ''
  );
  const [currency, setCurrency] = useState(replyToItem?.currency || 'USD');
  const [showCommercialSection, setShowCommercialSection] = useState(
    Boolean(replyToItem?.clientCode || replyToItem?.costCode || replyToItem?.contractNumber)
  );

  // Saving state
  const [saving, setSaving] = useState(false);

  // Today's official date
  const todayStr = new Date().toISOString().split('T')[0];

  // Natural sequence number (e.g. IN-2026-1, OUT-2026-1, IC-2026-1 - NO LEADING ZEROS)
  const prefix = type === 'incoming' ? 'IN' : type === 'outgoing' ? 'OUT' : 'IC';
  const typeCount = allCorrespondence.filter((c) => c.type === type).length;
  const nextSeqEstimate = `${prefix}-2026-${typeCount + 1}`;

  // Handle switching type dynamically
  const handleTypeChange = (newType: CorrespondenceType) => {
    setType(newType);
    if (newType === 'internal') {
      setSenderOrg(settings.companyName);
      setRecipientOrg(settings.companyName);
      if (!bodyHtml || bodyHtml.includes('Dear Sirs')) {
        setBodyHtml(
          '<p><strong>INTERNAL MEMORANDUM</strong></p><p>Please note the following internal directive for your attention and execution:</p><p></p>'
        );
      }
      setActionPurpose('internal_memo');
    } else if (newType === 'outgoing') {
      setSenderOrg(settings.companyName);
      if (bodyHtml.includes('INTERNAL MEMORANDUM')) {
        setBodyHtml('<p>Dear Sirs,</p><p>We are writing to formally submit...</p>');
      }
      setActionPurpose('new_correspondence');
    } else {
      setActionPurpose('new_correspondence');
    }
  };

  // Requirement 7: Searchable Reply / Link Selection Handler
  const handleSelectRelatedCorrespondence = (target: Correspondence) => {
    setLinkedCorrespondence(target);
    setShowRelatedSearch(false);
    setRelatedSearchQuery('');

    // 1. Set bidirectional link
    const newLink: RelatedLink = {
      id: `rel-${Date.now()}`,
      targetCorrespondenceId: target.id,
      targetCorrespondenceNumber: target.correspondenceNumber,
      targetSubject: target.subject,
      relationshipType: 'response_to',
      direction: target.type,
      date: target.officialDate,
    };
    setRelatedLinks([newLink]);

    // 2. Set relevant subject line: RE: [original subject]
    if (!subject || subject.startsWith('RE: ') || subject.trim() === '') {
      setSubject(`RE: ${target.subject}`);
    }

    // 3. Action purpose
    setActionPurpose('reply');

    // 4. Suggested recipient & sender details
    if (type === 'outgoing') {
      if (target.type === 'incoming') {
        setRecipientOrg(target.senderOrg);
        setRecipientPerson(target.senderPerson);
        setRecipientEmail(target.senderEmail);
      } else {
        setRecipientOrg(target.recipientOrg);
        setRecipientPerson(target.recipientPerson);
        setRecipientEmail(target.recipientEmail);
      }
    } else if (type === 'internal') {
      if (target.originDepartmentId) {
        setDestinationDeptId(target.originDepartmentId);
      }
      setRecipientPerson(target.senderPerson || target.createdByUserName);
    }

    // 5. Copy original reference into notes or metadata
    setExternalRefNumber(target.externalRefNumber || target.correspondenceNumber);

    // 6. Pre-fill acknowledgment body if blank or standard
    if (bodyHtml === '<p>Dear Sirs,</p><p>We are writing to formally submit...</p>' || !bodyHtml) {
      setBodyHtml(
        `<p>Dear Sirs,</p><p>We acknowledge receipt of your correspondence ref <strong>${
          target.externalRefNumber || target.correspondenceNumber
        }</strong> dated ${target.officialDate}.</p><p>In response to the matters raised, we advise as follows:</p><p></p>`
      );
    }
  };

  const handleClearRelatedCorrespondence = () => {
    setLinkedCorrespondence(null);
    setRelatedLinks([]);
  };

  // Filtered list of correspondence for reply/link search
  const searchResults = useMemo(() => {
    if (!relatedSearchQuery.trim()) {
      return allCorrespondence.slice(0, 8);
    }
    const q = relatedSearchQuery.toLowerCase();
    return allCorrespondence.filter(
      (c) =>
        c.correspondenceNumber.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        (c.externalRefNumber && c.externalRefNumber.toLowerCase().includes(q)) ||
        c.senderOrg.toLowerCase().includes(q) ||
        c.recipientOrg.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [allCorrespondence, relatedSearchQuery]);

  // Smart suggestions from previous letters matching recipient or subject keywords
  const similarLetters = allCorrespondence
    .filter((c) => {
      if (type === 'outgoing') {
        return (
          recipientOrg &&
          (c.recipientOrg.toLowerCase().includes(recipientOrg.toLowerCase()) ||
            c.subject.toLowerCase().includes(subject.toLowerCase()))
        );
      }
      return false;
    })
    .slice(0, 2);

  const handleContactSelect = (c: Contact) => {
    if (type === 'outgoing') {
      setRecipientOrg(c.orgName);
      setRecipientPerson(c.contactPerson);
      setRecipientEmail(c.email);
    } else {
      setSenderOrg(c.orgName);
      setSenderPerson(c.contactPerson);
      setSenderEmail(c.email);
    }
    // Auto-populate commercial & accounting trace codes from contact
    if (c.contactCode) {
      setClientCode(c.contactCode);
    }
    if (c.defaultCostCode) {
      setCostCode(c.defaultCostCode);
    }
    if (c.defaultRevenueCode) {
      setRevenueCode(c.defaultRevenueCode);
    }
    if (c.contactCode || c.defaultCostCode) {
      setShowCommercialSection(true);
    }
  };

  const handleAutoAllocateCodes = () => {
    const org = type === 'outgoing' ? recipientOrg : senderOrg;
    if (!org || !org.trim()) {
      alert('Please enter or select an Organization name first before allocating codes.');
      return;
    }
    const existingCodes = contacts
      .map((c) => c.contactCode)
      .filter((code): code is string => Boolean(code));
    const allocated = clientCode.trim()
      ? clientCode.trim().toUpperCase()
      : generateClientCode(org, existingCodes);
    setClientCode(allocated);
    if (!costCode) setCostCode(generateDefaultCostCode(allocated));
    if (!revenueCode) setRevenueCode(generateDefaultRevenueCode(allocated, 1));
    if (!contractNumber) setContractNumber(`CTR-${allocated}-2026-01`);
    if (!proformaInvoiceNumber) setProformaInvoiceNumber(`PI-${allocated}-001`);
    setShowCommercialSection(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactOrg || !newContactEmail) return;
    try {
      const created = await onCreateContact({
        orgName: newContactOrg,
        contactPerson: newContactPerson,
        email: newContactEmail,
      });
      handleContactSelect(created);
      setShowNewContactModal(false);
      setNewContactOrg('');
      setNewContactPerson('');
      setNewContactEmail('');
    } catch (e) {
      alert('Failed to create contact');
    }
  };

  // AI Actions
  const handleAiImprove = async () => {
    setAiLoading(true);
    setAiOutputResult('');
    try {
      const res = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: bodyHtml,
          mode: aiStyle,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setAiOutputResult(data.result);
      }
    } catch (err) {
      alert('AI improvement failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiDraftReply = async () => {
    if (!replyToItem && !aiInputText) {
      alert('Please provide incoming text or select a letter to reply to.');
      return;
    }
    setAiLoading(true);
    setAiOutputResult('');
    try {
      const res = await fetch('/api/ai/draft-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomingSubject: replyToItem?.subject || 'Incoming Document',
          incomingBody: replyToItem?.bodyHtml || aiInputText,
          externalRef: replyToItem?.externalRefNumber || '',
          instructions: aiInputText || 'Formal acknowledgement and response.',
        }),
      });
      const data = await res.json();
      if (data.bodyHtml) {
        setAiOutputResult(data.bodyHtml);
        if (data.subject && !subject) {
          setSubject(data.subject);
        }
      }
    } catch (err) {
      alert('AI drafting failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiExtractIncoming = async () => {
    if (!aiInputText) {
      alert('Paste scanned text or letter transcript first.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/extract-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInputText }),
      });
      const data = await res.json();
      if (data.subject) setSubject(data.subject);
      if (data.senderOrg) setSenderOrg(data.senderOrg);
      if (data.senderPerson) setSenderPerson(data.senderPerson);
      if (data.externalRefNumber) setExternalRefNumber(data.externalRefNumber);
      if (data.priority) setPriority(data.priority);
      if (data.summary) {
        setBodyHtml(
          `<p><strong>Summary of Scanned Letter:</strong></p><p>${data.summary}</p><p><strong>Required Action:</strong> ${data.actionRequired}</p>`
        );
      }
      setAiOpen(false);
    } catch (err) {
      alert('AI extraction failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Subject is required.');
      return;
    }

    setSaving(true);
    try {
      const originDept = departments.find((d) => d.id === originDeptId);
      const destDept = departments.find((d) => d.id === destinationDeptId);

      await onSave({
        type,
        actionPurpose,
        subject,
        bodyHtml,
        confidentiality,
        priority,
        assignedDepartmentId: type === 'internal' ? destinationDeptId : assignedDeptId,
        dueDate: dueDate || undefined,
        senderOrg:
          type === 'outgoing' || type === 'internal'
            ? settings.companyName
            : senderOrg || 'External',
        senderPerson,
        senderEmail,
        recipientOrg:
          type === 'incoming' || type === 'internal'
            ? settings.companyName
            : recipientOrg,
        recipientPerson,
        recipientEmail,
        originDepartmentId: type === 'internal' ? originDeptId : undefined,
        originDepartmentName: type === 'internal' ? originDept?.name : undefined,
        destinationDepartmentId: type === 'internal' ? destinationDeptId : undefined,
        destinationDepartmentName: type === 'internal' ? destDept?.name : undefined,
        externalRefNumber: externalRefNumber || undefined,
        externalDate: externalDate || undefined,
        receivedThrough: type === 'incoming' ? receivedThrough : undefined,
        signatureIncluded,
        signatoryName,
        signatoryPosition,
        relatedLinks,
        attachments,
        clientCode: clientCode.trim() ? clientCode.trim().toUpperCase() : undefined,
        costCode: costCode.trim() ? costCode.trim() : undefined,
        revenueCode: revenueCode.trim() ? revenueCode.trim() : undefined,
        contractNumber: contractNumber.trim() ? contractNumber.trim() : undefined,
        proformaInvoiceNumber: proformaInvoiceNumber.trim() ? proformaInvoiceNumber.trim() : undefined,
        commercialValue: commercialValue.trim() ? Number(commercialValue) : undefined,
        currency: currency || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save letter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-slate-50 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`p-2 rounded-lg ${
                type === 'incoming'
                  ? 'bg-blue-100 text-blue-800'
                  : type === 'outgoing'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {type === 'incoming' ? (
                <Inbox className="h-5 w-5" />
              ) : type === 'outgoing' ? (
                <Send className="h-5 w-5" />
              ) : (
                <ArrowLeftRight className="h-5 w-5" />
              )}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {type === 'incoming'
                  ? 'Register Incoming Correspondence'
                  : type === 'outgoing'
                  ? 'Compose Outgoing Official Letter'
                  : 'Compose Internal Memorandum (IC)'}
              </h2>
              <p className="text-xs text-slate-500">
                {type === 'internal'
                  ? 'Internal office distribution and inter-departmental memorandum'
                  : 'Automatic sequential numbering and official corporate letterhead compliance'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Type selector toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange('incoming')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  type === 'incoming'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Inbox className="h-3 w-3" />
                <span>Incoming (IN)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('outgoing')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  type === 'outgoing'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Send className="h-3 w-3" />
                <span>Outgoing (OUT)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('internal')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  type === 'internal'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>Internal (IC)</span>
              </button>
            </div>

            {/* View switcher */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'compose'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Form Container */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {activeTab === 'compose' ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Requirement 7: Searchable Reply & Linked Correspondence */}
              <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Reply To / Related Correspondence Relationship
                    </span>
                  </div>
                  {linkedCorrespondence && (
                    <button
                      type="button"
                      onClick={handleClearRelatedCorrespondence}
                      className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      <span>Unlink / Clear Relationship</span>
                    </button>
                  )}
                </div>

                {linkedCorrespondence ? (
                  <div className="p-3 bg-white border border-sky-200 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-md bg-sky-100 text-sky-700 mt-0.5">
                        <CornerDownRight className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {linkedCorrespondence.correspondenceNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              linkedCorrespondence.type === 'incoming'
                                ? 'bg-blue-100 text-blue-800'
                                : linkedCorrespondence.type === 'outgoing'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {linkedCorrespondence.type.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {linkedCorrespondence.officialDate}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {linkedCorrespondence.subject}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Correspondent: {linkedCorrespondence.senderOrg || linkedCorrespondence.originDepartmentName || 'Internal'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Response Linked</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search correspondence to reply or link (by ref #, subject, organization, date)..."
                        value={relatedSearchQuery}
                        onFocus={() => setShowRelatedSearch(true)}
                        onChange={(e) => {
                          setRelatedSearchQuery(e.target.value);
                          setShowRelatedSearch(true);
                        }}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>

                    {showRelatedSearch && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                        <div className="p-2 bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Select previous correspondence to link as response:</span>
                          <button
                            type="button"
                            onClick={() => setShowRelatedSearch(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        {searchResults.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No matching correspondence found.
                          </div>
                        ) : (
                          searchResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectRelatedCorrespondence(c)}
                              className="w-full text-left px-3 py-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-sky-700">
                                    {c.correspondenceNumber}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      c.type === 'incoming'
                                        ? 'bg-blue-100 text-blue-800'
                                        : c.type === 'outgoing'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {c.type.toUpperCase()}
                                  </span>
                                  <span className="text-[11px] text-slate-400">{c.officialDate}</span>
                                </div>
                                <div className="text-xs font-medium text-slate-800 truncate mt-0.5">
                                  {c.subject}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {c.senderOrg ? `From: ${c.senderOrg}` : ''}{' '}
                                  {c.recipientOrg ? `To: ${c.recipientOrg}` : ''}
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-sky-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                Select & Reply →
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sequential Number & Official Date Informational Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type === 'internal' ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-800 text-sky-400'}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Allocated Sequential Reference
                    </div>
                    <div className="font-mono text-base font-bold text-white">
                      {nextSeqEstimate}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Official Record Date
                    </span>
                    <span className="font-semibold text-white">{todayStr}</span>
                  </div>
                  <div className="border-l border-slate-700 pl-4 hidden sm:block">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Integrity Policy
                    </span>
                    <span className="text-[11px] text-slate-300">
                      Auto-locked upon save
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Purpose & Classification Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Action / Purpose *
                  </label>
                  <select
                    value={actionPurpose}
                    onChange={(e) =>
                      setActionPurpose(e.target.value as ActionPurpose)
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    {type === 'internal' ? (
                      <>
                        <option value="internal_memo">Internal Memo</option>
                        <option value="for_action">For Action</option>
                        <option value="for_review">For Review</option>
                        <option value="for_approval">For Approval</option>
                        <option value="for_information">For Information</option>
                        <option value="for_comment">For Comment</option>
                        <option value="reply">Reply / Response</option>
                      </>
                    ) : (
                      <>
                        <option value="new_correspondence">New Correspondence</option>
                        <option value="reply">Reply</option>
                        <option value="forward">Forward</option>
                        <option value="for_information">For Information</option>
                        <option value="for_review">For Review</option>
                        <option value="for_observation">For Observation</option>
                        <option value="for_action">For Action</option>
                        <option value="for_response">For Response</option>
                        <option value="for_approval">For Approval</option>
                        <option value="for_comment">For Comment</option>
                        <option value="for_followup">For Follow-up</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confidentiality *
                  </label>
                  <select
                    value={confidentiality}
                    onChange={(e) =>
                      setConfidentiality(e.target.value as ConfidentialityLevel)
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="normal">Normal (Public)</option>
                    <option value="internal">Internal Only</option>
                    <option value="confidential">Confidential</option>
                    <option value="highly_confidential">
                      Highly Confidential
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as PriorityLevel)
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {type === 'internal' ? 'Target Destination' : 'Assigned Department'}
                  </label>
                  <select
                    value={type === 'internal' ? destinationDeptId : assignedDeptId}
                    onChange={(e) => {
                      if (type === 'internal') {
                        setDestinationDeptId(e.target.value);
                      } else {
                        setAssignedDeptId(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Incoming-Specific Fields */}
              {type === 'incoming' && (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Incoming Registration Details
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAiMode('extract');
                        setAiOpen(true);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Extract from Scanned Text / OCR (Gemini)</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                        External Reference No
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MOE/INFRA/2026/089"
                        value={externalRefNumber}
                        onChange={(e) => setExternalRefNumber(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                        Date on External Letter
                      </label>
                      <input
                        type="date"
                        value={externalDate}
                        onChange={(e) => setExternalDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                        Received Through Channel
                      </label>
                      <select
                        value={receivedThrough}
                        onChange={(e) => setReceivedThrough(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg"
                      >
                        <option value="email">Official Corporate Email</option>
                        <option value="courier">Courier Dispatch</option>
                        <option value="registered_post">Registered Post</option>
                        <option value="hand_delivery">Hand Delivery / Registry Desk</option>
                        <option value="portal">Government / Client Portal</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Routing & Correspondent Section: Internal (IC) vs. External (IN/OUT) */}
              {type === 'internal' ? (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-purple-700" />
                      <span>Inter-Departmental Routing (FROM / TO)</span>
                    </span>
                    <span className="text-[11px] text-purple-700 font-medium">
                      Company: {settings.companyName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Originating Department (FROM) */}
                    <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-2">
                      <div className="text-xs font-bold text-slate-800">
                        Originating Department (FROM)
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Department *
                        </label>
                        <select
                          value={originDeptId}
                          onChange={(e) => setOriginDeptId(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Originating Officer / Signatory
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Lead Resident Engineer"
                          value={senderPerson}
                          onChange={(e) => setSenderPerson(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Destination Department (TO) */}
                    <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-2">
                      <div className="text-xs font-bold text-slate-800">
                        Destination Department (TO)
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Department *
                        </label>
                        <select
                          value={destinationDeptId}
                          onChange={(e) => setDestinationDeptId(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Designated Action Officer / Attn
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Quantity Surveyor / Head of Procurement"
                          value={recipientPerson}
                          onChange={(e) => setRecipientPerson(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* External Correspondent Selection & Quick Contact Picker */
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {type === 'outgoing'
                        ? 'Recipient Correspondent'
                        : 'Sender Correspondent'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        Pick Existing:
                      </span>
                      <select
                        onChange={(e) => {
                          const found = contacts.find(
                            (c) => c.id === e.target.value
                          );
                          if (found) handleContactSelect(found);
                        }}
                        className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select from Contact Directory...
                        </option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.orgName} — {c.contactPerson}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewContactModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>New Contact</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Organization / Agency Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex Structural Consultants Ltd"
                        value={type === 'outgoing' ? recipientOrg : senderOrg}
                        onChange={(e) =>
                          type === 'outgoing'
                            ? setRecipientOrg(e.target.value)
                            : setSenderOrg(e.target.value)
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Attention Person / Signatory
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Arthur Pendelton"
                        value={type === 'outgoing' ? recipientPerson : senderPerson}
                        onChange={(e) =>
                          type === 'outgoing'
                            ? setRecipientPerson(e.target.value)
                            : setSenderPerson(e.target.value)
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="contact@agency.com"
                        value={type === 'outgoing' ? recipientEmail : senderEmail}
                        onChange={(e) =>
                          type === 'outgoing'
                            ? setRecipientEmail(e.target.value)
                            : setSenderEmail(e.target.value)
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Commercial & Financial Traceability Panel */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <div
                  onClick={() => setShowCommercialSection(!showCommercialSection)}
                  className="px-4 py-3 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Commercial & Financial Traceability
                    </span>
                    {(clientCode || costCode || contractNumber || commercialValue) ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        {clientCode ? `Client: ${clientCode}` : ''}
                        {costCode ? ` • ${costCode}` : ''}
                        {commercialValue ? ` • ${currency} ${Number(commercialValue).toLocaleString()}` : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">
                        (Client Code, Cost Code, Contract, Proforma Invoice, Value)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoAllocateCodes();
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-Allocate Codes</span>
                    </button>
                    {showCommercialSection ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {showCommercialSection && (
                  <div className="p-4 space-y-3.5 bg-white border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Client / Counterparty Code
                          </label>
                          <span className="text-[10px] text-slate-400">e.g. SBM, NPC, IOOC</span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. SBM"
                          value={clientCode}
                          onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono uppercase font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Cost Code / Cost Center
                          </label>
                          <span className="text-[10px] text-slate-400">CC-[CODE]-YYYY</span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. CC-SBM-2026"
                          value={costCode}
                          onChange={(e) => setCostCode(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Revenue Code (REV)
                          </label>
                          <span className="text-[10px] text-slate-400">REV-[CODE]-001</span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. REV-SBM-001"
                          value={revenueCode}
                          onChange={(e) => setRevenueCode(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Contract / PO Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CTR-SBM-2026-01"
                          value={contractNumber}
                          onChange={(e) => setContractNumber(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Proforma Invoice (PI) #
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PI-SBM-001"
                          value={proformaInvoiceNumber}
                          onChange={(e) => setProformaInvoiceNumber(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Commercial Value
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 150000"
                          value={commercialValue}
                          onChange={(e) => setCommercialValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="AED">AED (د.إ)</option>
                          <option value="SAR">SAR (﷼)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Letter Subject Line *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Concise official subject statement (e.g. CONTRACT 402 - SUBMISSION OF STRUCTURAL DEFLECTION LOGS)..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAiMode('improve');
                      setAiOpen(true);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Tools</span>
                  </button>
                </div>
              </div>

              {/* Similar Correspondence Recommendations */}
              {similarLetters.length > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5">
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600" />
                    <span>Similar Previous Correspondence Detected</span>
                  </div>
                  <div className="space-y-1">
                    {similarLetters.map((sim) => (
                      <div
                        key={sim.id}
                        className="flex items-center justify-between text-[11px] bg-white p-2 rounded border border-amber-100"
                      >
                        <span className="font-medium text-slate-800">
                          {sim.correspondenceNumber}: {sim.subject}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBodyHtml(sim.bodyHtml);
                            }}
                            className="text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                          >
                            Use as Template
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRelatedLinks((prev) => [
                                ...prev,
                                {
                                  id: `rel-${Date.now()}`,
                                  targetCorrespondenceId: sim.id,
                                  targetCorrespondenceNumber:
                                    sim.correspondenceNumber,
                                  targetSubject: sim.subject,
                                  relationshipType: 'reference_to',
                                  direction: sim.type,
                                  date: sim.officialDate,
                                },
                              ]);
                            }}
                            className="text-sky-700 hover:text-sky-900 font-semibold underline cursor-pointer"
                          >
                            Link Reference
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Letter Body Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Official Letter Content (HTML Paragraphs) *
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setBodyHtml((prev) => `${prev}<p>We remain available to coordinate on site at your earliest convenience.</p>`)
                      }
                      className="text-slate-600 hover:text-slate-900 text-[11px] underline cursor-pointer"
                    >
                      + Insert Formal Closing
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBodyHtml((prev) => `${prev}<p>Please treat this matter with the highest contractual priority.</p>`)
                      }
                      className="text-slate-600 hover:text-slate-900 text-[11px] underline cursor-pointer"
                    >
                      + Insert Priority Note
                    </button>
                  </div>
                </div>

                <textarea
                  rows={9}
                  required
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="<p>Enter letter text with HTML paragraphs (<p>, <strong>, <ul>, <li>)...</p>"
                  className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              {/* Attachments Section */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                    <span>Document Attachments ({attachments.length})</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Attachment description or filename (e.g. Schedule-A-Technical-Specs.pdf)..."
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!newAttachmentName.trim()) return;
                        const newAtt: Attachment = {
                          id: `att-${Date.now()}`,
                          name: newAttachmentName.trim(),
                          size: `${(Math.random() * 2 + 0.4).toFixed(1)} MB`,
                          type: newAttachmentName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                          uploadedAt: new Date().toISOString(),
                        };
                        setAttachments((prev) => [...prev, newAtt]);
                        setNewAttachmentName('');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newAttachmentName.trim()) return;
                      const newAtt: Attachment = {
                        id: `att-${Date.now()}`,
                        name: newAttachmentName.trim(),
                        size: `${(Math.random() * 2 + 0.4).toFixed(1)} MB`,
                        type: newAttachmentName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                        uploadedAt: new Date().toISOString(),
                      };
                      setAttachments((prev) => [...prev, newAtt]);
                      setNewAttachmentName('');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800">{att.name}</span>
                          <span className="text-[11px] text-slate-400">({att.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Digital Signature Options */}
              {type === 'outgoing' && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Authorized Signatory & Seal
                    </span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={signatureIncluded}
                        onChange={(e) => setSignatureIncluded(e.target.checked)}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>Include Official Digital Signature Stamp</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Signatory Full Name
                      </label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Signatory Official Title / Position
                      </label>
                      <input
                        type="text"
                        value={signatoryPosition}
                        onChange={(e) => setSignatoryPosition(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {signatureIncluded && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-28 bg-slate-50 border border-slate-200 rounded flex items-center justify-center p-1">
                          <img
                            src={activeSignatureUrl}
                            alt={`Signature of ${signatoryName}`}
                            className="h-10 max-w-full object-contain pointer-events-none select-none"
                          />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 text-[11px] block">
                            Authorized Handwritten Signature
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Stamped on official letter stationery & downloaded PDF
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEnhancerOpen(true)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold transition-all shadow-2xs"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                          <span>Enhance Photo (Sign 1 / Sign 2)</span>
                        </button>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: LIVE LETTERHEAD PREVIEW */
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              {type === 'internal' ? (
                /* INTERNAL MEMORANDUM (IC) PREVIEW */
                <div className="bg-white p-8 sm:p-10 rounded-xl shadow-lg border border-slate-300 w-full max-w-3xl font-sans text-slate-800 space-y-6">
                  <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                    <div>
                      <div className="h-11 w-36 mb-1">
                        <PjmakLogo variant="full" size="md" />
                      </div>
                      <p className="text-xs font-bold text-purple-800 uppercase tracking-widest mt-1">
                        Internal Memorandum (IC)
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-mono font-bold text-slate-900 text-sm">{nextSeqEstimate}</div>
                      <div className="text-slate-500">{todayStr}</div>
                    </div>
                  </div>

                  <table className="w-full text-xs border-collapse border border-slate-200">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="w-36 py-2 px-3 bg-slate-50 font-bold text-slate-600">TO (DESTINATION):</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {departments.find((d) => d.id === destinationDeptId)?.name || 'Destination Department'}
                          {recipientPerson ? ` — Attn: ${recipientPerson}` : ''}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 px-3 bg-slate-50 font-bold text-slate-600">FROM (ORIGIN):</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {departments.find((d) => d.id === originDeptId)?.name || 'Originating Department'}
                          {senderPerson ? ` — ${senderPerson}` : ''}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 px-3 bg-slate-50 font-bold text-slate-600">ACTION / PURPOSE:</td>
                        <td className="py-2 px-3 uppercase text-[11px] font-bold text-purple-800">
                          {actionPurpose.replace('_', ' ')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 bg-slate-50 font-bold text-slate-600">SUBJECT:</td>
                        <td className="py-2 px-3 font-bold text-slate-900 text-sm">
                          {subject || '[No Subject Specified]'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div
                    className="text-xs leading-relaxed prose max-w-none text-slate-800 pt-2 min-h-[140px]"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />

                  {attachments.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-[11px] font-bold text-slate-700 uppercase">Attached Documents:</p>
                      <ul className="list-disc list-inside text-xs text-slate-600 mt-1 space-y-0.5">
                        {attachments.map((att) => (
                          <li key={att.id}>{att.name} ({att.size})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{senderPerson || signatoryName}</p>
                      <p className="text-[11px] text-slate-500">Originating Officer / Registry</p>
                    </div>
                    <div className="p-2 border border-purple-300 bg-purple-50 text-[10px] font-mono text-purple-900 rounded">
                      ★ VERIFIED INTERNAL DIRECTIVE ★<br />
                      {senderPerson || signatoryName} — {todayStr}
                    </div>
                  </div>
                </div>
              ) : (
                /* OUTGOING / INCOMING LETTERHEAD PREVIEW */
                <div className="bg-white p-10 rounded-xl shadow-lg border border-slate-300 w-full max-w-3xl font-serif text-slate-800 space-y-6">
                  <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                    <div>
                      <div className="h-12 w-44">
                        <PjmakLogo variant="full" size="md" />
                      </div>
                    </div>
                  </div>

                  <div className="font-sans flex justify-between text-xs bg-slate-50 p-3 rounded border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">REF NO:</span>
                      <span className="font-mono font-bold text-slate-900">{nextSeqEstimate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">DATE:</span>
                      <span className="font-semibold text-slate-900">{todayStr}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">CLASSIFICATION:</span>
                      <span className="font-semibold text-slate-900 uppercase">{confidentiality}</span>
                    </div>
                  </div>

                  {(clientCode || costCode || revenueCode || contractNumber || proformaInvoiceNumber) && (
                    <div className="font-sans flex flex-wrap gap-x-4 gap-y-1 text-[11px] bg-emerald-50/60 p-2.5 rounded border border-emerald-200">
                      {clientCode && (
                        <div>
                          <span className="text-emerald-700 font-bold">CLIENT CODE:</span>{' '}
                          <span className="font-mono font-semibold text-slate-800">{clientCode}</span>
                        </div>
                      )}
                      {costCode && (
                        <div>
                          <span className="text-emerald-700 font-bold">COST CODE:</span>{' '}
                          <span className="font-mono font-semibold text-slate-800">{costCode}</span>
                        </div>
                      )}
                      {revenueCode && (
                        <div>
                          <span className="text-emerald-700 font-bold">REV CODE:</span>{' '}
                          <span className="font-mono font-semibold text-slate-800">{revenueCode}</span>
                        </div>
                      )}
                      {contractNumber && (
                        <div>
                          <span className="text-emerald-700 font-bold">CONTRACT:</span>{' '}
                          <span className="font-mono font-semibold text-slate-800">{contractNumber}</span>
                        </div>
                      )}
                      {proformaInvoiceNumber && (
                        <div>
                          <span className="text-emerald-700 font-bold">PI NO:</span>{' '}
                          <span className="font-mono font-semibold text-slate-800">{proformaInvoiceNumber}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="font-sans text-xs space-y-1">
                    <div className="font-bold text-slate-500">TO:</div>
                    <div className="font-bold text-slate-900 text-sm">{recipientOrg || '[Recipient Org]'}</div>
                    {recipientPerson && <div className="text-slate-700">Attn: {recipientPerson}</div>}
                  </div>

                  <div className="font-sans bg-slate-100 p-2.5 rounded border-l-4 border-slate-900 text-xs font-bold uppercase">
                    SUBJECT: {subject || '[No Subject Specified]'}
                  </div>

                  <div
                    className="text-xs leading-relaxed prose max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />

                  {attachments.length > 0 && (
                    <div className="font-sans pt-3 border-t border-slate-200">
                      <p className="text-[11px] font-bold text-slate-700 uppercase">Enclosures ({attachments.length}):</p>
                      <ul className="list-disc list-inside text-xs text-slate-600 mt-1 space-y-0.5">
                        {attachments.map((att) => (
                          <li key={att.id}>{att.name} ({att.size})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="font-sans pt-6 border-t border-slate-200">
                    <p className="text-xs text-slate-600">Yours faithfully,</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{settings.companyName}</p>
                    {signatureIncluded && (
                      <div className="my-2 max-w-xs">
                        <div className="py-1">
                          <img
                            src={activeSignatureUrl}
                            alt={`Signature of ${signatoryName}`}
                            className="h-14 w-auto object-contain pointer-events-none select-none"
                          />
                        </div>
                        <div className="text-[9px] font-mono text-slate-400">
                          ★ DIGITALLY AUTHENTICATED • {todayStr} ★
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-bold text-slate-900 mt-2">{signatoryName}</p>
                    <p className="text-[11px] text-slate-500">{signatoryPosition}</p>
                  </div>

                  {/* Official Company Footer at the bottom of the letter */}
                  <div className="font-sans text-[10px] text-slate-400 text-center pt-6 mt-6 border-t border-slate-200">
                    {settings.footerText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Check className="h-4 w-4 text-emerald-400" />
                <span>
                  {saving
                    ? 'Registering...'
                    : type === 'incoming'
                    ? 'Register Incoming Letter'
                    : type === 'outgoing'
                    ? 'Save & Create Outgoing Draft'
                    : 'Register & Distribute Internal Memo (IC)'}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* AI Assistant Floating Drawer */}
        {aiOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-600" />
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Gemini AI Assistant
                </span>
              </div>
              <button
                onClick={() => setAiOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAiMode('improve')}
                className={`flex-1 py-1 rounded text-center cursor-pointer ${
                  aiMode === 'improve' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Refine Tone
              </button>
              <button
                type="button"
                onClick={() => setAiMode('draft_reply')}
                className={`flex-1 py-1 rounded text-center cursor-pointer ${
                  aiMode === 'draft_reply' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Draft Reply
              </button>
              <button
                type="button"
                onClick={() => setAiMode('extract')}
                className={`flex-1 py-1 rounded text-center cursor-pointer ${
                  aiMode === 'extract' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                OCR Extract
              </button>
            </div>

            {aiMode === 'improve' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Corporate Style Tone
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    ['diplomatic', 'professional', 'concise', 'grammar'] as const
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAiStyle(st)}
                      className={`p-2 rounded-lg border text-left capitalize cursor-pointer font-medium ${
                        aiStyle === st
                          ? 'border-sky-500 bg-sky-50 text-sky-900 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAiImprove}
                  disabled={aiLoading}
                  className="w-full py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer"
                >
                  {aiLoading ? 'Enhancing with Gemini...' : 'Enhance Current Letter Body'}
                </button>
              </div>
            )}

            {aiMode === 'draft_reply' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Internal Instructions or Position
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Acknowledge the delay claim, request site inspection logs before agreeing to any cost claims..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAiDraftReply}
                  disabled={aiLoading}
                  className="w-full py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer"
                >
                  {aiLoading ? 'Drafting Response...' : 'Generate Official Response'}
                </button>
              </div>
            )}

            {aiMode === 'extract' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Paste Scanned / OCR Text from Incoming Document
                </label>
                <textarea
                  rows={6}
                  placeholder="Paste raw letter content here..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAiExtractIncoming}
                  disabled={aiLoading}
                  className="w-full py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer"
                >
                  {aiLoading ? 'Extracting Fields...' : 'Auto-Extract Metadata into Form'}
                </button>
              </div>
            )}

            {/* AI Result Box */}
            {aiOutputResult && (
              <div className="flex-1 flex flex-col space-y-2 overflow-hidden border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Generated AI Text:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBodyHtml(aiOutputResult);
                      setAiOutputResult('');
                      setAiOpen(false);
                    }}
                    className="text-sky-700 hover:text-sky-900 font-bold underline cursor-pointer"
                  >
                    Accept & Insert into Letter
                  </button>
                </div>
                <div
                  className="flex-1 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: aiOutputResult }}
                />
              </div>
            )}
          </div>
        )}

        {/* Inline Quick New Contact Modal */}
        {showNewContactModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Add New Correspondent Contact
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewContactModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization / Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={newContactOrg}
                    onChange={(e) => setNewContactOrg(e.target.value)}
                    placeholder="e.g. Metro Railway Authority"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    placeholder="e.g. Director Harold Finch"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="h.finch@metro.gov"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewContactModal(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs"
                  >
                    Save & Select
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Signature Photo Quality Enhancer Modal */}
        <SignatureEnhancerModal
          isOpen={isEnhancerOpen}
          onClose={() => setIsEnhancerOpen(false)}
          currentSignatureUrl={activeSignatureUrl}
          onApply={(enhancedUrl) => {
            setActiveSignatureUrl(enhancedUrl);
          }}
        />
      </div>
    </div>
  );
};
