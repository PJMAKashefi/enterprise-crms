import React, { useState } from 'react';
import { Download, Monitor, ExternalLink, X, Check, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running standalone as an installed desktop app, do not show install prompt
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        <span>Desktop App Active</span>
      </div>
    );
  }

  const handleButtonClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        className={`flex items-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer shadow-2xs ${
          compact
            ? 'px-2.5 py-1 text-xs bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            : 'px-3 py-1.5 text-xs text-white bg-blue-950 hover:bg-blue-900 border border-blue-900'
        }`}
        title="Install PJMAK as a standalone desktop application on your computer"
      >
        <Laptop className="h-3.5 w-3.5 text-sky-400" />
        <span>Install Desktop App</span>
      </button>

      {/* Guide Modal if browser requires manual install from address bar or menu */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/10 text-sky-300">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Install PJMAK Desktop App</h3>
                  <p className="text-[11px] text-sky-200">Run as a native app on Windows, Mac, or Linux</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed">
                You can run PJMAK as a standalone window application on your computer without browser tabs or address bars:
              </p>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 space-y-2.5">
                <div className="font-bold text-sky-950 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-900 flex items-center justify-center text-[10px] font-bold">1</span>
                  Open in a Full Browser Tab
                </div>
                <p className="text-slate-600 text-[11px] pl-6.5">
                  If you are currently previewing inside Google AI Studio's frame, click the button below to open the app directly in its own browser tab.
                </p>
                <div className="pl-6.5 pt-1">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-900 text-white font-semibold hover:bg-blue-800 transition"
                  >
                    <span>Open in New Tab</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-bold">2</span>
                  Click Install in Chrome or Edge
                </div>
                <ul className="text-[11px] text-slate-600 pl-6.5 space-y-1 list-disc">
                  <li>
                    Look at the right side of the URL address bar for the <strong className="text-slate-800">Install icon</strong> (a computer monitor with an arrow) and click it.
                  </li>
                  <li>
                    Or click the browser menu (<strong>⋮</strong> three dots) → <strong>Cast, save, and share</strong> (or <strong>Apps</strong>) → <strong>Install PJMAK...</strong>
                  </li>
                  <li>
                    Click <strong>Install</strong>. PJMAK will appear on your desktop, taskbar, and Start Menu!
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer text-xs"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
