import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Mail,
  Layers,
  Briefcase,
  CheckSquare,
  GitBranch,
  Users,
  Archive,
  BarChart3,
  Settings,
  FileText,
  ChevronUp,
  LogOut,
  UserCheck,
  Shield,
  Laptop,
} from 'lucide-react';
import { User } from '../types';
import { PjmakLogo } from './PjmakLogo';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab =
  | 'dashboard'
  | 'correspondence'
  | 'incoming'
  | 'outgoing'
  | 'internal'
  | 'technical_docs'
  | 'commercial'
  | 'tasks'
  | 'chains'
  | 'contacts'
  | 'archive'
  | 'reports'
  | 'admin';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  incomingCount: number;
  outgoingCount: number;
  internalCount: number;
  pendingTasksCount: number;
  draftedCount?: number;
  currentUser: User;
  users?: User[];
  onSwitchUser?: (userId: string) => void;
  onLogout?: () => void;
  onOpenAdminUsers?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  incomingCount,
  outgoingCount,
  internalCount,
  pendingTasksCount,
  draftedCount = 0,
  currentUser,
  users = [],
  onSwitchUser,
  onLogout,
  onOpenAdminUsers,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const totalCorrespondence = incomingCount + outgoingCount + internalCount;

  // Normalized active state for correspondence sub-registers
  const isCorrespondenceActive =
    activeTab === 'correspondence' ||
    activeTab === 'incoming' ||
    activeTab === 'outgoing' ||
    activeTab === 'internal';

  const executiveItems: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
    },
  ];

  const operationalRegisters: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
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
  ];

  const toolsAndGovernance: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'tasks',
      label: 'Tasks & Approvals',
      icon: CheckSquare,
      badge: pendingTasksCount,
      badgeColor: pendingTasksCount > 0 ? 'bg-rose-100 text-rose-700 font-bold' : undefined,
    },
    {
      id: 'chains',
      label: 'Communication Chains',
      icon: GitBranch,
    },
    {
      id: 'contacts',
      label: 'Contact Directory',
      icon: Users,
    },
    {
      id: 'archive',
      label: 'Archive & Folders',
      icon: Archive,
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
    },
  ];

  const adminItems: {
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'admin',
      label: 'Administration',
      icon: Settings,
    },
  ];

  const renderNavButton = (
    item: {
      id: ActiveTab;
      label: string;
      icon: React.ElementType;
      badge?: number;
      badgeColor?: string;
    },
    isActiveOverride?: boolean
  ) => {
    const Icon = item.icon;
    const isActive = isActiveOverride !== undefined ? isActiveOverride : activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onSelectTab(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          isActive
            ? 'bg-white text-blue-950 font-bold border-l-4 border-blue-900 shadow-2xs ring-1 ring-blue-100/80'
            : 'text-slate-700 hover:bg-blue-100/60 hover:text-blue-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon
            className={`h-4 w-4 ${
              isActive ? 'text-blue-900' : 'text-blue-700/60'
            }`}
          />
          <span>{item.label}</span>
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              isActive
                ? 'bg-blue-100 text-blue-950 font-bold'
                : item.badgeColor || 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'officer':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'manager':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <aside className="hidden md:flex w-64 bg-[#F0F5FA] text-slate-700 flex-col shrink-0 border-r border-blue-100/90 select-none h-screen sticky top-0">
      {/* Brand Header Banner: Single official presentation of PJMAK Logo */}
      <div className="p-4 border-b border-blue-100 bg-white flex flex-col items-center">
        <div className="w-full bg-white rounded-xl p-2.5 border border-blue-100 shadow-2xs flex items-center justify-center">
          <PjmakLogo variant="full" size="md" />
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-3 px-3 space-y-3 overflow-y-auto">
        {/* Executive Overview */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold text-blue-950/60 uppercase tracking-wider">
            Executive Overview
          </div>
          {executiveItems.map((item) => renderNavButton(item))}
        </div>

        {/* Operational Registers */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold text-blue-950/60 uppercase tracking-wider">
            Operational Registers
          </div>
          {operationalRegisters.map((item) =>
            renderNavButton(
              item,
              item.id === 'correspondence' ? isCorrespondenceActive : undefined
            )
          )}
        </div>

        {/* Tools & Governance */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold text-blue-950/60 uppercase tracking-wider">
            Tools & Governance
          </div>
          {toolsAndGovernance.map((item) => renderNavButton(item))}
        </div>

        {/* System Control */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold text-blue-950/60 uppercase tracking-wider">
            System Control
          </div>
          {adminItems.map((item) => renderNavButton(item))}
        </div>
      </div>

      {/* User Account, Role & Governance Card at the Bottom of Left Sidebar */}
      <div className="relative border-t border-blue-100 bg-white p-3 shadow-2xs" ref={userMenuRef}>
        {/* User Flyout Popup */}
        {showUserMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-white rounded-xl shadow-2xl border border-blue-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(
                    currentUser.role
                  )}`}
                >
                  {currentUser.role}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.email}</div>
              <div className="text-[10px] text-blue-900 font-medium mt-0.5">{currentUser.department}</div>
            </div>

            {/* Switch User options */}
            {users.length > 1 && onSwitchUser && (
              <div className="py-1">
                <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Officer
                </div>
                <div className="max-h-36 overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                        u.id === currentUser.id ? 'bg-blue-50/70 text-blue-900 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{u.name}</span>
                      {u.id === currentUser.id && (
                        <span className="text-[10px] text-blue-700 font-bold">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-1">
              <div className="p-2">
                <PWAInstallButton compact={true} />
              </div>

              {onOpenAdminUsers && (
                <button
                  onClick={() => {
                    onOpenAdminUsers();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span>System Administration</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* User Card Trigger */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/70 transition-colors cursor-pointer text-left group border border-transparent hover:border-blue-100"
          title="Account profile & system options"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-950">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                {currentUser.title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <span
              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(
                currentUser.role
              )}`}
            >
              {currentUser.role}
            </span>
            <ChevronUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
          </div>
        </button>
      </div>
    </aside>
  );
};
