import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Patient } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { PrescriptionManager } from './PrescriptionManager';
import { ClinicalNotesManager } from '../ClinicalNotes/ClinicalNotesManager';
import { Odontogram } from '../DentalOdontogram/Odontogram';
import {
  Pill,
  FileText,
  Grid,
  User,
  ShieldAlert,
  Phone,
  Search,
} from 'lucide-react';

export const GlobalPrescriptionsHub: React.FC = () => {
  const { clinic } = useAuth();
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'rx' | 'soap' | 'odontogram'>('rx');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'clinics', clinicId, 'patients'),
      (snap) => {
        const list: Patient[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Patient));
        list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        setPatients(list);
        if (list.length > 0 && !selectedPatientId) {
          setSelectedPatientId(list[0].id);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [clinicId]);

  const filteredPatients = patients.filter(
    (p) =>
      searchQuery === '' ||
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientIdNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
  );

  const selectedPatient =
    patients.find((p) => p.id === selectedPatientId) || filteredPatients[0] || null;

  return (
    <div className="space-y-5">
      {/* Header & Patient Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              Clinical Chairside Workspace: e-Prescriptions (Rx), SOAP Notes & Odontogram
            </h3>
            <p className="text-xs text-slate-500">
              Select a patient to write digital prescriptions, record clinical SOAP encounter notes, or chart FDI tooth conditions.
            </p>
          </div>

          {/* Sub-module switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('rx')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSubTab === 'rx'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-3.5 h-3.5 text-teal-600" />
              e-Prescriptions (Rx)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('soap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSubTab === 'soap'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              SOAP Clinical Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('odontogram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSubTab === 'odontogram'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-teal-600" />
              FDI Odontogram
            </button>
          </div>
        </div>

        {/* Patient Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 items-center">
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter patient by name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedPatient?.id || ''}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.patientIdNumber}) — {p.gender}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            {selectedPatient && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">
                    {selectedPatient.fullName}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                    <Phone className="w-3 h-3" />
                    {selectedPatient.phone}
                  </span>
                </div>
                {(selectedPatient.allergies || selectedPatient.medicalAlerts) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 truncate">
                    <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                    {selectedPatient.allergies || selectedPatient.medicalAlerts}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Patient Workspace */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading clinical workspace...
        </div>
      ) : !selectedPatient ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
          No patient selected or registered. Please register a patient first.
        </div>
      ) : (
        <div>
          {activeSubTab === 'rx' && <PrescriptionManager patient={selectedPatient} />}
          {activeSubTab === 'soap' && <ClinicalNotesManager patient={selectedPatient} />}
          {activeSubTab === 'odontogram' && <Odontogram patient={selectedPatient} />}
        </div>
      )}
    </div>
  );
};
