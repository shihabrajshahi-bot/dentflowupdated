import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { Patient } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { formatClinicDate } from '../../utils/dateFormatter';
import { PatientDetailModal } from './PatientDetailModal';
import { NewPatientModal } from './NewPatientModal';
import {
  Users,
  Search,
  Plus,
  Filter,
  ShieldAlert,
  Phone,
  Mail,
  ChevronRight,
  Trash2,
  FileText,
  Grid,
  Printer,
} from 'lucide-react';
import { ClinicalHandoverModal } from './ClinicalHandoverModal';

export const PatientList: React.FC = () => {
  const { clinic, hasPermission, recordAuditLog, userProfile, activeRole } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState<'all' | 'alerts_only'>('all');

  // Modals
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [handoverPatient, setHandoverPatient] = useState<Patient | null>(null);

  const canCreate = hasPermission(['Owner', 'Receptionist']);
  const canDelete = hasPermission(['Owner']);

  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    setLoading(true);
    const path = `clinics/${clinicId}/patients`;

    const q = query(collection(db, 'clinics', clinicId, 'patients'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Patient[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Patient);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPatients(list);
        setSelectedPatient((prev) => (prev ? list.find((p) => p.id === prev.id) || prev : null));
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [clinic?.id]);

  const handleDeletePatient = async (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation();
    if (!canDelete || !clinic) return;
    const targetPatient = patients.find((p) => p.id === patientId);
    const path = `clinics/${clinic.id}/patients/${patientId}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinic.id, 'patients', patientId));

      if (recordAuditLog) {
        recordAuditLog({
          activityType: 'Patient Deleted',
          details: `Patient record #${targetPatient?.patientIdNumber || patientId} (${targetPatient?.fullName || 'Patient'}) deleted by Owner`,
          targetResource: targetPatient?.patientIdNumber || patientId,
          notes: `Removed from active patient directory by ${userProfile?.displayName || 'Clinic Owner'}`,
        }).catch(() => {});
      }

      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const openPatient = (patient: Patient, tab = 'overview') => {
    setSelectedPatient(patient);
    setDetailTab(tab);
    setIsDetailOpen(true);
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientIdNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery);

    const matchesAlert =
      alertFilter === 'all' || (alertFilter === 'alerts_only' && Boolean(p.medicalAlerts || p.allergies));

    return matchesSearch && matchesAlert;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Patient Records Directory
          </h3>
          <p className="text-xs text-slate-500">
            Search patient charts, medical histories, odontograms, and appointments.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Patient
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID (e.g. DF-1001), phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wide">Filter:</span>
          <button
            type="button"
            onClick={() => setAlertFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              alertFilter === 'all'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Patients ({patients.length})
          </button>
          <button
            type="button"
            onClick={() => setAlertFilter('alerts_only')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              alertFilter === 'alerts_only'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            With Health Alerts
          </button>
        </div>
      </div>

      {/* Patients Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading patient directory...
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No patients found.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click 'Register Patient' to create a new profile.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Patient ID & Name</th>
                  <th className="py-3 px-4">Gender & Age</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Medical Alert / Flags</th>
                  <th className="py-3 px-4 text-center">Quick Actions</th>
                  <th className="py-3 px-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => openPatient(patient, 'overview')}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* ID & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-xs border border-teal-200">
                          {patient.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {patient.fullName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">{patient.patientIdNumber}</div>
                        </div>
                      </div>
                    </td>

                    {/* Gender & Age */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                      <div>{patient.gender}</div>
                      <div className="text-[11px] text-slate-400">DOB: {formatClinicDate(patient.dateOfBirth)}</div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {patient.phone}
                      </div>
                      {patient.email && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {patient.email}
                        </div>
                      )}
                    </td>

                    {/* Medical Alert Flags */}
                    <td className="py-3.5 px-4">
                      {patient.medicalAlerts || patient.allergies ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          {patient.medicalAlerts || patient.allergies}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Normal</span>
                      )}
                    </td>

                    {/* Quick shortcuts */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openPatient(patient, 'chart')}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Open Odontogram Chart"
                        >
                          <Grid className="w-3 h-3" />
                          Chart
                        </button>
                        <button
                          type="button"
                          onClick={() => openPatient(patient, 'notes')}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Open Clinical Notes"
                        >
                          <FileText className="w-3 h-3" />
                          Notes
                        </button>
                        <button
                          type="button"
                          onClick={() => setHandoverPatient(patient)}
                          className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-semibold transition-colors flex items-center gap-1 border border-teal-200"
                          title="Generate Clinical Handover Summary"
                        >
                          <Printer className="w-3 h-3 text-teal-600" />
                          Handover
                        </button>
                      </div>
                    </td>

                    {/* View profile button & delete */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {canDelete && (
                          confirmDeleteId === patient.id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <span className="text-[10px] text-rose-700 font-semibold">Delete?</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeletePatient(e, patient.id)}
                                className="text-[10px] font-bold text-rose-700 hover:underline px-1 cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] text-slate-500 hover:underline px-1 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(patient.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Delete patient"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                        <ChevronRight
                          onClick={() => openPatient(patient, 'overview')}
                          className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors cursor-pointer"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && isDetailOpen && (
        <PatientDetailModal
          patient={selectedPatient}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          defaultTab={detailTab}
        />
      )}

      {/* New Patient Registration Modal */}
      {isNewModalOpen && (
        <NewPatientModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={(newId) => {
            // Patient list automatically updates via onSnapshot
          }}
        />
      )}

      {/* Clinical Handover & Treatment Summary Modal */}
      {handoverPatient && (
        <ClinicalHandoverModal
          patient={handoverPatient}
          isOpen={Boolean(handoverPatient)}
          onClose={() => setHandoverPatient(null)}
        />
      )}
    </div>
  );
};
