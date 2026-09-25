import React from 'react';
import {
  Search,
  Bell,
  Clock,
  CheckCircle2,
  Menu,
  Maximize2,
} from 'lucide-react';
import { User, Task } from '../types';
import { PjmakLogo } from './PjmakLogo';

interface HeaderProps {
  currentUser: User;
  users: User[];
  onSwitchUser: (userId: string) => void;
  onOpenGlobalSearch: () => void;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onLogout?: () => void;
  onOpenAdminUsers?: () => void;
  onOpenMobileMenu?: () => void;
  isRegisterActive?: boolean;
  onExpandToFullScreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenGlobalSearch,
  tasks,
  onSelectTask,
  onOpenMobileMenu,
  isRegisterActive,
  onExpandToFullScreen,
}) => {
  const [showNotificationMenu, setShowNotificationMenu] = React.useState(false);

  const myPendingTasks = tasks.filter(
    (t) => t.assignedUserId === currentUser.id && t.status !== 'completed'
  );

  return (
    <header className="h-14 bg-white border-b border-blue-100/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Mobile Brand / Toggle (only visible on mobile, since left sidebar covers desktop) */}
      <div className="flex md:hidden items-center gap-2">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="Open Menu"
            aria-label="Open Navigation"
          >
            <Menu className="h-5 w-5 text-blue-950" />
          </button>
        )}
        <div className="h-8 w-8 rounded-lg bg-white border border-blue-100 shadow-2xs flex items-center justify-center p-1 overflow-hidden">
          <PjmakLogo variant="compact" size="sm" />
        </div>
        <span className="font-extrabold text-blue-950 tracking-tight text-base">
          PJMAK
        </span>
      </div>

      {/* General System-Wide Search Trigger */}
      <div className="flex-1 max-w-2xl">
        <button
          onClick={onOpenGlobalSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-slate-400 bg-slate-50/80 hover:bg-blue-50/60 border border-blue-100 hover:border-blue-200 rounded-xl transition-all cursor-pointer group"
          title="Search letters, technical documents, contacts, contracts..."
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Search className="h-4 w-4 text-blue-900/60 group-hover:text-blue-900 transition-colors shrink-0" />
            <span className="truncate text-slate-500 group-hover:text-slate-700">
              Search system-wide: letters, EDMS technical docs, contacts, contracts...
            </span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-blue-950/70 bg-white border border-blue-200 rounded shadow-2xs">
              /
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 ml-4">
        {/* Expand Register to Full-Screen Workspace (when register active) */}
        {isRegisterActive && onExpandToFullScreen && (
          <button
            onClick={onExpandToFullScreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Switch to Full-Page Spacious Register Workspace (hides sidebar for wider view)"
          >
            <Maximize2 className="h-3.5 w-3.5 text-blue-700" />
            <span className="hidden sm:inline">Full Screen Register</span>
          </button>
        )}

        {/* Action Tasks & Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="p-2 text-slate-600 hover:text-blue-950 hover:bg-blue-50 rounded-xl relative transition-colors cursor-pointer border border-transparent hover:border-blue-100"
            title="Tasks & Reminders"
          >
            <Bell className="h-4.5 w-4.5" />
            {myPendingTasks.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center leading-none">
                {myPendingTasks.length}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
                  Pending Tasks ({myPendingTasks.length})
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {currentUser.name}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {myPendingTasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                    No pending correspondence tasks assigned to you.
                  </div>
                ) : (
                  myPendingTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        onSelectTask(task);
                        setShowNotificationMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors block cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-900">
                          {task.correspondenceNumber}
                        </span>
                        <span className="text-[10px] font-medium text-rose-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due {task.dueDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {task.correspondenceSubject}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {(task.taskType || 'task').replace(/_/g, ' ')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
