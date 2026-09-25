import React, { useState } from 'react';
import {
  GitBranch,
  Inbox,
  Send,
  ArrowDown,
  ArrowRight,
  Eye,
  Search,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { Correspondence } from '../types';

interface CommunicationChainViewProps {
  correspondence: Correspondence[];
  onOpenCorrespondence: (item: Correspondence) => void;
}

export const CommunicationChainView: React.FC<CommunicationChainViewProps> = ({
  correspondence,
  onOpenCorrespondence,
}) => {
  // Find letters that have links
  const lettersWithLinks = correspondence.filter(
    (c) => c.relatedLinks && c.relatedLinks.length > 0
  );

  const [selectedId, setSelectedId] = useState<string>(
    lettersWithLinks[0]?.id || correspondence[0]?.id || ''
  );

  const currentItem = correspondence.find((c) => c.id === selectedId);

  // Trace the communication tree for current item
  const buildThread = (root: Correspondence) => {
    const thread: Correspondence[] = [root];
    const visited = new Set<string>([root.id]);

    // Add direct links
    for (const link of root.relatedLinks) {
      const linked = correspondence.find(
        (c) => c.id === link.targetCorrespondenceId
      );
      if (linked && !visited.has(linked.id)) {
        visited.add(linked.id);
        thread.push(linked);
      }
    }

    // Also find any letters that cite root as a link
    for (const other of correspondence) {
      if (!visited.has(other.id)) {
        const hasRel = other.relatedLinks.some(
          (l) => l.targetCorrespondenceId === root.id
        );
        if (hasRel) {
          visited.add(other.id);
          thread.push(other);
        }
      }
    }

    // Sort chronologically
    return thread.sort(
      (a, b) =>
        new Date(a.officialDate).getTime() - new Date(b.officialDate).getTime()
    );
  };

  const currentThread = currentItem ? buildThread(currentItem) : [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
            <GitBranch className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Correspondence Communication Chains & Threads
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Explore complete contractual exchange lifecycles from original incoming notices to official responses and subsequent transmittals
        </p>
      </div>

      {/* Select active thread */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Root or Linked Correspondence:
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
          >
            {correspondence.map((c) => (
              <option key={c.id} value={c.id}>
                {c.correspondenceNumber} — {c.subject.slice(0, 45)}... (
                {c.relatedLinks.length > 0 ? `${c.relatedLinks.length} links` : 'Unlinked'})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Thread Length: <strong>{currentThread.length}</strong> linked communication(s)
        </div>
      </div>

      {/* Visual Thread Timeline */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-2xs space-y-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Sequential Communication Flow
        </h2>

        <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {currentThread.map((item, index) => {
            const isSelected = item.id === selectedId;
            const isIncoming = item.type === 'incoming';

            return (
              <div key={item.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 top-1 h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    isIncoming
                      ? 'bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-600'
                  }`}
                >
                  {index + 1}
                </div>

                {/* Card */}
                <div
                  className={`p-5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isIncoming
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isIncoming ? <Inbox className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                        <span>{isIncoming ? 'Incoming Letter' : 'Outgoing Letter'}</span>
                      </span>

                      <span className="font-mono font-bold text-xs text-slate-900">
                        {item.correspondenceNumber}
                      </span>

                      {item.externalRefNumber && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Ext Ref: {item.externalRefNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Date: <strong>{item.officialDate}</strong></span>
                      <button
                        onClick={() => onOpenCorrespondence(item)}
                        className="flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Dossier</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {item.subject}
                  </h3>

                  <div className="text-xs text-slate-600 flex items-center gap-4 text-[11px] mb-3">
                    <span>
                      {isIncoming ? `From: ${item.senderOrg}` : `To: ${item.recipientOrg}`}
                    </span>
                    <span>•</span>
                    <span className="capitalize">Purpose: {(item.actionPurpose || 'for_information').replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span className="capitalize font-semibold text-slate-700">Status: {(item.status || 'draft').replace(/_/g, ' ')}</span>
                  </div>

                  {/* Body Snippet */}
                  <div
                    className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
                  />

                  {/* Relationship badges */}
                  {item.relatedLinks.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="font-bold text-slate-400 uppercase">Cross-References:</span>
                      {item.relatedLinks.map((rel) => (
                        <span
                          key={rel.id}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium font-mono"
                        >
                          {rel.relationshipType}: {rel.targetCorrespondenceNumber}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
