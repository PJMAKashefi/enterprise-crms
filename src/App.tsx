import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CorrespondenceRegisterView } from './components/CorrespondenceRegisterView';
import { TasksView } from './components/TasksView';
import { CommunicationChainView } from './components/CommunicationChainView';
import { ContactsView } from './components/ContactsView';
import { ReportsView } from './components/ReportsView';
import { AdminView } from './components/AdminView';
import { LoginView } from './components/LoginView';
import { ArchiveView } from './components/ArchiveView';
import { TechnicalDocumentRegisterView } from './components/TechnicalDocumentRegisterView';
import { CommercialFinancialView } from './components/CommercialFinancialView';
import { CorrespondenceDetailModal } from './components/CorrespondenceDetailModal';
import { LetterEditorModal } from './components/LetterEditorModal';
import { ForwardTaskModal } from './components/ForwardTaskModal';
import { EmailDispatchDialog } from './components/EmailDispatchDialog';
import { DraftEndDayReminder } from './components/DraftEndDayReminder';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileDrawer } from './components/MobileDrawer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ExternalDocumentViewer } from './components/ExternalDocumentViewer';
import { RegisterWorkspaceHeader } from './components/RegisterWorkspaceHeader';
import {
  Correspondence,
  CorrespondenceType,
  Task,
  User,
  Department,
  Contact,
  AuditLog,
  CompanySettings,
  NumberingSequences,
  LetterTemplate,
  ActionPurpose,
  Attachment,
  ArchiveFolder,
  TechnicalDocument,
} from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('pjmak_logged_in') === 'true';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Core Data
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [numberSequences, setNumberSequences] =
    useState<NumberingSequences | null>(null);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [archiveFolders, setArchiveFolders] = useState<ArchiveFolder[]>([]);
  const [technicalDocuments, setTechnicalDocuments] = useState<TechnicalDocument[]>([]);

  // Controlled External Reviewer Viewer State (supports URL query param or in-app preview)
  const [externalViewerShareToken, setExternalViewerShareToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('ext_access_token') || params.get('ext_share') || params.get('token');
    if (token) return token;
    if (window.location.pathname.startsWith('/external-access/')) {
      return window.location.pathname.replace('/external-access/', '').split('?')[0];
    }
    return null;
  });
  const [externalViewerShareId, setExternalViewerShareId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share_id');
  });

  // Modals state
  const [selectedCorrespondence, setSelectedCorrespondence] =
    useState<Correspondence | null>(null);
  const [selectedDetailTab, setSelectedDetailTab] = useState<
    'workspace' | 'history' | 'document' | 'tasks' | 'versions' | 'audit' | 'admin_date'
  >('document');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<CorrespondenceType>('outgoing');
  const [replyToItem, setReplyToItem] = useState<Correspondence | null>(null);
  const [forwardModalItem, setForwardModalItem] =
    useState<Correspondence | null>(null);
  const [emailModalItem, setEmailModalItem] =
    useState<Correspondence | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [registerLayoutMode, setRegisterLayoutMode] = useState<'full_page' | 'sidebar'>('full_page');

  const [loading, setLoading] = useState(true);

  // Fetch initial system state
  const fetchData = useCallback(async () => {
    try {
      const [
        sessionRes,
        corrRes,
        tasksRes,
        contactsRes,
        logsRes,
        settingsRes,
        foldersRes,
        docsRes,
      ] = await Promise.all([
        fetch('/api/session').then((r) => r.json()),
        fetch('/api/correspondence').then((r) => r.json()),
        fetch('/api/tasks').then((r) => r.json()),
        fetch('/api/contacts').then((r) => r.json()),
        fetch('/api/audit-logs').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/archive-folders').then((r) => r.json()).catch(() => []),
        fetch('/api/documents').then((r) => r.json()).catch(() => []),
      ]);

      setCurrentUser(sessionRes.currentUser);
      setUsers(sessionRes.users || []);
      setDepartments(sessionRes.departments || []);
      setCorrespondence(corrRes || []);
      setTasks(tasksRes || []);
      setContacts(contactsRes || []);
      setAuditLogs(logsRes || []);
      setSettings(settingsRes.companySettings);
      setNumberSequences(settingsRes.numberSequences);
      setTemplates(settingsRes.templates || []);
      setArchiveFolders(foldersRes || settingsRes.archiveFolders || []);
      setTechnicalDocuments(docsRes || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keyboard shortcut '/' for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Switch User
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/session/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.currentUser) {
        setCurrentUser(data.currentUser);
      }
    } catch (e) {
      alert('Failed to switch persona');
    }
  };

  // Create new correspondence
  const handleSaveCorrespondence = async (data: Partial<Correspondence>) => {
    const res = await fetch('/api/correspondence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save correspondence');
    }
    const created: Correspondence = await res.json();
    setCorrespondence((prev) => [created, ...prev]);

    // refresh logs & tasks
    fetchData();
  };

  // Admin Official Date Modification
  const handleUpdateOfficialDate = async (newDate: string, reason: string) => {
    if (!selectedCorrespondence) return;
    const res = await fetch(`/api/correspondence/${selectedCorrespondence.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        officialDate: newDate,
        adminDateReason: reason,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update official date');
    }
    const updated: Correspondence = await res.json();
    setSelectedCorrespondence(updated);
    setCorrespondence((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    fetchData();
  };

  // Workflow status transition
  const handleTransitionStatus = async (
    newStatus: string,
    notes?: string
  ) => {
    if (!selectedCorrespondence) return;
    const res = await fetch(
      `/api/correspondence/${selectedCorrespondence.id}/transition`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, notes }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to advance status');
    }
    const data = await res.json();
    setSelectedCorrespondence(data.correspondence);
    setCorrespondence((prev) =>
      prev.map((c) => (c.id === data.correspondence.id ? data.correspondence : c))
    );
    fetchData();
  };

  // Void official number
  const handleVoidNumber = async (reason: string) => {
    if (!selectedCorrespondence) return;
    const res = await fetch(
      `/api/correspondence/${selectedCorrespondence.id}/void`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to void number');
    }
    const data = await res.json();
    setSelectedCorrespondence(data.correspondence);
    setCorrespondence((prev) =>
      prev.map((c) => (c.id === data.correspondence.id ? data.correspondence : c))
    );
    fetchData();
  };

  // Permanently delete correspondence & roll back sequence counter
  const handleDeleteCorrespondence = async (item: Correspondence) => {
    const res = await fetch(`/api/correspondence/${item.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete correspondence');
    }
    setCorrespondence((prev) => prev.filter((c) => c.id !== item.id));
    if (selectedCorrespondence?.id === item.id) {
      setSelectedCorrespondence(null);
    }
    await fetchData();
  };

  // Forward / Distribute internally (creates task & formal distribution record)
  const handleForwardTask = async (data: {
    responsibleUserId: string;
    responsibleDeptId?: string;
    ccUserIds?: string[];
    instructions: string;
    actionType: ActionPurpose;
    priority: 'normal' | 'high' | 'urgent';
    dueDate: string;
    attachments?: Attachment[];
  }) => {
    if (!forwardModalItem) return;
    const res = await fetch(
      `/api/correspondence/${forwardModalItem.id}/distribute-internal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responsibleUserId: data.responsibleUserId,
          ccUserIds: data.ccUserIds || [],
          instructions: data.instructions,
          actionPurpose: data.actionType,
          dueDate: data.dueDate,
          attachments: data.attachments || [],
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to distribute correspondence internally');
    }
    const resData = await res.json();
    if (resData.task) {
      setTasks((prev) => [resData.task, ...prev]);
    }
    if (resData.correspondence) {
      setCorrespondence((prev) =>
        prev.map((c) => (c.id === resData.correspondence.id ? resData.correspondence : c))
      );
      if (selectedCorrespondence?.id === resData.correspondence.id) {
        setSelectedCorrespondence(resData.correspondence);
      }
    }
    setForwardModalItem(null);
    fetchData();
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (
    taskId: string,
    status: 'assigned' | 'in_progress' | 'completed',
    comment?: string
  ) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, completionComment: comment }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update task');
    }
    const updated: Task = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    fetchData();
  };

  // Add Comment to Task
  const handleAddTaskComment = async (taskId: string, comment: string) => {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add comment');
    }
    fetchData();
  };

  // Create Contact
  const handleCreateContact = async (contact: Partial<Contact>): Promise<Contact> => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create contact');
    }
    const created: Contact = await res.json();
    setContacts((prev) => [created, ...prev]);
    return created;
  };

  // Record Email Action (Draft or Direct Send with Permission)
  const handleRecordEmailAction = async (data: {
    to: string;
    cc: string;
    subject: string;
    body: string;
    isDraft: boolean;
    draftId?: string;
    draftUrl?: string;
    provider: 'gmail' | 'yahoo';
    senderAccount?: string;
  }) => {
    if (!emailModalItem) return;
    const res = await fetch(
      `/api/correspondence/${emailModalItem.id}/send-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to process email action');
    }
    const result = await res.json();
    if (result.item) {
      setCorrespondence((prev) =>
        prev.map((c) => (c.id === emailModalItem.id ? result.item : c))
      );
      if (selectedCorrespondence?.id === emailModalItem.id) {
        setSelectedCorrespondence(result.item);
      }
    }
    fetchData();
  };

  // Quick Send Email for End-of-Day Reminder
  const handleQuickSendEmail = async (letter: Correspondence) => {
    const res = await fetch(
      `/api/correspondence/${letter.id}/send-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: letter.recipientEmail || 'recipient@organization.com',
          cc: letter.ccEmails?.join(', ') || '',
          subject: `[OFFICIAL] ${letter.correspondenceNumber}: ${letter.subject}`,
          body: `Please find attached official correspondence ${letter.correspondenceNumber} from PJMAK Correspondence Management.`,
          isDraft: false,
          provider: letter.emailProvider || 'gmail',
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send email');
    }
    fetchData();
  };

  // Save Settings
  const handleSaveSettings = async (
    newSettings: Partial<CompanySettings>,
    newSequences: Partial<NumberingSequences>
  ) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companySettings: newSettings,
        numberSequences: newSequences,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save settings');
    }
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    localStorage.removeItem('pjmak_logged_in');
    localStorage.removeItem('pjmak_user_id');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Dedicated Controlled External Document Viewer Mode (External Reviewer Portal)
  if (externalViewerShareToken || externalViewerShareId) {
    return (
      <ExternalDocumentViewer
        shareToken={externalViewerShareToken || undefined}
        shareId={externalViewerShareId || undefined}
        onExit={() => {
          setExternalViewerShareToken(null);
          setExternalViewerShareId(null);
          if (
            window.location.search.includes('ext_share') ||
            window.location.search.includes('share_id') ||
            window.location.search.includes('ext_access_token') ||
            window.location.search.includes('token') ||
            window.location.pathname.startsWith('/external-access')
          ) {
            window.history.replaceState({}, '', '/');
          }
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setCurrentUser(user);
          fetchData();
        }}
      />
    );
  }

  if (loading || !currentUser || !settings || !numberSequences) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Loading Enterprise Correspondence Management System...
          </p>
        </div>
      </div>
    );
  }

  const incomingCount = correspondence.filter(
    (c) => c.type === 'incoming' && !c.isArchived
  ).length;
  const outgoingCount = correspondence.filter(
    (c) => c.type === 'outgoing' && !c.isArchived
  ).length;
  const internalCount = correspondence.filter(
    (c) => c.type === 'internal' && !c.isArchived
  ).length;
  const myPendingTasksCount = tasks.filter(
    (t) => t.assignedUserId === currentUser.id && t.status !== 'completed'
  ).length;
  const draftedCount = correspondence.filter(
    (c) =>
      c.emailStatus === 'drafted' &&
      c.status !== 'sent' &&
      c.status !== 'voided' &&
      !c.isArchived
  ).length;

  const isRegisterTab = [
    'correspondence',
    'technical_docs',
    'incoming',
    'outgoing',
    'internal',
    'commercial',
  ].includes(activeTab);

  const isFullPageWorkspace = isRegisterTab && registerLayoutMode === 'full_page';

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 font-sans antialiased overflow-hidden">
      {isFullPageWorkspace ? (
        <>
          {/* Full-Page Dedicated Register Workspace Header */}
          <RegisterWorkspaceHeader
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onBackToDashboard={() => setActiveTab('dashboard')}
            layoutMode={registerLayoutMode}
            onToggleLayoutMode={() =>
              setRegisterLayoutMode(registerLayoutMode === 'full_page' ? 'sidebar' : 'full_page')
            }
            currentUser={currentUser}
            users={users}
            onSwitchUser={handleSwitchUser}
            onLogout={handleLogout}
            onOpenGlobalSearch={() => setSearchModalOpen(true)}
            counts={{
              technicalDocs: technicalDocuments.length,
              correspondenceTotal: correspondence.filter((c) => !c.isArchived).length,
              incoming: incomingCount,
              outgoing: outgoingCount,
              internal: internalCount,
              commercial: correspondence.filter(
                (c) => c.financialClassification?.isCommercialOrFinancial && !c.isArchived
              ).length,
            }}
          />

          {/* Dedicated Full-Page Register Workspace Canvas */}
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
            {activeTab === 'technical_docs' && currentUser && (
              <TechnicalDocumentRegisterView
                documents={technicalDocuments}
                correspondence={correspondence}
                currentUser={currentUser}
                contacts={contacts}
                onCreateContact={handleCreateContact}
                onOpenCorrespondence={(corrNumber) => {
                  const found = correspondence.find((c) => c.correspondenceNumber === corrNumber);
                  if (found) {
                    setSelectedCorrespondence(found);
                    setSelectedDetailTab('document');
                  }
                }}
                onRefreshData={fetchData}
                onOpenExternalViewer={(shareId) => setExternalViewerShareId(shareId)}
                onOpenExternalViewerByToken={(token) => setExternalViewerShareToken(token)}
                onBackToDashboard={() => setActiveTab('dashboard')}
                isFullPage={true}
              />
            )}

            {(activeTab === 'correspondence' ||
              activeTab === 'incoming' ||
              activeTab === 'outgoing' ||
              activeTab === 'internal') && (
              <CorrespondenceRegisterView
                type={activeTab === 'correspondence' ? 'all' : activeTab}
                correspondence={correspondence}
                departments={departments}
                users={users}
                currentUser={currentUser}
                settings={settings}
                onOpenCorrespondence={(item, tab) => {
                  setSelectedCorrespondence(item);
                  setSelectedDetailTab(tab || 'document');
                }}
                onNew={(typeOverride) => {
                  setEditorType(
                    typeOverride ||
                      (activeTab === 'incoming'
                        ? 'incoming'
                        : activeTab === 'internal'
                        ? 'internal'
                        : 'outgoing')
                  );
                  setReplyToItem(null);
                  setEditorOpen(true);
                }}
                onDistributeInternal={(item) => setForwardModalItem(item)}
                onReply={(item) => {
                  setEditorType(item.type === 'incoming' ? 'outgoing' : 'internal');
                  setReplyToItem(item);
                  setEditorOpen(true);
                }}
                onSendEmail={(item) => setEmailModalItem(item)}
                onVoidNumber={handleVoidNumber}
                onDeleteCorrespondence={handleDeleteCorrespondence}
                onRefreshData={fetchData}
                onBackToDashboard={() => setActiveTab('dashboard')}
                isFullPage={true}
              />
            )}

            {activeTab === 'commercial' && currentUser && (
              <CommercialFinancialView
                correspondence={correspondence}
                contacts={contacts}
                currentUser={currentUser}
                onOpenCorrespondence={(item, tab) => {
                  setSelectedCorrespondence(item);
                  setSelectedDetailTab(tab || 'document');
                }}
                onRefreshData={fetchData}
                onBackToDashboard={() => setActiveTab('dashboard')}
                isFullPage={true}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex h-full overflow-hidden">
          {/* Left Sidebar from very top to bottom */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            incomingCount={incomingCount}
            outgoingCount={outgoingCount}
            internalCount={internalCount}
            pendingTasksCount={myPendingTasksCount}
            draftedCount={draftedCount}
            currentUser={currentUser}
            users={users}
            onSwitchUser={handleSwitchUser}
            onLogout={handleLogout}
            onOpenAdminUsers={() => setActiveTab('admin')}
          />

          {/* Right Column: Header on top, followed by Main Content */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Header */}
            <Header
              currentUser={currentUser}
              users={users}
              onSwitchUser={handleSwitchUser}
              onOpenGlobalSearch={() => setSearchModalOpen(true)}
              tasks={tasks}
              onSelectTask={(t) => {
                const found = correspondence.find(
                  (c) => c.id === t.correspondenceId
                );
                if (found) setSelectedCorrespondence(found);
              }}
              onLogout={handleLogout}
              onOpenAdminUsers={() => setActiveTab('admin')}
              onOpenMobileMenu={() => setMobileDrawerOpen(true)}
              isRegisterActive={isRegisterTab}
              onExpandToFullScreen={() => setRegisterLayoutMode('full_page')}
            />

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto bg-slate-50 pb-20 md:pb-6">
              {activeTab === 'dashboard' && (
                <DashboardView
                  correspondence={correspondence}
                  tasks={tasks}
                  auditLogs={auditLogs}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  settings={settings}
                  technicalDocuments={technicalDocuments}
                  onOpenCorrespondence={(item, tab) => {
                    setSelectedCorrespondence(item);
                    setSelectedDetailTab(tab || 'document');
                  }}
                  onNewOutgoing={() => {
                    setEditorType('outgoing');
                    setReplyToItem(null);
                    setEditorOpen(true);
                  }}
                  onRegisterIncoming={() => {
                    setEditorType('incoming');
                    setReplyToItem(null);
                    setEditorOpen(true);
                  }}
                  onNewInternal={() => {
                    setEditorType('internal');
                    setReplyToItem(null);
                    setEditorOpen(true);
                  }}
                  onDistributeInternal={(item) => setForwardModalItem(item)}
                  onReply={(item) => {
                    setEditorType('outgoing');
                    setReplyToItem(item);
                    setEditorOpen(true);
                  }}
                  onSendEmail={(item) => setEmailModalItem(item)}
                  onVoidNumber={handleVoidNumber}
                  onRefreshData={fetchData}
                  onViewTasks={() => setActiveTab('tasks')}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'correspondence' && (
                <CorrespondenceRegisterView
                  type="all"
                  correspondence={correspondence}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  settings={settings}
                  onOpenCorrespondence={(item, tab) => {
                    setSelectedCorrespondence(item);
                    setSelectedDetailTab(tab || 'document');
                  }}
                  onNew={(typeOverride) => {
                    setEditorType(typeOverride || 'outgoing');
                    setReplyToItem(null);
                    setEditorOpen(true);
                  }}
                  onDistributeInternal={(item) => setForwardModalItem(item)}
                  onReply={(item) => {
                    setEditorType('outgoing');
                    setReplyToItem(item);
                    setEditorOpen(true);
                  }}
                  onSendEmail={(item) => setEmailModalItem(item)}
                  onVoidNumber={handleVoidNumber}
                  onDeleteCorrespondence={handleDeleteCorrespondence}
                  onRefreshData={fetchData}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  isFullPage={false}
                />
              )}

              {activeTab === 'commercial' && currentUser && (
                <CommercialFinancialView
                  correspondence={correspondence}
                  currentUser={currentUser}
                  onOpenCorrespondence={(item, tab) => {
                    setSelectedCorrespondence(item);
                    setSelectedDetailTab(tab || 'document');
                  }}
                  onRefreshData={fetchData}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  isFullPage={false}
                />
              )}

              {activeTab === 'incoming' && (
                <CorrespondenceRegisterView
                  type="incoming"
                  correspondence={correspondence}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  settings={settings}
                  onOpenCorrespondence={(item, tab) => {
                    setSelectedCorrespondence(item);
                    setSelectedDetailTab(tab || 'document');
                  }}
                  onNew={() => {
                    setEditorType('incoming');
                    setReplyToItem(null);
                    setEditorOpen(true);
                  }}
                  onDistributeInternal={(item) => setForwardModalItem(item)}
                  onReply={(item) => {
                    setEditorType('outgoing');
                    setReplyToItem(item);
                    setEditorOpen(true);
                  }}
                  onSendEmail={(item) => setEmailModalItem(item)}
                  onVoidNumber={handleVoidNumber}
                  onDeleteCorrespondence={handleDeleteCorrespondence}
                  onRefreshData={fetchData}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  isFullPage={false}
                />
              )}

              {activeTab === 'outgoing' && (
                <CorrespondenceRegisterView
                  type="outgoing"
                  correspondence={correspondence}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  settings={settings}
                  onOpenCorrespondence={(item, tab) => {
                    setSelectedCorrespondence(item);
                    setSelectedDetailTab(tab || 'document');
                  }}
                  onNew={() => {
                    setEditorType('outgoing');
                    setReplyToItem(null);
                    setEditorOpen(true);
                  }}
                  onDistributeInternal={(item) => setForwardModalItem(item)}
                  onReply={(item) => {
                    setEditorType('outgoing');
                    setReplyToItem(item);
                    setEditorOpen(true);
                  }}
                  onSendEmail={(item) => setEmailModalItem(item)}
                  onVoidNumber={handleVoidNumber}
                  onDeleteCorrespondence={handleDeleteCorrespondence}
                  onRefreshData={fetchData}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  isFullPage={false}
                />
              )}

              {activeTab === 'internal' && (
                <CorrespondenceRegisterView
                  type="internal"
                  correspondence={correspondence}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  settings={settings}
                  onOpenCorrespondence={(item, tab) => {
                    setSelectedCorrespondence(item);
                    setSelectedDetailTab(tab || 'document');
                  }}
                  onNew={() => {
                    setEditorType('internal');
                    setReplyToItem(null);
                    setEditorOpen(true);
                  }}
                  onDistributeInternal={(item) => setForwardModalItem(item)}
                  onReply={(item) => {
                    setEditorType('internal');
                    setReplyToItem(item);
                    setEditorOpen(true);
                  }}
                  onSendEmail={(item) => setEmailModalItem(item)}
                  onVoidNumber={handleVoidNumber}
                  onDeleteCorrespondence={handleDeleteCorrespondence}
                  onRefreshData={fetchData}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  isFullPage={false}
                />
              )}

              {activeTab === 'technical_docs' && currentUser && (
                <TechnicalDocumentRegisterView
                  documents={technicalDocuments}
                  correspondence={correspondence}
                  currentUser={currentUser}
                  contacts={contacts}
                  onCreateContact={handleCreateContact}
                  onOpenCorrespondence={(corrNumber) => {
                    const found = correspondence.find(
                      (c) => c.correspondenceNumber === corrNumber
                    );
                    if (found) {
                      setSelectedCorrespondence(found);
                      setSelectedDetailTab('document');
                    }
                  }}
                  onRefreshData={fetchData}
                  onOpenExternalViewer={(shareId) => setExternalViewerShareId(shareId)}
                  onOpenExternalViewerByToken={(token) => setExternalViewerShareToken(token)}
                  onBackToDashboard={() => setActiveTab('dashboard')}
                  isFullPage={false}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  users={users}
                  currentUser={currentUser}
                  onOpenCorrespondence={(corrId) => {
                    const found = correspondence.find((c) => c.id === corrId);
                    if (found) setSelectedCorrespondence(found);
                  }}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onAddTaskComment={handleAddTaskComment}
                />
              )}

              {activeTab === 'chains' && (
                <CommunicationChainView
                  correspondence={correspondence}
                  onOpenCorrespondence={(item) => setSelectedCorrespondence(item)}
                />
              )}

              {activeTab === 'contacts' && (
                <ContactsView
                  contacts={contacts}
                  correspondence={correspondence}
                  onOpenCorrespondence={(item) => setSelectedCorrespondence(item)}
                  onCreateContact={handleCreateContact}
                />
              )}

              {activeTab === 'archive' && currentUser && settings && (
                <ArchiveView
                  correspondence={correspondence}
                  archiveFolders={archiveFolders}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  settings={settings}
                  onOpenCorrespondence={(item, tab) => {
                    setSelectedCorrespondence(item);
                    setSelectedDetailTab((tab as any) || 'document');
                  }}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  correspondence={correspondence}
                  departments={departments}
                  tasks={tasks}
                />
              )}

              {activeTab === 'admin' && (
                <AdminView
                  settings={settings}
                  numberSequences={numberSequences}
                  templates={templates}
                  departments={departments}
                  users={users}
                  currentUser={currentUser}
                  onSaveSettings={handleSaveSettings}
                  onRefreshData={fetchData}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* MODAL 1: LETTER EDITOR MODAL */}
      {editorOpen && (
        <LetterEditorModal
          initialType={editorType}
          allCorrespondence={correspondence}
          contacts={contacts}
          departments={departments}
          users={users}
          settings={settings}
          templates={templates}
          replyToItem={replyToItem}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveCorrespondence}
          onCreateContact={handleCreateContact}
        />
      )}

      {/* MODAL 2: CORRESPONDENCE DETAIL DOSSIER */}
      {selectedCorrespondence && (
        <CorrespondenceDetailModal
          correspondence={selectedCorrespondence}
          allCorrespondence={correspondence}
          currentUser={currentUser}
          users={users}
          settings={settings}
          templates={templates}
          tasks={tasks}
          auditLogs={auditLogs}
          archiveFolders={archiveFolders}
          initialTab={selectedDetailTab}
          onClose={() => setSelectedCorrespondence(null)}
          onOpenForwardModal={() => setForwardModalItem(selectedCorrespondence)}
          onOpenEmailModal={() => setEmailModalItem(selectedCorrespondence)}
          onReply={(item) => {
            setEditorType(item.type === 'incoming' ? 'outgoing' : 'internal');
            setReplyToItem(item);
            setEditorOpen(true);
          }}
          onTransitionStatus={handleTransitionStatus}
          onUpdateOfficialDate={handleUpdateOfficialDate}
          onVoidNumber={handleVoidNumber}
          onDeleteCorrespondence={handleDeleteCorrespondence}
          onSelectRelated={(item) => setSelectedCorrespondence(item)}
          onRefreshData={fetchData}
        />
      )}

      {/* MODAL 3: FORWARD TASK MODAL */}
      {forwardModalItem && (
        <ForwardTaskModal
          correspondence={forwardModalItem}
          users={users}
          departments={departments}
          onClose={() => setForwardModalItem(null)}
          onForward={handleForwardTask}
        />
      )}

      {/* MODAL 4: EMAIL DISPATCH & DRAFT DIALOG (GMAIL & YAHOO) */}
      {emailModalItem && settings && (
        <EmailDispatchDialog
          correspondence={emailModalItem}
          settings={settings}
          onClose={() => setEmailModalItem(null)}
          onRecordEmailAction={handleRecordEmailAction}
        />
      )}

      {/* MODAL 5: GLOBAL SEARCH MODAL */}
      {searchModalOpen && (
        <GlobalSearchModal
          correspondence={correspondence}
          technicalDocuments={technicalDocuments}
          contacts={contacts}
          onClose={() => setSearchModalOpen(false)}
          onSelectCorrespondence={(item) => setSelectedCorrespondence(item)}
          onSelectDocument={(doc) => {
            setActiveTab('technical_docs');
            setSearchModalOpen(false);
          }}
          onSelectContact={(c) => {
            setActiveTab('contacts');
            setSearchModalOpen(false);
          }}
        />
      )}

      {/* 1-Hour Before EOD Draft Reminder Notification Banner */}
      <DraftEndDayReminder
        correspondence={correspondence}
        settings={settings}
        onOpenCorrespondence={(item, tab) => {
          setSelectedCorrespondence(item);
          setSelectedDetailTab(tab || 'document');
        }}
        onOpenEmailModal={(item) => setEmailModalItem(item)}
        onQuickSendEmail={handleQuickSendEmail}
      />

      {/* Mobile Bottom Navigation Bar (Screens < md) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        incomingCount={incomingCount}
        outgoingCount={outgoingCount}
        draftedCount={draftedCount}
        pendingTasksCount={myPendingTasksCount}
        onNewLetter={() => {
          setEditorType('incoming');
          setReplyToItem(null);
          setEditorOpen(true);
        }}
        onOpenMobileMenu={() => setMobileDrawerOpen(true)}
      />

      {/* Mobile Navigation Drawer */}
      {currentUser && settings && (
        <MobileDrawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          users={users}
          onSwitchUser={handleSwitchUser}
          incomingCount={incomingCount}
          outgoingCount={outgoingCount}
          internalCount={internalCount}
          pendingTasksCount={myPendingTasksCount}
          draftedCount={draftedCount}
          settings={settings}
          onOpenGlobalSearch={() => setSearchModalOpen(true)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
