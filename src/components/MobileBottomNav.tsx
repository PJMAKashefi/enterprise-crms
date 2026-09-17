import React from 'react';
import {
  LayoutDashboard,
  Mail,
  Plus,
  Briefcase,
  CheckSquare,
  Menu,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  incomingCount: number;
  outgoingCount: number;
  draftedCount: number;
  pendingTasksCount: number;
  onNewLetter: () => void;
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  incomingCount,
  outgoingCount,
  draftedCount,
  pendingTasksCount,
  onNewLetter,
  onOpenMobileMenu,
}) => {
  const isCorrespondenceActive =
    activeTab === 'correspondence' ||
    activeTab === 'incoming' ||
    activeTab === 'outgoing' ||
    activeTab === 'internal';

  const totalCorrespondence = incomingCount + outgoingCount;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 shadow-lg flex items-center justify-around select-none">
      {/* 1. Dashboard */}
      <button
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] transition-colors ${
          activeTab === 'dashboard'
            ? 'text-blue-900 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span className="text-[10px] mt-0.5">Overview</span>
      </button>

      {/* 2. Correspondence */}
      <button
        onClick={() => onSelectTab('correspondence')}
        className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] transition-colors ${
          isCorrespondenceActive
            ? 'text-blue-900 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <Mail className="h-5 w-5" />
          {totalCorrespondence > 0 && (
            <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-blue-600 text-white">
              {totalCorrespondence}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Registers</span>
      </button>

      {/* 3. Center Create Floating Action */}
      <div className="flex flex-col items-center -mt-5">
        <button
          onClick={onNewLetter}
          className="h-12 w-12 rounded-full bg-blue-900 hover:bg-blue-950 text-white flex items-center justify-center shadow-lg border-2 border-white transform active:scale-95 transition-all"
          title="Compose / Register Letter"
          aria-label="New Letter"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
        <span className="text-[9px] font-bold text-blue-950 mt-0.5">New</span>
      </div>

      {/* 4. Tasks & Approvals */}
      <button
        onClick={() => onSelectTab('tasks')}
        className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] transition-colors ${
          activeTab === 'tasks'
            ? 'text-blue-900 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <CheckSquare className="h-5 w-5" />
          {pendingTasksCount > 0 && (
            <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white">
              {pendingTasksCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Tasks</span>
      </button>

      {/* 5. Menu / More Drawer */}
      <button
        onClick={onOpenMobileMenu}
        className="relative flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] text-slate-500 hover:text-slate-800 transition-colors"
      >
        <div className="relative">
          <Menu className="h-5 w-5" />
        </div>
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </nav>
  );
};
