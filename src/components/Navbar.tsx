import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/dental';
import {
  Stethoscope,
  Bell,
  LogOut,
  Shield,
  ChevronDown,
  Check,
  History,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  onOpenNotifications?: () => void;
  waitingCount?: number;
  lowStockCount?: number;
  onSelectModule?: (module: string) => void;
  isMobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  waitingCount = 0,
  lowStockCount = 0,
  onSelectModule,
  isMobileSidebarOpen = false,
  onToggleMobileSidebar,
}) => {
  const { userProfile, clinic, activeRole, switchActiveRole, signOut } = useAuth();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Exact 4 roles per user specification
  const roles: UserRole[] = ['Owner', 'Dentist', 'Receptionist', 'Cashier'];
  const totalNotifications = waitingCount + lowStockCount;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 h-16 px-3 sm:px-6 flex items-center justify-between no-print">
      {/* Left: Mobile Toggle & Clinic Brand Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none transition-colors cursor-pointer"
          aria-label={isMobileSidebarOpen ? 'Close menu' : 'Open menu'}
          title="Toggle Navigation Menu"
        >
          {isMobileSidebarOpen ? (
            <X className="w-5 h-5 text-teal-700" />
          ) : (
            <Menu className="w-5 h-5 text-slate-700" />
          )}
        </button>

        {clinic?.logoUrl ? (
          <img
            src={clinic.logoUrl}
            alt={clinic.name || 'Clinic Logo'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white border border-slate-200/90 p-0.5 shadow-xs shrink-0"
          />
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 shrink-0">
              {clinic?.brandName || 'DentFlow'}
            </span>
            {clinic?.badgeText && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/90 px-1.5 py-0.2 rounded-full hidden md:inline-block shrink-0">
                {clinic.badgeText}
              </span>
            )}
            <span className="text-slate-300 hidden xs:inline">|</span>
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[110px] sm:max-w-xs hidden xs:inline-block">
              {clinic?.slogan || clinic?.name || 'Apex Dental Care & Implant Center'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block truncate">
            {clinic?.currencySymbol || '৳'} {clinic?.currency || 'BDT'} Standard Practice
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100/70 text-teal-800 text-xs font-bold transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Portal:</span> {activeRole}
            <ChevronDown className="w-3 h-3 ml-0.5 text-teal-600" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Switch Role Portal
              </div>
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    switchActiveRole(r);
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                    activeRole === r
                      ? 'bg-teal-50 text-teal-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{r}</span>
                  {activeRole === r && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              ))}

              {activeRole === 'Owner' && onSelectModule && (
                <div className="border-t border-slate-100 mt-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectModule('log_history');
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100/80 transition-colors text-xs font-bold"
                  >
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    <span>Practice Log History</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 text-xs animate-in fade-in zoom-in-95 space-y-2">
              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between">
                <span>In-Clinic Notifications</span>
                <span className="text-[10px] text-teal-700 font-semibold">{totalNotifications} active</span>
              </div>

              {waitingCount > 0 ? (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                  <span className="font-bold block">Patient Waiting</span>
                  {waitingCount} patient(s) checked in and waiting for operatory.
                </div>
              ) : (
                <div className="text-slate-400 text-[11px] py-1">Waiting room is currently clear.</div>
              )}

              {lowStockCount > 0 && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  <span className="font-bold block">Inventory Warning</span>
                  {lowStockCount} material item(s) below reorder threshold.
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
            {userProfile?.displayName?.charAt(0) || activeRole.charAt(0)}
          </div>
          <div className="hidden md:block text-left text-xs">
            <div className="font-bold text-slate-800 truncate max-w-[120px]">
              {userProfile?.displayName || 'Clinical Staff'}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {userProfile?.email}
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors ml-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
