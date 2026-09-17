import React, { useState } from 'react';
import {
  X,
  Share2,
  Calendar,
  Clock,
  UserCheck,
  AlertCircle,
  Building2,
  Check,
  Paperclip,
  Users,
  Plus,
  Trash2,
  Send,
  FileText,
} from 'lucide-react';
import { Correspondence, User, Department, ActionPurpose, Attachment } from '../types';

interface ForwardTaskModalProps {
  correspondence: Correspondence;
  users: User[];
  departments: Department[];
  onClose: () => void;
  onForward: (data: {
    responsibleUserId: string;
    responsibleDeptId: string;
    ccUserIds: string[];
    instructions: string;
    actionType: ActionPurpose;
    priority: 'normal' | 'high' | 'urgent';
    dueDate: string;
    attachments?: Attachment[];
  }) => Promise<void>;
}

export const ForwardTaskModal: React.FC<ForwardTaskModalProps> = ({
  correspondence,
  users,
  departments,
  onClose,
  onForward,
}) => {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [ccUserIds, setCcUserIds] = useState<string[]>([]);
  const [actionType, setActionType] = useState<ActionPurpose>('for_response');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [instructions, setInstructions] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentNote, setNewAttachmentNote] = useState('');
  const [showAddAttachment, setShowAddAttachment] = useState(false);

  // Default due date: 7 days from now
  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [submitting, setSubmitting] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const setPresetDate = (days: number) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    setDueDate(d);
  };

  const toggleCcUser = (userId: string) => {
    setCcUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim()) return;
    const item: Attachment = {
      id: `att-${Date.now()}`,
      fileName: newAttachmentName.trim(),
      fileType: 'application/pdf',
      fileSize: 'Internal Note',
      url: '#',
      uploadedAt: new Date().toISOString(),
      isInternal: true,
      description: newAttachmentNote.trim() || undefined,
    };
    setAttachments((prev) => [...prev, item]);
    setNewAttachmentName('');
    setNewAttachmentNote('');
    setShowAddAttachment(false);
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !dueDate) {
      alert('Please select a responsible responder and set a due date.');
      return;
    }

    setSubmitting(true);
    try {
      await onForward({
        responsibleUserId: selectedUserId,
        responsibleDeptId: selectedUser?.departmentId || '',
        ccUserIds,
        actionType,
        instructions: instructions || `Please take required action: ${actionType.replace(/_/g, ' ')}`,
        priority,
        dueDate,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to distribute correspondence internally');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col my-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Internal Distribution
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {correspondence.correspondenceNumber} — {correspondence.subject}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Responsible Responder (Primary Assignee) */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Responsible Responder (Action Officer / Primary) *
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white text-xs font-medium"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.title} ({u.departmentName})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              The designated officer responsible for drafting or taking official action.
            </p>
          </div>

          {/* CC Participants */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span>Internal CCs (Informational Participants)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {ccUserIds.length} selected
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/60 divide-y divide-slate-100">
              {users
                .filter((u) => u.id !== selectedUserId)
                .map((u) => {
                  const isCc = ccUserIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center justify-between py-1.5 px-2 hover:bg-white rounded cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isCc}
                          onChange={() => toggleCcUser(u.id)}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-xs font-medium text-slate-800">
                          {u.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {u.title} • {u.departmentName}
                      </span>
                    </label>
                  );
                })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              CC'd participants receive informational access and visibility on progress.
            </p>
          </div>

          {/* Action Purpose & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Required Internal Action *
              </label>
              <select
                required
                value={actionType}
                onChange={(e) => setActionType(e.target.value as ActionPurpose)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="for_response">For Response / Drafting</option>
                <option value="for_action">For Action</option>
                <option value="for_review">For Review / Vetting</option>
                <option value="for_comment">For Technical Comment</option>
                <option value="for_information">For Information / CC</option>
                <option value="for_approval">For Management Approval</option>
                <option value="for_followup">For Follow-up</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Priority Level *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800">
                Action Due Date *
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-400">Quick:</span>
                <button
                  type="button"
                  onClick={() => setPresetDate(3)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-semibold cursor-pointer"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate(7)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-semibold cursor-pointer"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDate(14)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-semibold cursor-pointer"
                >
                  +14 Days
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>

          {/* Message / Instructions */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Message / Instructions for Recipient
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please examine technical parameters, consult with Finance regarding budget line, and prepare response draft..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>

          {/* Optional Attachments / Internal Documentation */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                <span>Internal Attachments & Notes ({attachments.length})</span>
              </label>
              {!showAddAttachment && (
                <button
                  type="button"
                  onClick={() => setShowAddAttachment(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Attach File/Note</span>
                </button>
              )}
            </div>

            {showAddAttachment && (
              <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-lg space-y-2 mb-2">
                <input
                  type="text"
                  placeholder="Document Name (e.g. Internal Briefing Note.pdf)"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-sky-200 rounded"
                />
                <input
                  type="text"
                  placeholder="Optional Note / Purpose"
                  value={newAttachmentNote}
                  onChange={(e) => setNewAttachmentNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-sky-200 rounded"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddAttachment(false)}
                    className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    disabled={!newAttachmentName.trim()}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-sky-700 text-white rounded hover:bg-sky-800 cursor-pointer disabled:opacity-50"
                  >
                    Add Attachment
                  </button>
                </div>
              </div>
            )}

            {attachments.length > 0 ? (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-medium text-slate-900 block truncate">
                          {att.fileName}
                        </span>
                        {att.description && (
                          <span className="text-[10px] text-slate-500 block truncate">
                            {att.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">
                Optional: Include briefing notes, drafts, or internal supporting material.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-sky-400" />
              <span>{submitting ? 'Distributing...' : 'Send Internally'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
