import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StaffAuthModal } from './StaffAuthModal';
import {
  Globe,
  ShieldCheck,
  ArrowRight,
  Grid,
  Calendar,
  Users,
  FileCheck,
  DollarSign,
  Layers,
  LogIn,
  Shield,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

// Tooth anatomical contour matching the screenshot's icon style
export const ToothIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M7 2C4.5 2 2.5 4 2.5 7.5C2.5 10.5 3.5 13.5 4.5 17C5.2 19.5 6.8 22 8.5 22C9.8 22 10.5 20 11 18C11.5 16 11.8 15 12 15C12.2 15 12.5 16 13 18C13.5 20 14.2 22 15.5 22C17.2 22 18.8 19.5 19.5 17C20.5 13.5 21.5 10.5 21.5 7.5C21.5 4 19.5 2 17 2C15 2 13.5 3.5 12 3.5C10.5 3.5 9 2 7 2Z" />
  </svg>
);

interface ToothData {
  fdi: number;
  universal: number;
  name: string;
  quadrant: string;
}

const UPPER_TEETH: ToothData[] = [
  { fdi: 18, universal: 1, name: 'Third Molar (Wisdom)', quadrant: 'Maxillary Right' },
  { fdi: 17, universal: 2, name: 'Second Molar', quadrant: 'Maxillary Right' },
  { fdi: 16, universal: 3, name: 'First Molar', quadrant: 'Maxillary Right' },
  { fdi: 15, universal: 4, name: 'Second Premolar (Bicuspid)', quadrant: 'Maxillary Right' },
  { fdi: 14, universal: 5, name: 'First Premolar (Bicuspid)', quadrant: 'Maxillary Right (Upper Right)' },
  { fdi: 13, universal: 6, name: 'Canine (Cuspid)', quadrant: 'Maxillary Right' },
  { fdi: 12, universal: 7, name: 'Lateral Incisor', quadrant: 'Maxillary Right' },
  { fdi: 11, universal: 8, name: 'Central Incisor', quadrant: 'Maxillary Right' },
  { fdi: 21, universal: 9, name: 'Central Incisor', quadrant: 'Maxillary Left' },
  { fdi: 22, universal: 10, name: 'Lateral Incisor', quadrant: 'Maxillary Left' },
  { fdi: 23, universal: 11, name: 'Canine (Cuspid)', quadrant: 'Maxillary Left' },
  { fdi: 24, universal: 12, name: 'First Premolar (Bicuspid)', quadrant: 'Maxillary Left' },
  { fdi: 25, universal: 13, name: 'Second Premolar (Bicuspid)', quadrant: 'Maxillary Left' },
  { fdi: 26, universal: 14, name: 'First Molar', quadrant: 'Maxillary Left' },
  { fdi: 27, universal: 15, name: 'Second Molar', quadrant: 'Maxillary Left' },
  { fdi: 28, universal: 16, name: 'Third Molar (Wisdom)', quadrant: 'Maxillary Left' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const { currentUser, clinic } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>('shihab');

  // Interactive Live Preview Odontogram Widget state
  const [selectedToothFdi, setSelectedToothFdi] = useState<number>(14);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(['O/I']);

  const selectedTooth =
    UPPER_TEETH.find((t) => t.fdi === selectedToothFdi) || UPPER_TEETH[4];

  const handleOpenAuth = (presetId: string | null = 'shihab') => {
    setActivePresetId(presetId);
    setIsAuthModalOpen(true);
  };

  const toggleSurface = (surface: string) => {
    setSelectedSurfaces((prev) =>
      prev.includes(surface) ? prev.filter((s) => s !== surface) : [...prev, surface]
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#0F172A] flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Clinic Info */}
          <div className="flex items-center gap-3">
            {clinic?.logoUrl ? (
              <img
                src={clinic.logoUrl}
                alt={clinic.name || 'Clinic Logo'}
                className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200/90 p-1 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                <ToothIcon className="w-5 h-5 text-teal-100" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  {clinic?.brandName || 'DentFlow'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/90 px-2 py-0.5 rounded-full">
                  {clinic?.badgeText || 'CLINICAL SUITE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {clinic?.slogan || clinic?.name || 'Apex Dental & Implant Centre'}
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <a href="#features" className="hover:text-teal-700 transition-colors">
              Features
            </a>
            <a href="#odontogram" className="hover:text-teal-700 transition-colors">
              Odontogram
            </a>
            <a href="#role-security" className="hover:text-teal-700 transition-colors">
              Role Security
            </a>
            <a href="#compliance" className="hover:text-teal-700 transition-colors">
              Compliance
            </a>
          </nav>

          {/* Right Action & Notation Indicator */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>FDI & Universal ISO 3950</span>
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={onEnterApp}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Go to Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAuth('shihab')}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Portal Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="pt-10 sm:pt-14 pb-14 px-4 sm:px-6 max-w-7xl mx-auto">
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            Comprehensive Dental Clinic Management Platform
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Column: Heading, Subtitle, Buttons, Feature Points */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.12]">
                Clinical Precision Meets Seamless Practice Operations.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-2xl">
                Unify interactive 5-surface odontogram charting, periodontal examinations, conflict-free operatory scheduling, patient health records, and double-entry financial accounting—all in one secure, localized dental system.
              </p>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('shihab')}
                  className="px-5 py-3 rounded-xl bg-[#0F3942] hover:bg-[#0A282E] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-300" />
                  Secure Owner & Admin Sign In
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAuth('shihab')}
                  className="px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  Staff Portal
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#odontogram"
                  className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  <Grid className="w-4 h-4 text-teal-700" />
                  Preview Odontogram
                </a>
              </div>

              {/* Quick Feature Points Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                <div>
                  <div className="font-extrabold text-xs text-slate-900 tracking-tight">
                    100% In-App
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    No external charting API required
                  </div>
                </div>

                <div>
                  <div className="font-extrabold text-xs text-slate-900 tracking-tight">
                    FDI & Universal
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Dual notation support (ISO 3950)
                  </div>
                </div>

                <div>
                  <div className="font-extrabold text-xs text-slate-900 tracking-tight">
                    Least-Privilege
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Enforced 5-role clinical security
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Odontogram Engine Card (LIVE PREVIEW) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
                {/* Dark Navy / Teal Header Bar */}
                <div className="bg-[#0B252E] px-4 py-3 flex items-center justify-between text-white border-b border-teal-900/60">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-100">
                    <ToothIcon className="w-4 h-4 text-teal-300" />
                    <span>Interactive Odontogram Engine</span>
                  </div>
                  <span className="text-[9.5px] font-extrabold text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/80 uppercase tracking-wider">
                    LIVE PREVIEW
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-3.5">
                  <p className="text-[11px] text-slate-500">
                    Click any tooth to test real-time FDI ↔ Universal translation:
                  </p>

                  {/* Teeth Numbers Grid */}
                  <div className="grid grid-cols-8 gap-1.5 text-center">
                    {UPPER_TEETH.map((tooth) => {
                      const isSelected = tooth.fdi === selectedToothFdi;
                      return (
                        <button
                          key={tooth.fdi}
                          type="button"
                          onClick={() => setSelectedToothFdi(tooth.fdi)}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-700 text-white font-bold shadow-xs ring-2 ring-teal-500/30'
                              : 'bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50'
                          }`}
                        >
                          {tooth.fdi}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Tooth Details Box */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {selectedTooth.quadrant} - {selectedTooth.name}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded border border-teal-200/80 shrink-0 uppercase tracking-wide">
                        Universal #{selectedTooth.universal}
                      </span>
                    </div>

                    {/* Surfaces Selectors */}
                    <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                      <span className="text-slate-500 font-medium mr-1">Surfaces:</span>
                      {['M', 'D', 'O/I', 'B', 'L'].map((surf) => {
                        const isSurfActive = selectedSurfaces.includes(surf);
                        return (
                          <button
                            key={surf}
                            type="button"
                            onClick={() => toggleSurface(surf)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              isSurfActive
                                ? 'bg-teal-700 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {surf}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Action inside preview card */}
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('ayesha')}
                    className="w-full py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Sign in as Dentist to Chart Full Patient Records</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. COMPLETE PRACTICE MANAGEMENT Section */}
        <section id="features" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-100">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-teal-700">
              COMPLETE PRACTICE MANAGEMENT
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Built Specifically for the Realities of Modern Dental Care
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Every feature has been architected to minimize administrative overhead, protect patient safety, and maximize chairside efficiency.
            </p>
          </div>

          {/* 6 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Interactive 5-Surface Odontogram */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 text-teal-700 flex items-center justify-center">
                    <Grid className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
                    CLINICAL CORE
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Interactive 5-Surface Odontogram
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full SVG dental chart supporting both adult permanent (11–48) and pediatric deciduous (51–85) dentition. Maps Mesial, Distal, Occlusal, Buccal, and Lingual findings with auditable revisions.
                </p>
              </div>
            </div>

            {/* Card 2: Conflict-Free Operatory Scheduling */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 text-teal-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
                    PRACTICE OPS
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Conflict-Free Operatory Scheduling
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Server-enforced booking rules prevent overlapping chair or dentist assignments. Real-time check-in, no-show tracking, and multi-chair day/week calendar views.
                </p>
              </div>
            </div>

            {/* Card 3: Comprehensive Patient Health Records */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 text-teal-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
                    HIPAA COMPLIANT
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Comprehensive Patient Health Records
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Medical condition alerts (cardiac, diabetes, bleeding disorders), severe allergy warnings (Penicillin, Latex), digital consent logs, and private X-ray storage.
                </p>
              </div>
            </div>

            {/* Card 4: Multi-Stage Treatment Planning */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 text-teal-700 flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
                    CASE ACCEPTANCE
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Multi-Stage Treatment Planning
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Formulate clinical treatment proposals with priority staging, trusted CDT code pricing, patient consent signatures, and automatic procedure progression.
                </p>
              </div>
            </div>

            {/* Card 5: Itemized Billing & Multi-Payment Ledger */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 text-teal-700 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
                    FINANCIAL ENGINE
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Itemized Billing & Multi-Payment Ledger
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fixed-precision decimal accounting. Partial payments, strict invoice allocations, authorized refunds, and printable itemized patient receipts.
                </p>
              </div>
            </div>

            {/* Card 6: Double-Entry Dental Inventory */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 text-teal-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
                    SUPPLY CHAIN
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Double-Entry Dental Inventory
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Track composite materials, anesthetics, and instruments with lot numbers, expiration alerts, supplier purchase orders, and automated low-stock reorder thresholds.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECURITY BY DESIGN / Strict Role-Based Access Control (RBAC) */}
        <section id="role-security" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-100">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-teal-700">
              SECURITY BY DESIGN
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Strict Role-Based Access Control (RBAC)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Patient health records are strictly compartmentalized. Unauthorized staff cannot view or alter clinical charts or financial ledgers.
            </p>
          </div>

          {/* 4 Role Cards in 4 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Clinic Owner */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Clinic Owner</h3>
                  <Shield className="w-4 h-4 text-teal-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full operational and financial governance, fee schedules, tax settings, staff permission control, and complete audit history.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('shihab')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center justify-between w-full cursor-pointer"
                >
                  <span>Sign In as Clinic Owner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 2: Dentist / Surgeon */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Dentist / Surgeon</h3>
                  <Shield className="w-4 h-4 text-teal-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Interactive odontogram charting, SOAP clinical notes, dental lab prosthodontics orders, and e-prescription writing.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('ayesha')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center justify-between w-full cursor-pointer"
                >
                  <span>Sign In as Dentist / Surgeon</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 3: Receptionist */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Receptionist</h3>
                  <Shield className="w-4 h-4 text-teal-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Front-desk patient check-in, appointment booking, lab case receiving, and demographic updates.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('marcus')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center justify-between w-full cursor-pointer"
                >
                  <span>Sign In as Receptionist</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 4: Cashier */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400/80 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Cashier</h3>
                  <Shield className="w-4 h-4 text-teal-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Point-of-sale invoice creation, counter payments, expense vouchers, and daily payment reconciliation.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('rachel')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center justify-between w-full cursor-pointer"
                >
                  <span>Sign In as Cashier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Banner Section: High-Precision Odontogram Charting Engine */}
        <section id="odontogram" className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="bg-[#07242B] text-white rounded-3xl p-8 sm:p-12 border border-teal-900/80 shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Heading, description, and compliance badges */}
              <div className="lg:col-span-7 space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-800/80 inline-block">
                  CLINICAL ODONTOGRAM
                </span>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  High-Precision Odontogram Charting Engine
                </h2>

                <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed max-w-xl">
                  DentFlow renders anatomical tooth geometries directly in vector SVG. Clinicians can chart restorations, caries, crowns, implants, endodontic obturations, and fractures with surface-level accuracy.
                </p>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="bg-teal-950/60 border border-teal-700/60 text-teal-200 text-xs px-3 py-1 rounded-full font-medium">
                    ISO 3950 Compliant
                  </span>
                  <span className="bg-teal-950/60 border border-teal-700/60 text-teal-200 text-xs px-3 py-1 rounded-full font-medium">
                    Adult Permanent (32)
                  </span>
                  <span className="bg-teal-950/60 border border-teal-700/60 text-teal-200 text-xs px-3 py-1 rounded-full font-medium">
                    Primary Deciduous (20)
                  </span>
                  <span className="bg-teal-950/60 border border-teal-700/60 text-teal-200 text-xs px-3 py-1 rounded-full font-medium">
                    Audit Trail Revisions
                  </span>
                </div>
              </div>

              {/* Right Column: Card with Tooth Logo and CTA */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center mb-4 shadow-inner">
                    <ToothIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Experience DentFlow Live
                  </h3>
                  <p className="text-xs text-teal-200/70 mt-1 mb-5">
                    Enter with staff credentials
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('ayesha')}
                    className="w-full py-3 bg-[#00D1B2] hover:bg-[#00BFA5] text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    Launch Clinical Charting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer id="compliance" className="bg-[#05181E] text-slate-400 py-10 px-4 sm:px-6 text-xs border-t border-teal-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-2.5 text-white">
            {clinic?.logoUrl ? (
              <img
                src={clinic.logoUrl}
                alt={clinic.name || 'Clinic Logo'}
                className="w-8 h-8 rounded-lg object-contain bg-white border border-teal-800 p-0.5"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                <ToothIcon className="w-4 h-4" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                {clinic?.brandName || 'DentFlow'}
              </span>
              <span className="text-slate-400 text-xs">
                {clinic?.badgeText ? `${clinic.badgeText} • ` : ''}Dental Management
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-300 text-xs">
            <button
              type="button"
              onClick={() => handleOpenAuth('shihab')}
              className="hover:text-teal-400 text-teal-300 font-semibold cursor-pointer"
            >
              Staff Login Portal
            </button>
            <span className="text-slate-600">•</span>
            <span>{clinic?.slogan || clinic?.name || 'Apex Dental & Implant Centre'}</span>
            <span className="text-slate-600">•</span>
            <span>Practice Edition</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px]">
          <p>Designed for international dental standards (FDI World Dental Federation ISO 3950 & US ADA).</p>
          <p>Encrypted patient medical records • HIPAA / GDPR Aligned Security</p>
        </div>
      </footer>

      {/* Staff Authentication Portal Modal with Quick Login Presets */}
      <StaffAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={onEnterApp}
        initialPresetId={activePresetId}
      />
    </div>
  );
};
