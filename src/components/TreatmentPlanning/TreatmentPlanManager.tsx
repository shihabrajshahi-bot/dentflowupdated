import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { TreatmentPlan, TreatmentPlanStatus, Patient } from '../../types/dental';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  Printer,
} from 'lucide-react';
import { ClinicalHandoverModal } from '../Patients/ClinicalHandoverModal';

interface TreatmentPlanManagerProps {
  patient?: Patient;
  onConvertSuccess?: () => void;
}

export const TreatmentPlanManager: React.FC<TreatmentPlanManagerProps> = ({ patient }) => {
  const { clinic, userProfile, hasPermission } = useAuth();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState(patient?.id || '');
  const [title, setTitle] = useState('');
  const [affectedTeeth, setAffectedTeeth] = useState('');
  const [procedures, setProcedures] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [estimatedCost, setEstimatedCost] = useState<number>(3500);
  const [phases, setPhases] = useState('Phase 1: Urgent disease control / hygiene\nPhase 2: Definitive restoration & crown');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canEdit = hasPermission(['Owner', 'Dentist']);
  const canBill = hasPermission(['Owner', 'Dentist', 'Receptionist', 'Cashier']);
  const currencySymbol = clinic?.currencySymbol || '৳';

  useEffect(() => {
    if (!clinic?.id) return;
    setLoading(true);

    const path = `clinics/${clinic.id}/treatment_plans`;
    let q = query(collection(db, 'clinics', clinic.id, 'treatment_plans'));
    if (patient?.id) {
      q = query(
        collection(db, 'clinics', clinic.id, 'treatment_plans'),
        where('patientId', '==', patient.id)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TreatmentPlan[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as TreatmentPlan);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPlans(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    let unsubPatients = () => {};
    if (!patient) {
      unsubPatients = onSnapshot(
        collection(db, 'clinics', clinic.id, 'patients'),
        (snap) => {
          const pList: Patient[] = [];
          snap.forEach((d) => pList.push({ id: d.id, ...d.data() } as Patient));
          setPatients(pList);
          if (pList.length > 0 && !selectedPatientId) {
            setSelectedPatientId(pList[0].id);
          }
        },
        () => {}
      );
    }

    return () => {
      unsubscribe();
      unsubPatients();
    };
  }, [clinic?.id, patient?.id]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !clinic) return;
    setIsSubmitting(true);
    setFeedback(null);

    const targetPatient =
      patient || patients.find((p) => p.id === selectedPatientId || p.patientIdNumber === selectedPatientId);
    const resolvedPatientId = targetPatient?.id || selectedPatientId || 'general';
    const resolvedPatientName = targetPatient?.fullName || 'General Plan';

    const path = `clinics/${clinic.id}/treatment_plans`;
    try {
      const newPlan: Omit<TreatmentPlan, 'id'> = {
        clinicId: clinic.id,
        patientId: resolvedPatientId,
        patientName: resolvedPatientName,
        title: title.trim(),
        affectedTeeth: affectedTeeth.trim(),
        procedures: procedures.trim(),
        priority,
        estimatedCost: Number(estimatedCost),
        phases: phases.trim(),
        status: 'Planned',
        notes: notes.trim(),
        dentistId: userProfile?.uid || 'dentist-uid',
        dentistName: userProfile?.displayName || 'Lead Dentist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'clinics', clinic.id, 'treatment_plans'), {
        ...newPlan,
        _serverTimestamp: serverTimestamp(),
      });

      setIsModalOpen(false);
      setTitle('');
      setAffectedTeeth('');
      setProcedures('');
      setNotes('');
      setFeedback('Treatment plan created successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (planId: string, status: TreatmentPlanStatus) => {
    if (!canEdit || !clinic) return;
    const path = `clinics/${clinic.id}/treatment_plans/${planId}`;
    try {
      await updateDoc(doc(db, 'clinics', clinic.id, 'treatment_plans', planId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleConvertToInvoice = async (plan: TreatmentPlan) => {
    if (!canBill || !clinic) return;
    const path = `clinics/${clinic.id}/invoices`;
    try {
      const subtotal = Number(plan.estimatedCost) || 0;
      const taxRate = Number(clinic.taxRate) || 0;
      const tax = Math.round((subtotal * taxRate) / 100);
      const total = subtotal + tax;
      const invoiceNumber = `${clinic.invoicePrefix || 'ADC'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const todayStr = new Date().toISOString().split('T')[0];
      const dueStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      await addDoc(collection(db, 'clinics', clinic.id, 'invoices'), {
        clinicId: clinic.id,
        patientId: plan.patientId,
        patientName: plan.patientName,
        invoiceNumber,
        issueDate: todayStr,
        dueDate: dueStr,
        items: [
          {
            id: '1',
            description: `${plan.title}${plan.affectedTeeth ? ` (Teeth #${plan.affectedTeeth})` : ''}`,
            quantity: 1,
            unitPrice: subtotal,
            total: subtotal,
          },
        ],
        subtotal,
        discount: 0,
        tax,
        total,
        paidAmount: 0,
        balance: total,
        status: 'Issued',
        notes: `Generated from accepted Treatment Plan: ${plan.title}`,
        createdBy: userProfile?.uid || 'staff',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setFeedback(`Invoice ${invoiceNumber} (${currencySymbol} ${total.toLocaleString()}) generated in Invoices & Payments!`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!canEdit || !clinic) return;
    const path = `clinics/${clinic.id}/treatment_plans/${planId}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinic.id, 'treatment_plans', planId));
      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            Treatment Proposals & Sequencing
          </h3>
          <p className="text-xs text-slate-500">
            {patient ? `Comprehensive dental care sequencing for ${patient.fullName}` : 'All clinic treatment plans & clinical care proposals'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {patient && (
            <button
              type="button"
              onClick={() => setIsHandoverOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Generate print-optimized clinical handover summary"
            >
              <Printer className="w-4 h-4 text-teal-600" />
              <span>Clinical Handover</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Treatment Plan
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Plan list */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading treatment plans...</div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No treatment plans documented yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Create structured care plans with phased procedures, affected teeth, and estimated costs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        plan.priority === 'Urgent'
                          ? 'bg-red-100 text-red-700'
                          : plan.priority === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {plan.priority} Priority
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{plan.title}</h4>
                    {!patient && (
                      <p className="text-xs text-teal-700 font-medium">Patient: {plan.patientName}</p>
                    )}
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      plan.status === 'Accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : plan.status === 'In Progress'
                        ? 'bg-sky-100 text-sky-800'
                        : plan.status === 'Completed'
                        ? 'bg-indigo-100 text-indigo-800'
                        : plan.status === 'Declined'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-2 text-xs">
                  {plan.affectedTeeth && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="font-semibold text-slate-700">Teeth Involved:</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] font-bold text-slate-800">
                        {plan.affectedTeeth}
                      </span>
                    </div>
                  )}

                  {plan.procedures && (
                    <div className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="font-semibold block text-[11px] text-slate-500 uppercase tracking-wide mb-1">
                        Procedures
                      </span>
                      <p className="whitespace-pre-line leading-relaxed">{plan.procedures}</p>
                    </div>
                  )}

                  {plan.phases && (
                    <div className="text-slate-600 bg-teal-50/40 p-2.5 rounded-lg border border-teal-100/60">
                      <span className="font-semibold block text-[11px] text-teal-800 uppercase tracking-wide mb-1">
                        Sequenced Phases
                      </span>
                      <p className="whitespace-pre-line leading-relaxed text-[11px]">{plan.phases}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">Estimated Cost:</span>
                    <span className="font-bold text-base text-slate-900">
                      {currencySymbol} {plan.estimatedCost?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {canEdit && plan.status === 'Planned' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(plan.id, 'Accepted')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Mark Accepted
                    </button>
                  )}
                  {canEdit && plan.status === 'Accepted' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(plan.id, 'In Progress')}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Start Treatment
                    </button>
                  )}
                  {canEdit && plan.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(plan.id, 'Completed')}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  )}
                  {canBill &&
                    (plan.status === 'Accepted' ||
                      plan.status === 'In Progress' ||
                      plan.status === 'Completed') && (
                      <button
                        type="button"
                        onClick={() => handleConvertToInvoice(plan)}
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <DollarSign className="w-3 h-3" />
                        Generate Invoice
                      </button>
                    )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    {confirmDeleteId === plan.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <span className="text-[10px] text-rose-700 font-semibold">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
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
                        onClick={() => setConfirmDeleteId(plan.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 text-xs transition-colors cursor-pointer"
                        title="Delete plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Treatment Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">New Treatment Plan Proposal</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4 overflow-y-auto text-xs">
              {!patient && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.patientIdNumber}) — {p.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Title / Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full Mouth Rehabilitation & Anterior Aesthetics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Affected Teeth (FDI numbers)</label>
                  <input
                    type="text"
                    placeholder="e.g. 11, 12, 21, 22 or 36, 37"
                    value={affectedTeeth}
                    onChange={(e) => setAffectedTeeth(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Low">Low (Maintenance)</option>
                    <option value="Medium">Medium (Routine)</option>
                    <option value="High">High (Active progression)</option>
                    <option value="Urgent">Urgent (Pain / Infection)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proposed Clinical Procedures *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="1. Endodontic root canal therapy&#10;2. Post and core build-up&#10;3. Monolithic Zirconia crown delivery"
                  value={procedures}
                  onChange={(e) => setProcedures(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sequencing Phases</label>
                <textarea
                  rows={2}
                  placeholder="Phase 1: Pain relief & Caries excavation&#10;Phase 2: Definitive prosthetic restoration"
                  value={phases}
                  onChange={(e) => setPhases(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estimated Total Fee ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving Plan...' : 'Create Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinical Handover Summary Modal */}
      {patient && isHandoverOpen && (
        <ClinicalHandoverModal
          patient={patient}
          isOpen={isHandoverOpen}
          onClose={() => setIsHandoverOpen(false)}
        />
      )}
    </div>
  );
};
