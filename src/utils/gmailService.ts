import { Correspondence, CompanySettings } from '../types';
import { generateCorrespondencePdf } from './pdfGenerator';

export interface EmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  includePdfAttachment?: boolean;
}

export interface GmailDraftResult {
  id: string;
  messageId: string;
  threadId: string;
  webUrl: string;
}

export interface GmailSendResult {
  id: string;
  threadId: string;
}

/**
 * Encodes string to base64url format required by Gmail API (RFC 4648 §5)
 */
function toBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds RFC 2822 MIME message for Gmail API
 */
export function buildRfc2822Message(
  payload: EmailPayload,
  correspondence?: Correspondence,
  settings?: CompanySettings
): string {
  const boundary = `====PJMAK_BOUND_${Date.now()}_${Math.random().toString(36).substring(2, 8)}====`;
  const lines: string[] = [];

  // Recipient headers
  lines.push(`To: ${payload.to}`);
  if (payload.cc && payload.cc.trim()) {
    lines.push(`Cc: ${payload.cc.trim()}`);
  }
  if (payload.bcc && payload.bcc.trim()) {
    lines.push(`Bcc: ${payload.bcc.trim()}`);
  }

  // Subject RFC 2047 encoded
  const encodedSubject = btoa(unescape(encodeURIComponent(payload.subject)));
  lines.push(`Subject: =?UTF-8?B?${encodedSubject}?=`);
  lines.push('MIME-Version: 1.0');

  let pdfAttachmentBase64: string | null = null;
  let pdfFilename = 'Official_Letter.pdf';

  if (payload.includePdfAttachment && correspondence && settings) {
    try {
      const doc = generateCorrespondencePdf(correspondence, settings, false);
      const dataUri = doc.output('datauristring');
      pdfAttachmentBase64 = dataUri.split(',')[1] || null;
      pdfFilename = `${correspondence.correspondenceNumber.replace(/[\/\\]/g, '_')}_Official_Letter.pdf`;
    } catch (e) {
      console.warn('Could not generate PDF attachment for email:', e);
    }
  }

  if (pdfAttachmentBase64) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(payload.bodyHtml || payload.bodyText || '');
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: application/pdf; name="${pdfFilename}"`);
    lines.push(`Content-Disposition: attachment; filename="${pdfFilename}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    // Split base64 into 76-character lines for RFC 2045 standard
    const chunks = pdfAttachmentBase64.match(/.{1,76}/g) || [pdfAttachmentBase64];
    lines.push(chunks.join('\r\n'));
    lines.push('');
    lines.push(`--${boundary}--`);
  } else {
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(payload.bodyHtml || payload.bodyText || '');
  }

  return lines.join('\r\n');
}

/**
 * Creates an email draft directly in the user's Gmail mailbox
 */
export async function createGmailDraft(
  accessToken: string,
  payload: EmailPayload,
  correspondence?: Correspondence,
  settings?: CompanySettings
): Promise<GmailDraftResult> {
  const mimeMessage = buildRfc2822Message(payload, correspondence, settings);
  const raw = toBase64Url(mimeMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || response.statusText;
    throw new Error(`Gmail API Draft Error: ${message}`);
  }

  const result = await response.json();
  const draftId = result.id;
  const messageId = result.message?.id || draftId;
  const threadId = result.message?.threadId || '';

  return {
    id: draftId,
    messageId,
    threadId,
    webUrl: `https://mail.google.com/mail/u/0/#drafts/${draftId}`,
  };
}

/**
 * Sends an email directly from the user's Gmail address (requires explicit user permission)
 */
export async function sendGmailMessage(
  accessToken: string,
  payload: EmailPayload,
  correspondence?: Correspondence,
  settings?: CompanySettings
): Promise<GmailSendResult> {
  const mimeMessage = buildRfc2822Message(payload, correspondence, settings);
  const raw = toBase64Url(mimeMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || response.statusText;
    throw new Error(`Gmail API Send Error: ${message}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    threadId: result.threadId,
  };
}

/**
 * Generates official Gmail Web Compose URL (bypasses OAuth/popup blockers)
 */
export function generateGmailComposeUrl(payload: EmailPayload): string {
  const params = new URLSearchParams();
  params.set('view', 'cm');
  params.set('fs', '1');
  if (payload.to) params.set('to', payload.to);
  if (payload.cc) params.set('cc', payload.cc);
  if (payload.bcc) params.set('bcc', payload.bcc);
  if (payload.subject) params.set('su', payload.subject);

  const plainBody = (payload.bodyText || payload.bodyHtml || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '');

  if (plainBody) params.set('body', plainBody);

  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function openGmailCompose(payload: EmailPayload): Window | null {
  const url = generateGmailComposeUrl(payload);
  return window.open(url, '_blank', 'noopener,noreferrer');
}
