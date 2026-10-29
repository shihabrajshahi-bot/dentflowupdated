import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { DentalService } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  Stethoscope,
  Plus,
  Trash2,
  Edit2,
  Clock,
  DollarSign,
  Tag,
  CheckCircle2,
} from 'lucide-react';

export const ServicesCatalog: React.FC = () => {
  const { clinic, hasPermission } = useAuth();
  const [services, setServices] = useState<DentalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DentalService | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Restorative');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(2000);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = hasPermission(['Owner', 'Dentist']);
  const currencySymbol = clinic?.currencySymbol || '৳';

  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    setLoading(true);
    const path = `clinics/${clinicId}/services`;

    const q = query(collection(db, 'clinics', clinicId, 'services'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DentalService[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as DentalService);
        });
        list.sort((a, b) => a.category.localeCompare(b.category));
        setServices(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [clinic?.id]);

  const handleOpenNew = () => {
    setEditingService(null);
    setName('');
    setCode('D');
    setCategory('Restorative');
    setDescription('');
    setPrice(2000);
    setDurationMinutes(30);
    setIsModalOpen(true);
  };

  const handleEdit = (s: DentalService) => {
    setEditingService(s);
    setName(s.name);
    setCode(s.code);
    setCategory(s.category);
    setDescription(s.description || '');
    setPrice(s.price);
    setDurationMinutes(s.durationMinutes || 30);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !clinic) return;
    setSubmitting(true);

    const clinicId = clinic.id;
    const path = `clinics/${clinicId}/services`;

    try {
      if (editingService) {
        await updateDoc(doc(db, 'clinics', clinicId, 'services', editingService.id), {
          name: name.trim(),
          code: code.trim(),
          category,
          description: description.trim(),
          price: Number(price),
          durationMinutes: Number(durationMinutes),
        });
      } else {
        const newSrv: Omit<DentalService, 'id'> = {
          clinicId,
          name: name.trim(),
          code: code.trim(),
          category,
          description: description.trim(),
          price: Number(price),
          durationMinutes: Number(durationMinutes),
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'clinics', clinicId, 'services'), newSrv);
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingService ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit || !clinic) return;
    if (!window.confirm('Delete this clinical procedure?')) return;
    const path = `clinics/${clinic.id}/services/${id}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinic.id, 'services', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            Dental Procedures & Fee Catalog
          </h3>
          <p className="text-xs text-slate-500">
            Standard clinical services, CDT procedure codes, chair durations, and clinic price list.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Procedure
          </button>
        )}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading service catalog...
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <Stethoscope className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No procedures configured yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click 'Add Procedure' to define procedures and prices.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((srv) => (
            <div
              key={srv.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
                    {srv.category}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">{srv.code}</span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm mt-2">{srv.name}</h4>
                {srv.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{srv.description}</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {srv.durationMinutes || 30} mins chair time
                  </div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {currencySymbol} {srv.price.toLocaleString()}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(srv)}
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
                      title="Edit procedure"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(srv.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                      title="Delete procedure"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingService ? 'Edit Dental Procedure' : 'New Dental Procedure'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Procedure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tooth Extraction (Surgical)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Procedure / CDT Code</label>
                  <input
                    type="text"
                    placeholder="e.g. D7210"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Preventative">Preventative</option>
                    <option value="Restorative">Restorative</option>
                    <option value="Endodontics">Endodontics</option>
                    <option value="Oral Surgery">Oral Surgery</option>
                    <option value="Prosthodontics">Prosthodontics</option>
                    <option value="Implantology">Implantology</option>
                    <option value="Periodontics">Periodontics</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Orthodontics">Orthodontics</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Standard Charge ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins (1h)</option>
                    <option value={90}>90 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Procedure Notes</label>
                <textarea
                  rows={2}
                  placeholder="Clinical notes or description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  {submitting ? 'Saving...' : 'Save Procedure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
