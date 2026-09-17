import React from 'react';
import {
  X,
  LayoutDashboard,
  Inbox,
  Send,
  ArrowLeftRight,
  CheckSquare,
  GitBranch,
  Users,
  Archive,
  BarChart3,
  Settings,
  Mail,
  Clock,
  LogOut,
  Shield,
  Search,
  Layers,
  Briefcase,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { User, CompanySettings } from '../types';
import { PjmakLogo } from './PjmakLogo';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (userId: string) => void;
  incomingCount: number;
  outgoingCount: number;
  internalCount: number;
  pendingTasksCount: number;
  draftedCount: number;
  settings: CompanySettings;
  onOpenGlobalSearch: () => void;
  onLogout?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  currentUser,
  users,
  onSwitchUser,
  incomingCount,
  outgoingCount,
  internalCount,
  pendingTasksCount,
  draftedCount,
  settings,
  onOpenGlobalSearch,
  onLogout,
}) => {
  if (!isOpen) return null;

  const totalCorrespondence = incomingCount + outgoingCount + internalCount;

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    {
      id: 'correspondence',
      label: 'Correspondence Register',
      icon: Mail,
      badge: totalCorrespondence,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'technical_docs',
      label: 'Technical Documents (EDMS)',
      icon: Layers,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'commercial',
      label: 'Commercial & Financial',
      icon: Briefcase,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'tasks',
      label: 'Tasks & Approvals',
      icon: CheckSquare,
      badge: pendingTasksCount,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    { id: 'chains', label: 'Communication Chains', icon: GitBranch },
    { id: 'contacts', label: 'Contact Directory', icon: Users },
    { id: 'archive', label: 'Archive & Folders', icon: Archive },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'admin', label: 'System Settings & Users', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-4/5 max-w-xs bg-[#F0F5FA] h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-4 bg-white border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PjmakLogo variant="compact" size="sm" />
            <div>
              <span className="font-extrabold text-blue-950 text-base">PJMAK</span>
              <span className="block text-[10px] text-slate-500 font-medium">
                Correspondence System
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 bg-blue-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs truncate">{currentUser.name}</div>
              <div className="text-[11px] text-blue-200 truncate">{currentUser.title}</div>
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-800 text-blue-100 mt-1 uppercase">
                {currentUser.role}
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <button
            onClick={() => {
              onClose();
              onOpenGlobalSearch();
            }}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-blue-100"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search all correspondence...</span>
          </button>
        </div>

        {/* Email Drafts Status Alert Banner in Menu */}
        {draftedCount > 0 && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold block text-[11px]">
                  {draftedCount} Email Draft{draftedCount === 1 ? '' : 's'}
                </span>
                <span className="text-[10px] text-amber-800">Pending EOD dispatch</span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onSelectTab('outgoing');
              }}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded"
            >
              View
            </button>
          </div>
        )}

        {/* Navigation List */}
        <div className="flex-1 px-3 py-3 space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-blue-900 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-blue-100/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isCurrent ? 'text-blue-200' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isCurrent ? 'bg-white text-blue-900' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Switch & Logout */}
        <div className="p-3 bg-white border-t border-blue-100 space-y-2">
          <div className="text-[10px] font-bold uppercase text-slate-400 px-1">Switch User</div>
          <div className="grid grid-cols-2 gap-1.5">
            {users.slice(0, 4).map((u) => (
              <button
                key={u.id}
                onClick={() => onSwitchUser(u.id)}
                className={`px-2 py-1.5 rounded-lg text-[11px] text-left truncate border ${
                  u.id === currentUser.id
                    ? 'border-blue-700 bg-blue-50 font-bold text-blue-900'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {u.name.split(' ')[0]} ({u.role[0].toUpperCase()})
              </button>
            ))}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
