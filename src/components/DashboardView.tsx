import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Send,
  Mail,
  Building,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  UserCheck,
  ChevronRight,
  Shield,
  Search,
  X,
  FileCheck2,
  Paperclip,
  GitBranch,
  PlusCircle,
  Layers,
  Briefcase,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Activity,
  FileSpreadsheet,
  Building2,
  FolderArchive,
  BarChart3,
} from 'lucide-react';
import {
  Correspondence,
  Task,
  AuditLog,
  User,
  Department,
  CompanySettings,
  TechnicalDocument,
} from '../types';
import { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  correspondence: Correspondence[];
  tasks: Task[];
  auditLogs: AuditLog[];
  departments?: Department[];
  users?: User[];
  currentUser: User;
  settings?: CompanySettings | null;
  technicalDocuments?: TechnicalDocument[];
  onOpenCorrespondence: (item: Correspondence, initialTab?: any) => void;
  onNewOutgoing: () => void;
  onRegisterIncoming: () => void;
  onNewInternal?: () => void;
  onDistributeInternal?: (item: Correspondence) => void;
  onReply?: (item: Correspondence) => void;
  onSendEmail?: (item: Correspondence) => void;
  onVoidNumber?: (reason: string) => Promise<void>;
  onRefreshData?: () => void;
  onViewTasks: () => void;
  onNavigate?: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  correspondence,
  tasks,
  auditLogs,
  departments = [],
  users = [],
  currentUser,
  settings,
  technicalDocuments = [],
  onOpenCorrespondence,
  onNewOutgoing,
  onRegisterIncoming,
  onNewInternal,
  onDistributeInternal,
  onReply,
  onSendEmail,
  onVoidNumber,
  onRefreshData,
  onViewTasks,
  onNavigate,
}) => {
  // Modal state for Audit Trail
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Actionable operational counts
  const myPendingTasks = tasks.filter(
    (t) => t.assignedUserId === currentUser.id && t.status !== 'completed'
  );
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate < todayStr
  );
  const dueTodayTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate === todayStr
  );
  const urgentCount = overdueTasks.length + dueTodayTasks.length;

  const approvalCount = correspondence.filter(
    (c) => c.status === 'awaiting_approval' && !c.isArchived
  ).length;

  const unrepliedIncoming = correspondence.filter(
    (c) =>
      c.type === 'incoming' &&
      c.responseRequired &&
      c.status !== 'replied' &&
      c.status !== 'completed' &&
      !c.isArchived
  ).length;

  // --- Module 1: Correspondence Metrics ---
  const activeCorrespondence = useMemo(
    () => correspondence.filter((c) => !c.isArchived),
    [correspondence]
  );
  const incomingCount = activeCorrespondence.filter((c) => c.type === 'incoming').length;
  const outgoingCount = activeCorrespondence.filter((c) => c.type === 'outgoing').length;
  const internalCount = activeCorrespondence.filter((c) => c.type === 'internal').length;
  const urgentCorrespondence = activeCorrespondence.filter(
    (c) => c.priority === 'urgent' && c.status !== 'completed' && c.status !== 'voided'
  ).length;

  // --- Module 2: Technical Documents Metrics ---
  const totalTechDocs = technicalDocuments.length;
  const underReviewDocs = technicalDocuments.filter(
    (d) => d.status === 'under_review' || d.status === 'submitted'
  ).length;
  const approvedDocs = technicalDocuments.filter(
    (d) => d.status === 'approved' || d.status === 'as_built'
  ).length;
  const linkedDocsCount = technicalDocuments.filter(
    (d) => !!d.linkedCorrespondenceNumber
  ).length;

  // --- Module 3: Commercial & Financial Metrics ---
  const commercialItems = useMemo(
    () =>
      activeCorrespondence.filter(
        (c) => c.clientCode || c.contractNumber || c.commercialValue || c.proformaInvoiceNumber
      ),
    [activeCorrespondence]
  );
  const activeContractsCount = new Set(
    activeCorrespondence.map((c) => c.contractNumber).filter(Boolean)
  ).size;
  const totalContractVal = activeCorrespondence.reduce(
    (acc, curr) => acc + (curr.commercialValue || 0),
    0
  );
  const pendingInvoicesCount = activeCorrespondence.filter(
    (c) => c.invoiceStatus === 'pending_approval' || c.invoiceStatus === 'draft'
  ).length;
  const activeClientsCount = new Set(
    activeCorrespondence.map((c) => c.clientCode).filter(Boolean)
  ).size;

  // Top 5 Recent Correspondence Items for executive glance
  const recentCorrespondence = useMemo(() => {
    return [...activeCorrespondence]
      .sort(
        (a, b) =>
          new Date(b.officialDate).getTime() - new Date(a.officialDate).getTime()
      )
      .slice(0, 5);
  }, [activeCorrespondence]);

  // Filter audit logs for modal
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.performedByUserName.toLowerCase().includes(q) ||
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      (log.newValue && log.newValue.toLowerCase().includes(q)) ||
      (log.previousValue && log.previousValue.toLowerCase().includes(q))
    );
  });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'sent':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
      case 'under_review':
      case 'in_progress':
      case 'assigned':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'awaiting_approval':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      case 'voided':
        return 'bg-rose-100 text-rose-700 border-rose-300 line-through';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Executive Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-blue-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
              Executive Dashboard
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 font-bold">
              PJMAK Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            • Operational & Compliance Overview
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onRegisterIncoming}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-950 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
          >
            <Inbox className="h-4 w-4 text-sky-700" />
            <span>Register Incoming</span>
          </button>

          <button
            onClick={onNewOutgoing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-950 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Send className="h-4 w-4 text-sky-400" />
            <span>New Outgoing Letter</span>
          </button>
        </div>
      </div>

      {/* Urgent Action Banner */}
      {urgentCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-950">Action Required:</span>{' '}
              <span className="text-amber-900">
                {overdueTasks.length > 0 && `${overdueTasks.length} overdue task(s)`}
                {overdueTasks.length > 0 && dueTodayTasks.length > 0 && ', '}
                {dueTodayTasks.length > 0 && `${dueTodayTasks.length} task(s) due today`}
              </span>
            </div>
          </div>
          <button
            onClick={onViewTasks}
            className="px-3 py-1 text-xs font-semibold bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-md transition-colors cursor-pointer shrink-0"
          >
            View Tasks
          </button>
        </div>
      )}

      {/* 2. Key Operational Health Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div
          onClick={onViewTasks}
          className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-medium text-slate-500">Your Pending Tasks</div>
            <div className="text-2xl font-black text-blue-950 mt-1">
              {myPendingTasks.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Assigned to you</div>
          </div>
          <span className="p-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-100 group-hover:bg-blue-100 transition-colors">
            <UserCheck className="h-5 w-5" />
          </span>
        </div>

        {/* Metric 2 */}
        <div
          onClick={onViewTasks}
          className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-medium text-slate-500">Deadlines & SLA</div>
            <div className={`text-2xl font-black mt-1 ${urgentCount > 0 ? 'text-amber-600' : 'text-blue-950'}`}>
              {urgentCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Due today or overdue</div>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 group-hover:bg-amber-100 transition-colors">
            <Clock className="h-5 w-5" />
          </span>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => onNavigate?.('correspondence')}
          className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs hover:border-sky-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-medium text-slate-500">Awaiting Sign-Off</div>
            <div className="text-2xl font-black text-blue-950 mt-1">
              {approvalCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Approval bottleneck</div>
          </div>
          <span className="p-2.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-100 group-hover:bg-sky-100 transition-colors">
            <FileCheck2 className="h-5 w-5" />
          </span>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => onNavigate?.('correspondence')}
          className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-medium text-slate-500">Unreplied Inflow</div>
            <div className="text-2xl font-black text-blue-950 mt-1">
              {unrepliedIncoming}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Response required</div>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
            <Inbox className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* 3. Three Functional Pillar Executive Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-blue-950 tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-600" />
              <span>Core Functional Portals</span>
            </h2>
            <p className="text-xs text-slate-500">
              High-level overview of company operations. Select any module to view its full registry and details.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Correspondence Register */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-blue-100 text-blue-900">
                    <Mail className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-blue-950">
                      Correspondence Register
                    </h3>
                    <p className="text-xs text-slate-500">
                      Incoming, Outgoing & Internal IC
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-xs font-bold font-mono bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                  {activeCorrespondence.length} total
                </span>
              </div>

              {/* Breakdown metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Incoming</div>
                  <div className="text-lg font-black text-blue-900 mt-0.5">{incomingCount}</div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Outgoing</div>
                  <div className="text-lg font-black text-emerald-800 mt-0.5">{outgoingCount}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Internal</div>
                  <div className="text-lg font-black text-purple-800 mt-0.5">{internalCount}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    <span>Urgent / High Priority</span>
                  </span>
                  <span className="font-bold text-slate-900">{urgentCorrespondence}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pending Incoming Inflow</span>
                  </span>
                  <span className="font-bold text-slate-900">{unrepliedIncoming}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-1.5">
                    <FileCheck2 className="h-3.5 w-3.5 text-sky-500" />
                    <span>Awaiting Approval Sign-Off</span>
                  </span>
                  <span className="font-bold text-slate-900">{approvalCount}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/60 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => onNavigate?.('correspondence')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-white bg-blue-950 hover:bg-blue-900 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <span>Open Correspondence Register</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Technical Documents */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-purple-100 text-purple-900">
                    <Layers className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-blue-950">
                      Technical Documents
                    </h3>
                    <p className="text-xs text-slate-500">
                      Engineering, Drawings & Submittals
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-xs font-bold font-mono bg-purple-50 text-purple-800 rounded-full border border-purple-200">
                  {totalTechDocs} registered
                </span>
              </div>

              {/* Breakdown metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Docs</div>
                  <div className="text-lg font-black text-purple-950 mt-0.5">{totalTechDocs}</div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Reviewing</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{underReviewDocs}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Approved</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{approvedDocs}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-purple-500" />
                    <span>Linked to Letters</span>
                  </span>
                  <span className="font-bold text-slate-900">{linkedDocsCount} transmittals</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Issued / As-Built</span>
                  </span>
                  <span className="font-bold text-slate-900">{approvedDocs} files</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pending Technical Approval</span>
                  </span>
                  <span className="font-bold text-slate-900">{underReviewDocs}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/60 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => onNavigate?.('technical_docs')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-purple-950 bg-purple-100 hover:bg-purple-200 rounded-xl transition-colors cursor-pointer border border-purple-200"
              >
                <span>Open Technical Document Register</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Commercial & Financial */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900">
                    <Briefcase className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-blue-950">
                      Commercial & Financial
                    </h3>
                    <p className="text-xs text-slate-500">
                      Contracts, Invoices & Cost Codes
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-xs font-bold font-mono bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  {commercialItems.length} records
                </span>
              </div>

              {/* Breakdown metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Contracts</div>
                  <div className="text-lg font-black text-emerald-950 mt-0.5">{activeContractsCount}</div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Clients</div>
                  <div className="text-lg font-black text-blue-900 mt-0.5">{activeClientsCount}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Invoices</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{pendingInvoicesCount}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Total Commercial Volume</span>
                  </span>
                  <span className="font-bold text-emerald-800 font-mono">
                    ${totalContractVal.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pending Invoices Review</span>
                  </span>
                  <span className="font-bold text-slate-900">{pendingInvoicesCount} proformas</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-sky-500" />
                    <span>Designated Cost Codes</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {new Set(activeCorrespondence.map((c) => c.costCode).filter(Boolean)).size} codes
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/60 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => onNavigate?.('commercial')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer border border-emerald-200"
              >
                <span>Open Commercial & Financial Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Correspondence Stream (Fast glance without table duplication) */}
      <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-600" />
              <span>Recent Correspondence Activity</span>
            </h3>
            <p className="text-xs text-slate-500">
              Quick access to the latest correspondence received or issued by your team.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('correspondence')}
            className="text-xs font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>View Full Correspondence Register</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentCorrespondence.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No correspondence logged yet.
            </div>
          ) : (
            recentCorrespondence.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenCorrespondence(item)}
                className="py-3.5 px-3 -mx-3 rounded-xl hover:bg-blue-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      item.type === 'incoming'
                        ? 'bg-blue-100 text-blue-800'
                        : item.type === 'outgoing'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {item.type === 'incoming' ? (
                      <Inbox className="h-4 w-4" />
                    ) : item.type === 'outgoing' ? (
                      <Send className="h-4 w-4" />
                    ) : (
                      <Building className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-950">
                        {item.correspondenceNumber}
                      </span>
                      <span
                        className={`text-[10px] uppercase px-1.5 py-0.2 rounded-full border font-semibold ${
                          item.type === 'incoming'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.type === 'outgoing'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {item.type}
                      </span>
                      <span
                        className={`text-[10px] uppercase px-1.5 py-0.2 rounded-full border ${getPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <div className="font-medium text-slate-800 text-xs mt-0.5 group-hover:text-blue-900 transition-colors">
                      {item.subject}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.type === 'incoming'
                        ? `From: ${item.senderOrg}`
                        : item.type === 'outgoing'
                        ? `To: ${item.recipientOrg}`
                        : `Internal: ${item.senderDept || 'Internal'} → ${item.recipientDept || 'Internal'}`}{' '}
                      • {item.officialDate}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCorrespondence(item);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-900 transition-colors cursor-pointer"
                    title="Open Document"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Immutable Audit Trail (Positioned at the bottom of the dashboard page) */}
      <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 shadow-2xs">
              <Shield className="h-5 w-5 text-blue-800" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-blue-950">Immutable Audit Trail</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                  {auditLogs.length} Verified Entries
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tamper-Evident Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory accountability ledger recording all numbering reservations, approvals, status transitions, and transmissions.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-950 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Shield className="h-3.5 w-3.5 text-blue-800" />
            <span>Open Full Audit Ledger</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Live preview of recent entries */}
        <div className="divide-y divide-slate-100">
          {auditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No audit logs recorded yet.</div>
          ) : (
            auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="py-3 px-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs hover:bg-slate-50/80 rounded-xl transition-colors"
              >
                <div className="flex items-start md:items-center gap-3 min-w-0">
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                  </span>
                  <span className="font-semibold text-blue-950 capitalize shrink-0">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-600 truncate">
                    Ref: <strong className="font-mono text-slate-800">{log.targetEntityId}</strong>
                    {log.reason && (
                      <span className="italic text-slate-500 ml-2">
                        &quot;{log.reason}&quot;
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <span className="text-[11px] text-slate-500">
                    Officer: <strong className="text-slate-700">{log.performedByUserName}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Audit Trail Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold">Immutable Audit Trail</h3>
                  <p className="text-[11px] text-sky-200">
                    Tamper-evident legal ledger ({auditLogs.length} verified entries)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Filter in Modal */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search audit actions, user name, reasons, ref no..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
              />
              {auditSearch && (
                <button
                  onClick={() => setAuditSearch('')}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Audit Log Entries List */}
            <div className="overflow-y-auto divide-y divide-slate-100 p-2 flex-1">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No audit entries found matching &quot;{auditSearch}&quot;.
                </div>
              ) : (
                filteredAuditLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.timestamp.replace('T', ' ').slice(0, 19)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>
                        By: <strong className="text-slate-700">{log.performedByUserName}</strong>
                      </span>
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {log.targetEntityId}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-600 italic bg-amber-50/50 p-1.5 rounded border border-amber-100">
                        &quot;{log.reason}&quot;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Registry protection active</span>
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
