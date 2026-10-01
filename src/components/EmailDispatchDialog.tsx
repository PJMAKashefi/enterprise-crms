import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  ShieldCheck,
  Lock,
  Clock,
  Sparkles,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import { Correspondence, CompanySettings, EmailTemplateItem } from '../types';
import { generateCorrespondencePdf } from '../utils/pdfGenerator';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  getGoogleUser,
  logoutGoogle,
} from '../utils/firebaseAuth';
import {
  createGmailDraft,
  sendGmailMessage,
  openGmailCompose,
  GmailDraftResult,
} from '../utils/gmailService';
import { openYahooCompose } from '../utils/yahooMailService';

interface EmailDispatchDialogProps {
  correspondence: Correspondence;
  settings: CompanySettings;
  onClose: () => void;
  onRecordEmailAction: (data: {
    to: string;
    cc: string;
    subject: string;
    body: string;
    isDraft: boolean;
    draftId?: string;
    draftUrl?: string;
    provider: 'gmail' | 'yahoo';
    senderAccount?: string;
  }) => Promise<void>;
}

export const EmailDispatchDialog: React.FC<EmailDispatchDialogProps> = ({
  correspondence,
  settings,
  onClose,
  onRecordEmailAction,
}) => {
  // Provider Selection: 'gmail' or 'yahoo'
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'yahoo'>(
    (settings.emailSettings?.provider === 'yahoo' ? 'yahoo' : 'gmail')
  );

  // Google Auth State
  const [googleUser, setGoogleUser] = useState<any>(() => getGoogleUser());
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Yahoo Email state
  const [yahooEmail, setYahooEmail] = useState<string>(
    settings.emailSettings?.yahooEmail || 'mamadalikashefi@yahoo.com'
  );

  // Salutation state: 'Dear Mr.' | 'Dear Ms.' | 'Dear Dr.' | 'Dear Eng.' | 'Dear Sir/Madam'
  const [salutationPrefix, setSalutationPrefix] = useState<string>(() => {
    const p = correspondence.recipientPerson || '';
    if (p.toLowerCase().includes('ms.') || p.toLowerCase().includes('mrs.')) return 'Dear Ms.';
    if (p.toLowerCase().includes('dr.')) return 'Dear Dr.';
    if (p.toLowerCase().includes('eng.')) return 'Dear Eng.';
    return 'Dear Mr.';
  });
  const [recipientSalutationName, setRecipientSalutationName] = useState<string>(
    correspondence.recipientPerson || correspondence.recipientOrg || 'Sir / Madam'
  );

  // Email Templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-std-transmittal');

  // Load email templates
  useEffect(() => {
    fetch('/api/email-templates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEmailTemplates(data);
          setSelectedTemplateId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Standard subject: {Subject} - {LetterNumber}
  const defaultSubject = `${correspondence.subject} - ${correspondence.correspondenceNumber}`;

  // Helper to build formatted email body
  const buildEmailBody = (salutation: string, name: string, templateId?: string) => {
    const tpl = emailTemplates.find((t) => t.id === templateId) || emailTemplates[0];
    
    if (tpl && tpl.bodyFormat) {
      // Replace placeholders
      let text = tpl.bodyFormat
        .replace(/{salutation}/g, (salutation || '').replace(/^Dear\s+/, ''))
        .replace(/{recipientName}/g, name || '')
        .replace(/{subject}/g, correspondence?.subject || '')
        .replace(/{letterNumber}/g, correspondence?.correspondenceNumber || '')
        .replace(/{signatoryName}/g, correspondence?.signatoryName || settings.signature.signatoryName)
        .replace(/{signatoryPosition}/g, correspondence?.signatoryPosition || settings.signature.position)
        .replace(/{companyName}/g, settings.companyName);
      return text;
    }

    const salutationLine = `${salutation} ${name},`;
    return `${salutationLine}\n\nKindly please find the attached file regarding "${correspondence.subject}" (Reference No: ${correspondence.correspondenceNumber}).\n\nPlease acknowledge receipt of this official transmittal.\n\nYours faithfully,\n${
      correspondence.signatoryName || settings.signature.signatoryName
    }\n${correspondence.signatoryPosition || settings.signature.position}\n${
      settings.companyName
    }`;
  };

  // Email form fields
  const [toEmail, setToEmail] = useState(correspondence.recipientEmail || '');
  const [ccEmails, setCcEmails] = useState<string>(() => {
    const list: string[] = [];
    if (correspondence.ccEmails && Array.isArray(correspondence.ccEmails)) {
      list.push(...correspondence.ccEmails);
    }
    if (correspondence.externalCcRecipients && Array.isArray(correspondence.externalCcRecipients)) {
      correspondence.externalCcRecipients.forEach((r) => {
        if (r.email && !list.includes(r.email)) list.push(r.email);
      });
    }
    if (correspondence.additionalRecipients && Array.isArray(correspondence.additionalRecipients)) {
      correspondence.additionalRecipients.forEach((r) => {
        if (r.email && !list.includes(r.email) && r.email !== correspondence.recipientEmail) {
          list.push(r.email);
        }
      });
    }
    return list.filter(Boolean).join(', ');
  });

  // Available quick CC options
  const availableQuickCc = useMemo(() => {
    const map = new Map<string, string>();
    if (correspondence.additionalRecipients) {
      correspondence.additionalRecipients.forEach((r) => {
        if (r.email && r.email !== toEmail) {
          map.set(r.email.toLowerCase(), r.contactPerson || r.orgName || r.email);
        }
      });
    }
    if (correspondence.externalCcRecipients) {
      correspondence.externalCcRecipients.forEach((r) => {
        if (r.email && r.email !== toEmail) {
          map.set(r.email.toLowerCase(), r.name || r.orgName || r.email);
        }
      });
    }
    if (correspondence.ccEmails) {
      correspondence.ccEmails.forEach((e) => {
        if (e && e !== toEmail && !map.has(e.toLowerCase())) {
          map.set(e.toLowerCase(), e);
        }
      });
    }
    return Array.from(map.entries()).map(([email, label]) => ({ email, label }));
  }, [correspondence, toEmail]);
  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailBody, setEmailBody] = useState(() => {
    const salutationLine = `Dear Mr. ${correspondence.recipientPerson || correspondence.recipientOrg || 'Sir / Madam'},`;
    return `${salutationLine}\n\nKindly please find the attached file regarding "${correspondence.subject}" (Reference No: ${correspondence.correspondenceNumber}).\n\nPlease review and kindly acknowledge receipt.\n\nYours faithfully,\n${
      correspondence.signatoryName || settings.signature.signatoryName
    }\n${correspondence.signatoryPosition || settings.signature.position}\n${
      settings.companyName
    }`;
  });

  // When template or salutation changes, update body
  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const newBody = buildEmailBody(salutationPrefix, recipientSalutationName, tplId);
    setEmailBody(newBody);
    const tpl = emailTemplates.find((t) => t.id === tplId);
    if (tpl && tpl.subjectFormat) {
      const newSubject = tpl.subjectFormat
        .replace(/{subject}/g, correspondence.subject)
        .replace(/{letterNumber}/g, correspondence.correspondenceNumber);
      setEmailSubject(newSubject);
    }
  };

  const handleSalutationChange = (prefix: string, name: string) => {
    setSalutationPrefix(prefix);
    setRecipientSalutationName(name);
    setEmailBody(buildEmailBody(prefix, name, selectedTemplateId));
  };

  // Action choice: 'draft' | 'send' | 'download_only'
  const [actionChoice, setActionChoice] = useState<'draft' | 'send' | 'download_only'>('draft');
  const [includePdf, setIncludePdf] = useState(true);

  // Explicit User Confirmation for direct sending
  const [grantPermissionConfirmed, setGrantPermissionConfirmed] = useState(false);

  // Execution states
  const [processing, setProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    draftUrl?: string;
    isDraft: boolean;
  } | null>(null);

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const pdfFilename = `${(correspondence?.correspondenceNumber || 'Correspondence').replace(/[\/\\]/g, '_')}_Official_Letter.pdf`;

  // 1-Click Direct Gmail Web Compose (Bypasses popup blockers and OAuth requirements)
  const handleDirectWebCompose = async () => {
    if (!toEmail.trim()) {
      alert('Recipient email address is required.');
      return;
    }
    try {
      setProcessing(true);
      // Download official PDF letter
      generateCorrespondencePdf(correspondence, settings, true);

      // Open Gmail Web Compose with pre-filled content
      const emailPayload = {
        to: toEmail,
        cc: ccEmails,
        subject: emailSubject,
        bodyText: emailBody,
      };
      openGmailCompose(emailPayload);

      // Record dispatch in PJMAK registry
      await onRecordEmailAction({
        to: toEmail,
        cc: ccEmails,
        subject: emailSubject,
        body: emailBody,
        isDraft: false,
        provider: 'gmail',
        senderAccount: 'Gmail Web',
      });

      setSuccessInfo({
        message: 'Official Letter PDF downloaded and Gmail compose opened! Letter marked as Sent with today’s date.',
        isDraft: false,
      });
      setTimeout(onClose, 2500);
    } catch (err: any) {
      console.error('Direct web compose error:', err);
      alert(err.message || 'Failed to open Gmail');
    } finally {
      setProcessing(false);
    }
  };

  // Submit Handler
  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (actionChoice !== 'download_only' && !toEmail.trim()) {
      alert('Recipient email address is required.');
      return;
    }

    if (actionChoice === 'send' && !grantPermissionConfirmed) {
      alert('Please check the permission box to confirm direct dispatch from your email.');
      return;
    }

    setProcessing(true);
    setAuthError(null);

    try {
      // 1. Download PDF if selected
      if (actionChoice === 'download_only') {
        generateCorrespondencePdf(correspondence, settings, true);
        await onRecordEmailAction({
          to: toEmail,
          cc: ccEmails,
          subject: emailSubject,
          body: emailBody,
          isDraft: false,
          provider: selectedProvider,
        });
        setSuccessInfo({
          message: 'Official Letter PDF downloaded successfully.',
          isDraft: false,
        });
        setTimeout(onClose, 1800);
        return;
      }

      // 2. Handling Gmail
      if (selectedProvider === 'gmail') {
        const todayStr = new Date().toISOString().split('T')[0];
        const emailPayload = {
          to: toEmail,
          cc: ccEmails,
          subject: emailSubject,
          bodyText: emailBody,
          bodyHtml: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${(emailBody || '').replace(/\n/g, '<br/>')}
            <br/><br/>
            <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;"/>
            <p style="font-size: 11px; color: #64748b;">
              <strong>${settings.companyName}</strong> - Official Correspondence Management System<br/>
              Reference: <strong>${correspondence.correspondenceNumber}</strong> | Date: ${todayStr}
            </p>
          </div>`,
          includePdfAttachment: includePdf,
        };

        // Attempt API if token exists or user authenticated
        let token = googleToken || (await getAccessToken());
        let usedWebFallback = false;

        if (!token) {
          try {
            const authRes = await googleSignIn();
            token = authRes?.accessToken || null;
            if (authRes) {
              setGoogleUser(authRes.user);
              setGoogleToken(authRes.accessToken);
            }
          } catch (authErr: any) {
            console.warn('Google Popup / OAuth blocked or unavailable. Seamlessly launching Gmail Web Compose:', authErr);
            usedWebFallback = true;
          }
        }

        if (usedWebFallback || !token) {
          // Seamless fallback: download PDF and open Gmail Web Compose
          generateCorrespondencePdf(correspondence, settings, true);
          openGmailCompose(emailPayload);

          await onRecordEmailAction({
            to: toEmail,
            cc: ccEmails,
            subject: emailSubject,
            body: emailBody,
            isDraft: actionChoice === 'draft',
            provider: 'gmail',
            senderAccount: 'Gmail Web',
          });

          setSuccessInfo({
            message: `Official Letter PDF downloaded and Gmail compose opened with your letter ready! Registry status updated to Sent.`,
            isDraft: actionChoice === 'draft',
          });
          setTimeout(onClose, 2500);
          return;
        }

        if (actionChoice === 'draft') {
          // Create Draft via Gmail API
          const draftRes: GmailDraftResult = await createGmailDraft(
            token,
            emailPayload,
            correspondence,
            settings
          );

          await onRecordEmailAction({
            to: toEmail,
            cc: ccEmails,
            subject: emailSubject,
            body: emailBody,
            isDraft: true,
            draftId: draftRes.id,
            draftUrl: draftRes.webUrl,
            provider: 'gmail',
            senderAccount: googleUser?.email,
          });

          setSuccessInfo({
            message: `Draft created in your Gmail account (${googleUser?.email || 'Gmail'}). An end-of-day reminder is set for 1 hour before work ends!`,
            draftUrl: draftRes.webUrl,
            isDraft: true,
          });
        } else {
          // Send Directly via Gmail API with user permission
          await sendGmailMessage(token, emailPayload, correspondence, settings);

          await onRecordEmailAction({
            to: toEmail,
            cc: ccEmails,
            subject: emailSubject,
            body: emailBody,
            isDraft: false,
            provider: 'gmail',
            senderAccount: googleUser?.email,
          });

          setSuccessInfo({
            message: `Official correspondence dispatched directly from your Gmail (${googleUser?.email})! Registry status updated to Sent.`,
            isDraft: false,
          });
          setTimeout(onClose, 2000);
        }
      } else {
        // 3. Handling Yahoo Mail
        const yahooPayload = {
          to: toEmail,
          cc: ccEmails,
          subject: emailSubject,
          bodyText: emailBody,
          includePdfAttachment: includePdf,
        };

        if (actionChoice === 'draft') {
          // Open Yahoo Mail Draft in web
          openYahooCompose(yahooPayload);

          await onRecordEmailAction({
            to: toEmail,
            cc: ccEmails,
            subject: emailSubject,
            body: emailBody,
            isDraft: true,
            provider: 'yahoo',
            senderAccount: yahooEmail,
          });

          setSuccessInfo({
            message: `Yahoo Mail compose opened with your draft. Saved as draft in PJMAK with 1-hour end-of-day reminder!`,
            isDraft: true,
          });
        } else {
          // Direct dispatch recorded
          openYahooCompose(yahooPayload);

          await onRecordEmailAction({
            to: toEmail,
            cc: ccEmails,
            subject: emailSubject,
            body: emailBody,
            isDraft: false,
            provider: 'yahoo',
            senderAccount: yahooEmail,
          });

          setSuccessInfo({
            message: `Official transmittal prepared in Yahoo Mail and recorded in audit log.`,
            isDraft: false,
          });
          setTimeout(onClose, 2000);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Operation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col my-auto">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-900 border border-blue-200">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Email Dispatch & Draft Permission
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {correspondence.correspondenceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {successInfo ? (
          <div className="p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="text-base font-bold text-slate-900">
              {successInfo.isDraft ? 'Saved to Email Drafts' : 'Dispatched Successfully'}
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {successInfo.message}
            </p>

            {successInfo.draftUrl && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <a
                  href={successInfo.draftUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <span>Open in Gmail</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleExecute} className="p-5 space-y-4 text-xs">
            {/* Account Provider Tabs */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Select Your Email Account:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('gmail')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    selectedProvider === 'gmail'
                      ? 'border-blue-700 bg-blue-50/80 text-blue-950 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="h-5 w-5 rounded flex items-center justify-center font-bold text-red-600 bg-white shadow-2xs text-[11px]">
                    G
                  </div>
                  <span>Gmail (Google Workspace)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('yahoo')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    selectedProvider === 'yahoo'
                      ? 'border-purple-700 bg-purple-50/80 text-purple-950 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="h-5 w-5 rounded flex items-center justify-center font-bold text-purple-700 bg-white shadow-2xs text-[11px]">
                    Y!
                  </div>
                  <span>Yahoo Mail</span>
                </button>
              </div>
            </div>

            {/* Provider Connection Status & Auth */}
            {selectedProvider === 'gmail' ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                {googleUser ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">
                          {googleUser.displayName || 'Connected User'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {googleUser.email}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => logoutGoogle()}
                      className="text-[11px] text-slate-500 hover:text-rose-600 underline"
                    >
                      Switch Account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Lock className="h-3.5 w-3.5 text-blue-900" />
                        <span>Sign in to grant Gmail drafting & sending permissions:</span>
                      </div>
                    </div>

                    {/* Official Sign In with Google Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isAuthenticating}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="h-4 w-4"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>
                        {isAuthenticating ? 'Connecting to Gmail...' : 'Connect with Gmail'}
                      </span>
                    </button>

                    <div className="relative flex py-0.5 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="shrink-0 mx-2 text-[10px] text-slate-400 font-semibold uppercase">Or Direct Web Compose</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDirectWebCompose}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold border border-blue-200 rounded-xl transition-colors cursor-pointer text-xs shadow-2xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-blue-700" />
                      <span>Open Directly in Gmail Web (1-Click • No Sign-In Required)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                <label className="block text-[11px] font-semibold text-purple-900">
                  Your Yahoo Email Address:
                </label>
                <input
                  type="email"
                  value={yahooEmail}
                  onChange={(e) => setYahooEmail(e.target.value)}
                  placeholder="username@yahoo.com"
                  className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs"
                />
                <p className="text-[10px] text-purple-700">
                  Letters will be prepared with pre-filled recipient and content directly in your Yahoo web compose.
                </p>
              </div>
            )}

            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Core Action Choice */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                What would you like to do right now?
              </label>
              <div className="space-y-2">
                {/* 1. Save to Draft */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    actionChoice === 'draft'
                      ? 'border-blue-700 bg-blue-50/60 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="actionChoice"
                    value="draft"
                    checked={actionChoice === 'draft'}
                    onChange={() => setActionChoice('draft')}
                    className="mt-0.5 text-blue-900"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        Save as Draft in My Email (Recommended)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                        Safe & Reviewable
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Creates the draft in your mailbox without sending. PJMAK will automatically
                      notify you <strong>1 hour before work ends</strong> to review and send.
                    </p>
                  </div>
                </label>

                {/* 2. Grant Permission & Send Directly */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    actionChoice === 'send'
                      ? 'border-emerald-700 bg-emerald-50/60 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="actionChoice"
                    value="send"
                    checked={actionChoice === 'send'}
                    onChange={() => setActionChoice('send')}
                    className="mt-0.5 text-emerald-700"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        Ask Permission to Send Directly from My Email Now
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Requires explicit permission confirmation. Dispatches the letter immediately to the recipient.
                    </p>
                  </div>
                </label>

                {/* 3. Download PDF Only */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    actionChoice === 'download_only'
                      ? 'border-slate-700 bg-slate-100 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="actionChoice"
                    value="download_only"
                    checked={actionChoice === 'download_only'}
                    onChange={() => setActionChoice('download_only')}
                    className="mt-0.5 text-slate-900"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900">
                      Download Official PDF Only
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Generates high-resolution PDF letterhead without email dispatch.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Explicit Permission Dialog (Required when Send is chosen) */}
            {actionChoice === 'send' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 text-amber-700" />
                  <span>Explicit User Permission Required</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-normal">
                  You are authorizing PJMAK to send this official letter directly from your email account (
                  <strong>
                    {selectedProvider === 'gmail'
                      ? googleUser?.email || 'Your Gmail'
                      : yahooEmail}
                  </strong>
                  ) to <strong>{toEmail || 'the recipient'}</strong>.
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={grantPermissionConfirmed}
                    onChange={(e) => setGrantPermissionConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-amber-800 focus:ring-amber-500"
                  />
                  <span className="font-bold text-amber-950 text-xs">
                    Yes, I give permission to send this email directly right now
                  </span>
                </label>
              </div>
            )}

            {/* Email Details Form */}
            {actionChoice !== 'download_only' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Message Transmittal Details:
                  </span>
                  <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePdf}
                      onChange={(e) => setIncludePdf(e.target.checked)}
                      className="rounded text-blue-900"
                    />
                    <span className="text-[11px] font-medium flex items-center gap-1">
                      <Paperclip className="h-3 w-3 text-slate-400" />
                      Attach Official Letterhead PDF ({pdfFilename})
                    </span>
                  </label>
                </div>

                {/* Salutation & Formal Address Picker */}
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-800" />
                      Transmittal Salutation & Formal Template
                    </span>
                    {emailTemplates.length > 0 && (
                      <span className="text-[10px] text-blue-700 font-medium">
                        {emailTemplates.length} templates available
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Prefix picker */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        Salutation Title
                      </label>
                      <div className="flex gap-1">
                        {['Dear Mr.', 'Dear Ms.', 'Dear Dr.', 'Dear Eng.', 'Dear Sir/Madam'].map((prefix) => (
                          <button
                            key={prefix}
                            type="button"
                            onClick={() => handleSalutationChange(prefix, recipientSalutationName)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                              salutationPrefix === prefix
                                ? 'bg-blue-900 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {prefix}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Picker */}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        Email Template
                      </label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleApplyTemplate(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                      >
                        {emailTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.category})
                          </option>
                        ))}
                      </select>
                    </div>
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
                    placeholder="recipient@organization.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    CC (Carbon Copy, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    placeholder="deputy@company.com, legal@company.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                  />
                  {availableQuickCc.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Add CC:</span>
                      {availableQuickCc.map((q) => {
                        const inCc = ccEmails.toLowerCase().includes(q.email.toLowerCase());
                        return (
                          <button
                            key={q.email}
                            type="button"
                            onClick={() => {
                              if (inCc) {
                                const updated = ccEmails
                                  .split(/[,;\s]+/)
                                  .filter((e) => e.toLowerCase() !== q.email.toLowerCase())
                                  .join(', ');
                                setCcEmails(updated);
                              } else {
                                const updated = ccEmails.trim()
                                  ? `${ccEmails.trim()}, ${q.email}`
                                  : q.email;
                                setCcEmails(updated);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer flex items-center gap-1 ${
                              inCc
                                ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={q.email}
                          >
                            <span>{inCc ? '✓' : '+'}</span>
                            <span className="truncate max-w-[160px]">{q.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Body
                  </label>
                  <textarea
                    rows={4}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs font-sans resize-none"
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={processing || (actionChoice === 'send' && !grantPermissionConfirmed)}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                  actionChoice === 'send'
                    ? 'bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50'
                    : actionChoice === 'draft'
                    ? 'bg-blue-900 hover:bg-blue-950'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {processing ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : actionChoice === 'draft' ? (
                  <>
                    <Clock className="h-4 w-4 text-blue-200" />
                    <span>Save in Email Drafts (Notify 1h Before EOD)</span>
                  </>
                ) : actionChoice === 'send' ? (
                  <>
                    <Send className="h-4 w-4 text-emerald-200" />
                    <span>Grant Permission & Send Email Now</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-slate-200" />
                    <span>Download Official PDF Letter</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
