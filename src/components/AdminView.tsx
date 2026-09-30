import React, { useState } from 'react';
import {
  Settings,
  Building2,
  FileText,
  Lock,
  Hash,
  Ban,
  CheckCircle2,
  Users,
  ShieldCheck,
  Save,
  AlertCircle,
  Eye,
  Key,
  UserPlus,
  Edit,
  Trash2,
  X,
  RefreshCw,
  EyeOff,
  Shield,
  ShieldAlert,
  UserCheck,
  Upload,
  Download,
  HardDrive,
  PenTool,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  CompanySettings,
  NumberingSequences,
  LetterTemplate,
  Department,
  User,
  UserRole,
} from '../types';
import { PjmakLogo } from './PjmakLogo';
import { SIGNATURE_PRESETS } from '../assets/signatures';
import { SignatureEnhancerModal } from './SignatureEnhancerModal';

interface AdminViewProps {
  settings: CompanySettings;
  numberSequences: NumberingSequences;
  templates: LetterTemplate[];
  departments: Department[];
  users: User[];
  currentUser?: User | null;
  initialTab?: 'company' | 'letterhead' | 'numbering' | 'voided' | 'users';
  onSaveSettings: (
    newSettings: Partial<CompanySettings>,
    newSequences: Partial<NumberingSequences>
  ) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = ({
  settings,
  numberSequences,
  templates,
  departments,
  users,
  currentUser,
  initialTab,
  onSaveSettings,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<
    'company' | 'letterhead' | 'numbering' | 'voided' | 'users'
  >(initialTab || 'company');

  // User Management State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCleanDbModal, setShowCleanDbModal] = useState(false);
  const [userOpLoading, setUserOpLoading] = useState(false);
  const [userOpMessage, setUserOpMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recalibrate Sequences State
  const [recalibrating, setRecalibrating] = useState(false);
  const [recalibrateMsg, setRecalibrateMsg] = useState<string | null>(null);

  const handleRecalibrateSequences = async () => {
    setRecalibrating(true);
    setRecalibrateMsg(null);
    try {
      const res = await fetch('/api/settings/recalibrate-sequences', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to recalibrate sequences');
      const data = await res.json();
      setRecalibrateMsg(data.message || 'Sequences synchronized successfully!');
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setRecalibrateMsg(null), 4000);
    } catch (e: any) {
      alert(e.message || 'Error recalibrating sequences');
    } finally {
      setRecalibrating(false);
    }
  };

  // Add User Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('officer');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || 'dept-1');
  const [newTitle, setNewTitle] = useState('');

  // Edit User Form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('officer');
  const [editDeptId, setEditDeptId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Handlers for User Management
  const handleOpenAddUser = () => {
    setNewName('');
    setNewEmail('');
    setNewUsername('');
    setNewPassword('Pjmak' + Math.floor(1000 + Math.random() * 9000) + '!');
    setNewRole('officer');
    setNewDeptId(departments[0]?.id || 'dept-1');
    setNewTitle('Officer');
    setUserOpMessage(null);
    setShowAddUserModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setUserOpMessage({ type: 'error', text: 'Name, Email, and Password are required.' });
      return;
    }

    setUserOpLoading(true);
    setUserOpMessage(null);

    const dept = departments.find((d) => d.id === newDeptId);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          username: (newUsername || newEmail.split('@')[0]).trim().toLowerCase(),
          password: newPassword.trim(),
          role: newRole,
          departmentId: newDeptId,
          departmentName: dept?.name || 'General Administration',
          title: newTitle.trim() || 'Officer',
          active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setUserOpMessage({ type: 'success', text: `User ${data.user.name} created successfully with password!` });
      setShowAddUserModal(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setUserOpMessage({ type: 'error', text: err.message });
    } finally {
      setUserOpLoading(false);
    }
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditUsername(u.username || u.email.split('@')[0]);
    setEditPassword('');
    setEditRole(u.role);
    setEditDeptId(u.departmentId);
    setEditTitle(u.title);
    setEditActive(u.active !== false);
    setShowPasswordInput(false);
    setUserOpMessage(null);
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUserOpLoading(true);
    setUserOpMessage(null);

    const dept = departments.find((d) => d.id === editDeptId);

    try {
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        username: editUsername.trim().toLowerCase(),
        role: editRole,
        departmentId: editDeptId,
        departmentName: dept?.name || editingUser.departmentName,
        title: editTitle.trim(),
        active: editActive,
      };

      if (editPassword.trim().length > 0) {
        payload.password = editPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setUserOpMessage({ type: 'success', text: `Account for ${data.user.name} updated successfully!` });
      setShowEditUserModal(false);
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      setUserOpMessage({ type: 'error', text: err.message });
    } finally {
      setUserOpLoading(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    if (currentUser && currentUser.id === u.id) {
      alert('You cannot deactivate your own logged-in administrator account.');
      return;
    }

    const nextActive = u.active === false ? true : false;
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user status');
      }
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (currentUser && currentUser.id === u.id) {
      alert('You cannot delete your own logged-in administrator account.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user account "${u.name}" (${u.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetDatabase = async () => {
    setUserOpLoading(true);
    try {
      const res = await fetch('/api/admin/clean-database', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset database');
      }
      setShowCleanDbModal(false);
      alert('System successfully reset to clean production state (zero correspondence and tasks).');
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUserOpLoading(false);
    }
  };

  // Database Backup & Restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleDownloadBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch('/api/database/backup');
      if (!res.ok) throw new Error('Failed to export database backup');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pjmak_edms_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Backup failed: ' + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore the database from this backup? Your proposals, correspondence, and settings will be restored from this file.')) {
      e.target.value = '';
      return;
    }

    try {
      setBackupLoading(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');

      setRestoreStatus('Database successfully restored from backup file.');
      setTimeout(() => setRestoreStatus(null), 5000);
      if (onRefreshData) await onRefreshData();
      alert('Database successfully restored! All your records, drafts, and proposals are up to date.');
    } catch (err: any) {
      alert('Restore failed: ' + err.message);
    } finally {
      setBackupLoading(false);
      e.target.value = '';
    }
  };

  // Company Form state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [regNumber, setRegNumber] = useState(settings.registrationNumber);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [website, setWebsite] = useState(settings.website);
  const [footerText, setFooterText] = useState(settings.footerText);

  // Signature state
  const [signatoryName, setSignatoryName] = useState(
    settings.signature.signatoryName
  );
  const [signatoryPosition, setSignatoryPosition] = useState(
    settings.signature.position
  );
  const [signaturePresetId, setSignaturePresetId] = useState(
    settings.signature.presetId || 'sign_2_black'
  );
  const [signatureImageUrl, setSignatureImageUrl] = useState(
    settings.signature.signatureImageUrl || '/assets/signature_kashefi.svg'
  );
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);

  // Numbering Sequence state
  const [inPrefix, setInPrefix] = useState(numberSequences.incoming.prefix);
  const [inDigits, setInDigits] = useState(numberSequences.incoming.digits || 4);
  const [inSeparator, setInSeparator] = useState(
    numberSequences.incoming.separator
  );
  const [inUseLeadingZeros, setInUseLeadingZeros] = useState(
    numberSequences.incoming.useLeadingZeros ?? false
  );

  const [outPrefix, setOutPrefix] = useState(numberSequences.outgoing.prefix);
  const [outDigits, setOutDigits] = useState(numberSequences.outgoing.digits || 4);
  const [outSeparator, setOutSeparator] = useState(
    numberSequences.outgoing.separator
  );
  const [outIncludeDept, setOutIncludeDept] = useState(
    numberSequences.outgoing.includeDepartment
  );
  const [outUseLeadingZeros, setOutUseLeadingZeros] = useState(
    numberSequences.outgoing.useLeadingZeros ?? false
  );

  const [icPrefix, setIcPrefix] = useState(
    numberSequences.internal?.prefix || 'IC'
  );
  const [icDigits, setIcDigits] = useState(
    numberSequences.internal?.digits || 4
  );
  const [icSeparator, setIcSeparator] = useState(
    numberSequences.internal?.separator || '-'
  );
  const [icIncludeDept, setIcIncludeDept] = useState(
    numberSequences.internal?.includeDepartment || false
  );
  const [icUseLeadingZeros, setIcUseLeadingZeros] = useState(
    numberSequences.internal?.useLeadingZeros ?? false
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preview generated sample numbers (natural vs padded)
  const formatSampleSeq = (num: number, useZeros: boolean, digits: number) =>
    useZeros ? String(num).padStart(digits, '0') : String(num);

  const sampleIncoming = `${inPrefix}${inSeparator}2026${inSeparator}${formatSampleSeq(1, inUseLeadingZeros, inDigits)}`;
  const sampleOutgoing = `${outPrefix}${
    outIncludeDept ? `${outSeparator}ENG` : ''
  }${outSeparator}2026${outSeparator}${formatSampleSeq(1, outUseLeadingZeros, outDigits)}`;
  const sampleInternal = `${icPrefix}${
    icIncludeDept ? `${icSeparator}HR` : ''
  }${icSeparator}2026${icSeparator}${formatSampleSeq(1, icUseLeadingZeros, icDigits)}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(
        {
          companyName,
          registrationNumber: regNumber,
          address,
          phone,
          email,
          website,
          footerText,
          signature: {
            ...settings.signature,
            signatoryName,
            position: signatoryPosition,
            presetId: signaturePresetId,
            signatureImageUrl,
          },
        },
        {
          incoming: {
            ...numberSequences.incoming,
            prefix: inPrefix,
            digits: inDigits,
            separator: inSeparator,
            useLeadingZeros: inUseLeadingZeros,
          },
          outgoing: {
            ...numberSequences.outgoing,
            prefix: outPrefix,
            digits: outDigits,
            separator: outSeparator,
            includeDepartment: outIncludeDept,
            useLeadingZeros: outUseLeadingZeros,
          },
          internal: {
            ...(numberSequences.internal || { currentYear: 2026, currentSeq: 0 }),
            prefix: icPrefix,
            digits: icDigits,
            separator: icSeparator,
            includeDepartment: icIncludeDept,
            useLeadingZeros: icUseLeadingZeros,
          },
        }
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Settings className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Enterprise System Administration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official organizational profile, letterhead stationery layout, sequential numbering rules, and voided records audit
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            <span>Configuration changes saved & audit logged.</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('company')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'company'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'hover:bg-slate-100'
          }`}
        >
          Company Information
        </button>
        <button
          onClick={() => setActiveTab('letterhead')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'letterhead'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'hover:bg-slate-100'
          }`}
        >
          Letterhead & Signature
        </button>
        <button
          onClick={() => setActiveTab('numbering')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'numbering'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'hover:bg-slate-100'
          }`}
        >
          Sequential Numbering Rules
        </button>
        <button
          onClick={() => setActiveTab('voided')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'voided'
              ? 'bg-rose-700 text-white shadow-2xs'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          Voided Numbers Registry ({numberSequences.voidedNumbers.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'hover:bg-slate-100'
          }`}
        >
          Department & User Access
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: COMPANY PROFILE */}
        {activeTab === 'company' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6 text-xs">
            {/* Visual Brand Identity Banner */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="h-16 w-36 bg-white rounded-lg p-2 flex items-center justify-center shadow-xs">
                  <PjmakLogo variant="full" size="md" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>PJMAK</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      KvK: 91081289
                    </span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Founder: Ali Kashefi • 's-Hertogenbosch, the Netherlands
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-300 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                <div className="text-slate-400">Mobile Direct</div>
                <div className="font-semibold text-white">(+31) 610 26 95 54</div>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Official Enterprise Legal Entity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Company / Agency Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registration / Tax Reference Number *
                </label>
                <input
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Headquarters Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary Corporate Telephone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registry Central Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Corporate Website URL
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Document Footer Notice / Confidentiality Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LETTERHEAD & SIGNATURE */}
        {activeTab === 'letterhead' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6 text-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Corporate Letterhead & Authorized Digital Signature
              </h2>
              <p className="text-slate-500 mt-0.5">
                Configure authorized corporate signatory, handwritten signature asset, and default stationery layout
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Authorized Signatory Name *
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Title / Position *
                </label>
                <input
                  type="text"
                  value={signatoryPosition}
                  onChange={(e) => setSignatoryPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Signature Selection: Sign 2 (Executive Black, Recommended) vs Sign 1 (Blue Pen) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <PenTool className="h-3.5 w-3.5 text-sky-600" />
                    Handwritten Signature Asset Selection
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Choose which uploaded signature asset will be rendered on official transmittals, outgoing letters, and PDF exports
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {SIGNATURE_PRESETS.map((preset) => {
                  const isSelected = signaturePresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setSignaturePresetId(preset.id);
                        setSignatureImageUrl(preset.svgUrl);
                      }}
                      className={`cursor-pointer relative p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-600 bg-white shadow-sm ring-2 ring-sky-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {preset.name}
                            </span>
                            {preset.isRecommended && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Recommended for App
                              </span>
                            )}
                          </div>
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'bg-sky-600 border-sky-600 text-white'
                                : 'border-slate-300 bg-slate-50'
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 mb-3">
                          {preset.description}
                        </p>
                      </div>

                      {/* Signature Preview Canvas */}
                      <div className="h-20 bg-slate-50/80 rounded-lg border border-slate-200/80 flex items-center justify-center p-2">
                        <img
                          src={preset.svgUrl}
                          alt={preset.name}
                          className="h-16 max-w-full object-contain pointer-events-none select-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Upload & Photo Enhancer Option */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 border-t border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-700">Use Your Authentic Photo:</span>
                  <button
                    type="button"
                    onClick={() => setIsEnhancerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50/80 hover:bg-sky-100 text-sky-800 text-xs font-bold transition-all shadow-2xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                    <span>Enhance Authentic Signature Photo (Sign 1 / Sign 2)</span>
                  </button>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold">
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span>Upload Image Directly</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setSignatureImageUrl(event.target.result as string);
                              setSignaturePresetId('custom');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {signaturePresetId === 'custom' && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Custom signature image active
                  </span>
                )}
              </div>
            </div>

            {/* Signature Photo Quality Enhancer Modal */}
            <SignatureEnhancerModal
              isOpen={isEnhancerOpen}
              onClose={() => setIsEnhancerOpen(false)}
              currentSignatureUrl={signatureImageUrl}
              onApply={(enhancedUrl) => {
                setSignatureImageUrl(enhancedUrl);
                setSignaturePresetId('custom');
              }}
            />

            {/* Live Visual Stationery Preview */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase text-[11px] block">
                  Official Stationery & Letterhead Live Preview
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Standard A4 Stationery
                </span>
              </div>

              <div className="bg-white p-8 rounded-lg border border-slate-300 shadow-xs max-w-2xl font-serif">
                <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                  <div>
                    <div className="h-12 w-40 mb-2">
                      <PjmakLogo variant="full" size="md" />
                    </div>
                    <p className="font-sans text-[11px] text-slate-600 mt-1">
                      {address}
                    </p>
                    <p className="font-sans text-[10px] text-slate-500 mt-0.5">
                      KvK: {regNumber} • Mobile: {phone} • Email: {email}
                    </p>
                  </div>
                </div>

                <div className="py-8 font-sans text-xs text-slate-400 italic text-center">
                  [Letterhead Body & Operational Correspondence Text Content Area]
                </div>

                {/* Sign-off and Signature Display */}
                <div className="pt-4 border-t border-slate-200 font-sans">
                  <p className="text-xs text-slate-600 mb-1">Yours faithfully,</p>
                  <p className="text-xs font-bold text-slate-900">{companyName}</p>

                  <div className="my-2 max-w-xs">
                    <div className="py-1">
                      <img
                        src={signatureImageUrl}
                        alt={`Signature of ${signatoryName}`}
                        className="h-14 w-auto object-contain pointer-events-none select-none"
                      />
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      ★ DIGITALLY AUTHENTICATED • REGISTRY SEAL ★
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 mt-1">{signatoryName}</p>
                  <p className="text-[11px] text-slate-500">{signatoryPosition}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NUMBERING SEQUENCES */}
        {activeTab === 'numbering' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6 text-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Automated Reference Numbering Rules
              </h2>
              <p className="text-slate-500 mt-0.5">
                Define the structural sequence format for Incoming, Outgoing, and Internal (IC) correspondence.
              </p>
            </div>

            {/* Live Counter Status & Recalibration Control */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Live Sequence Counters
                </div>
                <div className="flex items-center gap-6 mt-1 text-xs">
                  <div>
                    <span className="text-slate-400">Incoming Next: </span>
                    <span className="font-mono font-bold text-white">#{(numberSequences.incoming.currentSeq || 0) + 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Outgoing Next: </span>
                    <span className="font-mono font-bold text-emerald-400">#{(numberSequences.outgoing.currentSeq || 0) + 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Internal Next: </span>
                    <span className="font-mono font-bold text-purple-400">#{(numberSequences.internal?.currentSeq || 0) + 1}</span>
                  </div>
                </div>
                {recalibrateMsg && (
                  <p className="text-[11px] text-emerald-300 mt-1 font-medium animate-in fade-in">
                    ✓ {recalibrateMsg}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={recalibrating}
                onClick={handleRecalibrateSequences}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer transition-colors shrink-0"
                title="Synchronize counter against maximum existing registered letter number"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${recalibrating ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
                <span>{recalibrating ? 'Recalibrating...' : 'Recalibrate Counter with Database'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-amber-900 leading-relaxed">
                <span className="font-semibold">Natural Sequential Numbering Standard:</span> The system standard uses natural numbers without leading zeros (<code className="bg-amber-100/70 px-1 py-0.5 rounded text-[11px] font-mono">IN-2026-1</code>, <code className="bg-amber-100/70 px-1 py-0.5 rounded text-[11px] font-mono">OUT-2026-1</code>, <code className="bg-amber-100/70 px-1 py-0.5 rounded text-[11px] font-mono">IC-2026-1</code>). You can toggle leading zeros per sequence if zero-padding is required.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Incoming Sequence Rule */}
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-xs uppercase tracking-wider">
                    Incoming (IN)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                    External
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-blue-900 mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={inPrefix}
                    onChange={(e) => setInPrefix(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-900 mb-1">
                    Separator
                  </label>
                  <input
                    type="text"
                    value={inSeparator}
                    onChange={(e) => setInSeparator(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg font-mono text-center"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-blue-950 font-semibold">
                  <input
                    type="checkbox"
                    checked={inUseLeadingZeros}
                    onChange={(e) => setInUseLeadingZeros(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Use Leading Zeros (e.g. 0001)</span>
                </label>
                {inUseLeadingZeros && (
                  <div>
                    <label className="block font-semibold text-blue-900 mb-1">
                      Padding Digits
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={inDigits}
                      onChange={(e) => setInDigits(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg"
                    />
                  </div>
                )}
                <div className="pt-2 border-t border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-800">
                    Generated Sample:
                  </span>
                  <div className="font-mono text-sm font-bold text-blue-950 mt-0.5">
                    {sampleIncoming}
                  </div>
                </div>
              </div>

              {/* Outgoing Sequence Rule */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    Outgoing (OUT)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    External
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-emerald-900 mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={outPrefix}
                    onChange={(e) => setOutPrefix(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-900 mb-1">
                    Separator
                  </label>
                  <input
                    type="text"
                    value={outSeparator}
                    onChange={(e) => setOutSeparator(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg font-mono text-center"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-emerald-950 font-semibold">
                  <input
                    type="checkbox"
                    checked={outIncludeDept}
                    onChange={(e) => setOutIncludeDept(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Include Dept Code (e.g. ENG)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer pt-0.5 text-emerald-950 font-semibold">
                  <input
                    type="checkbox"
                    checked={outUseLeadingZeros}
                    onChange={(e) => setOutUseLeadingZeros(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Use Leading Zeros (e.g. 0001)</span>
                </label>
                {outUseLeadingZeros && (
                  <div>
                    <label className="block font-semibold text-emerald-900 mb-1">
                      Padding Digits
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={outDigits}
                      onChange={(e) => setOutDigits(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg"
                    />
                  </div>
                )}
                <div className="pt-2 border-t border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">
                    Generated Sample:
                  </span>
                  <div className="font-mono text-sm font-bold text-emerald-950 mt-0.5">
                    {sampleOutgoing}
                  </div>
                </div>
              </div>

              {/* Internal Sequence Rule (IC) */}
              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 text-xs uppercase tracking-wider">
                    Internal (IC)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                    Inter-Dept
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-purple-900 mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={icPrefix}
                    onChange={(e) => setIcPrefix(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-purple-900 mb-1">
                    Separator
                  </label>
                  <input
                    type="text"
                    value={icSeparator}
                    onChange={(e) => setIcSeparator(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg font-mono text-center"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-purple-950 font-semibold">
                  <input
                    type="checkbox"
                    checked={icIncludeDept}
                    onChange={(e) => setIcIncludeDept(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Include Dept Code (e.g. HR)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer pt-0.5 text-purple-950 font-semibold">
                  <input
                    type="checkbox"
                    checked={icUseLeadingZeros}
                    onChange={(e) => setIcUseLeadingZeros(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Use Leading Zeros (e.g. 0001)</span>
                </label>
                {icUseLeadingZeros && (
                  <div>
                    <label className="block font-semibold text-purple-900 mb-1">
                      Padding Digits
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={icDigits}
                      onChange={(e) => setIcDigits(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg"
                    />
                  </div>
                )}
                <div className="pt-2 border-t border-purple-200">
                  <span className="text-[10px] uppercase font-bold text-purple-800">
                    Generated Sample:
                  </span>
                  <div className="font-mono text-sm font-bold text-purple-950 mt-0.5">
                    {sampleInternal}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VOIDED NUMBERS */}
        {activeTab === 'voided' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Immutable Registry of Voided Correspondence Numbers
              </h2>
              <p className="text-slate-500 mt-0.5">
                Audit requirement: Official sequential numbers that were cancelled or voided are permanently preserved and cannot be reused
              </p>
            </div>

            {numberSequences.voidedNumbers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                No correspondence numbers have been voided. All sequence allocations remain active.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2.5">Voided Reference Number</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Date Voided</th>
                    <th className="p-2.5">Reason / Justification</th>
                    <th className="p-2.5">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {numberSequences.voidedNumbers.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-rose-700">
                        {v.number}
                      </td>
                      <td className="p-2.5 uppercase font-medium">{v.type}</td>
                      <td className="p-2.5 text-slate-500">
                        {new Date(v.voidedAt).toLocaleDateString()}
                      </td>
                      <td className="p-2.5 text-slate-700">{v.reason}</td>
                      <td className="p-2.5 font-medium text-slate-800">
                        {v.voidedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 5: USERS & DEPARTMENTS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Top User Management Banner & Action */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-600" />
                    <span>System User Accounts, Passwords & Access Roles</span>
                  </h2>
                  <p className="text-slate-500 mt-0.5">
                    As System Administrator, define login access, create new users, update passwords, and manage permissions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddUser}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0B1E36] hover:bg-[#08182b] rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <UserPlus className="h-4 w-4 text-sky-400" />
                  <span>+ Define New User & Password</span>
                </button>
              </div>

              {userOpMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    userOpMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {userOpMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{userOpMessage.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserOpMessage(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Users Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="p-3">User & Email</th>
                      <th className="p-3">Username</th>
                      <th className="p-3">Department & Job Title</th>
                      <th className="p-3">Role & Access</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isSelf = currentUser && currentUser.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-[#0B1E36] text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {u.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-semibold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {u.username || u.email.split('@')[0]}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{u.title || 'Officer'}</div>
                            <div className="text-[11px] text-slate-500">{u.departmentName}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : u.role === 'manager'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : u.role === 'auditor'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : 'bg-blue-100 text-blue-900 border-blue-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                u.active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  u.active !== false ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                              />
                              <span>{u.active !== false ? 'Active' : 'Suspended'}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-700 hover:bg-sky-50 border border-sky-200 transition-colors cursor-pointer"
                                title="Edit profile and update password"
                              >
                                <Key className="h-3.5 w-3.5 text-sky-600" />
                                <span>Change Password / Edit</span>
                              </button>

                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(u)}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                    u.active !== false
                                      ? 'text-slate-600 hover:bg-slate-100 border-slate-200'
                                      : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                  }`}
                                  title={u.active !== false ? 'Suspend login access' : 'Reactivate access'}
                                >
                                  {u.active !== false ? 'Suspend' : 'Activate'}
                                </button>
                              )}

                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete user account"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Database Backup, Safety & Work Preservation Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <HardDrive className="h-4 w-4 text-blue-800" />
                  <span>Database Backup, Safety & Work Preservation</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Work Safe & Protected
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                All your draft proposals, documents, registered letters, external shares, and settings are stored safely in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-900">data/correspondence_db.json</code>. This database file is protected from git updates so pulling new software changes from GitHub will never overwrite your work.
              </p>

              {restoreStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{restoreStatus}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={backupLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{backupLoading ? 'Preparing Backup...' : 'Download Full Backup (.json)'}</span>
                </button>

                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors shadow-2xs cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-slate-600" />
                  <span>Restore from Backup File...</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleRestoreBackupFile}
                    disabled={backupLoading}
                  />
                </label>
              </div>
            </div>

            {/* Departments Overview & Database Clean Slate Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Departments List */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-700" />
                    <span>Configured Routing Departments ({departments.length})</span>
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {departments.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{d.name}</span>
                        <div className="text-[11px] text-slate-400">Head: {d.headOfDepartment}</div>
                      </div>
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {d.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean Slate & Reset Maintenance Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span>Production Reset & Clean Slate</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Clear all test letters, registered correspondence, tasks, and contacts to start with a completely clean registry, while safely keeping your administrator login and system configuration intact.
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <p className="text-[11px]">
                    <strong>Note:</strong> Sequential correspondence numbers will reset to 0001 for clean official recording.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCleanDbModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-amber-800" />
                    <span>Reset Registry to Clean State</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MODAL: ADD NEW USER */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fadeIn">
                  <div className="bg-[#0B1E36] px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-sky-400" />
                      <h3 className="font-bold text-sm text-white">Define New User & Access Credentials</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => {
                            setNewName(e.target.value);
                            if (!newUsername && e.target.value) {
                              setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'));
                            }
                          }}
                          placeholder="e.g. John Doe"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="john.doe@pjmak.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Username (Login Handle)</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="e.g. john.doe"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Login Password *</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">System Role & Access</label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        >
                          <option value="officer">Correspondence Officer (Standard Registry Access)</option>
                          <option value="manager">Department Manager (Approvals & Reviews)</option>
                          <option value="admin">System Administrator (Full Settings & Users Access)</option>
                          <option value="auditor">Auditor (Read-Only Inspection)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Department</label>
                        <select
                          value={newDeptId}
                          onChange={(e) => setNewDeptId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Job Title / Designation</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Lead Project Engineer, Document Controller"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={userOpLoading}
                        className="px-4 py-2 rounded-lg bg-[#0B1E36] hover:bg-[#08182b] text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {userOpLoading ? 'Creating User...' : 'Create User & Save Credentials'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL: EDIT USER & CHANGE PASSWORD */}
            {showEditUserModal && editingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fadeIn">
                  <div className="bg-[#0B1E36] px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-sky-400" />
                      <h3 className="font-bold text-sm text-white">
                        Edit Account & Password: {editingUser.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEditUserModal(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateUser} className="p-6 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Username (Login Handle)</label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-slate-700">Change Password</label>
                          <span className="text-[10px] text-slate-400">Leave blank to keep unchanged</span>
                        </div>
                        <div className="relative">
                          <input
                            type={showPasswordInput ? 'text' : 'password'}
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordInput(!showPasswordInput)}
                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPasswordInput ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">System Role & Access</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        >
                          <option value="officer">Correspondence Officer</option>
                          <option value="manager">Department Manager</option>
                          <option value="admin">System Administrator</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Department</label>
                        <select
                          value={editDeptId}
                          onChange={(e) => setEditDeptId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">Account Access Status</div>
                        <div className="text-[11px] text-slate-500">
                          {editActive ? 'User can log in and perform actions' : 'User login is suspended'}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                      </label>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditUserModal(false)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={userOpLoading}
                        className="px-4 py-2 rounded-lg bg-[#0B1E36] hover:bg-[#08182b] text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {userOpLoading ? 'Saving...' : 'Save User & Password Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL: RESET DATABASE CONFIRMATION */}
            {showCleanDbModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-fadeIn">
                  <div className="bg-rose-900 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-amber-300" />
                      <h3 className="font-bold text-sm text-white">Confirm Production Clean State</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCleanDbModal(false)}
                      className="text-rose-200 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs">
                    <p className="text-slate-700 leading-relaxed">
                      This operation will permanently wipe all test letters, registered incoming/outgoing correspondence, tasks, and sample contacts from the database.
                    </p>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                      <strong>Preserved:</strong> Your administrator account (Ali Kashefi), user credentials, company letterhead, and organizational settings will remain fully intact.
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCleanDbModal(false)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDatabase}
                        disabled={userOpLoading}
                        className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {userOpLoading ? 'Resetting Data...' : 'Yes, Clean Slate All Records'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4 text-sky-400" />
            <span>{saving ? 'Saving...' : 'Save Configuration Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
