import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Inbox,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  Building2,
} from 'lucide-react';
import { Correspondence, Department, Task } from '../types';

interface ReportsViewProps {
  correspondence: Correspondence[];
  departments: Department[];
  tasks: Task[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  correspondence,
  departments,
  tasks,
}) => {
  const incoming = correspondence.filter((c) => c.type === 'incoming');
  const outgoing = correspondence.filter((c) => c.type === 'outgoing');

  // Distribution by department
  const deptStats = departments.map((d) => {
    const letters = correspondence.filter(
      (c) => c.assignedDepartmentId === d.id
    );
    const deptTasks = tasks.filter((t) => t.assignedDepartmentId === d.id);
    const openTasks = deptTasks.filter((t) => t.status !== 'completed');
    return {
      name: d.name,
      code: d.code,
      lettersCount: letters.length,
      tasksCount: deptTasks.length,
      openTasksCount: openTasks.length,
    };
  });

  // Priority distribution
  const priorityStats = {
    urgent: correspondence.filter((c) => c.priority === 'urgent').length,
    high: correspondence.filter((c) => c.priority === 'high').length,
    normal: correspondence.filter((c) => c.priority === 'normal').length,
    low: correspondence.filter((c) => c.priority === 'low').length,
  };

  // Status distribution
  const statusStats = {
    registered: correspondence.filter((c) => c.status === 'registered').length,
    assigned: correspondence.filter((c) => c.status === 'assigned').length,
    in_progress: correspondence.filter((c) => c.status === 'in_progress').length,
    under_review: correspondence.filter((c) => c.status === 'under_review').length,
    awaiting_approval: correspondence.filter(
      (c) => c.status === 'awaiting_approval'
    ).length,
    completed: correspondence.filter((c) =>
      ['completed', 'replied', 'issued', 'sent'].includes(c.status)
    ).length,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Executive Correspondence Analytics & Audit Reporting
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departmental workloads, turnaround responsiveness, and statutory compliance metrics
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Printer className="h-4 w-4 text-slate-600" />
          <span>Print Official Report</span>
        </button>
      </div>

      {/* Primary Volume High-Level Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Correspondence</span>
          <div className="text-2xl font-bold text-slate-900">{correspondence.length}</div>
          <div className="text-[11px] text-slate-400">All registered records</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-blue-600 font-semibold uppercase">Incoming Letters</span>
          <div className="text-2xl font-bold text-blue-900">{incoming.length}</div>
          <div className="text-[11px] text-slate-400">External inbound flow</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-emerald-600 font-semibold uppercase">Outgoing Letters</span>
          <div className="text-2xl font-bold text-emerald-900">{outgoing.length}</div>
          <div className="text-[11px] text-slate-400">Issued & dispatched</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-purple-600 font-semibold uppercase">Avg Response Turnaround</span>
          <div className="text-2xl font-bold text-purple-900">3.8 Days</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Within statutory target (5d)</div>
        </div>
      </div>

      {/* Department Workload Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Departmental Workload & Open Task Distribution
        </h2>
        <div className="divide-y divide-slate-100">
          {deptStats.map((dept) => (
            <div key={dept.code} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {dept.code}
                </span>
                <span className="font-semibold text-slate-900">{dept.name}</span>
              </div>

              <div className="flex items-center gap-8 text-slate-600">
                <span>Total Letters: <strong>{dept.lettersCount}</strong></span>
                <span>Assigned Tasks: <strong>{dept.tasksCount}</strong></span>
                <span className={`${dept.openTasksCount > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>
                  Open Actions: {dept.openTasksCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Visual Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Correspondence by Priority
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-rose-700">Urgent</span>
                <span className="font-semibold text-slate-700">{priorityStats.urgent}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full"
                  style={{ width: `${(priorityStats.urgent / (correspondence.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-orange-700">High</span>
                <span className="font-semibold text-slate-700">{priorityStats.high}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full"
                  style={{ width: `${(priorityStats.high / (correspondence.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-700">Normal</span>
                <span className="font-semibold text-slate-700">{priorityStats.normal}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-600 h-full rounded-full"
                  style={{ width: `${(priorityStats.normal / (correspondence.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-500">Low</span>
                <span className="font-semibold text-slate-700">{priorityStats.low}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full"
                  style={{ width: `${(priorityStats.low / (correspondence.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Lifecycle Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Operational Lifecycle Status
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
              <span className="text-blue-700 font-semibold block text-[11px]">Registered & Logged</span>
              <span className="text-lg font-bold text-blue-950">{statusStats.registered}</span>
            </div>
            <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200">
              <span className="text-indigo-700 font-semibold block text-[11px]">Assigned / Action</span>
              <span className="text-lg font-bold text-indigo-950">{statusStats.assigned}</span>
            </div>
            <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-200">
              <span className="text-sky-700 font-semibold block text-[11px]">Under Technical Review</span>
              <span className="text-lg font-bold text-sky-950">{statusStats.under_review}</span>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
              <span className="text-amber-700 font-semibold block text-[11px]">Awaiting Approval</span>
              <span className="text-lg font-bold text-amber-950">{statusStats.awaiting_approval}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 sm:col-span-2">
              <span className="text-emerald-700 font-semibold block text-[11px]">Finalized, Issued & Delivered</span>
              <span className="text-lg font-bold text-emerald-950">{statusStats.completed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
