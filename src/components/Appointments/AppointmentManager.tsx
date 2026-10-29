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
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { Appointment, AppointmentStatus, Patient } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CalendarDays,
  List,
  Search,
} from 'lucide-react';
import { formatClinicDate } from '../../utils/dateFormatter';

interface AppointmentManagerProps {
  patientIdFilter?: string;
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({ patientIdFilter }) => {
  const { clinic, userProfile, activeRole, hasPermission } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // View modes: list, day, week, month
  const [viewMode, setViewMode] = useState<'list' | 'day' | 'week'>('list');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New appointment form states
  const [patientId, setPatientId] = useState('');
  const [dentistName, setDentistName] = useState(userProfile?.displayName || 'Dr. Shihab');
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [type, setType] = useState('Consultation & Examination');
  const [reason, setReason] = useState('');
  const [room, setRoom] = useState('Operatory 1 (General)');
  const [notes, setNotes] = useState('');

  const canSchedule = hasPermission(['Owner', 'Receptionist']);
  const canUpdateStatus = hasPermission(['Owner', 'Dentist', 'Receptionist']);
  const canDelete = hasPermission(['Owner']);
  const isDentistRole = activeRole === 'Dentist';
  const [dentistAssignmentFilter, setDentistAssignmentFilter] = useState<'all' | 'mine'>(
    isDentistRole ? 'mine' : 'all'
  );

  // Fetch appointments in real-time
  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    setLoading(true);
    const path = `clinics/${clinicId}/appointments`;

    let q = query(collection(db, 'clinics', clinicId, 'appointments'));
    if (patientIdFilter) {
      q = query(
        collection(db, 'clinics', clinicId, 'appointments'),
        where('patientId', '==', patientIdFilter)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Appointment[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Appointment);
        });
        // Sort by date and startTime
        list.sort((a, b) => {
          const dateComp = a.date.localeCompare(b.date);
          if (dateComp !== 0) return dateComp;
          return a.startTime.localeCompare(b.startTime);
        });
        setAppointments(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    // Fetch patients list for booking dropdown
    const fetchPatients = async () => {
      try {
        const pSnap = await getDocs(collection(db, 'clinics', clinicId, 'patients'));
        const pList: Patient[] = [];
        pSnap.forEach((d) => pList.push({ id: d.id, ...d.data() } as Patient));
        setPatients(pList);
        if (pList.length > 0 && !patientId) {
          setPatientId(patientIdFilter || pList[0].id);
        }
      } catch (e) {
        console.warn('Patients fetch warning:', e);
      }
    };
    fetchPatients();

    return () => unsubscribe();
  }, [clinic?.id, patientIdFilter]);

  // Compute end time based on startTime + duration
  const calculateEndTime = (start: string, duration: number): string => {
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  // Double booking check algorithm
  const checkDoubleBooking = (
    dateStr: string,
    startStr: string,
    endStr: string,
    operatoryRoom: string,
    dentist: string,
    excludeId?: string
  ): boolean => {
    return appointments.some((a) => {
      if (excludeId && a.id === excludeId) return false;
      if (a.date !== dateStr) return false;
      if (a.status === 'Cancelled' || a.status === 'No Show') return false;

      // Check time overlap: (StartA < EndB) and (EndA > StartB)
      const overlaps = a.startTime < endStr && a.endTime > startStr;
      if (overlaps) {
        // If same dentist or same treatment room, conflict exists!
        if (a.dentistName === dentist || a.room === operatoryRoom) {
          return true;
        }
      }
      return false;
    });
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule) return;

    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const path = `clinics/${clinicId}/appointments`;
    const endTime = calculateEndTime(startTime, durationMinutes);

    // Double booking verification
    const hasConflict = checkDoubleBooking(apptDate, startTime, endTime, room, dentistName);
    if (hasConflict) {
      setConflictWarning(
        `Scheduling Conflict: Either ${dentistName} or ${room} is already booked during ${startTime} - ${endTime} on ${apptDate}. Please select another time or room.`
      );
      return;
    }

    setSubmitting(true);
    setConflictWarning(null);

    const selectedPatient = patients.find((p) => p.id === patientId);

    try {
      const newAppt: Omit<Appointment, 'id'> = {
        clinicId,
        patientId,
        patientName: selectedPatient?.fullName || 'Walk-in Patient',
        patientPhone: selectedPatient?.phone,
        dentistId: userProfile?.uid || 'dentist-uid',
        dentistName,
        date: apptDate,
        startTime,
        endTime,
        durationMinutes,
        type,
        reason: reason.trim(),
        status: 'Scheduled',
        room,
        notes: notes.trim(),
        createdBy: userProfile?.displayName || 'Reception Staff',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'clinics', clinicId, 'appointments'), {
        ...newAppt,
        _serverTimestamp: serverTimestamp(),
      });

      setIsModalOpen(false);
      setReason('');
      setNotes('');
      setFeedback('Appointment scheduled successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (apptId: string, newStatus: AppointmentStatus) => {
    if (!canUpdateStatus) return;
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const path = `clinics/${clinicId}/appointments/${apptId}`;
    try {
      await updateDoc(doc(db, 'clinics', clinicId, 'appointments', apptId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleDeleteAppointment = async (apptId: string) => {
    if (!canDelete) return;
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const path = `clinics/${clinicId}/appointments/${apptId}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinicId, 'appointments', apptId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Filtered appointment list
  const filteredAppointments = appointments.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.dentistName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = viewMode === 'list' ? true : a.date === selectedDate;
    const matchesDentist =
      dentistAssignmentFilter === 'all' ||
      a.dentistId === userProfile?.uid ||
      a.dentistName.toLowerCase().includes(userProfile?.displayName?.toLowerCase() || '') ||
      a.dentistName.toLowerCase().includes('ayesha') ||
      a.dentistName.toLowerCase().includes('dentist');
    return matchesStatus && matchesSearch && matchesDate && matchesDentist;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-teal-600" />
            Appointment Scheduling & Waiting Room
          </h3>
          <p className="text-xs text-slate-500">
            Real-time schedule, chair utilization, check-ins, and conflict prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Day View
            </button>
          </div>

          {canSchedule && (
            <button
              type="button"
              onClick={() => {
                setConflictWarning(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter and Date Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {viewMode !== 'list' && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent px-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient or dentist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Status:</span>
          {['all', 'Scheduled', 'Checked In', 'In Progress', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-teal-700 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List / Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading appointments...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No appointments found matching current filters.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click 'Book Appointment' to add a new visit.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Dentist & Room</th>
                  <th className="py-3 px-4">Procedure / Reason</th>
                  <th className="py-3 px-4">Status Pipeline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{formatClinicDate(appt.date)}</div>
                      <div className="text-[11px] text-teal-700 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-teal-500" />
                        {appt.startTime} – {appt.endTime} ({appt.durationMinutes}m)
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{appt.patientName}</div>
                      {appt.patientPhone && (
                        <div className="text-[11px] text-slate-500">{appt.patientPhone}</div>
                      )}
                    </td>

                    {/* Dentist & Room */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{appt.dentistName}</div>
                      <div className="text-[11px] text-slate-500">{appt.room || 'General Chair'}</div>
                    </td>

                    {/* Procedure / Reason */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{appt.type}</div>
                      {appt.reason && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">"{appt.reason}"</div>
                      )}
                    </td>

                    {/* Status Pipeline */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        disabled={!canUpdateStatus}
                        value={appt.status}
                        onChange={(e) =>
                          handleStatusChange(appt.id, e.target.value as AppointmentStatus)
                        }
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors focus:outline-none ${
                          appt.status === 'Scheduled'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : appt.status === 'Confirmed'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : appt.status === 'Checked In'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/40'
                            : appt.status === 'In Progress'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : appt.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Checked In">Waiting / Checked In</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="No Show">No Show</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAppointment(appt.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-slate-100 transition-colors"
                          title="Delete appointment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-teal-600" />
                Schedule New Appointment
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4 overflow-y-auto text-xs">
              {conflictWarning && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-snug">{conflictWarning}</span>
                </div>
              )}

              {/* Patient select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {patients.length === 0 ? (
                    <option value="">No patients registered yet</option>
                  ) : (
                    patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.patientIdNumber}) - {p.phone}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Dentist select */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attending Clinician *</label>
                  <input
                    type="text"
                    required
                    value={dentistName}
                    onChange={(e) => setDentistName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operatory Room / Chair</label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Operatory 1 (General)">Operatory 1 (General)</option>
                    <option value="Operatory 2 (Surgery)">Operatory 2 (Surgery)</option>
                    <option value="Operatory 3 (Hygiene)">Operatory 3 (Hygiene)</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins (1h)</option>
                    <option value={90}>90 mins (1.5h)</option>
                  </select>
                </div>
              </div>

              {/* Type & Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Procedure / Visit Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Consultation & Examination">Consultation & Examination</option>
                  <option value="Scaling & Polishing">Scaling & Polishing</option>
                  <option value="Restorative Filling">Restorative Filling</option>
                  <option value="Root Canal Treatment">Root Canal Treatment</option>
                  <option value="Tooth Extraction">Tooth Extraction</option>
                  <option value="Crown / Bridge Prep">Crown / Bridge Prep</option>
                  <option value="Crown Delivery">Crown Delivery</option>
                  <option value="Orthodontic Adjustment">Orthodontic Adjustment</option>
                  <option value="Post-op Follow up">Post-op Follow up</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Presenting Chief Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Sharp pain on upper right tooth, sensitivity to cold"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Checking & Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
