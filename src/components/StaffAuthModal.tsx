import React, { useState, useRef, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth, DEFAULT_CLINIC_ID } from '../context/AuthContext';
import { UserRole, StaffAccount } from '../types/dental';
import { STAFF_PRESETS, DEV_TEST_PASSWORD, StaffPreset } from '../config/staffPresets';
import {
  Stethoscope,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
  Check,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  UserPlus,
} from 'lucide-react';

interface StaffAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPresetId?: string | null;
}

export const StaffAuthModal: React.FC<StaffAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPresetId = 'shihab',
}) => {
  const {
    clinic,
    signInWithEmail,
    sendPasswordReset,
    error: authError,
    clearError,
  } = useAuth();

  const [authView, setAuthView] = useState<'login' | 'forgot'>('login');
  const [availableStaff, setAvailableStaff] = useState<StaffPreset[]>(STAFF_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPresetId || 'shihab');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Live real-time subscription to clinic staff roster
  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const staffColRef = collection(db, 'clinics', clinicId, 'staff');

    const unsubscribe = onSnapshot(
      staffColRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: StaffPreset[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as StaffAccount;
            if (data.status !== 'suspended') {
              const parts = (data.name || '').trim().split(/\s+/);
              const initials =
                parts.length >= 2
                  ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                  : (data.name || 'ST').slice(0, 2).toUpperCase();

              const isOwner = data.role === 'Owner';
              const roleTitle = isOwner ? 'Clinic Owner' : data.title || data.role;
              const badge = isOwner ? 'Full Practice Control' : data.specialty || data.role;

              list.push({
                id: data.id,
                name: data.name,
                role: roleTitle,
                systemRole: data.role,
                email: data.email,
                initials,
                badge,
                description: data.specialty || `${data.role} access`,
                specialty: data.specialty,
                licenseNumber: data.licenseNumber,
                initialPassword: data.initialPassword || DEV_TEST_PASSWORD,
              });
            }
          });

          if (list.length > 0) {
            // Priority order: Owner -> Dentist -> Receptionist -> Cashier
            const roleWeights: Record<UserRole, number> = {
              Owner: 0,
              Dentist: 1,
              Receptionist: 2,
              Cashier: 3,
            };
            list.sort((a, b) => {
              const diff = (roleWeights[a.systemRole] ?? 9) - (roleWeights[b.systemRole] ?? 9);
              if (diff !== 0) return diff;
              return a.name.localeCompare(b.name);
            });
            setAvailableStaff(list);
          } else {
            setAvailableStaff(STAFF_PRESETS);
          }
        } else {
          setAvailableStaff(STAFF_PRESETS);
        }
      },
      (err) => {
        console.warn('Live staff subscription note:', err);
      }
    );

    return () => unsubscribe();
  }, [clinic?.id]);

  // Set default initial preset email upon opening or when availableStaff updates
  useEffect(() => {
    if (isOpen) {
      clearError();
      setLocalError(null);
      setResetSuccessMessage(null);
      setAuthView('login');

      const preset =
        availableStaff.find(
          (p) =>
            p.id === initialPresetId ||
            p.id === `preset-${initialPresetId}` ||
            p.systemRole.toLowerCase() === (initialPresetId || '').toLowerCase() ||
            p.email.toLowerCase().includes((initialPresetId || '').toLowerCase())
        ) || availableStaff[0];

      if (preset) {
        setSelectedPresetId(preset.id);
        setEmail(preset.email);
        setPassword('');
      }
    }
  }, [isOpen, initialPresetId, availableStaff]);

  if (!isOpen) return null;

  // Handle Staff Preset Card Selection
  const handleSelectPreset = (preset: StaffPreset) => {
    setSelectedPresetId(preset.id);
    setEmail(preset.email);
    // Password field strictly remains empty per requirement
    setPassword('');
    clearError();
    setLocalError(null);

    // Focus password input for quick typing
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 60);
  };

  // Handle Authentication Form Submission
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your staff email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLocalError('Please enter a valid clinic email address (e.g. dr.shihab@apex-dental.com).');
      return;
    }

    if (!password) {
      setLocalError('Password is required to authenticate. Please enter your password.');
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(trimmedEmail, password);
      onClose();
      onSuccess();
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your registered staff email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setResetSuccessMessage(
        'If an account matches this email, password reset instructions have been dispatched.'
      );
    } catch (err: any) {
      // Do not disclose whether the account exists for security
      setResetSuccessMessage(
        'If an account matches this email, password reset instructions have been dispatched.'
      );
    } finally {
      setLoading(false);
    }
  };


  const displayedError = localError || authError;
  const clinicTitle = clinic?.name || 'Apex Dental & Implant Centre';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-auth-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header: Dark Teal Gradient */}
        <div className="bg-gradient-to-r from-[#0a272e] via-[#0d3942] to-[#072026] p-6 sm:p-7 text-white relative border-b border-teal-900/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* DentFlow Dental Logo / Tooth container */}
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner shrink-0">
                <Stethoscope className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-teal-300 block">
                  STAFF AUTHENTICATION PORTAL
                </span>
                <h2
                  id="staff-auth-title"
                  className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5"
                >
                  {authView === 'login'
                    ? 'Sign In to DentFlow'
                    : authView === 'forgot'
                    ? 'Reset Staff Password'
                    : 'Register Clinical Staff'}
                </h2>
              </div>
            </div>

            {/* Modal Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-teal-200/70 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="Close authentication modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-teal-100/80 mt-3 font-medium flex items-center gap-1.5">
            <span>{clinicTitle}</span>
            <span className="text-teal-400/80">•</span>
            <span>Role-Based Clinical Access Control</span>
          </p>
        </div>

        {/* Clean White Form Area */}
        <div className="p-6 sm:p-7 space-y-4">
          {/* Validation / Authentication Error Display */}
          {displayedError && (
            <div
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-100"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{displayedError}</div>
            </div>
          )}

          {/* Password Reset Confirmation Banner */}
          {resetSuccessMessage && (
            <div
              className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-100"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{resetSuccessMessage}</div>
            </div>
          )}

          {/* VIEW: STAFF SIGN IN */}
          {authView === 'login' && (
            <>
              <form onSubmit={handleAuthenticate} className="space-y-4">
                {/* Staff Email Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="staff-email-input"
                    className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-700"
                  >
                    STAFF EMAIL ADDRESS
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="staff-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. dr.shihab@apex-dental.com"
                      autoComplete="username"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password Input with show/hide toggle & Forgot Password link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="staff-password-input"
                      className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-700"
                    >
                      PASSWORD
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthView('forgot');
                        setLocalError(null);
                        setResetSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline focus:outline-none"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      ref={passwordInputRef}
                      id="staff-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Development-Only Quick Login Convenience */}
                {import.meta.env.DEV && (
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-2.5 text-[11px] text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded shrink-0">
                        Dev Testing
                      </span>
                      <span>
                        Preset click fills email. Test password:{' '}
                        <code className="font-mono font-bold text-amber-950">
                          {availableStaff.find(
                            (s) =>
                              s.id === selectedPresetId ||
                              s.email.toLowerCase() === email.toLowerCase()
                          )?.initialPassword || DEV_TEST_PASSWORD}
                        </code>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const activeStaff = availableStaff.find(
                          (s) =>
                            s.id === selectedPresetId ||
                            s.email.toLowerCase() === email.toLowerCase()
                        );
                        setPassword(activeStaff?.initialPassword || DEV_TEST_PASSWORD);
                        setLocalError(null);
                      }}
                      className="text-xs font-bold text-teal-900 hover:text-teal-950 bg-amber-200/80 hover:bg-amber-300/80 px-2.5 py-1 rounded-lg transition-colors shrink-0 text-left sm:text-center cursor-pointer"
                    >
                      Auto-fill Test Password
                    </button>
                  </div>
                )}

                {/* Full-width Teal Button: Authenticate & Open Dashboard */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Credentials & Workspace...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authenticate & Open Dashboard</span>
                    </>
                  )}
                </button>
              </form>

              {/* Horizontal Divider & Quick Login Presets (Select Role) - Live Synced with Staff Management */}
              <div className="pt-4 border-t border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                      QUICK LOGIN PRESETS (SELECT ROLE)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {availableStaff.length} active staff accounts
                  </span>
                </div>

                {/* Responsive Two-Column Staff Preset Cards - Dynamically updated when staff added/removed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {availableStaff.map((preset) => {
                    const isSelected =
                      selectedPresetId === preset.id ||
                      email.toLowerCase() === preset.email.toLowerCase();

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-500/30 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Initials inside a small teal rounded square */}
                          <div
                            className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-teal-700 text-white'
                                : 'bg-teal-600/15 text-teal-800'
                            }`}
                          >
                            {preset.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate leading-snug">
                              {preset.name}
                            </div>
                            <div className="text-[10px] font-semibold text-teal-800 truncate">
                              {preset.role}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {preset.email}
                            </div>
                          </div>
                        </div>

                        {/* Right Icon: check icon when selected, right-arrow when unselected */}
                        <div className="shrink-0 text-slate-400">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security Policy Notice: Staff provisioning restricted to Owner */}
              <div className="pt-2 text-center text-slate-500 text-[11px] flex items-center justify-center gap-1.5 font-medium border-t border-slate-100">
                <Shield className="w-3.5 h-3.5 text-teal-700" />
                <span>Staff accounts are provisioned exclusively by Clinic Owner</span>
              </div>
            </>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {authView === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                Enter your registered clinic email address below. We will dispatch secure password recovery instructions.
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
                  STAFF EMAIL ADDRESS
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dr.shihab@apex-dental.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Dispatching Recovery Email...' : 'Send Recovery Instructions'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setLocalError(null);
                    setResetSuccessMessage(null);
                  }}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold hover:underline"
                >
                  ← Back to Staff Authentication Portal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
