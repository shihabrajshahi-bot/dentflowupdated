import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { ClinicExpense, Payment, PaymentMethod } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
} from 'lucide-react';
import { formatClinicDate } from '../../utils/dateFormatter';

export const ExpensesProfitManager: React.FC = () => {
  const { clinic, userProfile, activeRole, hasPermission } = useAuth();
  const [expenses, setExpenses] = useState<ClinicExpense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ClinicExpense['category']>('Dental Supplies & Lab');
  const [amount, setAmount] = useState<number>(1500);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const isOwner = activeRole === 'Owner';
  const isCashier = activeRole === 'Cashier';
  const isAuthorized = isOwner || isCashier;
  const currencySymbol = clinic?.currencySymbol || '৳';

  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    setLoading(true);
    const expPath = `clinics/${clinicId}/expenses`;

    const unsubExp = onSnapshot(
      collection(db, 'clinics', clinicId, 'expenses'),
      (snap) => {
        const list: ClinicExpense[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ClinicExpense));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, expPath);
      }
    );

    // Fetch payments to calculate live revenue & net profit
    const payPath = `clinics/${clinicId}/payments`;
    const unsubPay = onSnapshot(
      collection(db, 'clinics', clinicId, 'payments'),
      (snap) => {
        const list: Payment[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Payment));
        setPayments(list);
      },
      (err) => console.warn('Payments snap warning:', err)
    );

    return () => {
      unsubExp();
      unsubPay();
    };
  }, [clinic?.id]);

  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Restricted Module</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Per clinic security policy, <strong>Expenses & Profit</strong> analytics are accessible strictly to <strong>Clinic Owners</strong> and authorized <strong>Cashiers</strong>. Dentists and Receptionists do not have authorization to view expenditure and profit figures.
        </p>
      </div>
    );
  }

  // Calculations
  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic || (!isOwner && !isCashier)) return;
    setSubmitting(true);
    setFeedback(null);

    const clinicId = clinic.id;
    const path = `clinics/${clinicId}/expenses`;

    try {
      const newExp: Omit<ClinicExpense, 'id'> = {
        clinicId,
        title: title.trim(),
        category,
        amount: Number(amount),
        date,
        paymentMethod,
        referenceNumber: refNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        recordedBy: userProfile?.displayName || 'Authorized Cashier',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'clinics', clinicId, 'expenses'), {
        ...newExp,
        _serverTimestamp: serverTimestamp(),
      });

      setIsModalOpen(false);
      setTitle('');
      setAmount(1500);
      setRefNumber('');
      setNotes('');
      setFeedback('Expense voucher registered in ledger.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!isOwner) {
      alert('Only the Clinic Owner has permission to delete registered expense entries.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const path = `clinics/${clinicId}/expenses/${id}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinicId, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      search === '' ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.referenceNumber && e.referenceNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Clinic Expenses, Overhead & Net Profit Ledger
          </h3>
          <p className="text-xs text-slate-500">
            Track operational disbursements, dental lab expenditures, facility utilities, and calculate live profit margins.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Record Expense Voucher
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Financial P&L KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wide">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono">
            {currencySymbol} {totalRevenue.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">From patient payments & receipts</div>
        </div>

        {/* Total Operating Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wide">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 font-mono">
            {currencySymbol} {totalExpenses.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{expenses.length} logged expense items</div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wide">
              Net Profit / Surplus
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              netProfit >= 0 ? 'text-teal-800' : 'text-rose-700'
            }`}
          >
            {currencySymbol} {netProfit.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Revenue minus all overhead costs</div>
        </div>

        {/* Net Margin Percentage */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wide">
              Operating Margin
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700 font-mono">
            {profitMargin}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Operating profitability ratio</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expense description, category, voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wide">
            Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Categories ({expenses.length})</option>
            <option value="Dental Supplies & Lab">Dental Supplies & Lab</option>
            <option value="Rent & Facility">Rent & Facility</option>
            <option value="Utilities">Utilities</option>
            <option value="Staff Salaries">Staff Salaries</option>
            <option value="Equipment & Maintenance">Equipment & Maintenance</option>
            <option value="Marketing">Marketing</option>
            <option value="Office & Admin">Office & Admin</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading financial ledger...
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No expense records found.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click 'Record Expense Voucher' to document laboratory fees, electricity, or supplies.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method & Ref</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                      {formatClinicDate(exp.date)}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-400 font-normal">"{exp.notes}"</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      <div>{exp.paymentMethod}</div>
                      {exp.referenceNumber && (
                        <div className="text-teal-700 font-mono text-[10px]">
                          Ref: {exp.referenceNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-rose-700 font-mono text-sm whitespace-nowrap">
                      -{currencySymbol} {exp.amount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                          title="Delete expense entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal to Record Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                Record Practice Expense Voucher
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expense Title / Payee *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Dental Lab — Ceramic Crown fabrication #16"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Dental Supplies & Lab">Dental Supplies & Lab</option>
                    <option value="Rent & Facility">Rent & Facility</option>
                    <option value="Utilities">Utilities (Electricity, Water, Internet)</option>
                    <option value="Staff Salaries">Staff Salaries & Honorarium</option>
                    <option value="Equipment & Maintenance">Equipment & Maintenance</option>
                    <option value="Marketing">Marketing & Patient Recall</option>
                    <option value="Office & Admin">Office Supplies & Admin</option>
                    <option value="Other">Other / Sundry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Channel *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Cash">Cash at Hand</option>
                    <option value="Mobile Financial Service">Mobile Financial Service (bKash / Nagad)</option>
                    <option value="Bank Transfer">Bank Wire Transfer</option>
                    <option value="Card">Clinic Corporate Debit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Voucher / Receipt Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. LAB-INV-9921, TrxID 84729"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Disbursement purpose, invoice attachment note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {submitting ? 'Recording...' : 'Register Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
