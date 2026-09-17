import React, { useState } from 'react';
import {
  X,
  Send,
  Download,
  Mail,
  FileText,
  CheckCircle2,
  Paperclip,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Correspondence, CompanySettings } from '../types';
import { generateCorrespondencePdf } from '../utils/pdfGenerator';

interface EmailSendModalProps {
  correspondence: Correspondence;
  settings: CompanySettings;
  onClose: () => void;
  onSendEmail: (data: {
    to: string;
    cc: string;
    subject: string;
    body: string;
  }) => Promise<void>;
}

export const EmailSendModal: React.FC<EmailSendModalProps> = ({
  correspondence,
  settings,
  onClose,
  onSendEmail,
}) => {
  const [sendMode, setSendMode] = useState<
    | 'download_only'
    | 'save_only'
    | 'send_email'
    | 'download_and_send'
    | 'create_draft'
  >('download_and_send');

  const [toEmail, setToEmail] = useState(correspondence.recipientEmail || '');
  const [ccEmails, setCcEmails] = useState(
    correspondence.ccEmails?.join(', ') || ''
  );
  const [emailSubject, setEmailSubject] = useState(
    `[OFFICIAL TRANSMITTAL] ${correspondence.correspondenceNumber}: ${correspondence.subject}`
  );
  const [emailBody, setEmailBody] = useState(
    `Dear ${correspondence.recipientPerson || correspondence.recipientOrg},\n\nPlease find attached the official correspondence from ${
      settings.companyName
    } regarding "${correspondence.subject}" (Reference: ${
      correspondence.correspondenceNumber
    }).\n\nKindly acknowledge receipt of this transmittal.\n\nYours faithfully,\n${
      correspondence.signatoryName || settings.signature.signatoryName
    }\n${correspondence.signatoryPosition || settings.signature.position}\n${
      settings.companyName
    }`
  );

  const [sending, setSending] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const pdfFilename = `${correspondence.correspondenceNumber}_Official_Letter.pdf`;

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      (sendMode === 'send_email' || sendMode === 'download_and_send') &&
      !toEmail.trim()
    ) {
      alert('Recipient email address is required.');
      return;
    }

    setSending(true);
    try {
      if (sendMode === 'download_only' || sendMode === 'download_and_send') {
        generateCorrespondencePdf(correspondence, settings, true);
      }

      if (sendMode === 'send_email' || sendMode === 'download_and_send') {
        await onSendEmail({
          to: toEmail,
          cc: ccEmails,
          subject: emailSubject,
          body: emailBody,
        });
      }

      setSuccessNotice('Official correspondence processed successfully.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Letter Dispatch & Issuance
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {correspondence.correspondenceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successNotice ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-bounce" />
            <div className="text-sm font-bold text-slate-900">
              {successNotice}
            </div>
            <p className="text-xs text-slate-500">
              Dispatch log recorded in audit trail.
            </p>
          </div>
        ) : (
          <form onSubmit={handleExecute} className="p-6 space-y-4 text-xs">
            {/* Mode Selection Radios */}
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                Select Issuance & Dispatch Method:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    sendMode === 'download_and_send'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMode"
                    value="download_and_send"
                    checked={sendMode === 'download_and_send'}
                    onChange={() => setSendMode('download_and_send')}
                    className="text-emerald-600"
                  />
                  <span>Download PDF + Send by Email</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    sendMode === 'send_email'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMode"
                    value="send_email"
                    checked={sendMode === 'send_email'}
                    onChange={() => setSendMode('send_email')}
                    className="text-emerald-600"
                  />
                  <span>Send by Email Only</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    sendMode === 'download_only'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMode"
                    value="download_only"
                    checked={sendMode === 'download_only'}
                    onChange={() => setSendMode('download_only')}
                    className="text-emerald-600"
                  />
                  <span>Download PDF Only</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    sendMode === 'save_only'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMode"
                    value="save_only"
                    checked={sendMode === 'save_only'}
                    onChange={() => setSendMode('save_only')}
                    className="text-emerald-600"
                  />
                  <span>Save Status Only (Mark Issued)</span>
                </label>
              </div>
            </div>

            {/* Email form details when email is selected */}
            {(sendMode === 'send_email' ||
              sendMode === 'download_and_send' ||
              sendMode === 'create_draft') && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Official Email Transmittal
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                    <Paperclip className="h-3 w-3" />
                    <span>{pdfFilename} (Auto-Attached)</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    To (Recipient Email) *
                  </label>
                  <input
                    type="email"
                    required
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="official.contact@recipient.org"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    CC (Carbon Copy Emails, separated by comma)
                  </label>
                  <input
                    type="text"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    placeholder="legal@ourcompany.com, project.lead@client.gov"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Transmittal Message Body
                  </label>
                  <textarea
                    rows={4}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-sans"
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-2xs cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>
                  {sending
                    ? 'Processing...'
                    : sendMode === 'download_and_send'
                    ? 'Download PDF & Dispatch Email'
                    : sendMode === 'download_only'
                    ? 'Download PDF'
                    : 'Dispatch Official Transmittal'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
