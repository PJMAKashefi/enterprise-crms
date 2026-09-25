import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Inbox,
  Send,
  Building,
  Search,
  Filter,
  Download,
  PlusCircle,
  Eye,
  ArrowUpDown,
  Calendar,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Share2,
  Reply,
  FileText,
  Paperclip,
  GitBranch,
  Ban,
  UserCheck,
  Copy,
  MessageSquare,
  Archive,
  History,
  UserPlus,
  Mail,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { Correspondence, Department, User, CompanySettings } from '../types';
import { generateCorrespondencePdf } from '../utils/pdfGenerator';

interface RegisterViewProps {
  type?: 'all' | 'incoming' | 'outgoing' | 'internal';
  correspondence: Correspondence[];
  departments: Department[];
  users?: User[];
  currentUser?: User | null;
  settings?: CompanySettings | null;
  onOpenCorrespondence: (item: Correspondence, initialTab?: any) => void;
  onNew: (typeOverride?: 'incoming' | 'outgoing' | 'internal') => void;
  onDistributeInternal?: (item: Correspondence) => void;
  onReply?: (item: Correspondence) => void;
  onSendEmail?: (item: Correspondence) => void;
  onVoidNumber?: (reason: string) => Promise<void>;
  onDeleteCorrespondence?: (item: Correspondence) => Promise<void> | void;
  onRefreshData?: () => void;
  onBackToDashboard?: () => void;
  isFullPage?: boolean;
}

export const CorrespondenceRegisterView: React.FC<RegisterViewProps> = ({
  type = 'all',
  correspondence,
  departments,
  users = [],
  currentUser,
  settings,
  onOpenCorrespondence,
  onNew,
  onDistributeInternal,
  onReply,
  onSendEmail,
  onVoidNumber,
  onDeleteCorrespondence,
  onRefreshData,
  onBackToDashboard,
  isFullPage = false,
}) => {
  const [activeRegisterType, setActiveRegisterType] = useState<'all' | 'incoming' | 'outgoing' | 'internal'>(
    type || 'all'
  );

  useEffect(() => {
    if (type) {
      setActiveRegisterType(type);
    }
  }, [type]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [sortField, setSortField] = useState<'officialDate' | 'correspondenceNumber'>('officialDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: Correspondence;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Delete modal state
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Correspondence | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, item: Correspondence) => {
    e.stopPropagation();
    setContextMenu(null);
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      if (onDeleteCorrespondence) {
        await onDeleteCorrespondence(deleteConfirmItem);
      } else {
        const res = await fetch(`/api/correspondence/${deleteConfirmItem.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete correspondence');
        }
        if (onRefreshData) onRefreshData();
      }
      setDeleteConfirmItem(null);
    } catch (err: any) {
      alert(err.message || 'Error deleting correspondence');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handlers for right-click actions
  const handleMakeCopy = async (item: Correspondence) => {
    try {
      const res = await fetch(`/api/correspondence/${item.id}/copy`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to make copy');
      }
      const copied = await res.json();
      if (onRefreshData) onRefreshData();
      alert(`Created copy as draft: ${copied.correspondenceNumber}`);
    } catch (err: any) {
      alert(err.message || 'Failed to copy correspondence');
    }
  };

  const handleQuickAssign = async (item: Correspondence) => {
    if (users.length === 0) {
      alert('No user accounts available for assignment.');
      return;
    }
    const userNames = users.map((u, i) => `${i + 1}. ${u.name} (${u.departmentName})`).join('\n');
    const pick = prompt(`Select responsible responder to assign:\n\n${userNames}\n\nEnter number (1-${users.length}):`);
    if (!pick) return;
    const index = parseInt(pick, 10) - 1;
    if (isNaN(index) || index < 0 || index >= users.length) {
      alert('Invalid selection');
      return;
    }
    const targetUser = users[index];
    const instructions = prompt(`Optional instructions for ${targetUser.name}:`) || undefined;

    try {
      const res = await fetch(`/api/correspondence/${item.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedUserId: targetUser.id,
          instructions,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign');
      }
      if (onRefreshData) onRefreshData();
      alert(`Assigned to ${targetUser.name}`);
    } catch (err: any) {
      alert(err.message || 'Failed to assign user');
    }
  };

  const handleAddComment = async (item: Correspondence) => {
    const comment = prompt(`Add internal comment/note to ${item.correspondenceNumber}:`);
    if (!comment || !comment.trim()) return;

    try {
      const res = await fetch(`/api/correspondence/${item.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Internal Note by ${currentUser?.name || 'User'}`,
          description: comment.trim(),
          type: 'note_added',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add comment');
      }
      if (onRefreshData) onRefreshData();
      alert('Internal note added to history timeline.');
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  const handleAddAttachment = async (item: Correspondence) => {
    const fileName = prompt(`Enter document or file name to attach to ${item.correspondenceNumber}:`);
    if (!fileName || !fileName.trim()) return;

    try {
      const res = await fetch(`/api/correspondence/${item.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName.trim(),
          fileType: 'application/pdf',
          fileSize: 102400,
          url: '#',
          isInternal: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to attach file');
      }
      if (onRefreshData) onRefreshData();
      alert(`Attachment added: ${fileName}`);
    } catch (err: any) {
      alert(err.message || 'Failed to add attachment');
    }
  };

  const handleToggleArchive = async (item: Correspondence) => {
    const confirmAction = confirm(
      `Are you sure you want to ${item.isArchived ? 'restore' : 'archive'} correspondence ${item.correspondenceNumber}?`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/correspondence/${item.id}/archive`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update archive status');
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update archive status');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Filter letters by type
  const typeFiltered = useMemo(() => {
    if (activeRegisterType === 'all') {
      return correspondence.filter((c) => !c.isArchived);
    }
    return correspondence.filter((c) => c.type === activeRegisterType && !c.isArchived);
  }, [correspondence, activeRegisterType]);

  // Apply search & multi-field filters
  const filteredList = useMemo(() => {
    let result = typeFiltered.filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        c.correspondenceNumber.toLowerCase().includes(q) ||
        (c.externalRefNumber && c.externalRefNumber.toLowerCase().includes(q)) ||
        c.subject.toLowerCase().includes(q) ||
        c.senderOrg.toLowerCase().includes(q) ||
        c.recipientOrg.toLowerCase().includes(q) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(q)) ||
        (c.costCode && c.costCode.toLowerCase().includes(q)) ||
        (c.contractNumber && c.contractNumber.toLowerCase().includes(q)) ||
        (c.proformaInvoiceNumber && c.proformaInvoiceNumber.toLowerCase().includes(q)) ||
        (c.assignedUserName && c.assignedUserName.toLowerCase().includes(q));

      const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      const matchesPriority = selectedPriority === 'ALL' || c.priority === selectedPriority;
      const matchesDept =
        selectedDept === 'ALL' ||
        c.assignedDepartmentId === selectedDept ||
        c.senderDeptId === selectedDept ||
        c.recipientDeptId === selectedDept;

      return matchesSearch && matchesStatus && matchesPriority && matchesDept;
    });

    result.sort((a, b) => {
      if (sortField === 'officialDate') {
        const diff = new Date(b.officialDate).getTime() - new Date(a.officialDate).getTime();
        return sortDirection === 'desc' ? diff : -diff;
      } else {
        const cmp = a.correspondenceNumber.localeCompare(b.correspondenceNumber);
        return sortDirection === 'desc' ? -cmp : cmp;
      }
    });

    return result;
  }, [typeFiltered, searchTerm, selectedStatus, selectedPriority, selectedDept, sortField, sortDirection]);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeRegisterType === 'all') {
      headers = [
        'Correspondence No',
        'Type',
        'Official Date',
        'Client Code',
        'Cost Code',
        'Contract No',
        'Sender Org',
        'Recipient Org',
        'Subject',
        'Priority',
        'Status',
      ];
      rows = filteredList.map((c) => [
        c.correspondenceNumber,
        c.type,
        c.officialDate,
        c.clientCode || 'N/A',
        c.costCode || 'N/A',
        c.contractNumber || 'N/A',
        `"${(c.senderOrg || '').replace(/"/g, '""')}"`,
        `"${(c.recipientOrg || '').replace(/"/g, '""')}"`,
        `"${c.subject.replace(/"/g, '""')}"`,
        c.priority,
        c.status,
      ]);
    } else if (activeRegisterType === 'incoming') {
      headers = [
        'Correspondence No',
        'Received Date',
        'External Ref',
        'Sender Org',
        'Sender Contact',
        'Subject',
        'Responsible Officer',
        'Priority',
        'Status',
        'Due Date',
      ];
      rows = filteredList.map((c) => [
        c.correspondenceNumber,
        c.officialDate,
        c.externalRefNumber || 'N/A',
        `"${c.senderOrg.replace(/"/g, '""')}"`,
        `"${c.senderPerson.replace(/"/g, '""')}"`,
        `"${c.subject.replace(/"/g, '""')}"`,
        `"${(c.assignedUserName || 'Unassigned').replace(/"/g, '""')}"`,
        c.priority,
        c.status,
        c.dueDate || 'None',
      ]);
    } else if (activeRegisterType === 'outgoing') {
      headers = [
        'Correspondence No',
        'Official Date',
        'Recipient Org',
        'Recipient Contact',
        'Subject',
        'Status',
        'Sent Date',
        'Created By',
        'Confidentiality',
      ];
      rows = filteredList.map((c) => [
        c.correspondenceNumber,
        c.officialDate,
        `"${c.recipientOrg.replace(/"/g, '""')}"`,
        `"${c.recipientPerson.replace(/"/g, '""')}"`,
        `"${c.subject.replace(/"/g, '""')}"`,
        c.status,
        c.sentAt || 'Pending',
        `"${c.createdByUserName.replace(/"/g, '""')}"`,
        c.confidentiality,
      ]);
    } else {
      // internal
      headers = [
        'Correspondence No',
        'Official Date',
        'From Department/Person',
        'To Department/Person',
        'Subject',
        'Status',
        'Priority',
        'Responsible Responder',
        'Confidentiality',
      ];
      rows = filteredList.map((c) => [
        c.correspondenceNumber,
        c.officialDate,
        `"${(c.senderDept || c.senderOrg || 'Internal').replace(/"/g, '""')} - ${(c.senderPerson || '').replace(/"/g, '""')}"`,
        `"${(c.recipientDept || c.recipientOrg || 'Internal').replace(/"/g, '""')} - ${(c.recipientPerson || '').replace(/"/g, '""')}"`,
        `"${(c.subject || '').replace(/"/g, '""')}"`,
        c.status,
        c.priority,
        `"${(c.assignedUserName || 'Unassigned').replace(/"/g, '""')}"`,
        c.confidentiality,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${activeRegisterType}_correspondence_register_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'assigned':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'in_progress':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'replied':
      case 'completed':
      case 'sent':
      case 'issued':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'awaiting_approval':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'under_review':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'voided':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleRowContextMenu = (e: React.MouseEvent, item: Correspondence) => {
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 280),
      item,
    });
  };

  const defaultSettings: CompanySettings = settings || {
    companyName: 'Corporate Administration',
    subTitle: 'Correspondence & Records Division',
    address: 'Executive Tower, Level 14',
    cityStateZip: 'Capital District, CD 10001',
    phone: '+1 (555) 019-2831',
    email: 'registry@company.internal',
    website: 'https://company.internal',
    logoUrl: '',
    signature: {
      signatoryName: currentUser?.name || 'Administrator',
      position: currentUser?.title || 'Registrar',
      department: currentUser?.departmentName || 'Administration',
    },
  };

  return (
    <div className={`p-6 md:p-8 space-y-6 mx-auto ${isFullPage ? 'w-full max-w-full' : 'max-w-7xl'}`}>
      {/* Title & Header Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-lg ${
                activeRegisterType === 'incoming'
                  ? 'bg-blue-100 text-blue-800'
                  : activeRegisterType === 'outgoing'
                  ? 'bg-emerald-100 text-emerald-800'
                  : activeRegisterType === 'internal'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-sky-100 text-sky-900'
              }`}
            >
              {activeRegisterType === 'incoming' ? (
                <Inbox className="h-5 w-5" />
              ) : activeRegisterType === 'outgoing' ? (
                <Send className="h-5 w-5" />
              ) : activeRegisterType === 'internal' ? (
                <Building className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-blue-950 tracking-tight">
                {activeRegisterType === 'incoming'
                  ? 'Incoming Correspondence Register'
                  : activeRegisterType === 'outgoing'
                  ? 'Outgoing Correspondence Register'
                  : activeRegisterType === 'internal'
                  ? 'Internal Correspondence Register (IC)'
                  : 'Company Correspondence Register'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeRegisterType === 'incoming'
                  ? 'Sequential registry of external letters, notices, and formal transmittals'
                  : activeRegisterType === 'outgoing'
                  ? 'Official external letters issued with verification letterhead compliance'
                  : activeRegisterType === 'internal'
                  ? 'Inter-departmental memoranda, directives, and internal distributions'
                  : 'Unified central log of all company incoming, outgoing, and internal correspondence'}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-register switcher tabs & actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-blue-100/70 p-1 rounded-xl border border-blue-200">
            <button
              onClick={() => setActiveRegisterType('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeRegisterType === 'all'
                  ? 'bg-white text-blue-950 shadow-2xs border border-blue-200'
                  : 'text-slate-600 hover:text-blue-950'
              }`}
            >
              All Registers
            </button>
            <button
              onClick={() => setActiveRegisterType('incoming')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeRegisterType === 'incoming'
                  ? 'bg-white text-blue-950 shadow-2xs border border-blue-200'
                  : 'text-slate-600 hover:text-blue-950'
              }`}
            >
              Incoming
            </button>
            <button
              onClick={() => setActiveRegisterType('outgoing')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeRegisterType === 'outgoing'
                  ? 'bg-white text-blue-950 shadow-2xs border border-blue-200'
                  : 'text-slate-600 hover:text-blue-950'
              }`}
            >
              Outgoing
            </button>
            <button
              onClick={() => setActiveRegisterType('internal')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeRegisterType === 'internal'
                  ? 'bg-white text-blue-950 shadow-2xs border border-blue-200'
                  : 'text-slate-600 hover:text-blue-950'
              }`}
            >
              Internal (IC)
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-950 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNew(activeRegisterType === 'all' ? 'outgoing' : activeRegisterType)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 text-sky-400" />
            <span>
              {activeRegisterType === 'incoming'
                ? 'Register Incoming'
                : activeRegisterType === 'outgoing'
                ? 'New Outgoing Letter'
                : activeRegisterType === 'internal'
                ? 'New Internal Memo'
                : 'New Correspondence'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                type === 'internal'
                  ? 'Search IC number, subject, author, department...'
                  : 'Search correspondence no, external ref, subject, organization...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-slate-50/50"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              {type === 'incoming' ? (
                <>
                  <option value="registered">Registered</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="completed">Completed</option>
                  <option value="voided">Voided</option>
                </>
              ) : type === 'outgoing' ? (
                <>
                  <option value="draft">Draft</option>
                  <option value="under_review">Under Review</option>
                  <option value="awaiting_approval">Awaiting Approval</option>
                  <option value="approved">Approved</option>
                  <option value="issued">Issued</option>
                  <option value="sent">Sent</option>
                  <option value="voided">Voided</option>
                </>
              ) : (
                <>
                  <option value="draft">Draft</option>
                  <option value="assigned">Assigned / In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="voided">Voided</option>
                </>
              )}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50 text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50 text-slate-700"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count & active filter summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span>
              Displaying <strong>{filteredList.length}</strong> of{' '}
              <strong>{typeFiltered.length}</strong> official records
            </span>
            <span className="text-[11px] text-slate-400">
              (Tip: Right-click any row for quick actions)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Sort by:</span>
            <button
              onClick={() => {
                if (sortField === 'officialDate') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('officialDate');
                  setSortDirection('desc');
                }
              }}
              className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                sortField === 'officialDate'
                  ? 'bg-slate-100 text-slate-800 font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Date {sortField === 'officialDate' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              onClick={() => {
                if (sortField === 'correspondenceNumber') {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('correspondenceNumber');
                  setSortDirection('desc');
                }
              }}
              className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                sortField === 'correspondenceNumber'
                  ? 'bg-slate-100 text-slate-800 font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Number {sortField === 'correspondenceNumber' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Main Register Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-2xs overflow-hidden">
        {/* Mobile Cards List (< md) */}
        <div className="md:hidden divide-y divide-blue-50">
          {filteredList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs px-4">
              No correspondence matching your current filter criteria.
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenCorrespondence(item)}
                className="p-4 bg-white hover:bg-blue-50/30 transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-blue-950 text-xs block">
                      {item.correspondenceNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.officialDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span
                      className={`text-[9px] uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                    <span
                      className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {(item.status || 'draft').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Email Draft / Sent Status Badge */}
                {item.emailStatus === 'drafted' && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-semibold">
                    <Clock className="h-3 w-3 text-amber-700" />
                    <span>Saved to {item.emailProvider === 'yahoo' ? 'Yahoo' : 'Gmail'} Drafts (EOD Reminder Active)</span>
                  </div>
                )}
                {item.emailStatus === 'sent' && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-semibold">
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                    <span>Sent via {item.emailProvider === 'yahoo' ? 'Yahoo' : 'Gmail'}</span>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-2">
                    {item.subject}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                    {type === 'incoming'
                      ? `From: ${item.senderOrg} (${item.senderPerson || 'Official'})`
                      : type === 'outgoing'
                      ? `To: ${item.recipientOrg} (${item.recipientPerson || 'Official'})`
                      : `IC: ${item.originDepartmentName || 'Origin'} → ${item.destinationDepartmentName || 'Target'}`}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {type === 'incoming' ? (item.assignedUserName || 'Unassigned') : item.createdByUserName}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenCorrespondence(item)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg"
                    >
                      View
                    </button>
                    {settings && (
                      <button
                        type="button"
                        onClick={() => generateCorrespondencePdf(item, settings, true)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                        title="Download PDF"
                      >
                        PDF
                      </button>
                    )}
                    {type === 'outgoing' && onSendEmail && (
                      <button
                        type="button"
                        onClick={() => onSendEmail(item)}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-lg flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        <span>{item.emailStatus === 'drafted' ? 'Review' : 'Email'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (md and above) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-blue-50/70 text-blue-950 font-bold uppercase tracking-wider text-[11px] border-b border-blue-200">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Ref No</th>
                {activeRegisterType === 'all' && (
                  <th className="py-3.5 px-4 whitespace-nowrap">Register Type</th>
                )}
                <th className="py-3.5 px-4 whitespace-nowrap">Official Date</th>
                {activeRegisterType === 'incoming' && (
                  <th className="py-3.5 px-4 whitespace-nowrap">External Ref</th>
                )}
                {activeRegisterType === 'internal' ? (
                  <>
                    <th className="py-3.5 px-4 whitespace-nowrap">Origin / Author</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Destination / Target</th>
                  </>
                ) : activeRegisterType === 'all' ? (
                  <th className="py-3.5 px-4 whitespace-nowrap">Counterparty / Dept</th>
                ) : (
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    {activeRegisterType === 'incoming' ? 'Sender Organization' : 'Recipient Organization'}
                  </th>
                )}
                <th className="py-3.5 px-4 min-w-[220px]">Subject</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Priority</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                {activeRegisterType === 'all' ? (
                  <th className="py-3.5 px-4 whitespace-nowrap">Commercial Ref</th>
                ) : activeRegisterType === 'incoming' ? (
                  <>
                    <th className="py-3.5 px-4 whitespace-nowrap">Responsible</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Due Date</th>
                  </>
                ) : activeRegisterType === 'outgoing' ? (
                  <>
                    <th className="py-3.5 px-4 whitespace-nowrap">Sent At</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Author</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-4 whitespace-nowrap">Responsible Responder</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Due Date</th>
                  </>
                )}
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-slate-400 text-xs bg-white"
                  >
                    No correspondence matching your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onOpenCorrespondence(item)}
                    onContextMenu={(e) => handleRowContextMenu(e, item)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Official Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-950 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{item.correspondenceNumber}</span>
                        {item.status === 'voided' && (
                          <span className="text-[9px] px-1 bg-rose-100 text-rose-700 rounded font-semibold uppercase">
                            Voided
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type column when showing 'all' */}
                    {activeRegisterType === 'all' && (
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            item.type === 'incoming'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.type === 'outgoing'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                    )}

                    {/* Official Date */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {item.officialDate}
                    </td>

                    {/* External Ref for Incoming */}
                    {activeRegisterType === 'incoming' && (
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {item.externalRefNumber || '—'}
                      </td>
                    )}

                    {/* Correspondent / Origin / Destination */}
                    {activeRegisterType === 'internal' ? (
                      <>
                        <td className="py-3.5 px-4 text-slate-800 font-medium whitespace-nowrap">
                          <div>{item.senderDept || item.senderOrg || 'Internal'}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.senderPerson || item.createdByUserName}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium whitespace-nowrap">
                          <div>{item.recipientDept || item.recipientOrg || 'Internal'}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.recipientPerson || 'All Department'}
                          </div>
                        </td>
                      </>
                    ) : activeRegisterType === 'all' ? (
                      <td className="py-3.5 px-4 text-slate-800 font-medium whitespace-nowrap">
                        <div>
                          {item.type === 'incoming'
                            ? item.senderOrg
                            : item.type === 'outgoing'
                            ? item.recipientOrg
                            : `${item.senderDept || 'Internal'} → ${item.recipientDept || 'Internal'}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.type === 'incoming'
                            ? item.senderPerson
                            : item.type === 'outgoing'
                            ? item.recipientPerson
                            : item.createdByUserName}
                        </div>
                      </td>
                    ) : (
                      <td className="py-3.5 px-4 text-slate-800 font-medium whitespace-nowrap">
                        <div>
                          {activeRegisterType === 'incoming' ? item.senderOrg : item.recipientOrg}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {activeRegisterType === 'incoming' ? item.senderPerson : item.recipientPerson}
                        </div>
                      </td>
                    )}

                    {/* Subject */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 line-clamp-1 flex items-center gap-1.5">
                        <span>{item.subject}</span>
                        {item.attachments && item.attachments.length > 0 && (
                          <span
                            title={`${item.attachments.length} attachment(s)`}
                            className="inline-flex items-center text-slate-400 hover:text-slate-600"
                          >
                            <Paperclip className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      {item.relatedLinks && item.relatedLinks.length > 0 && (
                        <div className="text-[10px] text-sky-700 mt-0.5 flex items-center gap-1">
                          <GitBranch className="h-3 w-3 inline" />
                          <span>Linked: {item.relatedLinks.length} record(s)</span>
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    {/* Status & Email Draft State */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {(item.status || 'draft').replace(/_/g, ' ')}
                        </span>
                        {item.emailStatus === 'drafted' && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300"
                            title="Drafted in mailbox. 1h before EOD reminder active."
                          >
                            <Clock className="h-2.5 w-2.5 text-amber-700" />
                            <span>Draft in {item.emailProvider === 'yahoo' ? 'Yahoo' : 'Gmail'}</span>
                          </span>
                        )}
                        {item.emailStatus === 'sent' && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-700" />
                            <span>Sent via {item.emailProvider === 'yahoo' ? 'Yahoo' : 'Gmail'}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Dynamic Columns */}
                    {activeRegisterType === 'all' ? (
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        {item.clientCode ? (
                          <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {item.clientCode}
                          </span>
                        ) : item.contractNumber ? (
                          <span className="font-mono text-[10px] text-slate-600">
                            {item.contractNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    ) : activeRegisterType === 'incoming' ? (
                      <>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                          {item.assignedUserName || (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.dueDate ? (
                            <span
                              className={`text-[11px] font-medium ${
                                item.dueDate < new Date().toISOString().split('T')[0]
                                  ? 'text-rose-600 font-bold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {item.dueDate}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </>
                    ) : activeRegisterType === 'outgoing' ? (
                      <>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                          {item.sentAt ? item.sentAt.split('T')[0] : 'Pending'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                          {item.createdByUserName}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                          {item.assignedUserName ? (
                            <span className="font-medium text-slate-800">
                              {item.assignedUserName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.dueDate ? (
                            <span
                              className={`text-[11px] font-medium ${
                                item.dueDate < new Date().toISOString().split('T')[0]
                                  ? 'text-rose-600 font-bold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {item.dueDate}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {onDistributeInternal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDistributeInternal(item);
                            }}
                            className="p-1.5 rounded-md hover:bg-sky-50 text-slate-500 hover:text-sky-700 transition-colors cursor-pointer"
                            title="Send internally / Distribute"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {type === 'outgoing' && onSendEmail && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendEmail(item);
                            }}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-900 hover:text-blue-950 transition-colors cursor-pointer"
                            title={item.emailStatus === 'drafted' ? 'Review & Send Email Draft' : 'Email Dispatch & Draft Permission'}
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCorrespondence(item);
                          }}
                          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Open Correspondence Dossier"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(e, item)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Letter (Rolls back sequence number)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowContextMenu(e, item);
                          }}
                          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Actions menu"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-70 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 w-60 text-xs text-slate-700 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3.5 py-1.5 flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-slate-900">
              {contextMenu.item.correspondenceNumber}
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              {contextMenu.item.type}
            </span>
          </div>

          <div className="py-1">
            {/* 1. Open */}
            <button
              type="button"
              onClick={() => {
                onOpenCorrespondence(contextMenu.item, 'workspace');
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800 font-semibold"
            >
              <Eye className="h-3.5 w-3.5 text-sky-600" />
              <span>Open Workspace</span>
            </button>

            {/* 2. Reply */}
            {onReply && contextMenu.item.status !== 'voided' && (
              <button
                type="button"
                onClick={() => {
                  onReply(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
              >
                <Reply className="h-3.5 w-3.5 text-emerald-600" />
                <span>Reply / Prepare Response</span>
              </button>
            )}

            {/* 3. Send internally / Distribute internally */}
            {onDistributeInternal && contextMenu.item.status !== 'voided' && (
              <button
                type="button"
                onClick={() => {
                  onDistributeInternal(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
              >
                <Share2 className="h-3.5 w-3.5 text-purple-600" />
                <span>Send Internally / Distribute</span>
              </button>
            )}

            {/* 4. Make a Copy */}
            {contextMenu.item.status !== 'voided' && (
              <button
                type="button"
                onClick={() => {
                  handleMakeCopy(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
                <span>Make a Copy</span>
              </button>
            )}

            {/* 5. Assign */}
            {contextMenu.item.status !== 'voided' && (
              <button
                type="button"
                onClick={() => {
                  handleQuickAssign(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
              >
                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Assign Responsible Responder</span>
              </button>
            )}

            {/* 6. Add Comment */}
            <button
              type="button"
              onClick={() => {
                handleAddComment(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
            >
              <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
              <span>Add Comment / Note</span>
            </button>

            {/* 7. Open History */}
            <button
              type="button"
              onClick={() => {
                onOpenCorrespondence(contextMenu.item, 'history');
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
            >
              <History className="h-3.5 w-3.5 text-slate-600" />
              <span>Open History Timeline</span>
            </button>
          </div>

          <div className="py-1">
            {/* 8. Download PDF */}
            <button
              type="button"
              onClick={() => {
                generateCorrespondencePdf(contextMenu.item, settings || defaultSettings, true);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
            >
              <Download className="h-3.5 w-3.5 text-amber-600" />
              <span>Download Official PDF</span>
            </button>

            {/* 9. Add Attachment */}
            {contextMenu.item.status !== 'voided' && (
              <button
                type="button"
                onClick={() => {
                  handleAddAttachment(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
              >
                <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                <span>Add Attachment</span>
              </button>
            )}

            {/* 10. Send by Email */}
            {onSendEmail && contextMenu.item.type === 'outgoing' && contextMenu.item.status !== 'voided' && (
              <button
                type="button"
                onClick={() => {
                  onSendEmail(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
              >
                <Send className="h-3.5 w-3.5 text-sky-600" />
                <span>Send by Email</span>
              </button>
            )}

            {/* 11. Archive */}
            <button
              type="button"
              onClick={() => {
                handleToggleArchive(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer text-slate-800"
            >
              <Archive className="h-3.5 w-3.5 text-slate-500" />
              <span>{contextMenu.item.isArchived ? 'Restore from Archive' : 'Archive Correspondence'}</span>
            </button>
          </div>

          {/* Void Reference Number (Admin Only) */}
          {currentUser?.role === 'admin' && contextMenu.item.status !== 'voided' && onVoidNumber && (
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  const reason = prompt('Please specify formal reason for voiding this record:');
                  if (reason) {
                    onVoidNumber(reason);
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 cursor-pointer font-medium"
              >
                <Ban className="h-3.5 w-3.5 text-rose-500" />
                <span>Void Reference Number</span>
              </button>
            </div>
          )}

          {/* Delete Letter Option */}
          <div className="py-1">
            <button
              type="button"
              onClick={(e) => handleDeleteClick(e, contextMenu.item)}
              className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 hover:text-rose-700 flex items-center gap-2.5 cursor-pointer font-semibold transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              <span>Delete Letter</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-80 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Correspondence Record?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to delete this letter? This action permanently removes the record and automatically rolls back the sequence counter so your sequential numbering remains clean and consecutive.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                  <span>Reference Number:</span>
                  <span className="text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {deleteConfirmItem.correspondenceNumber}
                  </span>
                </div>
                <div className="text-slate-700">
                  <span className="font-semibold text-slate-500">Subject: </span>
                  <span className="font-medium">{deleteConfirmItem.subject}</span>
                </div>
                <div className="text-slate-500 flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                  <span>Type: <strong className="uppercase text-slate-700">{deleteConfirmItem.type}</strong></span>
                  <span>Date: <strong className="text-slate-700">{deleteConfirmItem.officialDate}</strong></span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Letter Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
