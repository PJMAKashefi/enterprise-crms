import React from 'react';
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
} from 'lucide-react';
import { User } from '../types';
import { PjmakLogo } from './PjmakLogo';

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
}) => {
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

  return (
    <aside className="hidden md:flex w-64 bg-[#F0F5FA] text-slate-700 flex-col shrink-0 border-r border-blue-100/90 select-none">
      {/* Brand Header Banner */}
      <div className="p-4 border-b border-blue-100 bg-white flex flex-col items-center">
        <div className="w-full bg-white rounded-xl p-2.5 border border-blue-100 shadow-2xs flex items-center justify-center">
          <PjmakLogo variant="full" size="md" />
        </div>
        <div className="mt-2.5 text-center w-full">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xs font-bold text-blue-950 tracking-wide">Ali Kashefi</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 font-semibold">
              Managing Director
            </span>
          </div>
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

      {/* Footer info box */}
      <div className="p-3 m-3 rounded-xl bg-white border border-blue-100 text-[11px] text-slate-600 space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-blue-950">Registry Safe</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Sequential lock active. Official numbers & audit entries guaranteed.
        </p>
      </div>
    </aside>
  );
};
