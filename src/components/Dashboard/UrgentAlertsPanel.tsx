import React, { useState, useMemo } from 'react';
import {
  Appointment,
  Patient,
  Invoice,
  TreatmentPlan,
} from '../../types/dental';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  X,
  Stethoscope,
  CreditCard,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldAlert,
  Flame,
} from 'lucide-react';

export interface UrgentAlertItem {
  id: string;
  category: 'root_canal' | 'balance' | 'medical' | 'surgical';
  severity: 'urgent' | 'high' | 'medium';
  title: string;
  subtitle: string;
  patientName: string;
  patientIdNumber?: string;
  patientId?: string;
  meta: string;
  badgeText: string;
  badgeColor: string;
  actionText: string;
  targetModule: 'appointments' | 'billing' | 'patients';
  timestamp?: string;
  amount?: number;
  dueDate?: string;
}

interface UrgentAlertsPanelProps {
  appointments: Appointment[];
  patients: Patient[];
  invoices: Invoice[];
  onNavigate: (module: string) => void;
  currencySymbol?: string;
}

export const UrgentAlertsPanel: React.FC<UrgentAlertsPanelProps> = ({
  appointments,
  patients,
  invoices,
  onNavigate,
  currencySymbol = '৳',
}) => {
  const [filter, setFilter] = useState<'all' | 'clinical' | 'balance' | 'medical'>('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Derive urgent patient alerts dynamically from clinical & financial records
  const allAlerts: UrgentAlertItem[] = useMemo(() => {
    const items: UrgentAlertItem[] = [];

    // 1. URGENT CLINICAL: Upcoming Root Canal in Appointments (Today or Upcoming)
    appointments.forEach((appt) => {
      const typeLower = (appt.type || '').toLowerCase();
      const reasonLower = (appt.reason || '').toLowerCase();
      const notesLower = (appt.notes || '').toLowerCase();

      const isRootCanal =
        typeLower.includes('root canal') ||
        typeLower.includes('endodontic') ||
        reasonLower.includes('root canal') ||
        reasonLower.includes('pulp');

      const isSurgical =
        typeLower.includes('surgical') ||
        typeLower.includes('extraction') ||
        typeLower.includes('implant') ||
        reasonLower.includes('extraction') ||
        reasonLower.includes('implant');

      if (isRootCanal && appt.status !== 'Completed' && appt.status !== 'Cancelled') {
        const isToday = appt.date === todayStr;
        items.push({
          id: `appt-rc-${appt.id}`,
          category: 'root_canal',
          severity: 'urgent',
          title: isToday ? 'Upcoming Root Canal Today' : 'Upcoming Root Canal Procedure',
          subtitle: `Scheduled for ${appt.patientName} (${appt.startTime} in ${appt.room || 'Operatory'})`,
          patientName: appt.patientName,
          patientId: appt.patientId,
          meta: `Clinician: ${appt.dentistName} • ${appt.durationMinutes || 60}m chair session • ${appt.reason || 'Endodontic treatment'}`,
          badgeText: isToday ? 'TODAY • ROOT CANAL' : 'UPCOMING ROOT CANAL',
          badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
          actionText: 'View Operatory',
          targetModule: 'appointments',
          timestamp: `${appt.date} ${appt.startTime}`,
        });
      } else if (isSurgical && appt.date === todayStr && appt.status !== 'Completed' && appt.status !== 'Cancelled') {
        items.push({
          id: `appt-surg-${appt.id}`,
          category: 'surgical',
          severity: 'high',
          title: 'Surgical Procedure Scheduled Today',
          subtitle: `${appt.type} for ${appt.patientName} at ${appt.startTime}`,
          patientName: appt.patientName,
          patientId: appt.patientId,
          meta: `${appt.room || 'Surgical Bay'} • Assigned to ${appt.dentistName}`,
          badgeText: 'SURGICAL CHAIR',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          actionText: 'Review Schedule',
          targetModule: 'appointments',
          timestamp: `${appt.date} ${appt.startTime}`,
        });
      }
    });

    // 2. FINANCIAL ALERTS: Outstanding Balances & Overdue Invoices
    invoices.forEach((inv) => {
      const balanceNum = Number(inv.balance) || 0;
      if (balanceNum > 0 && inv.status !== 'Paid') {
        const isOverdue = inv.dueDate && inv.dueDate < todayStr;
        const isSignificant = balanceNum >= 3000 || isOverdue;

        if (isSignificant) {
          items.push({
            id: `inv-${inv.id}`,
            category: 'balance',
            severity: isOverdue ? 'urgent' : 'high',
            title: isOverdue ? 'Overdue Patient Invoice' : 'Outstanding Balance Pending Collection',
            subtitle: `${inv.patientName} has unpaid balance of ${currencySymbol} ${balanceNum.toLocaleString()} (Invoice #${inv.invoiceNumber})`,
            patientName: inv.patientName,
            patientId: inv.patientId,
            meta: `Total Billed: ${currencySymbol} ${Number(inv.total).toLocaleString()} • Paid: ${currencySymbol} ${(Number(inv.paidAmount) || 0).toLocaleString()} • Due Date: ${inv.dueDate || 'Immediate'}`,
            badgeText: isOverdue ? 'OVERDUE BALANCE' : 'OUTSTANDING BALANCE',
            badgeColor: isOverdue ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200',
            actionText: 'Collect Payment',
            targetModule: 'billing',
            amount: balanceNum,
            dueDate: inv.dueDate,
          });
        }
      }
    });

    // 4. MEDICAL & ALLERGY CAUTIONS: Patients scheduled today with critical health alerts
    const todayPatientNames = new Set(appointments.filter((a) => a.date === todayStr).map((a) => a.patientName));

    patients.forEach((p) => {
      const hasSevereAlert = p.medicalAlerts || p.allergies;
      const isScheduledToday = todayPatientNames.has(p.fullName);

      if (hasSevereAlert && isScheduledToday) {
        items.push({
          id: `med-${p.id}`,
          category: 'medical',
          severity: 'urgent',
          title: 'High-Risk Medical Alert in Today\'s Queue',
          subtitle: `${p.fullName} (${p.patientIdNumber}): ${p.medicalAlerts || p.allergies}`,
          patientName: p.fullName,
          patientIdNumber: p.patientIdNumber,
          patientId: p.id,
          meta: `Allergies: ${p.allergies || 'None'} • Current Meds: ${p.currentMedications || 'None'} • Chair alert active`,
          badgeText: 'MEDICAL CAUTION',
          badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
          actionText: 'Review Medical Chart',
          targetModule: 'patients',
        });
      }
    });

    // Sort by severity (urgent first, then high, then medium)
    const severityScore = { urgent: 3, high: 2, medium: 1 };
    items.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);

    return items;
  }, [appointments, invoices, patients, todayStr, currencySymbol]);

  // Filter out dismissed alerts
  const visibleAlerts = useMemo(() => {
    return allAlerts.filter((a) => !dismissedIds.includes(a.id));
  }, [allAlerts, dismissedIds]);

  // Tab filtered alerts
  const filteredAlerts = useMemo(() => {
    if (filter === 'clinical') {
      return visibleAlerts.filter(
        (a) => a.category === 'root_canal' || a.category === 'surgical'
      );
    }
    if (filter === 'balance') {
      return visibleAlerts.filter((a) => a.category === 'balance');
    }
    if (filter === 'medical') {
      return visibleAlerts.filter((a) => a.category === 'medical');
    }
    return visibleAlerts;
  }, [visibleAlerts, filter]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleRestoreAll = () => {
    setDismissedIds([]);
  };

  const rootCanalCount = visibleAlerts.filter((a) => a.category === 'root_canal').length;
  const balanceCount = visibleAlerts.filter((a) => a.category === 'balance').length;
  const medicalCount = visibleAlerts.filter((a) => a.category === 'medical').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0F3942] to-[#0A262C] p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
            {visibleAlerts.length > 0 ? (
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-teal-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                Urgent Patient Alerts & Clinical Watchlist
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                visibleAlerts.length > 0
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
              }`}>
                {visibleAlerts.length} {visibleAlerts.length === 1 ? 'Action Required' : 'Actions Required'}
              </span>
            </div>
            <p className="text-[11px] text-teal-100/80 mt-0.5">
              Real-time procedural alerts (Upcoming Root Canals, Surgical Extractions) and financial overdue balances.
            </p>
          </div>
        </div>

        {/* Controls: Category Filter & Collapse Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {dismissedIds.length > 0 && (
            <button
              type="button"
              onClick={handleRestoreAll}
              className="text-[10px] text-teal-200 hover:text-white flex items-center gap-1 font-semibold px-2 py-1 rounded bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
              title="Restore dismissed alerts"
            >
              <RotateCcw className="w-3 h-3" />
              Reset ({dismissedIds.length})
            </button>
          )}

          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              All ({visibleAlerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('clinical')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'clinical'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              Root Canals ({rootCanalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('balance')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'balance'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              Balances ({balanceCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('medical')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === 'medical'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-teal-100 hover:text-white'
              }`}
            >
              Medical ({medicalCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Alert Panel' : 'Collapse Alert Panel'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Panel Body: Alert Cards */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5">
          {filteredAlerts.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                No Urgent Patient Alerts in this View
              </h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                All upcoming procedures are verified, medical cautions are acknowledged, and no overdue accounts require immediate escalation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAlerts.map((alert) => {
                const isRootCanal = alert.category === 'root_canal';
                const isBalance = alert.category === 'balance';
                const isMedical = alert.category === 'medical';

                return (
                  <div
                    key={alert.id}
                    onClick={() => onNavigate(alert.targetModule)}
                    className={`relative p-3.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between gap-3 ${
                      isRootCanal
                        ? 'bg-rose-50/40 hover:bg-rose-50/80 border-rose-200 hover:border-rose-300'
                        : isBalance
                        ? 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200 hover:border-amber-300'
                        : 'bg-purple-50/40 hover:bg-purple-50/80 border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Top Row: Category Badge & Dismiss */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${alert.badgeColor}`}
                        >
                          {isRootCanal && <Stethoscope className="w-3 h-3 text-rose-600" />}
                          {isBalance && <DollarSign className="w-3 h-3 text-amber-700" />}
                          {isMedical && <HeartPulse className="w-3 h-3 text-purple-600" />}
                          {alert.badgeText}
                        </span>

                        {alert.severity === 'urgent' && (
                          <span className="text-[9.5px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded">
                            High Priority
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-white/80 transition-colors cursor-pointer"
                        title="Dismiss alert for this session"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Patient & Description */}
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg font-extrabold text-[11px] flex items-center justify-center shrink-0 ${
                            isRootCanal
                              ? 'bg-rose-100 text-rose-800'
                              : isBalance
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-purple-100 text-purple-900'
                          }`}
                        >
                          {alert.patientName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900 group-hover:text-teal-900 transition-colors">
                            {alert.title}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-700">
                            {alert.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-[10.5px] text-slate-500 font-medium pl-9">
                        {alert.meta}
                      </div>
                    </div>

                    {/* Bottom: Action Link */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs pl-9">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Action required
                      </span>
                      <span className="text-[11px] font-bold text-teal-800 group-hover:text-teal-950 flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                        {alert.actionText} <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
