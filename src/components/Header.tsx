import React from 'react';
import {
  FileText,
  Search,
  Bell,
  Shield,
  ChevronDown,
  Building2,
  Clock,
  CheckCircle2,
  LogOut,
  UserCog,
  Key,
  Menu,
  Maximize2,
} from 'lucide-react';
import { User, Task } from '../types';
import { PjmakLogo } from './PjmakLogo';
import { PWAInstallButton } from './PWAInstallButton';

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
  users,
  onSwitchUser,
  onOpenGlobalSearch,
  tasks,
  onSelectTask,
  onLogout,
  onOpenAdminUsers,
  onOpenMobileMenu,
  isRegisterActive,
  onExpandToFullScreen,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = React.useState(false);

  const myPendingTasks = tasks.filter(
    (t) => t.assignedUserId === currentUser.id && t.status !== 'completed'
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'officer':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'manager':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-blue-100 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Identity & Mobile Menu Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="Open Menu"
            aria-label="Open Navigation"
          >
            <Menu className="h-5 w-5 text-blue-950" />
          </button>
        )}
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white border border-blue-100 shadow-2xs flex items-center justify-center p-1 overflow-hidden">
          <PjmakLogo variant="compact" size="sm" />
        </div>
        <div>
          <span className="font-extrabold text-blue-950 tracking-tight text-base sm:text-lg">
            PJMAK
          </span>
        </div>
      </div>

      {/* Center Search Trigger */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <button
          onClick={onOpenGlobalSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-slate-400 bg-slate-50 hover:bg-blue-50/50 border border-blue-100 hover:border-blue-200 rounded-lg transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-800/60" />
            <span>Search letters, ref no, contacts, subject...</span>
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-blue-950/70 bg-white border border-blue-200 rounded shadow-2xs">
            /
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Expand Register to Full-Screen Workspace (when register active with sidebar) */}
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

        {/* PWA Install Desktop App Button */}
        <PWAInstallButton compact={true} />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowUserMenu(false);
            }}
            className="p-2 text-slate-600 hover:text-blue-950 hover:bg-blue-50 rounded-lg relative transition-colors cursor-pointer border border-transparent hover:border-blue-100"
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
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
                  Action Tasks for You ({myPendingTasks.length})
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
                        {task.taskType.replace(/_/g, ' ')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current User & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer text-left"
          >
            <div className="h-7 w-7 rounded-full bg-slate-800 text-white text-xs font-semibold flex items-center justify-center">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser.title}
              </div>
            </div>
            <span
              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(
                currentUser.role
              )}`}
            >
              {currentUser.role}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(
                      currentUser.role
                    )}`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {currentUser.title} • {currentUser.departmentName}
                </div>
              </div>

              {/* Admin quick link to manage users */}
              {currentUser.role === 'admin' && onOpenAdminUsers && (
                <div className="p-2 border-b border-slate-100">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAdminUsers();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <UserCog className="h-4 w-4 text-sky-600" />
                    <span>Manage Users & Passwords</span>
                  </button>
                </div>
              )}

              {/* Persona switch if multiple users */}
              {users.length > 1 && (
                <>
                  <div className="px-4 pt-2.5 pb-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Switch User Account ({users.length})
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                          u.id === currentUser.id ? 'bg-sky-50/50' : ''
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {u.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {u.title}
                          </div>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Sign Out Action */}
              {onLogout && (
                <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="h-4 w-4 text-rose-600" />
                    <span>Sign Out of Registry</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
