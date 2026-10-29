import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { DentalChartEntry, ToothCondition, ToothSurface, Patient } from '../../types/dental';
import { ToothSvg } from './ToothSvg';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  History,
  Info,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface OdontogramProps {
  patient: Patient;
  onPlanCreated?: () => void;
}

export const Odontogram: React.FC<OdontogramProps> = ({ patient }) => {
  const { userProfile, activeRole, hasPermission } = useAuth();
  const [dentitionType, setDentitionType] = useState<'permanent' | 'primary'>('permanent');
  const [selectedTooth, setSelectedTooth] = useState<number>(11);
  const [chartEntries, setChartEntries] = useState<DentalChartEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for documenting finding
  const [condition, setCondition] = useState<ToothCondition>('Caries');
  const [surface, setSurface] = useState<ToothSurface>('O');
  const [procedureStatus, setProcedureStatus] = useState<'existing' | 'planned' | 'completed'>('planned');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const canEditChart = hasPermission(['Owner', 'Dentist']);

  // Quadrants definition for Permanent
  const maxillaRightPerm = [18, 17, 16, 15, 14, 13, 12, 11];
  const maxillaLeftPerm = [21, 22, 23, 24, 25, 26, 27, 28];
  const mandibleRightPerm = [48, 47, 46, 45, 44, 43, 42, 41];
  const mandibleLeftPerm = [31, 32, 33, 34, 35, 36, 37, 38];

  // Quadrants definition for Primary
  const maxillaRightPrim = [55, 54, 53, 52, 51];
  const maxillaLeftPrim = [61, 62, 63, 64, 65];
  const mandibleRightPrim = [85, 84, 83, 82, 81];
  const mandibleLeftPrim = [71, 72, 73, 74, 75];

  // Real-time listener for this patient's dental chart findings
  useEffect(() => {
    if (!patient?.id || !patient?.clinicId) return;
    setLoading(true);

    const path = `clinics/${patient.clinicId}/dental_charts`;
    const q = query(
      collection(db, 'clinics', patient.clinicId, 'dental_charts'),
      where('patientId', '==', patient.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries: DentalChartEntry[] = [];
        snapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() } as DentalChartEntry);
        });
        setChartEntries(entries);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [patient?.id, patient?.clinicId]);

  // Find findings for the selected tooth
  const selectedToothEntries = chartEntries.filter(
    (e) => e.toothNumber === selectedTooth
  );

  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditChart) return;
    setIsSubmitting(true);
    setFeedbackMsg(null);

    const path = `clinics/${patient.clinicId}/dental_charts`;
    try {
      const newEntry: Omit<DentalChartEntry, 'id'> = {
        clinicId: patient.clinicId,
        patientId: patient.id,
        toothNumber: selectedTooth,
        toothType: dentitionType,
        surface: surface || 'General',
        condition,
        procedureStatus,
        notes: notes.trim(),
        examinedBy: userProfile?.displayName || 'Dr. Shihab (Lead Dental Surgeon)',
        examinedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'clinics', patient.clinicId, 'dental_charts'), {
        ...newEntry,
        _serverTimestamp: serverTimestamp(),
      });

      setNotes('');
      setFeedbackMsg(`Tooth #${selectedTooth} finding logged successfully.`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFinding = async (id: string) => {
    if (!canEditChart) return;
    if (!window.confirm('Are you sure you want to remove this charted clinical entry?')) return;
    const path = `clinics/${patient.clinicId}/dental_charts/${id}`;
    try {
      await deleteDoc(doc(db, 'clinics', patient.clinicId, 'dental_charts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Header & Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              Interactive Odontogram (FDI Two-Digit System)
            </h3>
            <span className="text-xs bg-teal-100 text-teal-800 font-medium px-2 py-0.5 rounded-full">
              ISO 3950 / FDI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any tooth to review documented pathology, treatments, or register clinical observations.
          </p>
        </div>

        {/* Dentition Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setDentitionType('permanent')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              dentitionType === 'permanent'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Permanent (Adult: 32)
          </button>
          <button
            type="button"
            onClick={() => setDentitionType('primary')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              dentitionType === 'primary'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Deciduous (Pediatric: 20)
          </button>
        </div>
      </div>

      {/* Visual Chart Canvas */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="min-w-[760px] flex flex-col items-center">
          {/* Anatomical Orientation Guide */}
          <div className="w-full flex justify-between px-6 mb-3 text-xs font-bold text-slate-400 tracking-wider">
            <span>RIGHT (Patient Right)</span>
            <span className="text-teal-700 bg-teal-50 px-3 py-0.5 rounded-full font-semibold">MAXILLARY ARCH (UPPER)</span>
            <span>LEFT (Patient Left)</span>
          </div>

          {/* Upper Jaw (Maxillary) */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2 pb-4 border-b border-slate-100 w-full">
            {/* Upper Right Quadrant */}
            <div className="flex gap-1 justify-end">
              {(dentitionType === 'permanent' ? maxillaRightPerm : maxillaRightPrim).map((t) => (
                <ToothSvg
                  key={t}
                  toothNumber={t}
                  toothType={dentitionType}
                  entries={chartEntries.filter((e) => e.toothNumber === t)}
                  isSelected={selectedTooth === t}
                  onSelect={setSelectedTooth}
                />
              ))}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-teal-300 mx-1 flex flex-col justify-between items-center py-1">
              <span className="text-[9px] font-bold text-teal-600">▲</span>
            </div>

            {/* Upper Left Quadrant */}
            <div className="flex gap-1 justify-start">
              {(dentitionType === 'permanent' ? maxillaLeftPerm : maxillaLeftPrim).map((t) => (
                <ToothSvg
                  key={t}
                  toothNumber={t}
                  toothType={dentitionType}
                  entries={chartEntries.filter((e) => e.toothNumber === t)}
                  isSelected={selectedTooth === t}
                  onSelect={setSelectedTooth}
                />
              ))}
            </div>
          </div>

          {/* Lower Jaw (Mandibular) */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 pt-2 w-full">
            {/* Lower Right Quadrant */}
            <div className="flex gap-1 justify-end">
              {(dentitionType === 'permanent' ? mandibleRightPerm : mandibleRightPrim).map((t) => (
                <ToothSvg
                  key={t}
                  toothNumber={t}
                  toothType={dentitionType}
                  entries={chartEntries.filter((e) => e.toothNumber === t)}
                  isSelected={selectedTooth === t}
                  onSelect={setSelectedTooth}
                />
              ))}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-teal-300 mx-1 flex flex-col justify-between items-center py-1">
              <span className="text-[9px] font-bold text-teal-600">▼</span>
            </div>

            {/* Lower Left Quadrant */}
            <div className="flex gap-1 justify-start">
              {(dentitionType === 'permanent' ? mandibleLeftPerm : mandibleLeftPrim).map((t) => (
                <ToothSvg
                  key={t}
                  toothNumber={t}
                  toothType={dentitionType}
                  entries={chartEntries.filter((e) => e.toothNumber === t)}
                  isSelected={selectedTooth === t}
                  onSelect={setSelectedTooth}
                />
              ))}
            </div>
          </div>

          <div className="w-full flex justify-between px-6 mt-3 text-xs font-bold text-slate-400 tracking-wider">
            <span>RIGHT</span>
            <span className="text-teal-700 bg-teal-50 px-3 py-0.5 rounded-full font-semibold">MANDIBULAR ARCH (LOWER)</span>
            <span>LEFT</span>
          </div>
        </div>

        {/* Color Legend */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-slate-300 bg-white inline-block"></span>
            <span className="text-slate-600 font-medium">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-red-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Caries / Cavity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-sky-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Filling / Composite</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Crown / Bridge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-orange-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Root Canal (RCT)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-purple-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Implant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 inline-block"></span>
            <span className="text-slate-600 font-medium">Extraction</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-300 inline-block line-through text-red-600 font-bold text-center leading-3">✕</span>
            <span className="text-slate-600 font-medium">Missing</span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-[11px] text-slate-400">Dash border = Planned</span>
            <span className="text-[11px] text-slate-400">Solid = Existing</span>
          </div>
        </div>
      </div>

      {/* Selected Tooth Detail & Diagnostic Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Tooth Overview & Documented Findings */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs uppercase font-bold text-teal-600">Selected Tooth</span>
              <h4 className="text-xl font-bold text-slate-800">FDI Tooth #{selectedTooth}</h4>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-700">
              #{selectedTooth}
            </div>
          </div>

          <div className="mt-4 flex-1">
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Charted History ({selectedToothEntries.length})
            </h5>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading clinical chart...</div>
            ) : selectedToothEntries.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 p-4">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-medium">No recorded pathologies.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tooth is currently considered healthy.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {selectedToothEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 relative group text-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            entry.condition === 'Caries'
                              ? 'bg-red-100 text-red-700'
                              : entry.condition === 'Filling'
                              ? 'bg-blue-100 text-blue-700'
                              : entry.condition === 'Crown'
                              ? 'bg-amber-100 text-amber-800'
                              : entry.condition === 'Root Canal'
                              ? 'bg-orange-100 text-orange-800'
                              : entry.condition === 'Implant'
                              ? 'bg-purple-100 text-purple-800'
                              : entry.condition === 'Missing'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {entry.condition}
                        </span>
                        <span className="text-slate-500 font-medium">
                          Surface: {entry.surface || 'All'}
                        </span>
                      </div>

                      {canEditChart && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFinding(entry.id)}
                          className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity p-1"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="capitalize font-medium text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Status: {entry.procedureStatus}
                      </span>
                      <span>•</span>
                      <span>{entry.examinedDate}</span>
                    </div>

                    {entry.notes && (
                      <p className="mt-1.5 text-slate-600 bg-white p-2 rounded border border-slate-200/80 text-[11px]">
                        "{entry.notes}"
                      </p>
                    )}

                    <div className="mt-1.5 text-[10px] text-slate-400 text-right">
                      Logged by {entry.examinedBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Clinical Finding Entry Form */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Document Finding / Procedure on Tooth #{selectedTooth}
              </h4>
              <p className="text-xs text-slate-500">
                Log diagnostic condition, restorative surface, or planned treatment.
              </p>
            </div>
            {!canEditChart && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
                Read Only (Dentist or Owner authorization required)
              </span>
            )}
          </div>

          {feedbackMsg && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddFinding} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Condition *
                </label>
                <select
                  disabled={!canEditChart}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ToothCondition)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Healthy">Healthy (Sound tooth)</option>
                  <option value="Caries">Caries / Cavity</option>
                  <option value="Filling">Filling / Restoration</option>
                  <option value="Crown">Crown / Bridge</option>
                  <option value="Root Canal">Root Canal Therapy (RCT)</option>
                  <option value="Implant">Dental Implant</option>
                  <option value="Missing">Missing / Unerupted</option>
                  <option value="Extraction">Extraction Needed</option>
                  <option value="Periodontal">Periodontal Pocket / Mobility</option>
                  <option value="Other">Other / Fracture</option>
                </select>
              </div>

              {/* Surface */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Surface / Location
                </label>
                <select
                  disabled={!canEditChart}
                  value={surface}
                  onChange={(e) => setSurface(e.target.value as ToothSurface)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="O">Occlusal (O)</option>
                  <option value="M">Mesial (M)</option>
                  <option value="D">Distal (D)</option>
                  <option value="B">Buccal / Facial (B)</option>
                  <option value="L">Lingual / Palatal (L)</option>
                  <option value="I">Incisal Edge (I)</option>
                  <option value="MO">Mesio-Occlusal (MO)</option>
                  <option value="DO">Disto-Occlusal (DO)</option>
                  <option value="MOD">MOD Complex</option>
                  <option value="All">Full Crown / Whole Tooth</option>
                </select>
              </div>

              {/* Procedure Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Procedure Stage *
                </label>
                <select
                  disabled={!canEditChart}
                  value={procedureStatus}
                  onChange={(e) =>
                    setProcedureStatus(e.target.value as 'existing' | 'planned' | 'completed')
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="planned">Planned (Requires Treatment)</option>
                  <option value="existing">Existing (Prior Work / Present)</option>
                  <option value="completed">Completed Today</option>
                </select>
              </div>
            </div>

            {/* Clinical Annotation Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Annotation & Prognosis
              </label>
              <textarea
                disabled={!canEditChart}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Deep dentinal caries approaching pulp chamber, mild sensitivity on percussion, recommend composite or RCT..."
                rows={3}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Examiner: <span className="font-semibold text-slate-700">{userProfile?.displayName || 'Dentist'}</span> ({activeRole})
              </div>

              <button
                type="submit"
                disabled={!canEditChart || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? 'Saving to Record...' : 'Record Finding in Chart'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
