import { EmailPayload } from './gmailService';

export function generateYahooComposeUrl(payload: EmailPayload): string {
  const params = new URLSearchParams();
  if (payload.to) params.set('to', payload.to);
  if (payload.cc) params.set('cc', payload.cc);
  if (payload.bcc) params.set('bcc', payload.bcc);
  if (payload.subject) params.set('subj', payload.subject);

  // Yahoo web compose prefers plain text body for query parameters
  const plainBody = (payload.bodyText || payload.bodyHtml || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '');

  params.set('body', plainBody);

  return `https://compose.mail.yahoo.com/?${params.toString()}`;
}

export function generateMailtoUrl(payload: EmailPayload): string {
  const params: string[] = [];
  if (payload.cc) params.push(`cc=${encodeURIComponent(payload.cc)}`);
  if (payload.bcc) params.push(`bcc=${encodeURIComponent(payload.bcc)}`);
  if (payload.subject) params.push(`subject=${encodeURIComponent(payload.subject)}`);

  const plainBody = (payload.bodyText || payload.bodyHtml || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '');
  if (plainBody) params.push(`body=${encodeURIComponent(plainBody)}`);

  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `mailto:${encodeURIComponent(payload.to)}${query}`;
}

export function openYahooCompose(payload: EmailPayload): Window | null {
  const url = generateYahooComposeUrl(payload);
  return window.open(url, '_blank', 'noopener,noreferrer');
}
