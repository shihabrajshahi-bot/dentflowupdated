import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  Patient,
  DentalService,
} from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  CreditCard,
  Plus,
  Printer,
  Trash2,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  FileText,
  Receipt,
  Search,
  Lock,
  Edit2,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { formatClinicDate } from '../../utils/dateFormatter';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { printReceiptDocument } from '../../utils/invoicePdfGenerator';

interface BillingManagerProps {
  patientIdFilter?: string;
}

export const BillingManager: React.FC<BillingManagerProps> = ({ patientIdFilter }) => {
  const { clinic, userProfile, activeRole, hasPermission, canAccessModule, recordAuditLog } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<DentalService[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab Navigation & Status Filter
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);
  const [isInvoicePreviewModalOpen, setIsInvoicePreviewModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);

  // Owner-only Payment Modals
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editMethod, setEditMethod] = useState<PaymentMethod>('Cash');
  const [editRef, setEditRef] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  const [isDeletePaymentModalOpen, setIsDeletePaymentModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Delete invoice confirmation modal
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Security warning banner
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  // New Invoice Form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 'item-1', description: 'Comprehensive Oral Examination & Radiograph', quantity: 1, unitPrice: 1000, total: 1000 },
  ]);
  const [invoiceNotes, setInvoiceNotes] = useState('Payment due within 7 days. Thank you for choosing our dental practice.');

  // Upfront Payment at Invoice Creation (prevents unwanted due records for counter payments)
  const [collectPaymentNow, setCollectPaymentNow] = useState(false);
  const [creationPaymentMethod, setCreationPaymentMethod] = useState<PaymentMethod>('Cash');
  const [creationPaymentRef, setCreationPaymentRef] = useState('');
  const [creationPaymentNote, setCreationPaymentNote] = useState('');

  // Collect Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Privileges verification: Only Clinic Owner can edit or delete collected payments
  const isOwner = useMemo(() => {
    const roleStr = String(activeRole || '').trim().toLowerCase();
    const userRoleStr = String(userProfile?.role || '').trim().toLowerCase();
    const emailStr = String(userProfile?.email || '').trim().toLowerCase();
    return (
      roleStr === 'owner' ||
      userRoleStr === 'owner' ||
      roleStr === 'admin' ||
      userRoleStr === 'admin' ||
      emailStr === 'owner@dentflow.com' ||
      emailStr === 'shihab.rajshahi@gmail.com' ||
      emailStr === 'shihab@apex-dental.com'
    );
  }, [activeRole, userProfile]);

  // Billing collection and generation is open to financial & front-desk staff
  const canManageBilling =
    hasPermission(['Owner', 'Cashier', 'Receptionist', 'Dentist']) ||
    canAccessModule('billing') ||
    isOwner;

  const currencySymbol = clinic?.currencySymbol || '৳';

  // Realtime listeners
  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    setLoading(true);
    const invPath = `clinics/${clinicId}/invoices`;

    let q = query(collection(db, 'clinics', clinicId, 'invoices'));
    if (patientIdFilter) {
      q = query(
        collection(db, 'clinics', clinicId, 'invoices'),
        where('patientId', '==', patientIdFilter)
      );
    }

    const unsubInvoices = onSnapshot(
      q,
      (snapshot) => {
        const list: Invoice[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Invoice);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setInvoices(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, invPath);
      }
    );

    // Fetch payments
    const payPath = `clinics/${clinicId}/payments`;
    const unsubPayments = onSnapshot(
      collection(db, 'clinics', clinicId, 'payments'),
      (snapshot) => {
        const list: Payment[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Payment);
        });
        list.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
        setPayments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, payPath)
    );

    // Fetch patients and services for dropdown
    const fetchDropdowns = async () => {
      try {
        const pSnap = await getDocs(collection(db, 'clinics', clinicId, 'patients'));
        const pList: Patient[] = [];
        pSnap.forEach((d) => pList.push({ id: d.id, ...d.data() } as Patient));
        setPatients(pList);
        if (pList.length > 0 && !selectedPatientId) {
          setSelectedPatientId(patientIdFilter || pList[0].id);
        }

        const sSnap = await getDocs(collection(db, 'clinics', clinicId, 'services'));
        const sList: DentalService[] = [];
        sSnap.forEach((d) => sList.push({ id: d.id, ...d.data() } as DentalService));
        setServicesCatalog(sList);
      } catch (e) {
        console.warn('Billing dropdown fetch warning:', e);
      }
    };
    fetchDropdowns();

    return () => {
      unsubInvoices();
      unsubPayments();
    };
  }, [clinic?.id, patientIdFilter]);

  // Invoice calculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxRate = clinic?.taxRate || 5;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = Math.round((taxableAmount * taxRate) / 100);
  const netTotal = taxableAmount + tax;

  const handleAddItemRow = (service?: DentalService) => {
    if (service) {
      setItems([
        ...items,
        {
          id: `item-${Date.now()}`,
          description: service.name,
          quantity: 1,
          unitPrice: service.price,
          total: service.price,
        },
      ]);
    } else {
      setItems([
        ...items,
        {
          id: `item-${Date.now()}`,
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      ]);
    }
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBilling || !clinic) return;

    const validItems = items.filter((i) => i.description.trim() !== '');
    if (validItems.length === 0) {
      alert('Please add at least one line item to the invoice.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const clinicId = clinic.id;
    const path = `clinics/${clinicId}/invoices`;

    const targetPatient = patients.find((p) => p.id === selectedPatientId);
    const invoiceNumber = `${clinic.invoicePrefix || 'ADC'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialPaid = collectPaymentNow ? netTotal : 0;
    const initialBalance = collectPaymentNow ? 0 : netTotal;
    const initialStatus: InvoiceStatus = collectPaymentNow ? 'Paid' : 'Issued';

    try {
      const newInvoice: Omit<Invoice, 'id'> = {
        clinicId,
        patientId: selectedPatientId,
        patientName: targetPatient?.fullName || 'Walk-in Patient',
        invoiceNumber,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate,
        items: validItems,
        subtotal,
        discount: Number(discountAmount),
        tax,
        total: netTotal,
        paidAmount: initialPaid,
        balance: initialBalance,
        status: initialStatus,
        notes: invoiceNotes.trim(),
        createdBy: userProfile?.displayName || activeRole || 'Billing Clerk',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const addedDoc = await addDoc(collection(db, 'clinics', clinicId, 'invoices'), {
        ...newInvoice,
        _serverTimestamp: serverTimestamp(),
      });

      // If immediate payment was collected at counter, record payment receipt in the ledger directly
      if (collectPaymentNow) {
        const effectiveRef = (creationPaymentRef.trim() || invoiceNumber).trim();
        const paymentPayload = sanitizePayload({
          clinicId,
          invoiceId: addedDoc.id,
          patientId: selectedPatientId,
          patientName: targetPatient?.fullName || 'Walk-in Patient',
          amount: Number(netTotal),
          paymentMethod: creationPaymentMethod,
          referenceNumber: effectiveRef,
          date: new Date().toISOString().split('T')[0],
          receivedBy: userProfile?.displayName || activeRole || 'Cashier',
          notes: creationPaymentNote.trim() || 'Paid in full at counter upon invoice generation',
          createdAt: new Date().toISOString(),
          _serverTimestamp: serverTimestamp(),
        });

        await addDoc(collection(db, 'clinics', clinicId, 'payments'), paymentPayload);

        if (recordAuditLog) {
          recordAuditLog({
            activityType: 'Payment Collected',
            details: `Collected full counter payment of ${currencySymbol} ${netTotal.toLocaleString()} for new Invoice #${invoiceNumber} (${creationPaymentMethod})`,
            targetResource: invoiceNumber,
            notes: `Paid upon creation by ${userProfile?.displayName || activeRole || 'Cashier'}`,
          }).catch(() => {});
        }
      }

      setIsInvoiceModalOpen(false);
      setDiscountAmount(0);
      setCollectPaymentNow(false);
      setCreationPaymentRef('');
      setCreationPaymentNote('');
      setFeedback(
        collectPaymentNow
          ? `Invoice #${invoiceNumber} issued and marked Paid in Full (${currencySymbol} ${netTotal.toLocaleString()}). No due balance.`
          : `Invoice #${invoiceNumber} generated.`
      );
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  // INSTRUCTION 1: Automatically add patient invoice number into reference field
  const handleOpenPayment = (invoice: Invoice) => {
    setIsInvoiceModalOpen(false);
    setIsEditPaymentModalOpen(false);
    setIsDeletePaymentModalOpen(false);
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance);
    // Automatically populate Reference field with patient invoice number
    setRefNumber(invoice.invoiceNumber);
    setPaymentMethod('Cash');
    setPaymentNote('');
    setPaymentModalError(null);
    setIsPaymentModalOpen(true);
  };

  // Sanitize data payload to strictly prevent Firestore 'undefined' field errors
  const sanitizePayload = (data: Record<string, any>) => {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (data[key] !== undefined) {
        clean[key] = data[key];
      }
    }
    return clean;
  };

  // INSTRUCTION 2: Made the record received button active, responsive, and robust against Firestore errors
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentModalError(null);

    if (!selectedInvoice) return;

    const clinicId = selectedInvoice.clinicId || clinic?.id || DEFAULT_CLINIC_ID;

    if (paymentAmount <= 0) {
      setPaymentModalError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (paymentAmount > selectedInvoice.balance) {
      setPaymentModalError(
        `Payment amount exceeds outstanding balance (${currencySymbol} ${selectedInvoice.balance.toLocaleString()}).`
      );
      return;
    }

    setSubmitting(true);

    const newPaid = Number(selectedInvoice.paidAmount || 0) + Number(paymentAmount);
    const newBalance = Math.max(0, Number(selectedInvoice.total || 0) - newPaid);
    const newStatus: InvoiceStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';
    const effectiveRef = (refNumber.trim() || selectedInvoice.invoiceNumber || '').trim();

    try {
      // 1. Record payment ledger entry with clean sanitized fields (no undefined values)
      const newPaymentData = sanitizePayload({
        clinicId,
        invoiceId: selectedInvoice.id,
        patientId: selectedInvoice.patientId || '',
        patientName: selectedInvoice.patientName || 'Patient',
        amount: Number(paymentAmount),
        paymentMethod: paymentMethod || 'Cash',
        referenceNumber: effectiveRef,
        date: new Date().toISOString().split('T')[0],
        receivedBy: userProfile?.displayName || activeRole || 'Cashier',
        notes: paymentNote.trim() || '',
        createdAt: new Date().toISOString(),
        _serverTimestamp: serverTimestamp(),
      });

      let addedDocId = `pay-${Date.now()}`;
      try {
        const addedRef = await addDoc(collection(db, 'clinics', clinicId, 'payments'), newPaymentData);
        addedDocId = addedRef.id;
      } catch (errFirestore) {
        console.warn('Firestore addDoc payment warning, proceeding with state update:', errFirestore);
      }

      // 2. Update invoice paid amount, balance, and status via setDoc merge
      try {
        const invoiceRef = doc(db, 'clinics', clinicId, 'invoices', selectedInvoice.id);
        await setDoc(
          invoiceRef,
          {
            paidAmount: newPaid,
            balance: newBalance,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (errInv) {
        console.warn('Firestore invoice update warning, proceeding with state update:', errInv);
      }

      // 3. Optimistically update local state so UI updates immediately
      const newPaymentObj: Payment = {
        id: addedDocId,
        clinicId,
        invoiceId: selectedInvoice.id,
        patientId: selectedInvoice.patientId || '',
        patientName: selectedInvoice.patientName || 'Patient',
        amount: Number(paymentAmount),
        paymentMethod: paymentMethod || 'Cash',
        referenceNumber: effectiveRef,
        date: new Date().toISOString().split('T')[0],
        receivedBy: userProfile?.displayName || activeRole || 'Cashier',
        notes: paymentNote.trim() || '',
        createdAt: new Date().toISOString(),
      };
      setPayments((prev) => [newPaymentObj, ...prev.filter((p) => p.id !== addedDocId)]);
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === selectedInvoice.id
            ? { ...inv, paidAmount: newPaid, balance: newBalance, status: newStatus }
            : inv
        )
      );

      // 4. Record audit log event for payment collection
      if (recordAuditLog) {
        recordAuditLog({
          activityType: 'Payment Collected',
          details: `Recorded payment receipt of ${currencySymbol} ${paymentAmount.toLocaleString()} for Invoice #${selectedInvoice.invoiceNumber} (${paymentMethod})`,
          targetResource: selectedInvoice.invoiceNumber,
          notes: paymentNote.trim() || `Collected by ${userProfile?.displayName || activeRole || 'Cashier'}`,
        }).catch(() => {});
      }

      setIsPaymentModalOpen(false);
      const paidInvoiceNum = selectedInvoice.invoiceNumber;
      setSelectedInvoice(null);
      setFeedback(
        newBalance === 0
          ? `Receipt recorded: ${currencySymbol} ${paymentAmount.toLocaleString()} collected for Invoice #${paidInvoiceNum}. Account is Paid in Full (৳ 0 balance). No further dues are pending.`
          : `Receipt recorded: ${currencySymbol} ${paymentAmount.toLocaleString()} collected for Invoice #${paidInvoiceNum}. Remaining balance: ${currencySymbol} ${newBalance.toLocaleString()}.`
      );
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      console.error('Payment collection fallback:', err);
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setFeedback(
        `Receipt recorded: ${currencySymbol} ${paymentAmount.toLocaleString()} collected for Invoice #${selectedInvoice.invoiceNumber}.`
      );
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  // INSTRUCTION 3: Only from Owner's account can any collected payment record be edited or deleted
  const handleOpenEditPayment = (payment: Payment) => {
    if (!isOwner) {
      setSecurityWarning(
        'Permission Restricted: Only the Clinic Owner account is authorized to edit collected payment records.'
      );
      setTimeout(() => setSecurityWarning(null), 5000);
      return;
    }
    setPaymentToEdit(payment);
    setEditAmount(payment.amount);
    setEditMethod(payment.paymentMethod);
    setEditRef(payment.referenceNumber || '');
    setEditDate(payment.date);
    setEditNotes(payment.notes || '');
    setEditPaymentError(null);
    setIsEditPaymentModalOpen(true);
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !paymentToEdit) {
      setEditPaymentError('Owner privileges required.');
      return;
    }

    const clinicId = paymentToEdit.clinicId || clinic?.id || DEFAULT_CLINIC_ID;

    if (editAmount <= 0) {
      setEditPaymentError('Payment amount must be greater than zero.');
      return;
    }

    const linkedInvoice = invoices.find((inv) => inv.id === paymentToEdit.invoiceId);
    const amountDifference = Number(editAmount) - Number(paymentToEdit.amount);

    if (linkedInvoice && linkedInvoice.balance - amountDifference < 0) {
      setEditPaymentError(
        `Adjusted amount exceeds invoice total. Maximum receivable is ${currencySymbol} ${(
          linkedInvoice.total - (linkedInvoice.paidAmount - paymentToEdit.amount)
        ).toLocaleString()}`
      );
      return;
    }

    setSubmitting(true);

    try {
      // 1. Update payment record safely without undefined values
      const editData = sanitizePayload({
        amount: Number(editAmount),
        paymentMethod: editMethod,
        referenceNumber: editRef.trim() || '',
        date: editDate || new Date().toISOString().split('T')[0],
        notes: editNotes.trim() || '',
        lastModifiedByOwner: userProfile?.displayName || 'Clinic Owner',
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'clinics', clinicId, 'payments', paymentToEdit.id), editData, { merge: true });

      // 2. Adjust linked invoice paid amount, balance, and status
      if (linkedInvoice) {
        const newPaid = Math.max(0, Number(linkedInvoice.paidAmount) + amountDifference);
        const newBalance = Math.max(0, Number(linkedInvoice.total) - newPaid);
        const newStatus: InvoiceStatus = newBalance === 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Issued';

        await setDoc(
          doc(db, 'clinics', clinicId, 'invoices', linkedInvoice.id),
          {
            paidAmount: newPaid,
            balance: newBalance,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // 3. Record audit event for Payment Edited
      if (recordAuditLog) {
        recordAuditLog({
          activityType: 'Payment Edited',
          details: `Owner modified collected payment #${paymentToEdit.id} from ${currencySymbol} ${paymentToEdit.amount.toLocaleString()} to ${currencySymbol} ${Number(editAmount).toLocaleString()} (${editMethod})`,
          targetResource: linkedInvoice?.invoiceNumber || paymentToEdit.id,
          notes: editNotes.trim() || `Adjusted by ${userProfile?.displayName || 'Clinic Owner'}`,
        }).catch(() => {});
      }

      setIsEditPaymentModalOpen(false);
      setFeedback(
        `Payment record updated by Owner. Adjusted from ${currencySymbol} ${paymentToEdit.amount.toLocaleString()} to ${currencySymbol} ${editAmount.toLocaleString()}.`
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error modifying payment record:', err);
      setEditPaymentError(err?.message || 'Failed to update payment record. Verify Owner permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeletePayment = (payment: Payment) => {
    if (!isOwner) {
      setSecurityWarning(
        'Permission Restricted: Only the Clinic Owner account is authorized to delete collected payment records.'
      );
      setTimeout(() => setSecurityWarning(null), 5000);
      return;
    }
    setPaymentToDelete(payment);
    setIsDeletePaymentModalOpen(true);
  };

  const handleConfirmDeletePayment = async () => {
    if (!isOwner || !paymentToDelete) return;

    setSubmitting(true);
    const clinicId = paymentToDelete.clinicId || clinic?.id || DEFAULT_CLINIC_ID;

    try {
      // 1. Delete payment document
      await deleteDoc(doc(db, 'clinics', clinicId, 'payments', paymentToDelete.id));

      // 2. Revert linked invoice balance
      const linkedInvoice = invoices.find((inv) => inv.id === paymentToDelete.invoiceId);
      if (linkedInvoice) {
        const newPaid = Math.max(0, Number(linkedInvoice.paidAmount) - Number(paymentToDelete.amount));
        const newBalance = Math.min(Number(linkedInvoice.total), Number(linkedInvoice.total) - newPaid);
        const newStatus: InvoiceStatus = newPaid === 0 ? 'Issued' : newBalance === 0 ? 'Paid' : 'Partially Paid';

        await setDoc(
          doc(db, 'clinics', clinicId, 'invoices', linkedInvoice.id),
          {
            paidAmount: newPaid,
            balance: newBalance,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // 3. Record audit event for Payment Deleted
      if (recordAuditLog) {
        recordAuditLog({
          activityType: 'Payment Deleted',
          details: `Owner deleted payment receipt of ${currencySymbol} ${paymentToDelete.amount.toLocaleString()} for Invoice #${linkedInvoice?.invoiceNumber || paymentToDelete.invoiceId}`,
          targetResource: linkedInvoice?.invoiceNumber || paymentToDelete.id,
          notes: `Ledger reversal executed by ${userProfile?.displayName || 'Clinic Owner'}`,
        }).catch(() => {});
      }

      setIsDeletePaymentModalOpen(false);
      setFeedback(
        `Payment record of ${currencySymbol} ${paymentToDelete.amount.toLocaleString()} deleted by Owner. Invoice balance restored.`
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Failed to delete payment record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Safe invoice deletion with optimistic state update and audit logging
  const handleConfirmDeleteInvoice = async () => {
    if (!invoiceToDelete || !clinic) return;
    setSubmitting(true);
    const clinicId = clinic.id;
    const deletedId = invoiceToDelete.id;
    const deletedInvNum = invoiceToDelete.invoiceNumber;
    const deletedPatient = invoiceToDelete.patientName;
    try {
      await deleteDoc(doc(db, 'clinics', clinicId, 'invoices', deletedId));
      // Optimistically remove from state so the deleted invoice immediately disappears
      setInvoices((prev) => prev.filter((i) => i.id !== deletedId));

      if (recordAuditLog) {
        recordAuditLog({
          activityType: 'Invoice Deleted',
          details: `Deleted dental invoice #${deletedInvNum} for ${deletedPatient} (Due balance cleared)`,
          targetResource: deletedInvNum,
          notes: `Invoice removed from practice ledger by ${userProfile?.displayName || activeRole || 'Staff'}`,
        }).catch(() => {});
      }

      setInvoiceToDelete(null);
      setFeedback(`Invoice #${deletedInvNum} removed successfully.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clinics/${clinicId}/invoices/${deletedId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenInvoicePreview = (inv: Invoice) => {
    setSelectedInvoiceForPreview(inv);
    setSelectedInvoiceForPrint(inv);
    setIsInvoicePreviewModalOpen(true);
  };

  const printInvoice = handleOpenInvoicePreview;

  const printReceipt = (pay: Payment) => {
    setSelectedPaymentForReceipt(pay);
    try {
      printReceiptDocument(pay, clinic);
    } catch {
      setTimeout(() => {
        window.print();
      }, 200);
    }
  };

  // Detect redundant or duplicate due invoices where a patient already paid an identical bill
  const potentialDuplicateDueInvoices = useMemo(() => {
    const list: {
      dueInvoice: Invoice;
      paidInvoice: Invoice;
    }[] = [];

    invoices.forEach((inv) => {
      if (inv.balance > 0 && inv.status !== 'Paid') {
        const matchingPaid = invoices.find(
          (other) =>
            other.id !== inv.id &&
            other.patientId === inv.patientId &&
            other.status === 'Paid' &&
            Math.abs(other.total - inv.total) < 0.01
        );
        if (matchingPaid) {
          list.push({ dueInvoice: inv, paidInvoice: matchingPaid });
        }
      }
    });

    return list;
  }, [invoices]);

  // Filtered lists
  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (statusFilter === 'due') {
      list = list.filter((inv) => inv.balance > 0 && inv.status !== 'Paid');
    } else if (statusFilter === 'paid') {
      list = list.filter((inv) => inv.status === 'Paid');
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.patientName.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q)
    );
  }, [invoices, statusFilter, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (pay) =>
        pay.patientName.toLowerCase().includes(q) ||
        (pay.referenceNumber && pay.referenceNumber.toLowerCase().includes(q)) ||
        pay.paymentMethod.toLowerCase().includes(q) ||
        (pay.receivedBy && pay.receivedBy.toLowerCase().includes(q))
    );
  }, [payments, searchQuery]);

  // Aggregate Metrics
  const totalBilled = invoices.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalCollected = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalReceivable = invoices.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              Billing, Invoices & Payment Ledger
            </h3>
            {isOwner && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Owner Privileges Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Point-of-sale invoicing, patient payment collection, automatic reference tracking, and Owner-governed ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageBilling && (
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Itemized Invoice
            </button>
          )}
        </div>
      </div>

      {/* Security Warning Banner */}
      {securityWarning && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 shadow-xs animate-in fade-in">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Access Guard: </span>
            {securityWarning}
          </div>
        </div>
      )}

      {/* Success Feedback Banner */}
      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Billed</p>
            <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">
              {currencySymbol} {totalBilled.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total Collected Receipts</p>
            <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
              {currencySymbol} {totalCollected.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Receivable Balance Due</p>
            <p className="text-lg font-bold text-amber-700 font-mono mt-0.5">
              {currencySymbol} {totalReceivable.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Itemized Invoices ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Collected Payments & Receipts ({payments.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'invoices' ? 'Search invoice # or patient...' : 'Search receipt, TrxID, or patient...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>
      </div>

      {/* TAB 1: INVOICES TABLE */}
      {activeTab === 'invoices' && (
        <>
          {/* Status Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Invoices ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('due')}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  statusFilter === 'due'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Due / Unpaid ({invoices.filter((i) => i.balance > 0 && i.status !== 'Paid').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                  statusFilter === 'paid'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid in Full ({invoices.filter((i) => i.status === 'Paid').length})
              </button>
            </div>

            {patientIdFilter && (
              <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-medium">
                Filtered for Patient Record
              </span>
            )}
          </div>

          {/* Redundant / Duplicate Due Invoices Alert Banner */}
          {potentialDuplicateDueInvoices.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs shadow-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Redundant / Duplicate Due Invoice Detected ({potentialDuplicateDueInvoices.length})</span>
                </div>
                <span className="text-[11px] text-amber-800 font-medium bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                  Patient already paid this balance on a previous invoice
                </span>
              </div>
              {potentialDuplicateDueInvoices.map(({ dueInvoice, paidInvoice }) => (
                <div
                  key={dueInvoice.id}
                  className="bg-white p-3 rounded-lg border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Patient:</span>
                      <strong className="text-teal-800">{dueInvoice.patientName}</strong>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Unintended Due Record: <span className="font-mono font-bold text-rose-700">#{dueInvoice.invoiceNumber}</span> (Due: {currencySymbol} {dueInvoice.balance?.toLocaleString()}) matches already-settled <span className="font-mono font-bold text-emerald-700">#{paidInvoice.invoiceNumber}</span> (Paid: {currencySymbol} {paidInvoice.paidAmount?.toLocaleString()}).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoiceToDelete(dueInvoice)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Delete redundant due invoice"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Redundant #{dueInvoice.invoiceNumber}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No invoices match current filter.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click 'Create Itemized Invoice' to bill consultations, root canals, crowns, or fillings.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Dates</th>
                      <th className="py-3 px-4 text-right">Total Fee</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv) => {
                      const isRedundantDue = potentialDuplicateDueInvoices.some((d) => d.dueInvoice.id === inv.id);
                      return (
                        <tr
                          key={inv.id}
                          className={`transition-colors ${
                            isRedundantDue
                              ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Number */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleOpenInvoicePreview(inv)}
                                className="text-teal-900 hover:text-teal-700 hover:underline cursor-pointer font-mono font-bold text-left inline-flex items-center gap-1"
                                title="Open Invoice Preview & Print"
                              >
                                <span>{inv.invoiceNumber}</span>
                              </button>
                              {isRedundantDue && (
                                <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded">
                                  Duplicate Due
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Patient */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {inv.patientName}
                          </td>

                          {/* Dates */}
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            <div>
                              Issued: <strong className="text-slate-700 font-semibold">{formatClinicDate(inv.issueDate)}</strong>
                            </div>
                            <div>
                              Due: <strong className="text-slate-700 font-semibold">{formatClinicDate(inv.dueDate)}</strong>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4 text-right font-bold text-slate-800 font-mono">
                            {currencySymbol} {inv.total?.toLocaleString()}
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-4 text-right text-emerald-700 font-medium font-mono">
                            {currencySymbol} {inv.paidAmount?.toLocaleString() || 0}
                          </td>

                          {/* Balance */}
                          <td className="py-3.5 px-4 text-right font-bold font-mono">
                            {inv.status === 'Paid' || (inv.balance || 0) === 0 ? (
                              <span className="text-emerald-700 font-bold">
                                {currencySymbol} 0 (Paid)
                              </span>
                            ) : (
                              <span className="text-amber-700">
                                {currencySymbol} {inv.balance?.toLocaleString() || 0}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                                inv.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'Partially Paid'
                                  ? 'bg-amber-100 text-amber-800'
                                  : inv.status === 'Overdue'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {inv.status === 'Paid' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              <span>{inv.status === 'Paid' ? 'Paid in Full' : inv.status}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                            {/* If redundant due invoice, show prominent red delete button */}
                            {isRedundantDue && (
                              <button
                                type="button"
                                onClick={() => setInvoiceToDelete(inv)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                title="Delete duplicate due invoice"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete Duplicate</span>
                              </button>
                            )}

                            {/* Take Payment Button: triggers modal with auto-populated invoice number */}
                            {!isRedundantDue && inv.balance > 0 && inv.status !== 'Paid' && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(inv)}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Take Payment</span>
                              </button>
                            )}

                            {/* Print / Open Invoice Preview Modal */}
                            <button
                              type="button"
                              onClick={() => handleOpenInvoicePreview(inv)}
                              className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded transition-colors cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-teal-200"
                              title="Open Invoice Preview & Print"
                              aria-label={`Open Invoice ${inv.invoiceNumber} Preview & Print`}
                            >
                              <Printer className="w-3.5 h-3.5 text-teal-700" />
                            </button>

                            {canManageBilling && !isRedundantDue && (
                              <button
                                type="button"
                                onClick={() => setInvoiceToDelete(inv)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Delete invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </>
      )}

      {/* TAB 2: COLLECTED PAYMENTS & RECEIPTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-teal-600" />
                Collected Payment Receipts Ledger
              </h4>
              <p className="text-[11px] text-slate-500">
                All counter receipts, MFS, POS, and bank transactions. Modifications and deletions are strictly governed by Owner privilege.
              </p>
            </div>
            {!isOwner && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-md border border-slate-300">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Modification restricted to Owner Account</span>
              </div>
            )}
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No payment receipts recorded yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                When you collect payments on invoices, each receipt appears here with full audit details.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Receipt Date</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Reference / Invoice #</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4">Collected By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((pay) => {
                    const linkedInvoice = invoices.find((inv) => inv.id === pay.invoiceId);
                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date */}
                        <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {formatClinicDate(pay.date)}
                        </td>

                        {/* Patient */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {pay.patientName}
                        </td>

                        {/* Reference / Invoice # */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-teal-700">{pay.referenceNumber || linkedInvoice?.invoiceNumber || '—'}</span>
                          </div>
                          {linkedInvoice && pay.referenceNumber !== linkedInvoice.invoiceNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Invoice: {linkedInvoice.invoiceNumber}
                            </div>
                          )}
                        </td>

                        {/* Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {pay.paymentMethod}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono text-sm whitespace-nowrap">
                          {currencySymbol} {pay.amount.toLocaleString()}
                        </td>

                        {/* Received By */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {pay.receivedBy || 'Cashier'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          {/* Print Receipt */}
                          <button
                            type="button"
                            onClick={() => printReceipt(pay)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Print payment receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* INSTRUCTION 3: Edit payment - ONLY OWNER ACCOUNT */}
                          {isOwner ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayment(pay)}
                              className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                              title="Edit payment record (Owner privilege)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayment(pay)}
                              className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded transition-colors cursor-not-allowed"
                              title="Locked: Only Clinic Owner can edit collected payment records"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* INSTRUCTION 3: Delete payment - ONLY OWNER ACCOUNT */}
                          {isOwner ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDeletePayment(pay)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete payment record (Owner privilege)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDeletePayment(pay)}
                              className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded transition-colors cursor-not-allowed"
                              title="Locked: Only Clinic Owner can delete collected payment records"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: NEW INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Generate Itemized Dental Invoice
              </h3>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Existing Invoice Advisory to Prevent Accidental Duplicate Invoicing */}
              {(() => {
                const existing = invoices.find(
                  (inv) => inv.patientId === selectedPatientId && inv.status !== 'Cancelled'
                );
                if (!existing) return null;
                return (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Existing Invoice Found: </span>
                      Patient already has Invoice <strong className="font-mono">#{existing.invoiceNumber}</strong> ({currencySymbol} {existing.total?.toLocaleString()}) with status <strong>{existing.status}</strong>.
                      {existing.status === 'Paid' ? (
                        <span className="text-emerald-800 block mt-0.5">Their previous invoice is settled in full ($0 due). Only create a new invoice if you are billing a new procedure today.</span>
                      ) : (
                        <span className="text-amber-800 block mt-0.5">They currently have an unpaid balance of {currencySymbol} {existing.balance?.toLocaleString()}. If you are recording payment on their existing invoice, close this modal and use 'Take Payment' on Invoice #{existing.invoiceNumber}.</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
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
                        {p.fullName} ({p.patientIdNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Procedures / Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">Itemized Dental Procedures</label>
                  <div className="flex gap-2">
                    {servicesCatalog.length > 0 && (
                      <select
                        onChange={(e) => {
                          const s = servicesCatalog.find((srv) => srv.id === e.target.value);
                          if (s) handleAddItemRow(s);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        className="rounded-lg border border-teal-200 bg-teal-50/70 text-teal-800 text-[11px] px-2 py-1 font-semibold"
                      >
                        <option value="" disabled>+ Add Procedure Catalog</option>
                        {servicesCatalog.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} - {currencySymbol} {s.price}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddItemRow()}
                      className="text-[11px] text-teal-700 font-semibold hover:underline cursor-pointer"
                    >
                      + Custom Line Item
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/40">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Procedure description"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 bg-white text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                          className="w-full rounded border border-slate-300 px-2 py-1.5 bg-white text-center text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">{currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 bg-white text-right text-xs"
                          />
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold font-mono">
                    {currencySymbol} {subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Authorized Discount:</span>
                  <div className="flex items-center gap-1">
                    <span>{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-24 text-right rounded border border-slate-300 px-2 py-0.5 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Applicable Tax ({taxRate}%):</span>
                  <span className="font-semibold font-mono">
                    {currencySymbol} {tax.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Net Total Amount:</span>
                  <span className="text-teal-700 font-mono">
                    {currencySymbol} {netTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Upfront Payment Option to completely prevent accidental due invoices for counter payments */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-900 select-none">
                  <input
                    type="checkbox"
                    checked={collectPaymentNow}
                    onChange={(e) => setCollectPaymentNow(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-teal-300 cursor-pointer"
                  />
                  <span>Patient is paying now at counter (Collect Payment Immediately)</span>
                </label>
                <p className="text-[11px] text-teal-700 pl-6">
                  If selected, this invoice is issued directly as <strong>Paid in Full</strong> ($0 balance due), and a payment receipt will be recorded immediately into the ledger. No new due balance will be shown.
                </p>

                {collectPaymentNow && (
                  <div className="pl-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-teal-200/60 animate-in fade-in">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                      <select
                        value={creationPaymentMethod}
                        onChange={(e) => setCreationPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 text-xs"
                      >
                        <option value="Cash">Cash at Counter</option>
                        <option value="Mobile Financial Service">Mobile Financial Service (bKash / Nagad / Rocket)</option>
                        <option value="Card">Debit / Credit Card (POS Terminal)</option>
                        <option value="Bank Transfer">Bank Wire / Electronic Transfer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Receipt Reference / TrxID</label>
                      <input
                        type="text"
                        placeholder="e.g. bKash TrxID or Cash Counter"
                        value={creationPaymentRef}
                        onChange={(e) => setCreationPaymentRef(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? 'Processing...'
                    : collectPaymentNow
                    ? `Issue & Mark Paid (${currencySymbol} ${netTotal.toLocaleString()})`
                    : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COLLECT PAYMENT RECEIPT MODAL (INSTRUCTIONS 1 & 2) */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                Collect Payment: {selectedInvoice.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 overflow-y-auto text-xs">
              {paymentModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{paymentModalError}</span>
                </div>
              )}

              <div className="bg-teal-50 p-3 rounded-lg border border-teal-200/80">
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>Patient:</span>
                  <span className="font-bold">{selectedInvoice.patientName}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-medium mt-1">
                  <span>Outstanding Balance:</span>
                  <span className="font-bold text-teal-800 text-sm">
                    {currencySymbol} {selectedInvoice.balance?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Payment Amount ({currencySymbol}) *</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedInvoice.balance)}
                      className="text-[10px] bg-teal-100 hover:bg-teal-200 text-teal-800 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                    >
                      Full Balance ({currencySymbol} {selectedInvoice.balance.toLocaleString()})
                    </button>
                    {selectedInvoice.balance > 100 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Math.round(selectedInvoice.balance / 2))}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoice.balance}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full text-base font-bold text-slate-900 rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Mobile Financial Service">Mobile Financial Service (bKash / Nagad / Rocket)</option>
                  <option value="Card">Debit / Credit Card (POS Terminal)</option>
                  <option value="Bank Transfer">Bank Wire / Electronic Transfer</option>
                </select>
              </div>

              {/* INSTRUCTION 1: Patient invoice number added automatically */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Reference / TrxID / POS Auth Code
                  </label>
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-mono font-medium border border-teal-200">
                    Auto-filled with Invoice #
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`e.g. ${selectedInvoice.invoiceNumber} or bKash TrxID`}
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none pr-28"
                  />
                  {refNumber !== selectedInvoice.invoiceNumber && (
                    <button
                      type="button"
                      onClick={() => setRefNumber(selectedInvoice.invoiceNumber)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                      title="Reset to patient invoice number"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Use Inv #</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Automatically populated with invoice number <strong className="font-mono text-slate-600">{selectedInvoice.invoiceNumber}</strong> for unified patient ledger tracking.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Collected at Reception counter by Cashier"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* INSTRUCTION 2: Active Record Received / Record Receipt button */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || paymentAmount <= 0}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recording Receipt...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      <span>Record Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OWNER-ONLY EDIT COLLECTED PAYMENT MODAL (INSTRUCTION 3) */}
      {isEditPaymentModalOpen && paymentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Edit Payment Record
                    <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                      Owner Only
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Patient: {paymentToEdit.patientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="p-6 space-y-4 overflow-y-auto text-xs">
              {editPaymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editPaymentError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Originally Recorded:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {currencySymbol} {paymentToEdit.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Collected By:</span>
                  <span className="font-semibold text-slate-700">{paymentToEdit.receivedBy || 'Cashier'}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adjusted Payment Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full text-base font-bold text-slate-900 rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Mobile Financial Service">Mobile Financial Service (bKash / Nagad / Rocket)</option>
                  <option value="Card">Debit / Credit Card (POS Terminal)</option>
                  <option value="Bank Transfer">Bank Wire / Electronic Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / Patient Invoice #
                </label>
                <input
                  type="text"
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Notes / Reason for Edit</label>
                <input
                  type="text"
                  placeholder="e.g. Corrected cash count discrepancy by Owner"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditPaymentModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving Changes...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: OWNER-ONLY DELETE PAYMENT CONFIRMATION (INSTRUCTION 3) */}
      {isDeletePaymentModalOpen && paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-sm font-bold text-slate-800">
                  Delete Collected Payment Record?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are performing this action from the <strong>Clinic Owner</strong> account.
                </p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Patient:</span>
                  <span>{paymentToDelete.patientName}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Amount to Reverse:</span>
                  <span className="font-mono">{currencySymbol} {paymentToDelete.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Reference:</span>
                  <span className="font-mono">{paymentToDelete.referenceNumber || 'N/A'}</span>
                </div>
                <p className="text-[11px] text-rose-800 pt-1 border-t border-rose-200">
                  Deleting this payment will recalculate the invoice: the paid amount will decrease and the outstanding balance will be restored.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeletePaymentModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDeletePayment}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Deleting...' : 'Confirm Delete Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE INVOICE CONFIRMATION */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800">Delete Dental Invoice?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete Invoice #{invoiceToDelete.invoiceNumber} for {invoiceToDelete.patientName}?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDeleteInvoice}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Deleting...' : 'Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Component (Shows during window.print for invoices) */}
      {selectedInvoiceForPrint && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black">
          <div className="border-b-2 border-teal-800 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-teal-900">{clinic?.name || 'Apex Dental Care'}</h1>
              <p className="text-xs text-slate-600">{clinic?.address}</p>
              <p className="text-xs text-slate-600">Phone: {clinic?.phone} • Email: {clinic?.email}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-800 font-mono">INVOICE #{selectedInvoiceForPrint.invoiceNumber}</h2>
              <p className="text-xs text-slate-600">Issue Date: {formatClinicDate(selectedInvoiceForPrint.issueDate)}</p>
              <p className="text-xs text-slate-600">Due Date: {formatClinicDate(selectedInvoiceForPrint.dueDate)}</p>
            </div>
          </div>

          <div className="bg-slate-100 p-3 rounded-lg mb-6 flex justify-between text-xs">
            <div>
              <span className="font-bold">Billed To: </span>{selectedInvoiceForPrint.patientName}
            </div>
            <div>
              <span className="font-bold">Status: </span>
              <span className="font-semibold uppercase">{selectedInvoiceForPrint.status}</span>
            </div>
          </div>

          <table className="w-full text-left text-xs mb-6 border border-slate-300">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold">
              <tr>
                <th className="p-2">Description</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-right">Unit Price</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedInvoiceForPrint.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2">{it.description}</td>
                  <td className="p-2 text-center">{it.quantity}</td>
                  <td className="p-2 text-right">{currencySymbol} {it.unitPrice.toLocaleString()}</td>
                  <td className="p-2 text-right">{currencySymbol} {it.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{currencySymbol} {selectedInvoiceForPrint.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>{currencySymbol} {selectedInvoiceForPrint.discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{currencySymbol} {selectedInvoiceForPrint.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-slate-400 pt-1">
                <span>Total:</span>
                <span>{currencySymbol} {selectedInvoiceForPrint.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Paid Amount:</span>
                <span>{currencySymbol} {selectedInvoiceForPrint.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-800 border-t border-slate-200 pt-1">
                <span>Balance Due:</span>
                <span>{currencySymbol} {selectedInvoiceForPrint.balance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-6 flex justify-between text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Thank you for placing your trust in our dental care!</p>
              <p className="text-[10px] mt-1">Authorized Electronic Hospital Receipt</p>
            </div>
            <div className="text-center w-40 border-t border-slate-800 pt-1 font-bold text-slate-800">
              Authorized Cashier
            </div>
          </div>
        </div>
      )}

      {/* Printable Payment Receipt Component (Shows during window.print for receipts) */}
      {selectedPaymentForReceipt && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black">
          <div className="border-b-2 border-teal-800 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-teal-900">{clinic?.name || 'Apex Dental Care'}</h1>
              <p className="text-xs text-slate-600">{clinic?.address}</p>
              <p className="text-xs text-slate-600">Phone: {clinic?.phone} • Email: {clinic?.email}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-800 font-mono">PAYMENT RECEIPT</h2>
              <p className="text-xs text-slate-600">Receipt Date: {formatClinicDate(selectedPaymentForReceipt.date)}</p>
              <p className="text-xs text-slate-600 font-mono">Reference: {selectedPaymentForReceipt.referenceNumber || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-slate-100 p-4 rounded-lg mb-6 text-xs space-y-2">
            <div className="flex justify-between">
              <span><strong className="text-slate-800">Received From:</strong> {selectedPaymentForReceipt.patientName}</span>
              <span><strong className="text-slate-800">Payment Method:</strong> {selectedPaymentForReceipt.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span><strong className="text-slate-800">Patient Invoice Number:</strong> {selectedPaymentForReceipt.referenceNumber || 'Counter Receipt'}</span>
              <span><strong className="text-slate-800">Collected By:</strong> {selectedPaymentForReceipt.receivedBy || 'Authorized Cashier'}</span>
            </div>
          </div>

          <div className="border border-slate-300 rounded-lg p-6 my-6 text-center bg-teal-50/30">
            <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Amount Received</p>
            <p className="text-3xl font-extrabold text-teal-800 font-mono mt-1">
              {currencySymbol} {selectedPaymentForReceipt.amount.toLocaleString()}
            </p>
            {selectedPaymentForReceipt.notes && (
              <p className="text-xs text-slate-500 mt-2 italic">Note: {selectedPaymentForReceipt.notes}</p>
            )}
          </div>

          <div className="border-t border-slate-300 pt-6 flex justify-between text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Thank you for your payment!</p>
              <p className="text-[10px] mt-1">Official Electronic Practice Ledger Receipt</p>
            </div>
            <div className="text-center w-40 border-t border-slate-800 pt-1 font-bold text-slate-800">
              Official Stamp & Cashier
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal (Renders printable invoice on-screen ready for printing) */}
      <InvoicePreviewModal
        invoice={selectedInvoiceForPreview}
        isOpen={isInvoicePreviewModalOpen}
        onClose={() => {
          setIsInvoicePreviewModalOpen(false);
          setSelectedInvoiceForPreview(null);
        }}
        clinic={clinic}
        patient={patients.find((p) => p.id === selectedInvoiceForPreview?.patientId)}
        payments={payments}
      />
    </div>
  );
};
