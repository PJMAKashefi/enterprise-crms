import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function improveLetterText(
  text: string,
  mode: 'professional' | 'diplomatic' | 'concise' | 'grammar' | 'translate'
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    // Graceful fallback if API key is not configured in local environment
    if (mode === 'diplomatic') {
      return `<p>With reference to your correspondence, we wish to cordially note the concerns raised and assure you of our utmost attention to resolving this matter amicably.</p>\n${text}`;
    }
    if (mode === 'concise') {
      return text.replace(/(\r\n|\n|\r){2,}/gm, '\n\n').trim();
    }
    return text;
  }

  const promptMap = {
    professional: 'Rewrite the following business letter content to sound authoritative, polished, standard enterprise English, keeping any placeholders and HTML formatting intact:',
    diplomatic: 'Rewrite the following letter content using diplomatic, respectful, and tactful corporate wording suitable for high-stakes contractual or regulatory correspondence:',
    concise: 'Make the following business letter content concise and direct, eliminating redundant phrases while retaining all legal and technical points:',
    grammar: 'Proofread and correct any grammatical, spelling, and punctuation errors in the following letter body, preserving exact HTML structure:',
    translate: 'Translate and refine the following letter into formal, high-standard international business English:',
  };

  try {
    const prompt = `${promptMap[mode] || promptMap.professional}\n\nCONTENT:\n${text}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an executive correspondence specialist for major engineering and corporate enterprises. Return clean HTML paragraphs (<p>, <ul>, <li>, <strong>, etc.) with no markdown code fences.',
      },
    });

    let result = response.text || text;
    result = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
    return result;
  } catch (err: any) {
    console.error('Gemini improveLetterText error:', err);
    return text;
  }
}

export async function draftOfficialResponse(
  incomingSubject: string,
  incomingBody: string,
  externalRef: string,
  instructions?: string
): Promise<{ subject: string; bodyHtml: string }> {
  const ai = getAiClient();
  const defaultSubject = `Response to Ref: ${externalRef || incomingSubject} - Acknowledgement & Position`;
  const defaultBody = `<p>Dear Sirs,</p>
<p>We acknowledge receipt of your correspondence regarding <strong>${incomingSubject}</strong> (Reference: ${externalRef || 'N/A'}).</p>
<p>Having reviewed your submission with our technical and management representatives, we wish to state that our evaluation is currently in progress, and formal determinations shall follow in due course.</p>
<p>Should further clarifications be required, please do not hesitate to contact our office.</p>`;

  if (!ai) {
    return { subject: defaultSubject, bodyHtml: defaultBody };
  }

  try {
    const prompt = `You are the executive drafting officer for Vance Engineering Group & Infrastructure Corp.
Draft an official corporate response letter replying to the following incoming letter:
INCOMING REFERENCE: ${externalRef || 'None'}
INCOMING SUBJECT: ${incomingSubject}
INCOMING BODY:
${incomingBody}

INTERNAL INSTRUCTIONS / DECISION:
${instructions || 'Formal acknowledgement with technical review caveats.'}

Generate a JSON object with:
"subject": Concise official reply subject line,
"bodyHtml": Full business letter body formatted with proper HTML tags (<p>, <strong>, <ol>, <li>). Do not include the header or footer (these will be stamped by letterhead).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      subject: parsed.subject || defaultSubject,
      bodyHtml: parsed.bodyHtml || defaultBody,
    };
  } catch (err) {
    console.error('Gemini draftOfficialResponse error:', err);
    return { subject: defaultSubject, bodyHtml: defaultBody };
  }
}

export async function extractIncomingMetadata(text: string): Promise<{
  subject: string;
  senderOrg: string;
  senderPerson: string;
  externalRefNumber: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  summary: string;
  actionRequired: string;
}> {
  const ai = getAiClient();
  const fallback = {
    subject: 'Incoming Official Correspondence',
    senderOrg: '',
    senderPerson: '',
    externalRefNumber: '',
    priority: 'normal' as const,
    summary: text.slice(0, 200),
    actionRequired: 'For Review and Internal Registration',
  };

  if (!ai) return fallback;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Extract key metadata from this incoming business letter/scanned text:\n\n${text}`,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: `Extract structured JSON:
{
  "subject": "Clear concise subject line",
  "senderOrg": "Sender company or authority name",
  "senderPerson": "Name of contact person/signatory",
  "externalRefNumber": "External reference or letter number if mentioned",
  "priority": "low" | "normal" | "high" | "urgent",
  "summary": "Brief 2-sentence summary of the core issue",
  "actionRequired": "Recommended action (e.g. Review schedule, Grant permit, Respond within 14 days)"
}`,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      subject: parsed.subject || fallback.subject,
      senderOrg: parsed.senderOrg || '',
      senderPerson: parsed.senderPerson || '',
      externalRefNumber: parsed.externalRefNumber || '',
      priority: ['low', 'normal', 'high', 'urgent'].includes(parsed.priority)
        ? parsed.priority
        : 'normal',
      summary: parsed.summary || fallback.summary,
      actionRequired: parsed.actionRequired || fallback.actionRequired,
    };
  } catch (e) {
    console.error('Gemini extractIncomingMetadata error:', e);
    return fallback;
  }
}
