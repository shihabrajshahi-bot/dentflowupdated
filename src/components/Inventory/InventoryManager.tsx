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
import { InventoryItem } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Search,
  Boxes,
  TrendingDown,
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const { clinic, activeRole, hasPermission } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'expiring'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Anesthetics');
  const [quantity, setQuantity] = useState<number>(20);
  const [unit, setUnit] = useState('Cartridge');
  const [purchaseCost, setPurchaseCost] = useState<number>(85);
  const [supplier, setSupplier] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [reorderThreshold, setReorderThreshold] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = activeRole === 'Owner';
  const canEdit = isOwner; // Full management for Owner
  const canAdjustStock = hasPermission(['Owner', 'Dentist']); // View/use as allowed for Dentist & Owner
  const currencySymbol = clinic?.currencySymbol || '৳';

  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    setLoading(true);
    const path = `clinics/${clinicId}/inventory`;

    const q = query(collection(db, 'clinics', clinicId, 'inventory'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: InventoryItem[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as InventoryItem);
        });
        setItems(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [clinic?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !clinic) return;
    setSubmitting(true);

    const clinicId = clinic.id;
    const path = `clinics/${clinicId}/inventory`;

    const status =
      quantity <= 0
        ? 'Out of Stock'
        : quantity <= reorderThreshold
        ? 'Low Stock'
        : 'In Stock';

    try {
      const newItem: Omit<InventoryItem, 'id'> = {
        clinicId,
        name: name.trim(),
        category,
        quantity: Number(quantity),
        unit: unit.trim(),
        purchaseCost: Number(purchaseCost),
        supplier: supplier.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        reorderThreshold: Number(reorderThreshold),
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, clinicId ? `clinics/${clinicId}/inventory` : 'inventory'), newItem);

      setIsModalOpen(false);
      setName('');
      setSupplier('');
      setBatchNumber('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustQuantity = async (item: InventoryItem, delta: number) => {
    if (!canAdjustStock || !clinic) return;
    const newQty = Math.max(0, item.quantity + delta);
    const status =
      newQty <= 0
        ? 'Out of Stock'
        : newQty <= item.reorderThreshold
        ? 'Low Stock'
        : 'In Stock';

    const path = `clinics/${clinic.id}/inventory/${item.id}`;
    try {
      await updateDoc(doc(db, 'clinics', clinic.id, 'inventory', item.id), {
        quantity: newQty,
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit || !clinic) return;
    if (!window.confirm('Delete this stock item?')) return;
    const path = `clinics/${clinic.id}/inventory/${id}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinic.id, 'inventory', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      search === '' ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());

    const isLow = it.quantity <= it.reorderThreshold;
    const matchesFilter =
      filter === 'all' || (filter === 'low_stock' && isLow);

    return matchesSearch && matchesFilter;
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.reorderThreshold).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-teal-600" />
            Dental Consumables & Material Inventory
          </h3>
          <p className="text-xs text-slate-500">
            Stock levels, anesthetics, restorative composite, PPE, expiry dates, and replenishment thresholds.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Material Item
          </button>
        )}
      </div>

      {/* Filter and stats banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search material, brand, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('low_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'low_stock'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Low Stock Alerts ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading inventory...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No inventory items found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Item & Category</th>
                  <th className="py-3 px-4">Batch & Expiry</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-center">In Stock / Threshold</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Stock Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isLow = item.quantity <= item.reorderThreshold;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-teal-700 font-medium">{item.category}</div>
                      </td>

                      {/* Batch & Expiry */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <div>Batch: <span className="font-mono">{item.batchNumber || 'N/A'}</span></div>
                        <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Exp: {item.expiryDate || 'N/A'}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 text-slate-700">
                        {item.supplier || 'Direct'}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          {item.quantity}
                        </span>{' '}
                        <span className="text-slate-500 text-[11px]">{item.unit}</span>
                        <div className="text-[10px] text-slate-400">Min safe: {item.reorderThreshold}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.quantity <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.quantity <= 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      {/* Quantity adjust buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canAdjustStock && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustQuantity(item, -1)}
                              className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700 text-xs transition-colors"
                              title="Deduct 1 unit (Used in treatment)"
                            >
                              -1
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleAdjustQuantity(item, 5)}
                                className="px-2 h-7 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded font-bold text-slate-700 text-xs transition-colors"
                                title="Restock 5 units"
                              >
                                +5
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded ml-1"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Add Dental Material Item</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Septocaine 4% with 1:100,000 Epinephrine"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Anesthetics">Anesthetics</option>
                    <option value="Restorative">Restorative / Composite</option>
                    <option value="PPE">PPE & Protection</option>
                    <option value="Sterilization">Sterilization</option>
                    <option value="Impression">Impression & Gypsum</option>
                    <option value="Endodontics">Endodontic Files & Sealers</option>
                    <option value="Pharmaceuticals">Pharmaceuticals</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure *</label>
                  <input
                    type="text"
                    required
                    placeholder="Cartridge, Box, Syringe, Bottle"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Low Stock Warning Threshold *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Septodont / 3M"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
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
                  {submitting ? 'Saving...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
