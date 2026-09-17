import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Share2,
  MessageSquare,
  ChevronRight,
  Send,
  FileText,
} from 'lucide-react';
import { Task, User, Correspondence } from '../types';

interface TasksViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onOpenCorrespondence: (corrId: string) => void;
  onUpdateTaskStatus: (
    taskId: string,
    status: 'assigned' | 'in_progress' | 'completed',
    comment?: string
  ) => Promise<void>;
  onAddTaskComment: (taskId: string, comment: string) => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  users,
  currentUser,
  onOpenCorrespondence,
  onUpdateTaskStatus,
  onAddTaskComment,
}) => {
  const [filterTab, setFilterTab] = useState<
    'my' | 'all_open' | 'urgent_overdue' | 'completed'
  >('my');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    if (filterTab === 'my') {
      return t.assignedUserId === currentUser.id && t.status !== 'completed';
    }
    if (filterTab === 'all_open') {
      return t.status !== 'completed';
    }
    if (filterTab === 'urgent_overdue') {
      return t.status !== 'completed' && t.dueDate <= todayStr;
    }
    if (filterTab === 'completed') {
      return t.status === 'completed';
    }
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDueDateLabel = (dueDate: string, status: string) => {
    if (status === 'completed') {
      return <span className="text-emerald-600 font-medium">Completed</span>;
    }
    if (dueDate < todayStr) {
      return (
        <span className="text-rose-600 font-bold flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Overdue ({dueDate})
        </span>
      );
    }
    if (dueDate === todayStr) {
      return (
        <span className="text-amber-600 font-bold flex items-center gap-1">
          <Clock className="h-3 w-3" /> Due Today
        </span>
      );
    }
    return (
      <span className="text-slate-500 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Due {dueDate}
      </span>
    );
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;
    try {
      await onAddTaskComment(selectedTask.id, newCommentText);
      // update local view
      const updated = {
        ...selectedTask,
        comments: [
          ...selectedTask.comments,
          {
            id: `cm-${Date.now()}`,
            taskId: selectedTask.id,
            userId: currentUser.id,
            userName: currentUser.name,
            comment: newCommentText,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      setSelectedTask(updated);
      setNewCommentText('');
    } catch (e) {
      alert('Failed to add comment');
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedTask) return;
    try {
      await onUpdateTaskStatus(selectedTask.id, 'completed', completionNote);
      setShowCompleteModal(false);
      setCompletionNote('');
      setSelectedTask((prev) =>
        prev ? { ...prev, status: 'completed' } : null
      );
    } catch (e) {
      alert('Failed to complete task');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-800">
            <CheckSquare className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Internal Correspondence Action Queue
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Track letters forwarded for review, response drafting, technical observation, and departmental sign-off
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setFilterTab('my')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterTab === 'my'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'hover:bg-slate-100'
          }`}
        >
          My Tasks (
          {
            tasks.filter(
              (t) =>
                t.assignedUserId === currentUser.id && t.status !== 'completed'
            ).length
          }
          )
        </button>
        <button
          onClick={() => setFilterTab('all_open')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterTab === 'all_open'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'hover:bg-slate-100'
          }`}
        >
          All Open Tasks (
          {tasks.filter((t) => t.status !== 'completed').length})
        </button>
        <button
          onClick={() => setFilterTab('urgent_overdue')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterTab === 'urgent_overdue'
              ? 'bg-rose-700 text-white shadow-2xs'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          Overdue & Due Today (
          {
            tasks.filter(
              (t) => t.status !== 'completed' && t.dueDate <= todayStr
            ).length
          }
          )
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterTab === 'completed'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'hover:bg-slate-100'
          }`}
        >
          Completed (
          {tasks.filter((t) => t.status === 'completed').length})
        </button>
      </div>

      {/* Main Grid: Task List & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Task Cards */}
        <div className="lg:col-span-2 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
              No tasks found in this view.
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className={`p-4 bg-white rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  selectedTask?.id === t.id
                    ? 'border-sky-500 ring-1 ring-sky-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {t.correspondenceNumber}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {t.taskType.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-1">
                      {t.correspondenceSubject}
                    </div>
                  </div>

                  <div className="text-right text-xs shrink-0">
                    {getDueDateLabel(t.dueDate, t.status)}
                    <div className="text-[10px] text-slate-400 mt-1 capitalize font-medium">
                      Status: {t.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2.5 line-clamp-2">
                  {t.instructions}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                  <span>
                    Assigned to: <strong className="text-slate-700">{t.assignedUserName}</strong> ({t.assignedDepartmentName})
                  </span>
                  <div className="flex items-center gap-1.5 text-sky-600 font-semibold">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{t.comments.length} notes</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right 1 Col: Selected Task Action Drawer */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[600px]">
          {selectedTask ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Task Details
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900">
                    {selectedTask.correspondenceNumber}
                  </div>
                </div>
                <button
                  onClick={() =>
                    onOpenCorrespondence(selectedTask.correspondenceId)
                  }
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 rounded-md border border-sky-200 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Open Letter</span>
                </button>
              </div>

              {/* Task Details Content */}
              <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
                <div>
                  <div className="font-bold text-slate-800 text-xs mb-1">
                    {selectedTask.correspondenceSubject}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Due Date: <strong>{selectedTask.dueDate}</strong></span>
                    <span className="capitalize font-semibold text-slate-700">
                      {selectedTask.status}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Mandated Action & Instructions
                  </div>
                  <div className="text-slate-800 leading-relaxed">
                    {selectedTask.instructions}
                  </div>
                </div>

                {/* Workflow Status Buttons */}
                {selectedTask.status !== 'completed' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Complete & Resolve Task</span>
                    </button>
                    {selectedTask.status === 'assigned' && (
                      <button
                        onClick={() =>
                          onUpdateTaskStatus(selectedTask.id, 'in_progress')
                        }
                        className="w-full py-1.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Mark In Progress
                      </button>
                    )}
                  </div>
                )}

                {/* Task Comment Discussion Feed */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="font-bold text-slate-700 text-xs">
                    Internal Collaboration Notes ({selectedTask.comments.length})
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTask.comments.length === 0 ? (
                      <div className="text-slate-400 text-[11px] italic">
                        No comments recorded yet.
                      </div>
                    ) : (
                      selectedTask.comments.map((cm) => (
                        <div
                          key={cm.id}
                          className="p-2.5 bg-slate-50 rounded border border-slate-100 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <strong className="text-slate-700">{cm.userName}</strong>
                            <span>{new Date(cm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-700">{cm.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Add Comment Box */}
              <form
                onSubmit={handleSendComment}
                className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Type an internal update or observation..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-400 text-xs">
              Select a task from the list to view instructions, comment history, and status controls.
            </div>
          )}
        </div>
      </div>

      {/* Completion Resolution Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-emerald-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Mark Task Completed</span>
            </div>
            <p className="text-xs text-slate-600">
              Confirm resolution of task for correspondence{' '}
              <strong>{selectedTask?.correspondenceNumber}</strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Completion Resolution Notes *
              </label>
              <textarea
                rows={3}
                required
                placeholder="State how this task was resolved (e.g. Reviewed schedule, prepared draft response, site visit completed)..."
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkComplete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
