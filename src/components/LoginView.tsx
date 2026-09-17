import React, { useState } from 'react';
import { Shield, Key, Mail, Lock, Eye, EyeOff, LogIn, CheckCircle2, AlertCircle, Building2, UserCheck } from 'lucide-react';
import { PjmakLogo } from './PjmakLogo';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('mamadalikashefi@gmail.com');
  const [password, setPassword] = useState('Pjmak2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      // Mark session in localStorage
      localStorage.setItem('pjmak_logged_in', 'true');
      localStorage.setItem('pjmak_user_id', data.user.id);

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = () => {
    setIdentifier('mamadalikashefi@gmail.com');
    setPassword('Pjmak2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-radial from-blue-50 via-slate-50 to-blue-100 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Container Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-blue-100/80 overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-[#0B1E36] px-8 py-8 text-white text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-white p-2 shadow-md mb-3 flex items-center justify-center">
              <PjmakLogo variant="crest" size="md" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">PJMAK</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300 mt-0.5">
              Project Management Key
            </p>
            <p className="text-xs text-blue-200/80 mt-2 font-normal">
              Correspondence & Document Management System
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Sign In to Registry</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your authorized credentials to access internal and official correspondence.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username/Email Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email or Username
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. mamadalikashefi@gmail.com or ali.kashefi"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 rounded-xl transition-all outline-none text-slate-900"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleQuickAdminLogin}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Load Admin Preset
                </button>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50/50 border border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 rounded-xl transition-all outline-none text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#0B1E36] hover:bg-[#08182b] active:bg-[#061220] text-white font-semibold text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In to System</span>
                </>
              )}
            </button>
          </form>

          {/* Master Admin Quick Credentials Info Card */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-xl text-xs text-sky-950">
              <div className="flex items-center gap-2 font-semibold text-sky-900 mb-1">
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                <span>Default Administrator Credentials:</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 font-mono mt-1.5 pl-5">
                <div>User: <span className="font-semibold text-slate-800">mamadalikashefi@gmail.com</span></div>
                <div>Pass: <span className="font-semibold text-slate-800">Pjmak2026!</span></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 pl-5">
                Once logged in, as Administrator you can define users, passwords, and access rights in the <strong>Admin & Settings</strong> panel.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-100 text-center flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield className="h-3.5 w-3.5 text-slate-400" />
          <span>Role-Based Access Control • KvK 91081289</span>
        </div>
      </div>
    </div>
  );
};
