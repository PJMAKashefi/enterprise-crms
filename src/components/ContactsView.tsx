import React, { useState } from 'react';
import {
  Users,
  Building2,
  Mail,
  Phone,
  MapPin,
  Search,
  Plus,
  FileText,
  ChevronRight,
  ExternalLink,
  Tag,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { Contact, Correspondence } from '../types';
import {
  generateClientCode,
  generateDefaultCostCode,
  generateDefaultRevenueCode,
} from '../utils/clientCodeGenerator';

interface ContactsViewProps {
  contacts: Contact[];
  correspondence: Correspondence[];
  onOpenCorrespondence: (item: Correspondence) => void;
  onCreateContact: (contact: Partial<Contact>) => Promise<Contact>;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  correspondence,
  onOpenCorrespondence,
  onCreateContact,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [activeContact, setActiveContact] = useState<Contact | null>(
    contacts[0] || null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New contact form fields
  const [orgName, setOrgName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactType, setContactType] = useState<
    'government' | 'consultant' | 'contractor' | 'client' | 'company'
  >('company');
  const [contactCode, setContactCode] = useState('');
  const [defaultCostCode, setDefaultCostCode] = useState('');
  const [defaultRevenueCode, setDefaultRevenueCode] = useState('');
  const [industrySector, setIndustrySector] = useState('Oil & Gas / Marine');

  const handleAutoGenerateCodes = () => {
    if (!orgName.trim()) {
      alert('Please enter an Organization name first.');
      return;
    }
    const existing = contacts
      .map((c) => c.contactCode)
      .filter((c): c is string => Boolean(c));
    const code = generateClientCode(orgName, existing);
    setContactCode(code);
    setDefaultCostCode(generateDefaultCostCode(code));
    setDefaultRevenueCode(generateDefaultRevenueCode(code, 1));
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'ALL' || c.contactType === selectedType;
    return matchesSearch && matchesType;
  });

  // Find correspondence related to active contact
  const contactLetters = activeContact
    ? correspondence.filter((c) => {
        const org = activeContact.orgName.toLowerCase();
        return (
          c.senderOrg.toLowerCase().includes(org) ||
          c.recipientOrg.toLowerCase().includes(org) ||
          (c.senderEmail && c.senderEmail.toLowerCase() === activeContact.email.toLowerCase()) ||
          (c.recipientEmail && c.recipientEmail.toLowerCase() === activeContact.email.toLowerCase())
        );
      })
    : [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !contactPerson || !email) {
      alert('Organization name, contact person, and email are required.');
      return;
    }
    try {
      const created = await onCreateContact({
        orgName,
        contactPerson,
        position,
        email,
        phone,
        address,
        contactType,
        contactCode: contactCode.trim() ? contactCode.trim().toUpperCase() : undefined,
        defaultCostCode: defaultCostCode.trim() || undefined,
        defaultRevenueCode: defaultRevenueCode.trim() || undefined,
        industrySector: industrySector.trim() || undefined,
      });
      setActiveContact(created);
      setShowCreateModal(false);
      setOrgName('');
      setContactPerson('');
      setPosition('');
      setEmail('');
      setPhone('');
      setAddress('');
      setContactCode('');
      setDefaultCostCode('');
      setDefaultRevenueCode('');
    } catch (e) {
      alert('Failed to create contact');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Correspondent Contacts Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized registry of government authorities, client representatives, consulting engineers, and contracting partners
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4 text-sky-400" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by organization name, signatory, email address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700"
          >
            <option value="ALL">All Contact Categories</option>
            <option value="government">Government Authorities</option>
            <option value="consultant">Consulting Engineers</option>
            <option value="contractor">Contractors & Vendors</option>
            <option value="client">Clients & Owners</option>
            <option value="company">Corporate Entities</option>
          </select>
        </div>
      </div>

      {/* Split Directory Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Contact Cards List */}
        <div className="space-y-3 overflow-y-auto max-h-[650px] pr-1">
          {filteredContacts.map((c) => {
            const isSelected = activeContact?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveContact(c)}
                className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {c.orgName}
                    </h3>
                    <div className="text-xs text-slate-700 font-medium mt-0.5">
                      {c.contactPerson}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.position || 'Official Representative'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {c.contactType}
                    </span>
                    {c.contactCode && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.contactCode}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 2 Cols: Selected Contact Dossier & Correspondence History */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          {activeContact ? (
            <div className="p-6 space-y-6">
              {/* Contact Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                    {activeContact.contactType}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">
                    {activeContact.orgName}
                  </h2>
                  <div className="text-xs text-slate-700 font-medium">
                    Attn: {activeContact.contactPerson} — {activeContact.position}
                  </div>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <div className="font-bold text-slate-900 text-base">
                    {contactLetters.length}
                  </div>
                  <div>Exchanged Letters</div>
                </div>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                    Official Email
                  </span>
                  <span className="font-semibold text-slate-800">
                    {activeContact.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                    Telephone
                  </span>
                  <span className="font-semibold text-slate-800">
                    {activeContact.phone || '—'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                    Physical / Mailing Address
                  </span>
                  <span className="text-slate-700">
                    {activeContact.address || '—'}
                  </span>
                </div>
              </div>

              {/* Commercial & Traceability Metadata Card */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    <Briefcase className="h-4 w-4 text-emerald-700" />
                    <span>Commercial & Accounting Identifiers</span>
                  </div>
                  {activeContact.contactCode && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Client: {activeContact.contactCode}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Client / Counterparty Code
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {activeContact.contactCode || 'Pending Allocation'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Default Cost Code
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {activeContact.defaultCostCode || `CC-${activeContact.contactCode || 'STD'}-2026`}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Default Revenue Code
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {activeContact.defaultRevenueCode || `REV-${activeContact.contactCode || 'STD'}-001`}
                    </span>
                  </div>
                </div>

                {activeContact.industrySector && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                    <span className="font-semibold text-slate-700">Industry / Sector:</span>
                    <span>{activeContact.industrySector}</span>
                  </div>
                )}
              </div>

              {/* Exchanged Correspondence History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Full Correspondence History ({contactLetters.length})
                  </h3>
                </div>

                {contactLetters.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    No correspondence registered with this contact yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {contactLetters.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => onOpenCorrespondence(l)}
                        className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`p-1.5 rounded ${
                              l.type === 'incoming'
                                ? 'bg-blue-100 text-blue-800 font-bold'
                                : 'bg-emerald-100 text-emerald-800 font-bold'
                            }`}
                          >
                            {l.type === 'incoming' ? 'IN' : 'OUT'}
                          </span>
                          <div>
                            <div className="font-mono font-bold text-slate-900">
                              {l.correspondenceNumber}
                            </div>
                            <div className="text-slate-700 font-medium line-clamp-1">
                              {l.subject}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <div>{l.officialDate}</div>
                          <span className="capitalize text-slate-600 font-semibold">
                            {l.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Select a contact to view full profile and correspondence archive.
            </div>
          )}
        </div>
      </div>

      {/* New Contact Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Register New Correspondent Contact
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. State Highway Administration"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="government">Government Authority</option>
                    <option value="consultant">Consulting Engineer</option>
                    <option value="contractor">Contractor</option>
                    <option value="client">Client</option>
                    <option value="company">Company</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Signatory Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Eng. Robert Sterling"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Position / Title
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Chief Resident Engineer"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sterling@highways.gov"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Telephone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 432-8900"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Physical / Postal Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Suite 900, Government Plaza, New York, NY"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Commercial & Traceability Fields */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Commercial & Accounting Codes</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCodes}
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-white px-2 py-0.5 rounded border border-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-Generate Codes</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Client Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBM"
                      value={contactCode}
                      onChange={(e) => setContactCode(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1 font-mono uppercase bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Default Cost Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CC-SBM-2026"
                      value={defaultCostCode}
                      onChange={(e) => setDefaultCostCode(e.target.value)}
                      className="w-full px-2.5 py-1 font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Default Rev Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. REV-SBM-001"
                      value={defaultRevenueCode}
                      onChange={(e) => setDefaultRevenueCode(e.target.value)}
                      className="w-full px-2.5 py-1 font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                    Industry / Sector
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EPC / Marine Construction / Offshore Engineering"
                    value={industrySector}
                    onChange={(e) => setIndustrySector(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
