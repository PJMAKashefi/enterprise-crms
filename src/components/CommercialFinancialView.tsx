import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Download,
  Filter,
  CreditCard,
  Building2,
  Tag,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ArrowLeft,
} from 'lucide-react';
import { Correspondence, Contact, User } from '../types';

interface CommercialFinancialViewProps {
  correspondence: Correspondence[];
  contacts?: Contact[];
  currentUser?: User | null;
  onOpenCorrespondence: (item: Correspondence, tab?: string) => void;
  onNewCorrespondence?: () => void;
  onRefreshData?: () => void;
  onBackToDashboard?: () => void;
  isFullPage?: boolean;
}

export const CommercialFinancialView: React.FC<CommercialFinancialViewProps> = ({
  correspondence,
  contacts = [],
  currentUser,
  onOpenCorrespondence,
  onNewCorrespondence,
  onRefreshData,
  onBackToDashboard,
  isFullPage = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientCode, setSelectedClientCode] = useState<string>('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'officialDate' | 'commercialValue'>('officialDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter correspondence that has commercial/financial data or all correspondence
  const commercialItems = useMemo(() => {
    return correspondence.filter(
      (c) =>
        !c.isArchived &&
        (c.clientCode ||
          c.costCode ||
          c.revenueCode ||
          c.contractNumber ||
          c.proformaInvoiceNumber ||
          (c.commercialValue !== undefined && c.commercialValue !== null))
    );
  }, [correspondence]);

  // Unique client codes
  const clientCodes = useMemo(() => {
    const set = new Set<string>();
    correspondence.forEach((c) => {
      if (c.clientCode) set.add(c.clientCode.toUpperCase());
    });
    contacts.forEach((contact) => {
      if (contact.contactCode) set.add(contact.contactCode.toUpperCase());
    });
    return Array.from(set).sort();
  }, [correspondence, contacts]);

  // Total commercial value aggregated by currency
  const totalValueByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    commercialItems.forEach((c) => {
      if (c.commercialValue && !isNaN(Number(c.commercialValue))) {
        const curr = c.currency || 'USD';
        totals[curr] = (totals[curr] || 0) + Number(c.commercialValue);
      }
    });
    return totals;
  }, [commercialItems]);

  // Unique contracts
  const uniqueContracts = useMemo(() => {
    const set = new Set<string>();
    commercialItems.forEach((c) => {
      if (c.contractNumber) set.add(c.contractNumber);
    });
    return Array.from(set);
  }, [commercialItems]);

  // Unique proforma invoices
  const uniqueInvoices = useMemo(() => {
    const set = new Set<string>();
    commercialItems.forEach((c) => {
      if (c.proformaInvoiceNumber) set.add(c.proformaInvoiceNumber);
    });
    return Array.from(set);
  }, [commercialItems]);

  // Unique cost codes
  const uniqueCostCodes = useMemo(() => {
    const set = new Set<string>();
    commercialItems.forEach((c) => {
      if (c.costCode) set.add(c.costCode);
    });
    return Array.from(set);
  }, [commercialItems]);

  // Filtered list
  const filteredList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const result = commercialItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.correspondenceNumber.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        (item.clientCode && item.clientCode.toLowerCase().includes(q)) ||
        (item.costCode && item.costCode.toLowerCase().includes(q)) ||
        (item.revenueCode && item.revenueCode.toLowerCase().includes(q)) ||
        (item.contractNumber && item.contractNumber.toLowerCase().includes(q)) ||
        (item.proformaInvoiceNumber && item.proformaInvoiceNumber.toLowerCase().includes(q)) ||
        (item.recipientOrg && item.recipientOrg.toLowerCase().includes(q)) ||
        (item.senderOrg && item.senderOrg.toLowerCase().includes(q));

      const matchesClient =
        selectedClientCode === 'ALL' ||
        (item.clientCode && item.clientCode.toUpperCase() === selectedClientCode);

      const matchesCurrency =
        selectedCurrency === 'ALL' ||
        (item.currency && item.currency.toUpperCase() === selectedCurrency) ||
        (!item.currency && selectedCurrency === 'USD');

      return matchesSearch && matchesClient && matchesCurrency;
    });

    result.sort((a, b) => {
      if (sortField === 'commercialValue') {
        const valA = Number(a.commercialValue) || 0;
        const valB = Number(b.commercialValue) || 0;
        return sortDirection === 'desc' ? valB - valA : valA - valB;
      } else {
        const diff = new Date(b.officialDate).getTime() - new Date(a.officialDate).getTime();
        return sortDirection === 'desc' ? diff : -diff;
      }
    });

    return result;
  }, [commercialItems, searchTerm, selectedClientCode, selectedCurrency, sortField, sortDirection]);

  const handleExportCSV = () => {
    const headers = [
      'Ref Number',
      'Type',
      'Client Code',
      'Cost Code',
      'Revenue Code',
      'Contract No',
      'Proforma Invoice',
      'Commercial Value',
      'Currency',
      'Counterparty',
      'Subject',
      'Official Date',
      'Status',
    ];

    const rows = filteredList.map((c) => [
      c.correspondenceNumber,
      c.type,
      c.clientCode || 'N/A',
      c.costCode || 'N/A',
      c.revenueCode || 'N/A',
      c.contractNumber || 'N/A',
      c.proformaInvoiceNumber || 'N/A',
      c.commercialValue !== undefined ? String(c.commercialValue) : '0',
      c.currency || 'USD',
      `"${(c.type === 'incoming' ? c.senderOrg : c.recipientOrg).replace(/"/g, '""')}"`,
      `"${c.subject.replace(/"/g, '""')}"`,
      c.officialDate,
      c.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pjmak_commercial_register_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`p-6 md:p-8 space-y-6 mx-auto ${isFullPage ? 'w-full max-w-full' : 'max-w-7xl'}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-blue-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-blue-950 tracking-tight flex items-center gap-2">
                <span>Commercial & Financial Register</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  Cost Center & Billing Traceability
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Unified cross-referencing between official correspondence, client acronyms, cost codes, contracts, and proforma invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-950 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Financial Log</span>
          </button>
        </div>
      </div>

      {/* Top Commercial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Value Tracked</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-blue-950 mt-1">
            {Object.keys(totalValueByCurrency).length > 0 ? (
              Object.entries(totalValueByCurrency).map(([curr, val]) => (
                <span key={curr} className="block text-emerald-700">
                  {curr} {val.toLocaleString()}
                </span>
              ))
            ) : (
              <span className="text-slate-400 font-normal text-base">No valuations</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Across official correspondence</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Client Codes</span>
            <Building2 className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-blue-950 mt-1">{clientCodes.length}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            {clientCodes.slice(0, 4).join(', ') || 'None assigned'}
            {clientCodes.length > 4 ? ` +${clientCodes.length - 4}` : ''}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Contracts & POs</span>
            <FileText className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-blue-950 mt-1">{uniqueContracts.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Tracked contract numbers</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Proforma Invoices (PI)</span>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-blue-950 mt-1">{uniqueInvoices.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">{uniqueCostCodes.length} active cost centers</div>
        </div>
      </div>

      {/* Client Filter Pill Bar */}
      {clientCodes.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1.5 pl-1 pr-2 border-r border-slate-200">
            <Tag className="h-3.5 w-3.5 text-blue-700" />
            <span>Counterparty:</span>
          </span>
          <button
            onClick={() => setSelectedClientCode('ALL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              selectedClientCode === 'ALL'
                ? 'bg-blue-950 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Counterparties
          </button>
          {clientCodes.map((code) => {
            const count = commercialItems.filter(
              (c) => c.clientCode && c.clientCode.toUpperCase() === code
            ).length;
            return (
              <button
                key={code}
                onClick={() => setSelectedClientCode(code)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedClientCode === code
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span>{code}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
                    selectedClientCode === code ? 'bg-emerald-900 text-emerald-200' : 'bg-white text-emerald-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Filter & Commercial Table */}
      <div className="bg-white rounded-xl border border-blue-100 shadow-2xs overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-blue-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search client code, contract no, cost code, PI, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
            />
          </div>

          <div>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED (د.إ)</option>
              <option value="SAR">SAR (﷼)</option>
            </select>
          </div>

          <div>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-');
                setSortField(f as any);
                setSortDirection(d as any);
              }}
              className="w-full px-3 py-2 text-xs border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-slate-700 font-medium"
            >
              <option value="officialDate-desc">Date (Newest First)</option>
              <option value="officialDate-asc">Date (Oldest First)</option>
              <option value="commercialValue-desc">Value (Highest First)</option>
              <option value="commercialValue-asc">Value (Lowest First)</option>
            </select>
          </div>
        </div>

        {/* Commercial Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-blue-50/70 border-b border-blue-100 text-[11px] font-bold text-blue-950 uppercase tracking-wider">
                <th className="py-3 px-3.5">Ref & Type</th>
                <th className="py-3 px-3.5">Client Code</th>
                <th className="py-3 px-3.5">Cost & Rev Code</th>
                <th className="py-3 px-3.5">Contract / PI No</th>
                <th className="py-3 px-3.5">Counterparty & Subject</th>
                <th className="py-3 px-3.5 text-right">Commercial Value</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No commercial correspondence found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Items with client codes, contract references, or commercial values will appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const hasVal = item.commercialValue !== undefined && item.commercialValue !== null;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onOpenCorrespondence(item)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-blue-950 text-xs flex items-center gap-1.5">
                          <span>{item.correspondenceNumber}</span>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                            item.type === 'incoming'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : item.type === 'outgoing'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        {item.clientCode ? (
                          <span className="font-mono font-bold text-emerald-800 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200 text-xs">
                            {item.clientCode}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-[11px]">
                        {item.costCode && (
                          <div className="text-slate-800 font-semibold">{item.costCode}</div>
                        )}
                        {item.revenueCode && (
                          <div className="text-slate-500 text-[10px]">{item.revenueCode}</div>
                        )}
                        {!item.costCode && !item.revenueCode && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-[11px]">
                        {item.contractNumber && (
                          <div className="text-blue-950 font-bold">{item.contractNumber}</div>
                        )}
                        {item.proformaInvoiceNumber && (
                          <div className="text-amber-800 text-[10px] font-semibold">
                            PI: {item.proformaInvoiceNumber}
                          </div>
                        )}
                        {!item.contractNumber && !item.proformaInvoiceNumber && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="font-bold text-slate-800 truncate">
                          {item.type === 'incoming' ? item.senderOrg : item.recipientOrg}
                        </div>
                        <div className="text-slate-500 text-[11px] truncate mt-0.5" title={item.subject}>
                          {item.subject}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-bold">
                        {hasVal ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            {item.currency || 'USD'} {Number(item.commercialValue).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCorrespondence(item);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <span>Dossier</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
