import React, { useState } from 'react';
import { Search, X, Inbox, Send, ChevronRight, FileText } from 'lucide-react';
import { Correspondence } from '../types';

interface GlobalSearchModalProps {
  correspondence: Correspondence[];
  onClose: () => void;
  onSelectCorrespondence: (item: Correspondence) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  correspondence,
  onClose,
  onSelectCorrespondence,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'incoming' | 'outgoing'>('ALL');

  const filtered = correspondence.filter((c) => {
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    if (!query.trim()) return true;

    const q = query.toLowerCase().trim();
    return (
      c.correspondenceNumber.toLowerCase().includes(q) ||
      (c.externalRefNumber && c.externalRefNumber.toLowerCase().includes(q)) ||
      c.subject.toLowerCase().includes(q) ||
      c.senderOrg.toLowerCase().includes(q) ||
      c.recipientOrg.toLowerCase().includes(q) ||
      c.bodyHtml.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-70 flex items-start justify-center pt-16 bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search letters by reference number, subject, organization, content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Filter:</span>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Records ({correspondence.length})
          </button>
          <button
            onClick={() => setFilterType('incoming')}
            className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
              filterType === 'incoming'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            Incoming
          </button>
          <button
            onClick={() => setFilterType('outgoing')}
            className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
              filterType === 'outgoing'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            Outgoing
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching correspondence found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectCorrespondence(item);
                  onClose();
                }}
                className="p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`shrink-0 p-1.5 rounded ${
                      item.type === 'incoming'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {item.type === 'incoming' ? (
                      <Inbox className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {item.correspondenceNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.officialDate}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 truncate mt-0.5">
                      {item.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.type === 'incoming'
                        ? `From: ${item.senderOrg}`
                        : `To: ${item.recipientOrg}`}
                    </div>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
