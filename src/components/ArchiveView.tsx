import React, { useState, useMemo } from 'react';
import {
  Archive,
  Folder,
  FolderPlus,
  FolderOpen,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Tag,
  X,
  ChevronRight,
  RefreshCw,
  Check,
  Eye,
  MoreVertical,
  Inbox,
  Send,
  ArrowLeftRight,
  Calendar,
  Building2,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  FolderCheck,
  FolderArchive,
  Undo2,
} from 'lucide-react';
import {
  Correspondence,
  ArchiveFolder,
  User,
  Department,
  CompanySettings,
} from '../types';

interface ArchiveViewProps {
  correspondence: Correspondence[];
  archiveFolders: ArchiveFolder[];
  departments: Department[];
  users: User[];
  currentUser: User;
  settings: CompanySettings;
  onOpenCorrespondence: (item: Correspondence, tab?: string) => void;
  onRefreshData: () => void;
}

const FOLDER_COLORS = [
  { id: 'blue', label: 'Navy Blue', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-600' },
  { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber Gold', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-600' },
  { id: 'purple', label: 'Royal Purple', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-600' },
  { id: 'rose', label: 'Crimson Rose', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-600' },
  { id: 'indigo', label: 'Deep Indigo', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-600' },
  { id: 'sky', label: 'Sky Cyan', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-600' },
  { id: 'slate', label: 'Neutral Slate', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-600' },
];

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  correspondence,
  archiveFolders,
  departments,
  users,
  currentUser,
  settings,
  onOpenCorrespondence,
  onRefreshData,
}) => {
  // Current selected folder view: 'all' | 'uncategorized' | folderId
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'incoming' | 'outgoing' | 'internal'>('all');
  const [selectedLetterIds, setSelectedLetterIds] = useState<Set<string>>(new Set());

  // Modal States
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<ArchiveFolder | null>(null);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<ArchiveFolder | null>(null);
  const [showAddLettersModal, setShowAddLettersModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Form states for Create/Edit Folder
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderColor, setFolderColor] = useState('blue');
  const [folderIsGlobal, setFolderIsGlobal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add letters modal selection state
  const [lettersToAddSelection, setLettersToAddSelection] = useState<Set<string>>(new Set());
  const [addLettersSearch, setAddLettersSearch] = useState('');
  const [addLettersType, setAddLettersType] = useState<'all' | 'incoming' | 'outgoing' | 'internal'>('all');

  // Move destination folder
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>('');

  const selectedFolder = useMemo(() => {
    if (selectedFolderId === 'all' || selectedFolderId === 'uncategorized') return null;
    return archiveFolders.find((f) => f.id === selectedFolderId) || null;
  }, [archiveFolders, selectedFolderId]);

  // Counts by folder
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      uncategorized: 0,
    };

    archiveFolders.forEach((f) => {
      counts[f.id] = 0;
    });

    correspondence.forEach((c) => {
      // Consider item archived if c.isArchived is true OR status is 'archived' OR it has an archiveFolderId
      const isArchived = c.isArchived || c.status === 'archived' || !!c.archiveFolderId;
      if (isArchived) {
        counts.all = (counts.all || 0) + 1;
        if (c.archiveFolderId && counts[c.archiveFolderId] !== undefined) {
          counts[c.archiveFolderId] += 1;
        } else {
          counts.uncategorized = (counts.uncategorized || 0) + 1;
        }
      }
    });

    return counts;
  }, [correspondence, archiveFolders]);

  // Filtered letters according to selected folder and filters
  const filteredLetters = useMemo(() => {
    return correspondence.filter((c) => {
      const isArchived = c.isArchived || c.status === 'archived' || !!c.archiveFolderId;
      if (!isArchived) return false;

      // Folder filter
      if (selectedFolderId === 'all') {
        // include all archived
      } else if (selectedFolderId === 'uncategorized') {
        if (c.archiveFolderId) return false;
      } else {
        if (c.archiveFolderId !== selectedFolderId) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = c.correspondenceNumber?.toLowerCase().includes(q);
        const subjMatch = c.subject?.toLowerCase().includes(q);
        const senderMatch = (c.senderOrg + ' ' + c.senderPerson).toLowerCase().includes(q);
        const recipientMatch = (c.recipientOrg + ' ' + c.recipientPerson).toLowerCase().includes(q);
        const extRefMatch = c.externalRefNumber?.toLowerCase().includes(q);
        if (!numMatch && !subjMatch && !senderMatch && !recipientMatch && !extRefMatch) {
          return false;
        }
      }

      return true;
    });
  }, [correspondence, selectedFolderId, typeFilter, searchQuery]);

  // Letters available to add into the current folder (from active register or other locations)
  const availableLettersToAdd = useMemo(() => {
    return correspondence.filter((c) => {
      // Don't include letters already in the selected folder
      if (selectedFolderId !== 'all' && selectedFolderId !== 'uncategorized') {
        if (c.archiveFolderId === selectedFolderId) return false;
      }

      if (addLettersType !== 'all' && c.type !== addLettersType) return false;

      if (addLettersSearch.trim()) {
        const q = addLettersSearch.toLowerCase();
        const numMatch = c.correspondenceNumber?.toLowerCase().includes(q);
        const subjMatch = c.subject?.toLowerCase().includes(q);
        const senderMatch = (c.senderOrg + ' ' + c.senderPerson).toLowerCase().includes(q);
        const recipientMatch = (c.recipientOrg + ' ' + c.recipientPerson).toLowerCase().includes(q);
        if (!numMatch && !subjMatch && !senderMatch && !recipientMatch) return false;
      }

      return true;
    });
  }, [correspondence, selectedFolderId, addLettersType, addLettersSearch]);

  const getColorConfig = (colorId?: string) => {
    return FOLDER_COLORS.find((c) => c.id === colorId) || FOLDER_COLORS[0];
  };

  // Helper notification
  const notify = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage((curr) => (curr?.text === text ? null : curr));
    }, 4000);
  };

  // Open Create Folder Modal
  const handleOpenCreateFolder = () => {
    setFolderName('');
    setFolderDescription('');
    setFolderColor('blue');
    setFolderIsGlobal(true);
    setShowCreateFolderModal(true);
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/archive-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.trim(),
          description: folderDescription.trim(),
          color: folderColor,
          isGlobal: folderIsGlobal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to create archive folder');
        return;
      }

      notify('success', `Archive folder "${data.folder.name}" created successfully.`);
      setShowCreateFolderModal(false);
      onRefreshData();
      if (data.folder?.id) {
        setSelectedFolderId(data.folder.id);
      }
    } catch (err: any) {
      notify('error', err.message || 'Error creating folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Folder Modal
  const handleOpenEditFolder = (f: ArchiveFolder) => {
    setFolderToEdit(f);
    setFolderName(f.name);
    setFolderDescription(f.description || '');
    setFolderColor(f.color || 'blue');
    setFolderIsGlobal(f.isGlobal !== false);
    setShowEditFolderModal(true);
  };

  // Update Folder
  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToEdit || !folderName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/archive-folders/${folderToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.trim(),
          description: folderDescription.trim(),
          color: folderColor,
          isGlobal: folderIsGlobal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to update folder');
        return;
      }

      notify('success', `Folder "${data.folder.name}" updated.`);
      setShowEditFolderModal(false);
      setFolderToEdit(null);
      onRefreshData();
    } catch (err: any) {
      notify('error', err.message || 'Error updating folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Folder
  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/archive-folders/${folderToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to delete folder');
        return;
      }

      notify('success', `Folder "${folderToDelete.name}" removed. Items kept safely in General Archive.`);
      setShowDeleteFolderConfirm(false);
      if (selectedFolderId === folderToDelete.id) {
        setSelectedFolderId('all');
      }
      setFolderToDelete(null);
      onRefreshData();
    } catch (err: any) {
      notify('error', err.message || 'Error deleting folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add selected active letters into the current folder
  const handleAddLettersToCurrentFolder = async () => {
    if (lettersToAddSelection.size === 0) return;
    if (selectedFolderId === 'all' || selectedFolderId === 'uncategorized') return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/archive-folders/${selectedFolderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correspondenceIds: Array.from(lettersToAddSelection),
          action: 'add',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to assign letters');
        return;
      }

      notify('success', `Added ${data.updatedCount} correspondence record(s) to "${selectedFolder?.name}".`);
      setShowAddLettersModal(false);
      setLettersToAddSelection(new Set());
      onRefreshData();
    } catch (err: any) {
      notify('error', err.message || 'Error assigning letters');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move selected letters to another folder
  const handleMoveSelected = async () => {
    if (selectedLetterIds.size === 0) return;

    setIsSubmitting(true);
    try {
      const targetFolder = archiveFolders.find((f) => f.id === targetMoveFolderId);
      const isUncategorized = targetMoveFolderId === 'uncategorized';

      if (isUncategorized) {
        // Bulk remove folder from items
        for (const id of Array.from(selectedLetterIds)) {
          await fetch(`/api/correspondence/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              archiveFolderId: null,
              isArchived: true,
            }),
          });
        }
        notify('success', `Moved ${selectedLetterIds.size} letter(s) to Uncategorized Archive.`);
      } else if (targetFolder) {
        await fetch(`/api/archive-folders/${targetFolder.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correspondenceIds: Array.from(selectedLetterIds),
            action: 'set',
          }),
        });
        notify('success', `Moved ${selectedLetterIds.size} letter(s) to "${targetFolder.name}".`);
      }

      setShowMoveModal(false);
      setSelectedLetterIds(new Set());
      onRefreshData();
    } catch (err: any) {
      notify('error', err.message || 'Error moving letters');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore letter to active registry (unarchive)
  const handleRestoreLetter = async (item: Correspondence) => {
    try {
      const res = await fetch(`/api/correspondence/${item.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isArchived: false,
          folderId: null,
          archiveNotes: 'Restored from archive back to active register',
        }),
      });

      if (res.ok) {
        notify('success', `Reference ${item.correspondenceNumber} restored to active register.`);
        onRefreshData();
      } else {
        notify('error', 'Failed to restore letter');
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to restore');
    }
  };

  // Bulk restore
  const handleBulkRestore = async () => {
    if (selectedLetterIds.size === 0) return;
    try {
      for (const id of Array.from(selectedLetterIds)) {
        await fetch(`/api/correspondence/${id}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isArchived: false,
            folderId: null,
            archiveNotes: 'Bulk restored to active register',
          }),
        });
      }
      notify('success', `Restored ${selectedLetterIds.size} letter(s) to active register.`);
      setSelectedLetterIds(new Set());
      onRefreshData();
    } catch (err: any) {
      notify('error', 'Error restoring selected letters');
    }
  };

  // Toggle selection
  const handleToggleSelectLetter = (id: string) => {
    setSelectedLetterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedLetterIds.size === filteredLetters.length) {
      setSelectedLetterIds(new Set());
    } else {
      setSelectedLetterIds(new Set(filteredLetters.map((l) => l.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Two-Column Archive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ARCHIVE FOLDERS DIRECTORY */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderArchive className="h-4 w-4 text-[#0B1E36]" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Archive Categories
              </h2>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateFolder}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0B1E36] hover:bg-[#08182b] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Create new category folder"
            >
              <FolderPlus className="h-3.5 w-3.5 text-sky-400" />
              <span>+ New Folder</span>
            </button>
          </div>

          {/* System Default Views */}
          <div className="p-3 space-y-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedFolderId('all')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                selectedFolderId === 'all'
                  ? 'bg-sky-50 text-sky-900 border border-sky-200'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="h-4 w-4 text-sky-700 shrink-0" />
                <span>All Archived Records</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  selectedFolderId === 'all'
                    ? 'bg-sky-200/70 text-sky-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {folderCounts.all || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolderId('uncategorized')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                selectedFolderId === 'uncategorized'
                  ? 'bg-sky-50 text-sky-900 border border-sky-200'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Uncategorized Archive</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  selectedFolderId === 'uncategorized'
                    ? 'bg-sky-200/70 text-sky-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {folderCounts.uncategorized || 0}
              </span>
            </button>
          </div>

          {/* User Custom Category Folders */}
          <div className="p-3 space-y-1.5 flex-1 max-h-[520px] overflow-y-auto">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>User & Department Folders ({archiveFolders.length})</span>
            </div>

            {archiveFolders.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <Folder className="h-8 w-8 mx-auto mb-2 text-slate-300 opacity-60" />
                <p>No custom folders created yet.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateFolder}
                  className="mt-2 text-sky-700 hover:underline font-bold text-xs cursor-pointer"
                >
                  + Create First Folder
                </button>
              </div>
            ) : (
              archiveFolders.map((folder) => {
                const color = getColorConfig(folder.color);
                const isSelected = selectedFolderId === folder.id;
                const count = folderCounts[folder.id] || 0;

                return (
                  <div
                    key={folder.id}
                    className={`group relative rounded-xl border transition-all ${
                      isSelected
                        ? `${color.bg} ${color.border} shadow-2xs`
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="w-full text-left p-2.5 flex items-start gap-2.5 cursor-pointer pr-16"
                    >
                      <div className="pt-0.5">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${color.dot} shadow-2xs shrink-0`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-bold truncate ${
                            isSelected ? color.text : 'text-slate-800'
                          }`}
                        >
                          {folder.name}
                        </div>
                        {folder.description && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {folder.description}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>By {folder.createdByUserName || 'User'}</span>
                          {folder.isGlobal && (
                            <span className="bg-slate-200/60 text-slate-600 px-1 rounded text-[9px]">
                              Shared
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Right side: Count & Action buttons */}
                    <div className="absolute right-2 top-2.5 flex items-center gap-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/80 text-slate-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditFolder(folder);
                          }}
                          className="p-1 text-slate-400 hover:text-sky-700 hover:bg-white rounded transition-colors cursor-pointer"
                          title="Edit folder"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folder);
                            setShowDeleteFolderConfirm(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                          title="Delete folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info Box */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              <span>User preference archiving</span>
            </span>
            <button
              type="button"
              onClick={onRefreshData}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              title="Refresh archive data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: CORRESPONDENCE IN SELECTED FOLDER */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Folder Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-2xs shrink-0 ${
                    selectedFolder
                      ? getColorConfig(selectedFolder.color).bg
                      : 'bg-slate-100 text-[#0B1E36]'
                  }`}
                >
                  {selectedFolder ? (
                    <Folder
                      className={`h-5 w-5 ${getColorConfig(selectedFolder.color).text}`}
                    />
                  ) : selectedFolderId === 'all' ? (
                    <Archive className="h-5 w-5 text-sky-700" />
                  ) : (
                    <Folder className="h-5 w-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-slate-900">
                      {selectedFolder
                        ? selectedFolder.name
                        : selectedFolderId === 'all'
                        ? 'All Archived Correspondence'
                        : 'Uncategorized Archived Records'}
                    </h1>
                    {selectedFolder && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getColorConfig(selectedFolder.color).bg} ${getColorConfig(selectedFolder.color).text} ${getColorConfig(selectedFolder.color).border}`}
                      >
                        {selectedFolder.isGlobal ? 'Shared Category' : 'Personal Folder'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedFolder?.description ||
                      (selectedFolderId === 'all'
                        ? 'Complete catalog of all historical and closed organizational correspondence'
                        : 'Archived correspondence not yet allocated into a custom category folder')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedFolder && (
                  <button
                    type="button"
                    onClick={() => {
                      setLettersToAddSelection(new Set());
                      setAddLettersSearch('');
                      setShowAddLettersModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0B1E36] hover:bg-[#08182b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-sky-400" />
                    <span>+ Add Letters to this Folder</span>
                  </button>
                )}

                {selectedFolder && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditFolder(selectedFolder)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    title="Edit category settings"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ref #, subject, sender..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({filteredLetters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('incoming')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    typeFilter === 'incoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <Inbox className="h-3 w-3" />
                  <span>Incoming</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('outgoing')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    typeFilter === 'outgoing'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Send className="h-3 w-3" />
                  <span>Outgoing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('internal')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    typeFilter === 'internal'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>Internal</span>
                </button>
              </div>
            </div>

            {/* Selection Toolbar (visible when items selected) */}
            {selectedLetterIds.size > 0 && (
              <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-fadeIn">
                <div className="flex items-center gap-2 text-sky-900 font-bold">
                  <FolderCheck className="h-4 w-4 text-sky-700" />
                  <span>{selectedLetterIds.size} letter(s) selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMoveFolderId(archiveFolders[0]?.id || 'uncategorized');
                      setShowMoveModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Folder className="h-3.5 w-3.5" />
                    <span>Move / Assign to Category...</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkRestore}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
                    title="Restore to active register"
                  >
                    <Undo2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Restore to Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLetterIds(new Set())}
                    className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Records Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredLetters.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Archive className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-700">No correspondence in this folder</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? `No matching records found for "${searchQuery}".`
                    : selectedFolder
                    ? `Add existing correspondence from the active registry to start categorizing under "${selectedFolder.name}".`
                    : 'Your archive is currently clean with zero archived correspondence.'}
                </p>
                {selectedFolder && (
                  <button
                    type="button"
                    onClick={() => {
                      setLettersToAddSelection(new Set());
                      setAddLettersSearch('');
                      setShowAddLettersModal(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1E36] hover:bg-[#08182b] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-sky-400" />
                    <span>+ Add Letters to this Folder</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredLetters.length > 0 &&
                            selectedLetterIds.size === filteredLetters.length
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">Reference & Type</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Party / Department</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Category Folder</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLetters.map((item) => {
                      const isSelected = selectedLetterIds.has(item.id);
                      const itemFolder = archiveFolders.find((f) => f.id === item.archiveFolderId);
                      const folderColor = itemFolder ? getColorConfig(itemFolder.color) : null;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-sky-50/50' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectLetter(item.id)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">
                              {item.correspondenceNumber}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.2 rounded mt-0.5 ${
                                item.type === 'incoming'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.type === 'outgoing'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => onOpenCorrespondence(item)}
                              className="text-left font-bold text-slate-900 hover:text-sky-700 transition-colors line-clamp-1 cursor-pointer"
                              title="Click to view full correspondence"
                            >
                              {item.subject}
                            </button>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {item.actionPurpose?.replace(/_/g, ' ')}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-medium text-slate-800 truncate max-w-[140px]">
                              {item.type === 'incoming'
                                ? item.senderOrg || item.senderPerson || 'External'
                                : item.type === 'outgoing'
                                ? item.recipientOrg || item.recipientPerson || 'External'
                                : `${item.originDepartmentName || 'Origin'} → ${item.destinationDepartmentName || 'Dest'}`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.type === 'incoming' ? 'Sender' : item.type === 'outgoing' ? 'Recipient' : 'Distribution'}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-600">
                            <div className="font-mono text-xs">{item.officialDate}</div>
                            {item.archivedAt && (
                              <div className="text-[10px] text-slate-400">
                                Archived {item.archivedAt.split('T')[0]}
                              </div>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {itemFolder && folderColor ? (
                              <button
                                type="button"
                                onClick={() => setSelectedFolderId(itemFolder.id)}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${folderColor.bg} ${folderColor.text} ${folderColor.border} hover:opacity-85 transition-opacity cursor-pointer`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${folderColor.dot}`} />
                                <span>{itemFolder.name}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Uncategorized
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenCorrespondence(item)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                title="Open document workspace"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-600" />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLetterIds(new Set([item.id]));
                                  setTargetMoveFolderId(item.archiveFolderId || archiveFolders[0]?.id || 'uncategorized');
                                  setShowMoveModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                title="Change category folder"
                              >
                                <Folder className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRestoreLetter(item)}
                                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Restore back to active register"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: CREATE NEW ARCHIVE FOLDER */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="bg-[#0B1E36] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Create New Archive Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Contract Claims 2026, Client Approvals, Municipality Permits"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Category Scope</label>
                <textarea
                  rows={2}
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="What type of correspondence belongs in this category..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Folder Color Tag</label>
                <div className="grid grid-cols-4 gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFolderColor(c.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        folderColor === c.id
                          ? `${c.bg} ${c.border} ring-2 ring-sky-500 ring-offset-1`
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${c.dot} shrink-0`} />
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{c.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Shared Category Folder</div>
                  <div className="text-[11px] text-slate-500">
                    Visible to all organization members and departments
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={folderIsGlobal}
                    onChange={(e) => setFolderIsGlobal(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#0B1E36] hover:bg-[#08182b] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ARCHIVE FOLDER */}
      {showEditFolderModal && folderToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="bg-[#0B1E36] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Edit Category: {folderToEdit.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditFolderModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateFolder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Category Scope</label>
                <textarea
                  rows={2}
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Folder Color Tag</label>
                <div className="grid grid-cols-4 gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFolderColor(c.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        folderColor === c.id
                          ? `${c.bg} ${c.border} ring-2 ring-sky-500 ring-offset-1`
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${c.dot} shrink-0`} />
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{c.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Shared Category Folder</div>
                  <div className="text-[11px] text-slate-500">
                    Visible to all organization members and departments
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={folderIsGlobal}
                    onChange={(e) => setFolderIsGlobal(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditFolderModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#0B1E36] hover:bg-[#08182b] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE FOLDER CONFIRMATION */}
      {showDeleteFolderConfirm && folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="bg-rose-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-300" />
                <h3 className="font-bold text-sm text-white">Delete Archive Folder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteFolderConfirm(false)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Are you sure you want to delete the archive folder <strong>"{folderToDelete.name}"</strong>?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                <strong>No documents will be lost:</strong> Any letters currently in this folder will remain safely stored in the General Uncategorized Archive.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteFolderConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFolder}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Folder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD CORRESPONDENCE TO CURRENT FOLDER */}
      {showAddLettersModal && selectedFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="bg-[#0B1E36] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">
                  Add Correspondence to "{selectedFolder.name}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLettersModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={addLettersSearch}
                  onChange={(e) => setAddLettersSearch(e.target.value)}
                  placeholder="Filter available correspondence..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {(['all', 'incoming', 'outgoing', 'internal'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAddLettersType(t)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      addLettersType === t
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Letters List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 text-xs">
              {availableLettersToAdd.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No available correspondence to add.</p>
                </div>
              ) : (
                availableLettersToAdd.map((item) => {
                  const isChecked = lettersToAddSelection.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className="p-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setLettersToAddSelection((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                        className="mt-1 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {item.correspondenceNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              item.type === 'incoming'
                                ? 'bg-blue-100 text-blue-800'
                                : item.type === 'outgoing'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="text-[10px] text-slate-400">{item.officialDate}</span>
                        </div>
                        <div className="font-semibold text-slate-800 truncate mt-0.5">
                          {item.subject}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.senderOrg || item.senderPerson} → {item.recipientOrg || item.recipientPerson}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                {lettersToAddSelection.size} correspondence record(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLettersModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLettersToCurrentFolder}
                  disabled={isSubmitting || lettersToAddSelection.size === 0}
                  className="px-4 py-2 rounded-lg bg-[#0B1E36] hover:bg-[#08182b] text-white font-bold cursor-pointer text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Archiving...' : `Archive to "${selectedFolder.name}"`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: MOVE SELECTED LETTERS TO FOLDER */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="bg-[#0B1E36] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">
                  Move {selectedLetterIds.size} Record(s) to Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700">
                Select the target category folder to organize these correspondence documents:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <label
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    targetMoveFolderId === 'uncategorized'
                      ? 'bg-sky-50 border-sky-300 text-sky-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Folder className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-bold">General Uncategorized Archive</div>
                      <div className="text-[11px] text-slate-500">Remove from any specific folder</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="targetFolder"
                    value="uncategorized"
                    checked={targetMoveFolderId === 'uncategorized'}
                    onChange={() => setTargetMoveFolderId('uncategorized')}
                    className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </label>

                {archiveFolders.map((f) => {
                  const color = getColorConfig(f.color);
                  const isChecked = targetMoveFolderId === f.id;

                  return (
                    <label
                      key={f.id}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? `${color.bg} ${color.border} ${color.text}`
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-3 w-3 rounded-full ${color.dot} shrink-0`} />
                        <div>
                          <div className="font-bold text-slate-900">{f.name}</div>
                          {f.description && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{f.description}</div>
                          )}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="targetFolder"
                        value={f.id}
                        checked={isChecked}
                        onChange={() => setTargetMoveFolderId(f.id)}
                        className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMoveSelected}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#0B1E36] hover:bg-[#08182b] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Moving...' : 'Move to Selected Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
