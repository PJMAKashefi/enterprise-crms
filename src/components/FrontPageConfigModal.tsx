import React, { useState } from 'react';
import {
  X,
  Check,
  Plus,
  Trash2,
  Layers,
  FileText,
  Users,
  Shield,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Building2,
  Hash,
} from 'lucide-react';
import { FrontPageConfig, DocumentSignOffPerson, TechnicalDocument, User } from '../types';

interface FrontPageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FrontPageConfig;
  signOffTeam: DocumentSignOffPerson[];
  document: TechnicalDocument;
  currentUser: User;
  onSave: (
    newConfig: FrontPageConfig,
    newSignOffTeam: DocumentSignOffPerson[],
    metadataUpdates: {
      contractNumber: string;
      poNumber: string;
      clientDocumentNumber: string;
      clientRevisionCode: string;
      documentScope: string;
      clientCompany: string;
    }
  ) => void;
}

export const FrontPageConfigModal: React.FC<FrontPageConfigModalProps> = ({
  isOpen,
  onClose,
  config: initialConfig,
  signOffTeam: initialSignOffTeam,
  document: doc,
  currentUser,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'visibility' | 'signoff' | 'metadata'>('visibility');

  const [config, setConfig] = useState<FrontPageConfig>({
    showPage1ControlSheet: initialConfig?.showPage1ControlSheet ?? true,
    showPage2CoverSheet: initialConfig?.showPage2CoverSheet ?? true,
    showPage3RevisionHoldPoints: initialConfig?.showPage3RevisionHoldPoints ?? true,
    showContractNumber: initialConfig?.showContractNumber ?? (doc.documentType !== 'PRP' && Boolean(doc.contractNumber)),
    showPoNumber: initialConfig?.showPoNumber ?? Boolean(doc.poNumber),
    showClientDocNumber: initialConfig?.showClientDocNumber ?? Boolean(doc.clientDocumentNumber),
    showScopeOfWorks: initialConfig?.showScopeOfWorks ?? true,
    showGraphicBanner: initialConfig?.showGraphicBanner ?? true,
    showHoldPoints: initialConfig?.showHoldPoints ?? true,
    showRevisionHistory: initialConfig?.showRevisionHistory ?? true,
    showMilestone: initialConfig?.showMilestone ?? true,
    customHeaderTitle: initialConfig?.customHeaderTitle || '',
    customSubtitle: initialConfig?.customSubtitle || '',
    customFooterText: initialConfig?.customFooterText || '',
  });

  const [metadata, setMetadata] = useState({
    contractNumber: doc.contractNumber || '',
    poNumber: doc.poNumber || '',
    clientDocumentNumber: doc.clientDocumentNumber || '',
    clientRevisionCode: doc.clientRevisionCode || '0',
    documentScope: doc.documentScope || doc.description || '',
    clientCompany: doc.clientCompany || '',
  });

  const [team, setTeam] = useState<DocumentSignOffPerson[]>(() => {
    if (initialSignOffTeam && initialSignOffTeam.length > 0) {
      return initialSignOffTeam;
    }
    return [
      {
        id: 'so-init',
        role: 'initiated',
        name: currentUser.name || 'Author',
        position: currentUser.title || 'Lead Engineer',
        company: 'PJMAK',
        date: doc.revisionDate || new Date().toISOString().slice(0, 10),
        digitalId: '#PJMAK-01',
        status: 'signed',
      },
      {
        id: 'so-chk',
        role: 'checked',
        name: 'Technical Reviewer',
        position: 'Discipline Lead',
        company: 'PJMAK',
        date: doc.revisionDate || new Date().toISOString().slice(0, 10),
        digitalId: '#PJMAK-02',
        status: 'verified',
      },
      {
        id: 'so-ver',
        role: 'verified',
        name: 'QA/QC Manager',
        position: 'Quality Assurance',
        company: 'PJMAK',
        date: doc.revisionDate || new Date().toISOString().slice(0, 10),
        digitalId: '#PJMAK-03',
        status: 'verified',
      },
      {
        id: 'so-app',
        role: 'approved',
        name: 'Project Director',
        position: 'Managing Director',
        company: 'PJMAK',
        date: doc.revisionDate || new Date().toISOString().slice(0, 10),
        digitalId: '#PJMAK-04',
        status: 'approved',
      },
    ];
  });

  if (!isOpen) return null;

  const handleAddSigner = () => {
    const newSigner: DocumentSignOffPerson = {
      id: `so-${Date.now()}`,
      role: 'checked',
      name: 'Reviewer Name',
      position: 'Senior Engineer',
      company: 'PJMAK',
      date: new Date().toISOString().slice(0, 10),
      digitalId: `#PJMAK-0${team.length + 1}`,
      status: 'pending',
    };
    setTeam([...team, newSigner]);
  };

  const handleRemoveSigner = (id: string) => {
    setTeam(team.filter((s) => s.id !== id));
  };

  const handleUpdateSigner = (id: string, updates: Partial<DocumentSignOffPerson>) => {
    setTeam(team.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleApply = () => {
    onSave(config, team, metadata);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl border border-slate-300 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Configure Front 3 Pages & Title Block
              </h3>
              <p className="text-xs text-slate-500">
                Manually select which items appear on Pages 1, 2, and 3 of the engineering dossier.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-2 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('visibility')}
            className={`py-3 px-3 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'visibility'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Page & Field Visibility</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signoff')}
            className={`py-3 px-3 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'signoff'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Sign-Off Matrix (Page 2)</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-mono">
              {team.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            className={`py-3 px-3 border-b-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'metadata'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Metadata & References</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: VISIBILITY TOGGLES */}
          {activeTab === 'visibility' && (
            <div className="space-y-6">
              {/* Pages Inclusion */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Front Pages to Include in Document & PDF
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showPage1ControlSheet}
                      onChange={(e) => setConfig({ ...config, showPage1ControlSheet: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Page 1: Control Sheet</strong>
                      <span className="text-slate-500 text-[11px]">Revision record & document classification</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showPage2CoverSheet}
                      onChange={(e) => setConfig({ ...config, showPage2CoverSheet: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Page 2: Cover Title Sheet</strong>
                      <span className="text-slate-500 text-[11px]">Title, scope & sign-off approval matrix</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showPage3RevisionHoldPoints}
                      onChange={(e) => setConfig({ ...config, showPage3RevisionHoldPoints: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Page 3: History & HOLD</strong>
                      <span className="text-slate-500 text-[11px]">Detailed revision log & HOLD points</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Specific Field Toggles */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Select Which Fields Appear on Front Pages
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Contract Number Toggle */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showContractNumber}
                      onChange={(e) => setConfig({ ...config, showContractNumber: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Contract Number</strong>
                      <span className="text-slate-500 text-[11px]">
                        Uncheck for proposals (will show blank or be hidden)
                      </span>
                    </div>
                  </label>

                  {/* PO Number Toggle */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showPoNumber}
                      onChange={(e) => setConfig({ ...config, showPoNumber: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Purchase Order (PO) Number</strong>
                      <span className="text-slate-500 text-[11px]">Shows external client purchase order reference</span>
                    </div>
                  </label>

                  {/* Client Document Number Toggle */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showClientDocNumber}
                      onChange={(e) => setConfig({ ...config, showClientDocNumber: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Client Document Number</strong>
                      <span className="text-slate-500 text-[11px]">External client cross-reference ID</span>
                    </div>
                  </label>

                  {/* Scope of Works Toggle */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showScopeOfWorks}
                      onChange={(e) => setConfig({ ...config, showScopeOfWorks: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Scope of Works Subtitle</strong>
                      <span className="text-slate-500 text-[11px]">Displays scope summary below document title</span>
                    </div>
                  </label>

                  {/* Graphic Banner on Page 2 */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showGraphicBanner}
                      onChange={(e) => setConfig({ ...config, showGraphicBanner: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Visual Cover Banner (Page 2)</strong>
                      <span className="text-slate-500 text-[11px]">Executive blue engineering graphic block</span>
                    </div>
                  </label>

                  {/* Revision History on Page 3 */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showRevisionHistory}
                      onChange={(e) => setConfig({ ...config, showRevisionHistory: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Revision History Table</strong>
                      <span className="text-slate-500 text-[11px]">Section-by-section changes table</span>
                    </div>
                  </label>

                  {/* HOLD Point Register on Page 3 */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showHoldPoints}
                      onChange={(e) => setConfig({ ...config, showHoldPoints: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">HOLD Point Register</strong>
                      <span className="text-slate-500 text-[11px]">Engineering stop/hold verification points</span>
                    </div>
                  </label>

                  {/* Project Milestone */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={config.showMilestone}
                      onChange={(e) => setConfig({ ...config, showMilestone: e.target.checked })}
                      className="mt-0.5 rounded text-blue-900"
                    />
                    <div>
                      <strong className="text-slate-800 block">Milestone Stage Indicator</strong>
                      <span className="text-slate-500 text-[11px]">e.g. Tender Bidding, Detailed Design, As-Built</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SIGN-OFF MATRIX MANAGER */}
          {activeTab === 'signoff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Page 2 Sign-Off Approval Matrix
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configure personnel for <strong>Initiated</strong>, <strong>Checked</strong>, <strong>Verified</strong>, and <strong>Approved</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSigner}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Signer</span>
                </button>
              </div>

              <div className="space-y-3">
                {team.map((signer, index) => (
                  <div
                    key={signer.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs"
                  >
                    {/* Role Dropdown */}
                    <div className="w-full sm:w-36 shrink-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Workflow Role
                      </label>
                      <select
                        value={signer.role}
                        onChange={(e) =>
                          handleUpdateSigner(signer.id, {
                            role: e.target.value as DocumentSignOffPerson['role'],
                          })
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-semibold text-xs capitalize text-blue-950"
                      >
                        <option value="initiated">Initiated (Author)</option>
                        <option value="checked">Checked By</option>
                        <option value="verified">Verified By</option>
                        <option value="approved">Approved By</option>
                      </select>
                    </div>

                    {/* Name */}
                    <div className="w-full sm:flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={signer.name}
                        onChange={(e) => handleUpdateSigner(signer.id, { name: e.target.value })}
                        placeholder="Person's Name"
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-medium text-xs text-slate-800"
                      />
                    </div>

                    {/* Position / Title */}
                    <div className="w-full sm:w-44">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Position / Discipline
                      </label>
                      <input
                        type="text"
                        value={signer.position || ''}
                        onChange={(e) => handleUpdateSigner(signer.id, { position: e.target.value })}
                        placeholder="e.g. Lead Engineer"
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700"
                      />
                    </div>

                    {/* Date */}
                    <div className="w-full sm:w-32">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Sign Date
                      </label>
                      <input
                        type="date"
                        value={signer.date || ''}
                        onChange={(e) => handleUpdateSigner(signer.id, { date: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>

                    {/* Status */}
                    <div className="w-full sm:w-28">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Stamp Status
                      </label>
                      <select
                        value={signer.status}
                        onChange={(e) =>
                          handleUpdateSigner(signer.id, {
                            status: e.target.value as DocumentSignOffPerson['status'],
                          })
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium"
                      >
                        <option value="signed">Signed</option>
                        <option value="verified">Verified</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>

                    {/* Delete button */}
                    <div className="sm:pt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveSigner(signer.id)}
                        disabled={team.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded hover:bg-slate-200/50 transition-colors cursor-pointer"
                        title="Remove signer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: METADATA & REFERENCES */}
          {activeTab === 'metadata' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-500">
                Edit the primary references displayed on Pages 1 and 2. Leave any field blank if not applicable to this document.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contract Number
                  </label>
                  <input
                    type="text"
                    value={metadata.contractNumber}
                    onChange={(e) => setMetadata({ ...metadata, contractNumber: e.target.value })}
                    placeholder="Leave blank for proposals"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    (In front of contract will be blank if left empty)
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client / Operator Company
                  </label>
                  <input
                    type="text"
                    value={metadata.clientCompany}
                    onChange={(e) => setMetadata({ ...metadata, clientCompany: e.target.value })}
                    placeholder="Client Company Name (Optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client Document Reference Number
                  </label>
                  <input
                    type="text"
                    value={metadata.clientDocumentNumber}
                    onChange={(e) => setMetadata({ ...metadata, clientDocumentNumber: e.target.value })}
                    placeholder="e.g. CLI-DOC-001 (Optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client Revision Code
                  </label>
                  <input
                    type="text"
                    value={metadata.clientRevisionCode}
                    onChange={(e) => setMetadata({ ...metadata, clientRevisionCode: e.target.value })}
                    placeholder="e.g. 0, A, or C"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Purchase Order (PO) Number
                  </label>
                  <input
                    type="text"
                    value={metadata.poNumber}
                    onChange={(e) => setMetadata({ ...metadata, poNumber: e.target.value })}
                    placeholder="e.g. PO-2026-001 (Optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Scope of Work / Title Block Description
                  </label>
                  <input
                    type="text"
                    value={metadata.documentScope}
                    onChange={(e) => setMetadata({ ...metadata, documentScope: e.target.value })}
                    placeholder="Detailed scope or subtitle for the cover sheet"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Changes apply immediately to Pages 1, 2, 3 and PDF generation.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Apply Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
