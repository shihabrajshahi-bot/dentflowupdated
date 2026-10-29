import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, DEFAULT_CLINIC_ID } from './context/AuthContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase/config';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/Dashboard/DashboardOverview';
import { PatientList } from './components/Patients/PatientList';
import { AppointmentManager } from './components/Appointments/AppointmentManager';
import { GlobalPrescriptionsHub } from './components/Prescriptions/GlobalPrescriptionsHub';
import { LabOrdersManager } from './components/LabOrders/LabOrdersManager';
import { BillingManager } from './components/Billing/BillingManager';
import { ExpensesProfitManager } from './components/Expenses/ExpensesProfitManager';
import { ServicesCatalog } from './components/Services/ServicesCatalog';
import { InventoryManager } from './components/Inventory/InventoryManager';
import { ReportsDashboard } from './components/Reports/ReportsDashboard';
import { SettingsView } from './components/StaffAndSettings/SettingsView';
import { StaffManagement } from './components/Dashboard/StaffManagement';
import { NewPatientModal } from './components/Patients/NewPatientModal';
import { Appointment } from './types/dental';
import { Shield, Lock } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, loading, clinic, activeRole, canAccessModule } = useAuth();
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [showLanding, setShowLanding] = useState<boolean>(false);

  // Global modals
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isBookApptOpen, setIsBookApptOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live badge counts
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  useEffect(() => {
    if (!currentUser) return;
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const todayStr = new Date().toISOString().split('T')[0];

    // Listen for waiting patients
    const apptPath = `clinics/${clinicId}/appointments`;
    const qAppt = query(
      collection(db, 'clinics', clinicId, 'appointments'),
      where('date', '==', todayStr),
      where('status', '==', 'Checked In')
    );

    const unsubAppt = onSnapshot(
      qAppt,
      (snap) => {
        setWaitingCount(snap.docs.length);
      },
      (err) => console.warn('Waiting count note:', err)
    );

    // Listen for low stock
    const invPath = `clinics/${clinicId}/inventory`;
    const unsubInv = onSnapshot(
      collection(db, 'clinics', clinicId, 'inventory'),
      (snap) => {
        let low = 0;
        snap.forEach((d) => {
          const data = d.data();
          if (data.quantity <= data.reorderThreshold) {
            low++;
          }
        });
        setLowStockCount(low);
      },
      (err) => console.warn('Low stock note:', err)
    );

    return () => {
      unsubAppt();
      unsubInv();
    };
  }, [currentUser, clinic?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center text-xs text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-700">Connecting to DentFlow Clinical Cloud...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in or explicitly toggled landing page
  if (!currentUser || showLanding) {
    return (
      <LandingPage
        onEnterApp={() => {
          setShowLanding(false);
          setCurrentModule('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFB] text-[#1E293B] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        waitingCount={waitingCount}
        lowStockCount={lowStockCount}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onSelectModule={(mod) => {
          setCurrentModule(mod);
          setIsMobileSidebarOpen(false);
        }}
      />

      <div className="flex flex-1 min-w-0">
        {/* Persistent Responsive Sidebar (Desktop & Mobile Drawer) */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={(mod) => {
            setCurrentModule(mod);
            setIsMobileSidebarOpen(false);
          }}
          waitingCount={waitingCount}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Work Area */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full min-w-0 overflow-y-auto">
          {!canAccessModule(currentModule) ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-md mx-auto my-12 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  Dashboard Section Restricted
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your current account permissions for role <strong className="text-slate-800 uppercase">{activeRole}</strong> do not include access to this part of the dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentModule('dashboard')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Return to Dashboard Overview
              </button>
            </div>
          ) : (
            <>
              {currentModule === 'dashboard' && (
                <DashboardOverview
                  onNavigate={(mod) => setCurrentModule(mod)}
                  onOpenNewPatient={() => setIsNewPatientOpen(true)}
                  onOpenNewAppointment={() => setCurrentModule('appointments')}
                />
              )}

              {currentModule === 'patients' && <PatientList />}

              {currentModule === 'appointments' && <AppointmentManager />}

              {currentModule === 'prescriptions' && <GlobalPrescriptionsHub />}

              {currentModule === 'lab_orders' && <LabOrdersManager />}

              {currentModule === 'billing' && <BillingManager />}

              {currentModule === 'expenses' && <ExpensesProfitManager />}

              {currentModule === 'services' && <ServicesCatalog />}

              {currentModule === 'inventory' && <InventoryManager />}

              {currentModule === 'reports' && <ReportsDashboard />}

              {currentModule === 'staff' && <StaffManagement />}

              {currentModule === 'log_history' && <StaffManagement initialTab="login_logs" />}

              {currentModule === 'settings' && (
                <SettingsView onNavigateToModule={(mod) => setCurrentModule(mod)} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      {isNewPatientOpen && (
        <NewPatientModal
          isOpen={isNewPatientOpen}
          onClose={() => setIsNewPatientOpen(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
