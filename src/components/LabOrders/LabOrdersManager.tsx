import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { LabOrder, LabOrderStatus, Patient, ClinicExpense } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  FlaskConical,
  Plus,
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  Trash2,
  Search,
  Calendar,
  Receipt,
  User,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { formatClinicDate } from '../../utils/dateFormatter';

interface LabOrdersManagerProps {
  patient?: Patient;
}

const PROSTHESIS_TYPES: LabOrder['prosthesisType'][] = [
  'Zirconia Crown',
  'PFM Crown',
  'E-Max Veneer / Crown',
  'Fixed Partial Denture (Bridge)',
  'Implant Abutment & Crown',
  'Complete / Acrylic Denture',
  'Flexible RPD (Valplast)',
  'Night Guard / Occlusal Splint',
  'Clear Aligner / Retainer',
  'Surgical Guide',
];

const VITA_SHADES = [
  'A1 (VITA Classical)',
  'A2 (VITA Classical)',
  'A3 (VITA Classical)',
  'A3.5 (VITA Classical)',
  'B1 (VITA Classical)',
  'B2 (VITA Classical)',
  'C1 (VITA Classical)',
  'D2 (VITA Classical)',
  'OM1 / Bleach Shade',
  'Clear / Transparent (Splint/Aligner)',
  'Pink Acrylic (Gingival)',
];

export const LabOrdersManager: React.FC<LabOrdersManagerProps> = ({ patient }) => {
  const { clinic, userProfile, hasPermission } = useAuth();
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
  const currencySymbol = clinic?.currencySymbol || '৳';

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patient?.id || '');
  const [labName, setLabName] = useState('Apex Precision Dental Ceramics');
  const [prosthesisType, setProsthesisType] = useState<LabOrder['prosthesisType']>('Zirconia Crown');
  const [toothNumbers, setToothNumbers] = useState('');
  const [shade, setShade] = useState('A2 (VITA Classical)');
  const [sentDate, setSentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [cost, setCost] = useState<number>(4000);
  const [instructions, setInstructions] = useState('');
  const [autoRecordExpense, setAutoRecordExpense] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const canManage = hasPermission(['Owner', 'Dentist', 'Receptionist']);
  const canDelete = hasPermission(['Owner', 'Dentist']);

  useEffect(() => {
    setLoading(true);
    const labPath = `clinics/${clinicId}/lab_orders`;
    let q = query(collection(db, 'clinics', clinicId, 'lab_orders'));
    if (patient?.id) {
      q = query(
        collection(db, 'clinics', clinicId, 'lab_orders'),
        where('patientId', '==', patient.id)
      );
    }

    const unsubOrders = onSnapshot(
      q,
      (snap) => {
        const list: LabOrder[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as LabOrder);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, labPath);
      }
    );

    let unsubPatients = () => {};
    if (!patient) {
      unsubPatients = onSnapshot(
        collection(db, 'clinics', clinicId, 'patients'),
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
      unsubOrders();
      unsubPatients();
    };
  }, [clinicId, patient?.id]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    setFeedback(null);

    const targetPatient =
      patient || patients.find((p) => p.id === selectedPatientId || p.patientIdNumber === selectedPatientId);
    const resolvedPatientId = targetPatient?.id || selectedPatientId || 'walk-in';
    const resolvedPatientName = targetPatient?.fullName || 'Clinic Patient';

    const path = `clinics/${clinicId}/lab_orders`;
    try {
      const newOrder: Omit<LabOrder, 'id'> = {
        clinicId,
        patientId: resolvedPatientId,
        patientName: resolvedPatientName,
        dentistId: userProfile?.uid || 'dentist',
        dentistName: userProfile?.displayName || 'Lead Dental Surgeon',
        labName: labName.trim(),
        prosthesisType,
        toothNumbers: toothNumbers.trim() || 'Full Arch',
        shade,
        sentDate,
        dueDate,
        cost: Number(cost) || 0,
        status: 'Dispatched',
        instructions: instructions.trim(),
        expenseRecorded: autoRecordExpense && Number(cost) > 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'clinics', clinicId, 'lab_orders'), {
        ...newOrder,
        _serverTimestamp: serverTimestamp(),
      });

      // Optionally record lab fabrication fee in clinic expenses
      if (autoRecordExpense && Number(cost) > 0) {
        const expData: Omit<ClinicExpense, 'id'> = {
          clinicId,
          title: `Lab Order: ${prosthesisType} (Teeth #${newOrder.toothNumbers}) - ${resolvedPatientName}`,
          category: 'Dental Supplies & Lab',
          amount: Number(cost),
          date: sentDate,
          paymentMethod: 'Bank Transfer',
          referenceNumber: `LAB-${docRef.id.slice(0, 5).toUpperCase()}`,
          notes: `Vendor: ${labName.trim()} | Shade: ${shade}`,
          recordedBy: userProfile?.displayName || 'Dental Staff',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'clinics', clinicId, 'expenses'), expData);
      }

      setIsModalOpen(false);
      setToothNumbers('');
      setInstructions('');
      setFeedback(
        autoRecordExpense
          ? 'Dental lab work order dispatched and lab fee logged to Clinic Expenses.'
          : 'Dental lab work order created successfully.'
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: LabOrderStatus) => {
    if (!canManage) return;
    const path = `clinics/${clinicId}/lab_orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'clinics', clinicId, 'lab_orders', orderId), {
        status,
        updatedAt: new Date().toISOString(),
      });
      setFeedback(`Lab case updated to "${status}".`);
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleRecordExpenseLater = async (order: LabOrder) => {
    if (order.expenseRecorded || order.cost <= 0) return;
    try {
      const expData: Omit<ClinicExpense, 'id'> = {
        clinicId,
        title: `Lab Order: ${order.prosthesisType} (Teeth #${order.toothNumbers}) - ${order.patientName}`,
        category: 'Dental Supplies & Lab',
        amount: Number(order.cost),
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        referenceNumber: `LAB-${order.id.slice(0, 5).toUpperCase()}`,
        notes: `Vendor: ${order.labName} | Shade: ${order.shade}`,
        recordedBy: userProfile?.displayName || 'Dental Staff',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'clinics', clinicId, 'expenses'), expData);
      await updateDoc(doc(db, 'clinics', clinicId, 'lab_orders', order.id), {
        expenseRecorded: true,
        updatedAt: new Date().toISOString(),
      });
      setFeedback(`Lab fee of ${currencySymbol} ${order.cost.toLocaleString()} posted to Clinic Expenses.`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinicId}/lab_orders/${order.id}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!canDelete) return;
    const path = `clinics/${clinicId}/lab_orders/${orderId}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinicId, 'lab_orders', orderId));
      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      o.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.labName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.prosthesisType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.toothNumbers.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeCount = orders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled').length;
  const tryInReadyCount = orders.filter((o) => o.status === 'Try-In Ready').length;
  const overdueCount = orders.filter(
    (o) => o.status !== 'Completed' && o.status !== 'Cancelled' && o.dueDate < todayStr
  ).length;
  const totalLabSpend = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((acc, o) => acc + (Number(o.cost) || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600" />
            Dental Laboratory & Prosthodontics Tracker
          </h3>
          <p className="text-xs text-slate-500">
            {patient
              ? `Prosthetic crowns, bridges, aligners & VITA shade tracking for ${patient.fullName}`
              : 'Track external dental lab cases, VITA tooth shades, try-in readiness, and delivery schedules'}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Lab Work Order
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      {!patient && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Lab Cases
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{activeCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dispatched or in fabrication</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-teal-200 bg-teal-50/30 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Ready for Patient Try-In
            </div>
            <div className="text-2xl font-extrabold text-teal-800 mt-1">{tryInReadyCount}</div>
            <div className="text-[11px] text-teal-700 mt-0.5">Received from dental lab</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Due / Overdue Delivery
            </div>
            <div className="text-2xl font-extrabold text-amber-900 mt-1">{overdueCount}</div>
            <div className="text-[11px] text-amber-700 mt-0.5">Follow up with lab vendor</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Prosthetic Lab Fees
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {currencySymbol} {totalLabSpend.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Synced with practice P&L</div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, tooth #, prosthesis, or lab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto text-xs">
          {(['ALL', 'Dispatched', 'In Fabrication', 'Try-In Ready', 'Completed'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Cases' : st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Lab Orders List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading dental laboratory cases...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No dental lab work orders found.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Create a lab order to track crowns, bridges, VITA shades, and delivery dates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const isOverdue =
              order.status !== 'Completed' &&
              order.status !== 'Cancelled' &&
              order.dueDate < todayStr;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          {order.prosthesisType}
                        </span>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          Teeth #{order.toothNumbers}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        {order.patientName}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Lab Vendor: <strong className="text-slate-700">{order.labName}</strong> • Ordering Dentist: {order.dentistName}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        order.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Try-In Ready'
                          ? 'bg-teal-100 text-teal-800 border border-teal-300'
                          : order.status === 'In Fabrication'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Specs */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        VITA Shade
                      </span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Palette className="w-3 h-3 text-teal-600" />
                        {order.shade}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Dispatched
                      </span>
                      <span className="text-[11px] font-medium text-slate-700 mt-0.5 block">
                        {formatClinicDate(order.sentDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Due Back
                      </span>
                      <span
                        className={`text-[11px] font-bold mt-0.5 block ${
                          isOverdue ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {formatClinicDate(order.dueDate)}
                      </span>
                    </div>
                  </div>

                  {order.instructions && (
                    <p className="mt-2.5 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                      <strong className="text-slate-700">Lab Rx Notes:</strong> {order.instructions}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Lab Fabrication Fee:</span>
                      <span className="font-bold text-slate-900">
                        {currencySymbol} {Number(order.cost || 0).toLocaleString()}
                      </span>
                    </div>
                    {order.expenseRecorded ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Logged in Clinic Expenses
                      </span>
                    ) : (
                      canManage &&
                      order.cost > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRecordExpenseLater(order)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          Post Fee to Expenses
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Status workflow actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {canManage && order.status === 'Dispatched' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'In Fabrication')}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Mark In Fabrication
                      </button>
                    )}
                    {canManage &&
                      (order.status === 'Dispatched' || order.status === 'In Fabrication') && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order.id, 'Try-In Ready')}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Mark Received (Try-In Ready)
                        </button>
                      )}
                    {canManage && order.status === 'Try-In Ready' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'Completed')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Cemented / Fitted to Patient
                      </button>
                    )}
                  </div>

                  {canDelete && (
                    <div className="flex items-center gap-1">
                      {confirmDeleteId === order.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <span className="text-[10px] text-rose-700 font-semibold">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id)}
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
                          onClick={() => setConfirmDeleteId(order.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 text-xs transition-colors cursor-pointer"
                          title="Delete lab order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Lab Work Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  New Dental Lab & Prosthodontics Work Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 overflow-y-auto text-xs">
              {!patient && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Patient *
                  </label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prosthesis / Restoration Type *
                  </label>
                  <select
                    value={prosthesisType}
                    onChange={(e) =>
                      setProsthesisType(e.target.value as LabOrder['prosthesisType'])
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {PROSTHESIS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dental Laboratory Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    placeholder="e.g. Apex Precision Dental Ceramics"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tooth Number(s) (FDI Notation) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11, 21 or 36-38 Bridge"
                    value={toothNumbers}
                    onChange={(e) => setToothNumbers(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tooth Shade Guide (VITA) *
                  </label>
                  <select
                    value={shade}
                    onChange={(e) => setShade(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {VITA_SHADES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dispatch Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={sentDate}
                    onChange={(e) => setSentDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lab Cost ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Occlusal / Margin & Lab Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Chamfer margin, glazed zirconia occlusal surface, sanitary pontic design..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-lg bg-teal-50/60 border border-teal-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRecordExpense}
                  onChange={(e) => setAutoRecordExpense(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-700 font-medium">
                  Automatically record lab fabrication fee ({currencySymbol}{' '}
                  {Number(cost || 0).toLocaleString()}) in Clinic Expenses & P&L Ledger
                </span>
              </label>

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
                  {isSubmitting ? 'Dispatching...' : 'Dispatch Lab Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
