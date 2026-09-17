import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Send,
  ExternalLink,
  X,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Bell,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Correspondence, CompanySettings } from '../types';

interface DraftEndDayReminderProps {
  correspondence: Correspondence[];
  settings: CompanySettings;
  onOpenCorrespondence: (item: Correspondence, tab?: string) => void;
  onOpenEmailModal: (item: Correspondence) => void;
  onQuickSendEmail: (item: Correspondence) => Promise<void>;
}

export const DraftEndDayReminder: React.FC<DraftEndDayReminderProps> = ({
  correspondence,
  settings,
  onOpenCorrespondence,
  onOpenEmailModal,
  onQuickSendEmail,
}) => {
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [hasRequestedNotification, setHasRequestedNotification] = useState(false);

  // Filter correspondence currently in 'drafted' email status
  const draftedLetters = useMemo(() => {
    return correspondence.filter(
      (c) =>
        c.emailStatus === 'drafted' &&
        c.status !== 'sent' &&
        c.status !== 'voided' &&
        !c.isArchived
    );
  }, [correspondence]);

  // Determine work day end time (default: 17:00 / 5:00 PM)
  const workEndStr = settings?.workHours?.end || '17:00';
  const reminderMinutesBefore = settings?.workHours?.reminderMinutesBeforeEnd || 60;

  // Check if current local time is in the 1-hour before finish window
  const [isInReminderWindow, setIsInReminderWindow] = useState(false);
  const [timeRemainingStr, setTimeRemainingStr] = useState('');

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const [endH, endM] = workEndStr.split(':').map(Number);
      const endTotalMins = (isNaN(endH) ? 17 : endH) * 60 + (isNaN(endM) ? 0 : endM);
      const nowTotalMins = now.getHours() * 60 + now.getMinutes();

      const reminderStartMins = endTotalMins - reminderMinutesBefore;

      // In window if current time is within [reminderStartMins, endTotalMins + 60]
      const inWindow = nowTotalMins >= reminderStartMins && nowTotalMins <= endTotalMins + 120;
      setIsInReminderWindow(inWindow);

      const minsUntilEnd = endTotalMins - nowTotalMins;
      if (minsUntilEnd > 0) {
        setTimeRemainingStr(`${minsUntilEnd} min${minsUntilEnd === 1 ? '' : 's'} before day end (${workEndStr})`);
      } else {
        setTimeRemainingStr(`Work day ended at ${workEndStr}`);
      }

      // Check browser notification trigger once if in window with drafts
      if (
        inWindow &&
        draftedLetters.length > 0 &&
        !hasRequestedNotification &&
        'Notification' in window
      ) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              new Notification('⏰ PJMAK End-of-Day Draft Reminder', {
                body: `You have ${draftedLetters.length} drafted letters pending review and dispatch before ${workEndStr}.`,
                icon: '/assets/pjmak_logo.svg',
              });
            }
          });
        } else if (Notification.permission === 'granted') {
          new Notification('⏰ PJMAK End-of-Day Draft Reminder', {
            body: `You have ${draftedLetters.length} drafted letters pending review and dispatch before ${workEndStr}.`,
            icon: '/assets/pjmak_logo.svg',
          });
        }
        setHasRequestedNotification(true);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [workEndStr, reminderMinutesBefore, draftedLetters.length, hasRequestedNotification]);

  // Check if dismissed
  const isDismissed = dismissedUntil ? Date.now() < dismissedUntil : false;

  // If no drafts, do not render banner
  if (draftedLetters.length === 0) return null;

  const handleSnooze = (minutes: number) => {
    setDismissedUntil(Date.now() + minutes * 60 * 1000);
    setModalOpen(false);
  };

  const handleDismissToday = () => {
    // Dismiss until tomorrow
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);
    setDismissedUntil(tomorrow.getTime());
    setModalOpen(false);
  };

  const handleQuickSend = async (letter: Correspondence) => {
    const confirmSend = window.confirm(
      `Permission Confirmation: Send official letter ${letter.correspondenceNumber} to ${letter.recipientEmail} directly from your email now?`
    );
    if (!confirmSend) return;

    setSendingId(letter.id);
    try {
      await onQuickSendEmail(letter);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch email.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <>
      {/* 1. Floating or Banner Reminder Bar when in Reminder Window and not dismissed */}
      {isInReminderWindow && !isDismissed && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between sticky top-16 z-20 transition-all border-b border-amber-400">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/20 text-white shrink-0 animate-pulse">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-xs truncate">
              <span className="font-extrabold uppercase tracking-wide mr-1.5">
                End-of-Day Reminder ({timeRemainingStr}):
              </span>
              <span>
                You have <strong>{draftedLetters.length}</strong> letter{draftedLetters.length === 1 ? '' : 's'} saved in email drafts awaiting your review and dispatch.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-1 bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Review & Send Drafts
            </button>
            <button
              onClick={() => handleSnooze(15)}
              className="px-2 py-1 text-[11px] text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Remind me in 15 minutes"
            >
              Snooze 15m
            </button>
            <button
              onClick={handleDismissToday}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-white/10"
              title="Dismiss for today"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Persistent Floating Badge if user dismissed banner but drafts remain */}
      {(!isInReminderWindow || isDismissed) && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-full shadow-lg border border-amber-400 transition-all transform hover:scale-105 cursor-pointer"
            title="View pending email drafts"
          >
            <Clock className="h-4 w-4" />
            <span>{draftedLetters.length} Draft{draftedLetters.length === 1 ? '' : 's'} Pending EOD Send</span>
          </button>
        </div>
      )}

      {/* 3. Detailed Review & Send Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-2xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    End-of-Day Email Drafts Pending Review
                  </h3>
                  <p className="text-xs text-amber-800 font-medium">
                    1 Hour Before Working Day Close ({workEndStr})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List of Drafted Letters */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <div className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                You currently have <strong>{draftedLetters.length}</strong> official correspondence
                letter{draftedLetters.length === 1 ? '' : 's'} drafted in your email (Gmail / Yahoo).
                Before finishing today's work, please verify if you are ready to grant permission and
                dispatch them to their external recipients.
              </div>

              <div className="space-y-2.5">
                {draftedLetters.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900 text-xs">
                            {item.correspondenceNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            Drafted in {item.emailProvider === 'yahoo' ? 'Yahoo' : 'Gmail'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs mt-1">
                          {item.subject}
                        </h4>
                      </div>

                      <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                        {item.officialDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                      <div>
                        <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                          Recipient
                        </span>
                        <span className="font-medium text-slate-900 truncate block">
                          {item.recipientOrg} ({item.recipientPerson || 'Official'})
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                          Recipient Email
                        </span>
                        <span className="font-mono text-slate-900 truncate block">
                          {item.recipientEmail || 'No email provided'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setModalOpen(false);
                            onOpenCorrespondence(item, 'document');
                          }}
                          className="text-[11px] font-semibold text-blue-900 hover:text-blue-950 underline cursor-pointer"
                        >
                          View Letter Content
                        </button>
                        {item.emailDraftUrl && (
                          <a
                            href={item.emailDraftUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                          >
                            <span>Open in Mail</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setModalOpen(false);
                            onOpenEmailModal(item);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                        >
                          Change Options
                        </button>

                        <button
                          onClick={() => handleQuickSend(item)}
                          disabled={sendingId === item.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>
                            {sendingId === item.id ? 'Sending...' : 'Send with Permission'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => handleSnooze(30)}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Remind me in 30 minutes
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismissToday}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Dismiss for Today
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
