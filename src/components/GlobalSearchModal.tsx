import React, { useState } from 'react';
import { Search, X, Inbox, Send, ChevronRight, FileText, Layers, Users } from 'lucide-react';
import { Correspondence, TechnicalDocument, Contact } from '../types';

interface GlobalSearchModalProps {
  correspondence: Correspondence[];
  technicalDocuments?: TechnicalDocument[];
  contacts?: Contact[];
  onClose: () => void;
  onSelectCorrespondence: (item: Correspondence) => void;
  onSelectDocument?: (item: TechnicalDocument) => void;
  onSelectContact?: (item: Contact) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  correspondence,
  technicalDocuments = [],
  contacts = [],
  onClose,
  onSelectCorrespondence,
  onSelectDocument,
  onSelectContact,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'correspondence' | 'documents' | 'contacts'>('ALL');

  const q = query.toLowerCase().trim();

  // Search in Correspondence
  const matchingCorrespondence = correspondence.filter((c) => {
    if (!q) return true;
    return (
      c.correspondenceNumber.toLowerCase().includes(q) ||
      (c.externalRefNumber && c.externalRefNumber.toLowerCase().includes(q)) ||
      c.subject.toLowerCase().includes(q) ||
      c.senderOrg.toLowerCase().includes(q) ||
      c.recipientOrg.toLowerCase().includes(q) ||
      (c.recipientPerson && c.recipientPerson.toLowerCase().includes(q)) ||
      (c.contractNumber && c.contractNumber.toLowerCase().includes(q)) ||
      (c.proformaInvoiceNumber && c.proformaInvoiceNumber.toLowerCase().includes(q)) ||
      c.bodyHtml.toLowerCase().includes(q)
    );
  });

  // Search in Technical Documents (EDMS)
  const matchingDocuments = technicalDocuments.filter((d) => {
    if (!q) return true;
    return (
      d.documentNumber.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.discipline.toLowerCase().includes(q) ||
      d.projectCode.toLowerCase().includes(q) ||
      (d.linkedCorrespondenceNumber && d.linkedCorrespondenceNumber.toLowerCase().includes(q))
    );
  });

  // Search in Contacts
  const matchingContacts = contacts.filter((c) => {
    if (!q) return true;
    return (
      c.orgName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.position && c.position.toLowerCase().includes(q)) ||
      (c.clientCode && c.clientCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-70 flex items-start justify-center pt-16 bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="h-5 w-5 text-blue-800 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search system-wide: letters, ref numbers, EDMS technical docs, contacts, contracts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category filter tabs */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-slate-400 font-medium">Domain:</span>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-blue-950 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Results ({matchingCorrespondence.length + matchingDocuments.length + matchingContacts.length})
          </button>
          <button
            onClick={() => setFilterType('correspondence')}
            className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'correspondence'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Letters ({matchingCorrespondence.length})</span>
          </button>
          <button
            onClick={() => setFilterType('documents')}
            className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'documents'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>EDMS Docs ({matchingDocuments.length})</span>
          </button>
          <button
            onClick={() => setFilterType('contacts')}
            className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'contacts'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Contacts ({matchingContacts.length})</span>
          </button>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
          {/* Section 1: Correspondence */}
          {(filterType === 'ALL' || filterType === 'correspondence') && matchingCorrespondence.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Official Correspondence ({matchingCorrespondence.length})
              </div>
              <div className="space-y-1">
                {matchingCorrespondence.slice(0, filterType === 'ALL' ? 6 : 25).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectCorrespondence(item);
                      onClose();
                    }}
                    className="p-3 hover:bg-blue-50/60 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs border border-transparent hover:border-blue-100"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`shrink-0 p-1.5 rounded-lg mt-0.5 ${
                          item.type === 'incoming'
                            ? 'bg-blue-100 text-blue-700'
                            : item.type === 'outgoing'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {item.type === 'incoming' ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-950">
                            {item.correspondenceNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.officialDate}
                          </span>
                          <span className="text-[10px] uppercase px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                            {item.type}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 truncate mt-0.5">
                          {item.subject}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.type === 'incoming' ? `From: ${item.senderOrg}` : `To: ${item.recipientOrg}`}
                          {item.contractNumber && ` • Contract: ${item.contractNumber}`}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Technical Documents EDMS */}
          {(filterType === 'ALL' || filterType === 'documents') && matchingDocuments.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Technical Documents (EDMS) ({matchingDocuments.length})
              </div>
              <div className="space-y-1">
                {matchingDocuments.slice(0, filterType === 'ALL' ? 4 : 25).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (onSelectDocument) onSelectDocument(doc);
                      onClose();
                    }}
                    className="p-3 hover:bg-amber-50/60 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs border border-transparent hover:border-amber-100"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="shrink-0 p-1.5 rounded-lg bg-amber-100 text-amber-800 mt-0.5">
                        <Layers className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-950">
                            {doc.documentNumber}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-900 font-bold">
                            Rev {doc.revision}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {doc.discipline}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 truncate mt-0.5">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Status: {doc.status.replace(/_/g, ' ')} • Project: {doc.projectCode}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Contacts */}
          {(filterType === 'ALL' || filterType === 'contacts') && matchingContacts.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Contact Directory ({matchingContacts.length})
              </div>
              <div className="space-y-1">
                {matchingContacts.slice(0, filterType === 'ALL' ? 4 : 25).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (onSelectContact) onSelectContact(c);
                      onClose();
                    }}
                    className="p-3 hover:bg-emerald-50/60 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs border border-transparent hover:border-emerald-100"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="shrink-0 p-1.5 rounded-lg bg-emerald-100 text-emerald-800 mt-0.5">
                        <Users className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-950">{c.orgName}</span>
                          {c.clientCode && (
                            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                              {c.clientCode}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-700 mt-0.5">
                          {c.contactPerson} {c.position ? `— ${c.position}` : ''}
                        </div>
                        {c.email && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {c.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchingCorrespondence.length === 0 && matchingDocuments.length === 0 && matchingContacts.length === 0 && (
            <div className="py-16 text-center text-xs text-slate-400 space-y-1">
              <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-600">No matching records found</div>
              <div className="text-slate-400 text-[11px]">
                Try searching by different reference number, contact name, or keywords.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
