import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Layers,
  Edit3,
  Building2,
  FileText,
  DollarSign,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Tag,
  Briefcase,
} from 'lucide-react';
import {
  TechnicalDocument,
  DocumentDiscipline,
  DocumentTypeCode,
  DocumentReviewStatus,
  Contact,
} from '../types';

interface EditTechnicalDocumentModalProps {
  isOpen: boolean;
  doc: TechnicalDocument;
  contacts?: Contact[];
  onClose: () => void;
  onSave: (updatedDoc: TechnicalDocument) => Promise<void>;
}

const DISCIPLINE_OPTIONS: Array<{ code: DocumentDiscipline; label: string; desc: string; isCommercial?: boolean }> = [
  { code: 'COM', label: 'COM - Commercial & Pricing', desc: 'Commercial proposals, quotation dossiers, commercial offers', isCommercial: true },
  { code: 'TEC', label: 'TEC - General Technical & Proposals', desc: 'Technical proposals, executive project dossiers' },
  { code: 'MEC', label: 'MEC - Mechanical Engineering', desc: 'Mechanical packages, rotating/static equipment' },
  { code: 'ELE', label: 'ELE - Electrical Engineering', desc: 'Single line diagrams, power systems, substations' },
  { code: 'INS', label: 'INS - Instrumentation & Control', desc: 'DCS, SCADA, instrument indexes, logic diagrams' },
  { code: 'CIV', label: 'CIV - Civil & Structural', desc: 'Foundations, steel structures, architectural plans' },
  { code: 'PIP', label: 'PIP - Piping & Plant Layout', desc: 'P&IDs, piping layouts, isometrics, tie-ins' },
  { code: 'PRC', label: 'PRC - Process Engineering', desc: 'Process flow diagrams (PFD), heat & material balances' },
  { code: 'PM', label: 'PM - Project Management', desc: 'Project plans, execution strategies, transmittals' },
  { code: 'HSE', label: 'HSE - Health, Safety & Environment', desc: 'HAZOP reports, safety philosophy, risk registers' },
  { code: 'QAC', label: 'QAC - Quality Assurance & Control', desc: 'ITP plans, welding specs, quality manuals' },
  { code: 'CNT', label: 'CNT - Subcontract & Legal', desc: 'Contract agreements, warranties, claim notices', isCommercial: true },
  { code: 'SUP', label: 'SUP - Suppliers & Procurement', desc: 'Purchase specs, vendor data, procurement packages', isCommercial: true },
];

const DOC_TYPE_OPTIONS: Array<{ code: DocumentTypeCode; label: string; isCommercial?: boolean }> = [
  { code: 'PRP', label: 'PRP - Proposal (Technical / Commercial)', isCommercial: true },
  { code: 'BOQ', label: 'BOQ - Bill of Quantities / Pricing Schedule', isCommercial: true },
  { code: 'PIN', label: 'PIN - Proforma Invoice / Payment Milestone', isCommercial: true },
  { code: 'CTR', label: 'CTR - Contract Agreement / Subcontract Terms', isCommercial: true },
  { code: 'SPC', label: 'SPC - Technical Specification' },
  { code: 'DWG', label: 'DWG - Engineering Drawing' },
  { code: 'CAL', label: 'CAL - Calculation Sheet / Design Note' },
  { code: 'MST', label: 'MST - Method Statement' },
  { code: 'RPT', label: 'RPT - Technical / Survey / Audit Report' },
  { code: 'REQ', label: 'REQ - Material Requisition / Inquiry' },
  { code: 'CRT', label: 'CRT - Inspection Release Certificate' },
];

export const EditTechnicalDocumentModal: React.FC<EditTechnicalDocumentModalProps> = ({
  isOpen,
  doc,
  contacts = [],
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<TechnicalDocument>(() => ({ ...doc }));
  const [autoUpdateDocNumber, setAutoUpdateDocNumber] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever doc changes
  useEffect(() => {
    setFormData({ ...doc });
    setError(null);
  }, [doc]);

  if (!isOpen) return null;

  // Handle changing discipline (e.g. from TEC to COM or vice-versa)
  const handleDisciplineChange = (newDiscipline: DocumentDiscipline) => {
    let newDocNumber = formData.documentNumber;

    if (autoUpdateDocNumber) {
      // Intelligently substitute the old discipline in the document number
      const oldDiscipline = formData.discipline;
      if (newDocNumber.includes(`-${oldDiscipline}-`)) {
        newDocNumber = newDocNumber.replace(`-${oldDiscipline}-`, `-${newDiscipline}-`);
      } else if (newDocNumber.includes(`${oldDiscipline}-`)) {
        newDocNumber = newDocNumber.replace(`${oldDiscipline}-`, `${newDiscipline}-`);
      }
    }

    setFormData((prev) => ({
      ...prev,
      discipline: newDiscipline,
      documentNumber: newDocNumber,
      // If switching to commercial, ensure reasonable reasonForIssue if was generic
      reasonForIssue:
        newDiscipline === 'COM' && prev.reasonForIssue === 'For Review'
          ? 'Commercial Offer'
          : prev.reasonForIssue,
    }));
  };

  // Handle changing document type (e.g. from SPC/DWG to PRP/BOQ)
  const handleDocTypeChange = (newType: DocumentTypeCode) => {
    let newDocNumber = formData.documentNumber;

    if (autoUpdateDocNumber) {
      const oldType = formData.documentType;
      if (newDocNumber.includes(`-${oldType}-`)) {
        newDocNumber = newDocNumber.replace(`-${oldType}-`, `-${newType}-`);
      } else if (newDocNumber.endsWith(`-${oldType}`)) {
        newDocNumber = newDocNumber.slice(0, -oldType.length) + newType;
      }
    }

    setFormData((prev) => ({
      ...prev,
      documentType: newType,
      documentNumber: newDocNumber,
    }));
  };

  const handleRegenerateNumber = () => {
    const prj = (formData.projectCode || 'PRJ').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
    const orig = formData.originator || 'PJMAK';
    const disc = formData.discipline || 'COM';
    const type = formData.documentType || 'PRP';
    const seq = String(formData.sequenceNumber || 1).padStart(4, '0');
    const newNumber = `${prj}-${orig}-${disc}-${type}-${seq}`;
    setFormData((prev) => ({ ...prev, documentNumber: newNumber }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Document title is required.');
      return;
    }
    if (!formData.documentNumber.trim()) {
      setError('Document number is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...formData,
        title: formData.title.trim(),
        documentNumber: formData.documentNumber.trim(),
        documentScope: formData.documentScope?.trim() || undefined,
        description: formData.description?.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to update technical document:', err);
      setError(err.message || 'Failed to update document details.');
    } finally {
      setSaving(false);
    }
  };

  const isCommercial = formData.discipline === 'COM' || formData.documentType === 'PRP' || formData.documentType === 'BOQ';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-900 text-white shadow-xs">
              <Edit3 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  Edit Document Classification & Details
                </h2>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  isCommercial
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                  {isCommercial ? 'Commercial & Pricing' : 'Technical & Engineering'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Current Ref: {doc.documentNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Switch Banner: Technical vs Commercial */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                Quick Category Switcher
              </span>
              <span className="text-[11px] text-slate-600 block">
                Easily toggle between Technical Engineering dossier and Commercial / Proposal offer before dispatch.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleDisciplineChange('TEC');
                  handleDocTypeChange('PRP');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  formData.discipline === 'TEC'
                    ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Technical Proposal (TEC)
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDisciplineChange('COM');
                  handleDocTypeChange('PRP');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  formData.discipline === 'COM'
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Commercial Document (COM)
              </button>
            </div>
          </div>

          {/* 1. Classification & Numbering */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-900" />
              <span>1. Multi-Discipline Classification</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Discipline */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discipline Category *
                </label>
                <select
                  value={formData.discipline}
                  onChange={(e) => handleDisciplineChange(e.target.value as DocumentDiscipline)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {DISCIPLINE_OPTIONS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {DISCIPLINE_OPTIONS.find((d) => d.code === formData.discipline)?.desc}
                </span>
              </div>

              {/* Document Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={formData.documentType}
                  onChange={(e) => handleDocTypeChange(e.target.value as DocumentTypeCode)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {DOC_TYPE_OPTIONS.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Determines front page layout (e.g. PRP shows commercial scope & deliverables).
                </span>
              </div>
            </div>

            {/* Document Number & Auto-Sync */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">
                  Document Reference Number *
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateNumber}
                  className="text-[11px] font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerate standard format</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="e.g. PRJ26-PJMAK-COM-PRP-001"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={autoUpdateDocNumber}
                  onChange={(e) => setAutoUpdateDocNumber(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-500"
                />
                <span>
                  Automatically update discipline segment in document number when discipline or type changes
                </span>
              </label>
            </div>
          </div>

          {/* 2. Document Title & Project Scope */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-900" />
              <span>2. Document Title & Description</span>
            </span>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Commercial & Technical Offer for Management Information Layer"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Scope of Work (Dossier Header)
                </label>
                <input
                  type="text"
                  value={formData.documentScope || ''}
                  onChange={(e) => setFormData({ ...formData, documentScope: e.target.value })}
                  placeholder="e.g. Turnkey Engineering, Software Implementation & Setup"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Issue
                </label>
                <select
                  value={formData.reasonForIssue}
                  onChange={(e) => setFormData({ ...formData, reasonForIssue: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
                >
                  <option value="Commercial Offer">Commercial Offer / Proposal</option>
                  <option value="Tender Submission">Tender Submission</option>
                  <option value="For Review">For Review</option>
                  <option value="For Approval">For Approval</option>
                  <option value="For Information">For Information Only</option>
                  <option value="For Construction">For Construction (IFC)</option>
                  <option value="As-Built">As-Built Record</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Description / Engineering Summary
              </label>
              <textarea
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Executive description of the proposal or technical package..."
                className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs resize-none"
              />
            </div>
          </div>

          {/* 3. Client & Project Details */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-900" />
              <span>3. Client Company & Project Details</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Organization *
                </label>
                <select
                  value={formData.clientCompany}
                  onChange={(e) => {
                    const org = e.target.value;
                    const matchedContact = contacts.find((c) => c.orgName === org || c.name === org);
                    setFormData((prev) => ({
                      ...prev,
                      clientCompany: org,
                      clientContactPerson: matchedContact?.contactPerson || prev.clientContactPerson,
                      clientEmail: matchedContact?.email || prev.clientEmail,
                      clientRoleLabel: prev.clientRoleLabel || 'Client / Operator',
                    }));
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                >
                  <option value="">— Select Client —</option>
                  {contacts
                    .filter((c) => c.role === 'client' || c.role === 'subcontractor' || c.orgName)
                    .map((c) => (
                      <option key={c.id} value={c.orgName || c.name}>
                        {c.orgName || c.name} {c.contactCode ? `(${c.contactCode})` : ''}
                      </option>
                    ))}
                  {formData.clientCompany && !contacts.some((c) => (c.orgName || c.name) === formData.clientCompany) && (
                    <option value={formData.clientCompany}>{formData.clientCompany}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Contact Person
                </label>
                <input
                  type="text"
                  value={formData.clientContactPerson || ''}
                  onChange={(e) => setFormData({ ...formData, clientContactPerson: e.target.value })}
                  placeholder="e.g. Lilian Ravix"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.projectName || ''}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g. SBM Offshore Management Info Integration"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Project Code / ID
                </label>
                <input
                  type="text"
                  value={formData.projectCode || ''}
                  onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                  placeholder="e.g. PRJ-2026-01"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* 4. Commercial & Financial Data */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-700" />
              <span>4. Commercial Pricing & Contracting (Optional)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Commercial Value
                </label>
                <input
                  type="number"
                  value={formData.commercialValue ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commercialValue: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 85000"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency || 'EUR'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (AED)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contract / PO Number
                </label>
                <input
                  type="text"
                  value={formData.contractNumber || ''}
                  onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  placeholder="e.g. CNT-2026-SBM-01"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cost Code (Outgoing Expense)
                </label>
                <input
                  type="text"
                  value={formData.costCode || ''}
                  onChange={(e) => setFormData({ ...formData, costCode: e.target.value })}
                  placeholder="e.g. CC-ENG-2026"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Revenue Code (Incoming Income)
                </label>
                <input
                  type="text"
                  value={formData.revenueCode || ''}
                  onChange={(e) => setFormData({ ...formData, revenueCode: e.target.value })}
                  placeholder="e.g. REV-SBO-01"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Changes will update the technical register, 3-page engineering dossier, and PDF letterhead.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
