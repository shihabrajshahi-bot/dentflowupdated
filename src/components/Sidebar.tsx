import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/dental';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  Pill,
  FlaskConical,
  CreditCard,
  TrendingUp,
  Stethoscope,
  Boxes,
  Settings,
  ChevronRight,
  Shield,
  ShieldCheck,
  BarChart3,
  History,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentModule: string;
  onSelectModule: (module: string) => void;
  waitingCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  waitingCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { activeRole, canAccessModule } = useAuth();

  // Navigation config based on the user's exact specification matrix
  const navigationItems: {
    id: string;
    label: string;
    icon: any;
    badge?: string;
    roles: UserRole[];
    roleSpecificBadge?: Partial<Record<UserRole, string>>;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'],
      roleSpecificBadge: {
        Owner: 'Full',
        Dentist: 'Clinical',
        Receptionist: 'Scheduling',
        Cashier: 'Financial',
      },
    },
    {
      id: 'patients',
      label: 'Patient Records',
      icon: Users,
      roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'],
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Calendar,
      badge: waitingCount > 0 ? `${waitingCount} Waiting` : undefined,
      roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'],
    },
    {
      id: 'prescriptions',
      label: 'Rx & Clinical Chart',
      icon: Pill,
      roles: ['Owner', 'Dentist'],
      roleSpecificBadge: {
        Owner: 'Rx/SOAP',
        Dentist: 'Rx/SOAP',
      },
    },
    {
      id: 'lab_orders',
      label: 'Dental Lab Orders',
      icon: FlaskConical,
      roles: ['Owner', 'Dentist', 'Receptionist'],
    },
    {
      id: 'billing',
      label: 'Invoices & Payments',
      icon: CreditCard,
      roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'],
    },
    {
      id: 'expenses',
      label: 'Expenses & Profit',
      icon: TrendingUp,
      // Owner: Full, Cashier: As authorized, Dentist: No access, Receptionist: No access
      roles: ['Owner', 'Cashier'],
      roleSpecificBadge: {
        Owner: 'P&L Full',
        Cashier: 'Vouchers',
      },
    },
    {
      id: 'inventory',
      label: 'Inventory & Supplies',
      icon: Boxes,
      // Owner: Full, Dentist: View/use, Cashier: Optional, Receptionist: No access
      roles: ['Owner', 'Dentist', 'Cashier'],
    },
    {
      id: 'services',
      label: 'Procedures Catalog',
      icon: Stethoscope,
      roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['Owner', 'Dentist', 'Cashier'],
      badge: 'PDF',
    },
    {
      id: 'staff',
      label: 'Staff Accounts',
      icon: ShieldCheck,
      roles: ['Owner'],
      badge: 'Owner Only',
    },
    {
      id: 'log_history',
      label: 'Log History',
      icon: History,
      roles: ['Owner'],
      badge: 'Owner Only',
    },
    {
      id: 'settings',
      label: 'Clinic Settings',
      icon: Settings,
      roles: ['Owner'],
    },
  ];

  const renderNavList = (isMobile = false) => (
    <div className="p-3.5 space-y-1">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Role: <span className="text-teal-700">{activeRole}</span>
      </div>

      {navigationItems.map((item) => {
        const Icon = item.icon;
        // Verify permissions: Owner has full clearance, other staff follow role & custom permissions
        const isAllowed = canAccessModule ? canAccessModule(item.id) : item.roles.includes(activeRole);
        const isActive = currentModule === item.id;

        if (!isAllowed) {
          return null;
        }

        const roleBadge = item.roleSpecificBadge?.[activeRole];

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectModule(item.id);
              if (isMobile) {
                onCloseMobile?.();
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-teal-700' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {roleBadge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {roleBadge}
                </span>
              )}
              {item.badge ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                  {item.badge}
                </span>
              ) : isActive ? (
                <ChevronRight className="w-3.5 h-3.5 text-teal-600" />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderFooter = () => (
    <div className="p-4 border-t border-slate-100 bg-[#FAFBFB] text-xs">
      <div className="flex items-center gap-1.5 text-teal-800 font-bold mb-1">
        <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>{activeRole} Workspace</span>
      </div>
      <p className="text-[11px] text-slate-500 leading-snug">
        Permissions enforced across clinical records, scheduling, billing, and P&L ledger.
      </p>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/90 flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 no-print overflow-y-auto shrink-0">
        {renderNavList(false)}
        {renderFooter()}
      </aside>

      {/* 2. Mobile Drawer Navigation Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 border-r border-slate-200">
            <div>
              {/* Drawer Top Header with Close Button */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    DentFlow Navigation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Items */}
              {renderNavList(true)}
            </div>

            {/* Role compliance footer */}
            {renderFooter()}
          </aside>
        </div>
      )}
    </>
  );
};
