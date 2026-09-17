import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Layers,
  Mail,
  Briefcase,
  Search,
  Layout,
  Maximize2,
  ChevronDown,
  UserCheck,
  LogOut,
  SlidersHorizontal,
  Inbox,
  Send,
  Building,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { User } from '../types';
import { PjmakLogo } from './PjmakLogo';

interface RegisterWorkspaceHeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onBackToDashboard: () => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  onOpenGlobalSearch: () => void;
  counts?: {
    technicalDocs?: number;
    correspondenceTotal?: number;
    incoming?: number;
    outgoing?: number;
    internal?: number;
    commercial?: number;
  };
  layoutMode: 'full_page' | 'sidebar';
  onToggleLayoutMode: () => void;
}

export const RegisterWorkspaceHeader: React.FC<RegisterWorkspaceHeaderProps> = ({
  activeTab,
  onSelectTab,
  onBackToDashboard,
  currentUser,
  users,
  onSwitchUser,
  onLogout,
  onOpenGlobalSearch,
  counts,
  layoutMode,
  onToggleLayoutMode,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [corrDropdownOpen, setCorrDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const corrDropdownRef = useRef<HTMLDivElement>(null);

  const safeCounts = {
    technicalDocs: counts?.technicalDocs ?? 0,
    correspondenceTotal: counts?.correspondenceTotal ?? 0,
    incoming: counts?.incoming ?? 0,
    outgoing: counts?.outgoing ?? 0,
    internal: counts?.internal ?? 0,
    commercial: counts?.commercial ?? 0,
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (corrDropdownRef.current && !corrDropdownRef.current.contains(event.target as Node)) {
        setCorrDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCorrActive =
    activeTab === 'correspondence' ||
    activeTab === 'incoming' ||
    activeTab === 'outgoing' ||
    activeTab === 'internal';

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-xs z-30 select-none">
      {/* Left Section: Back to Dashboard & Workspace Brand */}
      <div className="flex items-center gap-3">
        {/* Primary Return to Dashboard Button */}
        <button
          onClick={onBackToDashboard}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 hover:border-blue-300 font-semibold text-xs transition-all cursor-pointer shadow-2xs"
          title="Return to Executive Dashboard & Main Navigation Sidebar"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500 group-hover:text-blue-700 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Brand & Active Register Title */}
        <div className="flex items-center gap-2.5">
          <PjmakLogo size="sm" />
          <div className="hidden md:block">
            <span className="font-extrabold text-blue-950 text-xs tracking-tight block">
              PJMAK Integrated Systems
            </span>
            <span className="text-[10px] text-slate-500 font-medium block -mt-0.5">
              {activeTab === 'technical_docs'
                ? 'Technical Document Management System (EDMS)'
                : isCorrActive
                ? 'Official Correspondence Register Workspace'
                : 'Commercial & Financial Register'}
            </span>
          </div>
        </div>
      </div>

      {/* Center Section: Spacious Workspace Switcher */}
      <div className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
        {/* Technical Documents (EDMS) Tab */}
        <button
          onClick={() => onSelectTab('technical_docs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'technical_docs'
              ? 'bg-white text-blue-950 shadow-xs border border-slate-200/80 ring-1 ring-blue-500/20'
              : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
          }`}
        >
          <Layers className={`h-3.5 w-3.5 ${activeTab === 'technical_docs' ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>Technical Documents (EDMS)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'technical_docs' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200/80 text-slate-600'
          }`}>
            {safeCounts.technicalDocs}
          </span>
        </button>

        {/* Correspondence Register Dropdown / Tab */}
        <div className="relative" ref={corrDropdownRef}>
          <div className="flex items-center">
            <button
              onClick={() => onSelectTab('correspondence')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-l-lg text-xs font-bold transition-all cursor-pointer ${
                isCorrActive
                  ? 'bg-white text-blue-950 shadow-xs border-y border-l border-slate-200/80 ring-1 ring-blue-500/20'
                  : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
              }`}
            >
              <Mail className={`h-3.5 w-3.5 ${isCorrActive ? 'text-blue-700' : 'text-slate-400'}`} />
              <span>
                {activeTab === 'incoming'
                  ? 'Incoming Letters'
                  : activeTab === 'outgoing'
                  ? 'Outgoing Letters'
                  : activeTab === 'internal'
                  ? 'Internal (IC)'
                  : 'Correspondence Register'}
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isCorrActive ? 'bg-blue-100 text-blue-950' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {safeCounts.correspondenceTotal}
              </span>
            </button>
            <button
              onClick={() => setCorrDropdownOpen(!corrDropdownOpen)}
              className={`px-2 py-1.5 rounded-r-lg text-xs font-bold transition-all cursor-pointer ${
                isCorrActive
                  ? 'bg-white text-blue-950 shadow-xs border-y border-r border-slate-200/80 ring-1 ring-blue-500/20'
                  : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
              }`}
              title="Select specific correspondence sub-register"
            >
              <ChevronDown className="h-3 w-3 text-slate-500" />
            </button>
          </div>

          {corrDropdownOpen && (
            <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 text-xs animate-in fade-in slide-in-from-top-1">
              <button
                onClick={() => {
                  onSelectTab('correspondence');
                  setCorrDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-blue-50 cursor-pointer ${
                  activeTab === 'correspondence' ? 'bg-blue-50/70 font-bold text-blue-950' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-blue-700" />
                  <span>All Registers (Unified)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{safeCounts.correspondenceTotal}</span>
              </button>
              <button
                onClick={() => {
                  onSelectTab('incoming');
                  setCorrDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-blue-50 cursor-pointer ${
                  activeTab === 'incoming' ? 'bg-blue-50/70 font-bold text-blue-950' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Inbox className="h-3.5 w-3.5 text-sky-600" />
                  <span>Incoming Register</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{safeCounts.incoming}</span>
              </button>
              <button
                onClick={() => {
                  onSelectTab('outgoing');
                  setCorrDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-blue-50 cursor-pointer ${
                  activeTab === 'outgoing' ? 'bg-blue-50/70 font-bold text-blue-950' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-blue-600" />
                  <span>Outgoing Register</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{safeCounts.outgoing}</span>
              </button>
              <button
                onClick={() => {
                  onSelectTab('internal');
                  setCorrDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-blue-50 cursor-pointer ${
                  activeTab === 'internal' ? 'bg-blue-50/70 font-bold text-blue-950' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-purple-600" />
                  <span>Internal Correspondence (IC)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{safeCounts.internal}</span>
              </button>
            </div>
          )}
        </div>

        {/* Commercial & Financial Tab */}
        <button
          onClick={() => onSelectTab('commercial')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'commercial'
              ? 'bg-white text-blue-950 shadow-xs border border-slate-200/80 ring-1 ring-blue-500/20'
              : 'text-slate-600 hover:text-blue-950 hover:bg-white/60'
          }`}
        >
          <Briefcase className={`h-3.5 w-3.5 ${activeTab === 'commercial' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Commercial & Financial</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'commercial' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200/80 text-slate-600'
          }`}>
            {safeCounts.commercial}
          </span>
        </button>
      </div>

      {/* Right Section: Tools, Layout Toggle & User Profile */}
      <div className="flex items-center gap-2">
        {/* Global Search Button */}
        <button
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors cursor-pointer"
          title="Global Search across all correspondence and documents (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline-block px-1 py-0.2 bg-white text-slate-400 rounded text-[9px] font-mono border border-slate-200">
            /
          </kbd>
        </button>

        {/* Layout Toggle: Full Page vs Dock to Sidebar */}
        <button
          onClick={onToggleLayoutMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer border border-slate-200/80"
          title={
            layoutMode === 'full_page'
              ? 'Click to show the left navigation sidebar alongside this register'
              : 'Click to hide the sidebar and view this register in full screen'
          }
        >
          {layoutMode === 'full_page' ? (
            <>
              <Layout className="h-3.5 w-3.5 text-blue-700" />
              <span className="hidden sm:inline text-[11px]">Show Sidebar</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5 text-blue-700" />
              <span className="hidden sm:inline text-[11px]">Hide Sidebar</span>
            </>
          )}
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* User Profile & Switcher */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                {currentUser.role}
              </span>
            </div>
            <div className="h-7 w-7 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {currentUser.name.charAt(0)}
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70">
                <span className="font-bold text-slate-900 block">{currentUser.name}</span>
                <span className="text-slate-500 text-[11px] block">{currentUser.email}</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold">
                  {currentUser.departmentName || 'Headquarters'}
                </span>
              </div>

              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active User
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u.id);
                      setUserMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-blue-50 cursor-pointer ${
                      u.id === currentUser.id ? 'bg-blue-50/70 text-blue-950 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{u.name}</span>
                    <span className="text-[10px] text-slate-400">{u.role}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-1.5 text-left text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
