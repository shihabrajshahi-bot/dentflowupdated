import React, { useState, useEffect } from 'react';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  ClinicSettings,
  UserRole,
  PracticeRoleDefinition,
  DashboardModuleId,
  DASHBOARD_MODULE_DEFINITIONS,
  Invoice,
  Patient,
} from '../../types/dental';
import { usePracticeRoles } from '../../hooks/usePracticeRoles';
import { ToothIcon } from '../LandingPage';
import {
  Settings,
  Building,
  Users,
  Shield,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Key,
  FileText,
  UserCheck,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Lock,
  ShieldCheck,
  Upload,
  Sparkles,
  Image as ImageIcon,
  History,
  CloudDownload,
  Globe,
  MapPin,
  Phone,
  Mail,
  Printer,
  Info,
  Edit3,
} from 'lucide-react';
import { CloudBackupManager } from './CloudBackupManager';
import { DentalInvoiceLogo, InvoicePreviewModal } from '../Billing/InvoicePreviewModal';

export const CURRENCY_OPTIONS = [
  { code: 'BDT', label: 'Bangladeshi Taka (BDT)', symbol: '৳' },
  { code: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { code: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { code: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { code: 'JPY', label: 'Japanese yen (JPY)', symbol: '¥' },
  { code: 'AUD', label: 'Australian dollar (AUD)', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian dollar (CAD)', symbol: 'C$' },
  { code: 'CHF', label: 'Swiss franc (CHF)', symbol: 'CHF' },
  { code: 'CNH', label: 'Chinese renminbi (CNH)', symbol: 'CN¥' },
  { code: 'HKD', label: 'Hong Kong dollar (HKD)', symbol: 'HK$' },
  { code: 'NZD', label: 'New Zealand dollar (NZD)', symbol: 'NZ$' },
];

interface SettingsViewProps {
  onNavigateToModule?: (mod: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateToModule }) => {
  const { clinic, updateClinic, userProfile, activeRole, switchActiveRole, hasPermission } = useAuth();

  const [name, setName] = useState(clinic?.name || 'Apex Dental Care & Implant Center');
  const [brandName, setBrandName] = useState(clinic?.brandName || 'DentFlow');
  const [slogan, setSlogan] = useState(clinic?.slogan || 'Apex Dental & Implant Centre');
  const [badgeText, setBadgeText] = useState(clinic?.badgeText || 'CLINICAL SUITE');
  const [logoUrl, setLogoUrl] = useState<string>(clinic?.logoUrl || '');
  const [logoError, setLogoError] = useState<string | null>(null);

  const [phone, setPhone] = useState(clinic?.phone || '+880 1711 223344');
  const [email, setEmail] = useState(clinic?.email || 'info@brightsmiles.com');
  const [address, setAddress] = useState(clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh');
  const [website, setWebsite] = useState(clinic?.website || 'www.brightsmiles.com');
  const [currency, setCurrency] = useState(clinic?.currency || 'BDT');
  const [currencySymbol, setCurrencySymbol] = useState(clinic?.currencySymbol || '৳');
  const [invoicePrefix, setInvoicePrefix] = useState(clinic?.invoicePrefix || 'ADC');
  const [taxRate, setTaxRate] = useState<number>(clinic?.taxRate || 5);
  const [defaultDuration, setDefaultDuration] = useState<number>(clinic?.defaultAppointmentDuration || 30);

  const [activeTab, setActiveTab] = useState<'practice' | 'invoice'>('practice');
  const [savingPractice, setSavingPractice] = useState(false);
  const [practiceSavedMsg, setPracticeSavedMsg] = useState<string | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceSavedMsg, setInvoiceSavedMsg] = useState<string | null>(null);

  // Dedicated Header and Footer customization & save states
  const [isEditingHeader, setIsEditingHeader] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerSavedMsg, setHeaderSavedMsg] = useState<string | null>(null);
  const [savingFooter, setSavingFooter] = useState(false);
  const [footerSavedMsg, setFooterSavedMsg] = useState<string | null>(null);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);

  // Invoice Footer Customizable Fields State
  const DEFAULT_NOTES = [
    "Please follow the dentist's care instructions for a faster recovery.",
    'The next appointment is recommended in 6 months for a regular check-up.',
    `For any questions, please contact us at ${clinic?.phone || '+880 1711 223344'}.`,
  ];

  const [invoiceNotes, setInvoiceNotes] = useState<string[]>(
    clinic?.invoiceNotes && clinic.invoiceNotes.length > 0
      ? clinic.invoiceNotes
      : DEFAULT_NOTES
  );
  const [invoiceThankYouMessage, setInvoiceThankYouMessage] = useState<string>(
    clinic?.invoiceThankYouMessage || 'Thank you!'
  );
  const [invoiceFollowUpMessage, setInvoiceFollowUpMessage] = useState<string>(
    clinic?.invoiceFollowUpMessage || 'We look forward to seeing you again!'
  );
  const [invoiceFooterClinicName, setInvoiceFooterClinicName] = useState<string>(
    clinic?.invoiceFooterClinicName || `${clinic?.name || 'Bright Smiles'} Dental Clinic`
  );

  // Sync state if clinic data updates from Firestore
  useEffect(() => {
    if (clinic) {
      if (clinic.name) setName(clinic.name);
      if (clinic.brandName !== undefined) setBrandName(clinic.brandName || 'DentFlow');
      if (clinic.slogan !== undefined) setSlogan(clinic.slogan || 'Healthy Teeth • Brighter Smiles • Better Lives');
      if (clinic.badgeText !== undefined) setBadgeText(clinic.badgeText || 'DENTAL CLINIC');
      if (clinic.logoUrl !== undefined) setLogoUrl(clinic.logoUrl || '');
      if (clinic.phone) setPhone(clinic.phone);
      if (clinic.email) setEmail(clinic.email);
      if (clinic.address) setAddress(clinic.address);
      if (clinic.website !== undefined) setWebsite(clinic.website || 'www.brightsmiles.com');
      if (clinic.currency) setCurrency(clinic.currency);
      if (clinic.currencySymbol) setCurrencySymbol(clinic.currencySymbol);
      if (clinic.invoicePrefix) setInvoicePrefix(clinic.invoicePrefix);
      if (clinic.taxRate !== undefined) setTaxRate(clinic.taxRate);
      if (clinic.defaultAppointmentDuration) setDefaultDuration(clinic.defaultAppointmentDuration);

      // Sync footer fields
      if (clinic.invoiceNotes && clinic.invoiceNotes.length > 0) {
        setInvoiceNotes(clinic.invoiceNotes);
      }
      if (clinic.invoiceThankYouMessage !== undefined) {
        setInvoiceThankYouMessage(clinic.invoiceThankYouMessage || 'Thank you!');
      }
      if (clinic.invoiceFollowUpMessage !== undefined) {
        setInvoiceFollowUpMessage(clinic.invoiceFollowUpMessage || 'We look forward to seeing you again!');
      }
      if (clinic.invoiceFooterClinicName !== undefined) {
        setInvoiceFooterClinicName(clinic.invoiceFooterClinicName || `${clinic.name || 'Bright Smiles'} Dental Clinic`);
      }
    }
  }, [clinic]);

  // Handle clinic logo upload with canvas optimization
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      if (file.type === 'image/svg+xml' || file.size < 60 * 1024) {
        setLogoUrl(result);
        return;
      }

      // Optimize image dimensions for header badge
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimized = canvas.toDataURL('image/png', 0.9);
          setLogoUrl(optimized);
        } else {
          setLogoUrl(result);
        }
      };
      img.onerror = () => {
        setLogoUrl(result);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setLogoError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoError(null);
  };

  const hasAdminOrOwner =
    ['owner', 'admin', 'administrator'].includes(String(activeRole).toLowerCase()) ||
    hasPermission(['Owner', 'Admin']);
  const isOwner = hasAdminOrOwner;
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;

  // Real-time Practice Roles (Add & Delete inside Clinic Settings)
  const { allRoles, createRole, deleteRole, loadingRoles } = usePracticeRoles(clinicId, {
    activeRole,
    isOwner: hasAdminOrOwner,
    userEmail: userProfile?.email,
  });
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<PracticeRoleDefinition | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [savingNewRole, setSavingNewRole] = useState(false);
  const [roleActionToast, setRoleActionToast] = useState<string | null>(null);
  const [roleActionError, setRoleActionError] = useState<string | null>(null);
  const [newRoleForm, setNewRoleForm] = useState<{
    name: string;
    category: PracticeRoleDefinition['category'];
    description: string;
    permissions: DashboardModuleId[];
  }>({
    name: '',
    category: 'Clinical',
    description: '',
    permissions: ['dashboard', 'patients', 'appointments'],
  });

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleActionError(null);

    // Verify user activeRole has ADMIN or OWNER privileges
    if (!hasAdminOrOwner) {
      setRoleActionError(
        `Permission Restriction: Your current active role is "${activeRole}". Creating clinical roles (e.g. "${newRoleForm.name || 'Surgeon'}") requires Clinic OWNER or ADMIN privileges. Please switch to the Owner role using the portal switcher in the top navigation.`
      );
      return;
    }

    setSavingNewRole(true);
    try {
      const created = await createRole(newRoleForm);
      setRoleActionToast(`Practice role "${created.name}" created successfully and deployed to clinic registry.`);
      setIsAddRoleModalOpen(false);
      setNewRoleForm({
        name: '',
        category: 'Clinical',
        description: '',
        permissions: ['dashboard', 'patients', 'appointments'],
      });
      setTimeout(() => setRoleActionToast(null), 4000);
    } catch (err: any) {
      setRoleActionError(err.message || 'Failed to create practice role.');
    } finally {
      setSavingNewRole(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete || !isOwner) return;
    setDeletingRole(true);
    setRoleActionError(null);
    try {
      await deleteRole(roleToDelete);
      setRoleActionToast(`Role "${roleToDelete.name}" deleted successfully.`);
      setRoleToDelete(null);
      setTimeout(() => setRoleActionToast(null), 4000);
    } catch (err: any) {
      setRoleActionError(err.message || 'Failed to delete practice role.');
    } finally {
      setDeletingRole(false);
    }
  };

  const handleSavePractice = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isOwner) return;
    setSavingPractice(true);
    setPracticeSavedMsg(null);
    try {
      await updateClinic({
        name: name.trim(),
        brandName: brandName.trim() || 'Bright Smiles',
        slogan: slogan.trim() || 'Healthy Teeth • Brighter Smiles • Better Lives',
        badgeText: badgeText.trim() || 'DENTAL CLINIC',
        logoUrl: logoUrl || '',
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        website: website.trim(),
        defaultAppointmentDuration: Number(defaultDuration),
      });
      setPracticeSavedMsg('Practice details and custom branding saved successfully!');
      setTimeout(() => setPracticeSavedMsg(null), 4000);
    } catch (err: any) {
      console.error('Practice save error:', err);
    } finally {
      setSavingPractice(false);
    }
  };

  const handleSaveInvoiceConfig = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isOwner) return;
    setSavingInvoice(true);
    setInvoiceSavedMsg(null);
    try {
      const cleaned = invoiceNotes.filter((n) => n.trim().length > 0);
      await updateClinic({
        name: name.trim(),
        brandName: brandName.trim() || 'Bright Smiles',
        slogan: slogan.trim() || 'Healthy Teeth • Brighter Smiles • Better Lives',
        badgeText: badgeText.trim() || 'DENTAL CLINIC',
        logoUrl: logoUrl || '',
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        website: website.trim(),
        invoiceNotes: cleaned.length > 0 ? cleaned : DEFAULT_NOTES,
        invoiceThankYouMessage: invoiceThankYouMessage.trim() || 'Thank you!',
        invoiceFollowUpMessage: invoiceFollowUpMessage.trim() || 'We look forward to seeing you again!',
        invoiceFooterClinicName: invoiceFooterClinicName.trim() || `${name || 'Bright Smiles'} Dental Clinic`,
        currency,
        currencySymbol,
        invoicePrefix: invoicePrefix.trim(),
        taxRate: Number(taxRate),
      });
      setInvoiceSavedMsg('Invoice configuration (header, footer & billing rules) saved successfully!');
      setTimeout(() => setInvoiceSavedMsg(null), 4000);
    } catch (err: any) {
      console.error('Invoice save error:', err);
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleSaveHeader = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isOwner) return;
    setSavingHeader(true);
    setHeaderSavedMsg(null);
    try {
      await updateClinic({
        name: name.trim(),
        brandName: brandName.trim() || 'Bright Smiles',
        slogan: slogan.trim() || 'Healthy Teeth • Brighter Smiles • Better Lives',
        badgeText: badgeText.trim() || 'DENTAL CLINIC',
        logoUrl: logoUrl || '',
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        website: website.trim(),
      });
      setHeaderSavedMsg('Patient invoice header branding and contact details saved successfully!');
      setTimeout(() => setHeaderSavedMsg(null), 4000);
    } catch (err: any) {
      console.error('Header save error:', err);
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSaveFooter = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isOwner) return;
    setSavingFooter(true);
    setFooterSavedMsg(null);
    try {
      const cleaned = invoiceNotes.filter((n) => n.trim().length > 0);
      await updateClinic({
        invoiceNotes: cleaned.length > 0 ? cleaned : DEFAULT_NOTES,
        invoiceThankYouMessage: invoiceThankYouMessage.trim() || 'Thank you!',
        invoiceFollowUpMessage: invoiceFollowUpMessage.trim() || 'We look forward to seeing you again!',
        invoiceFooterClinicName: invoiceFooterClinicName.trim() || `${name || 'Bright Smiles'} Dental Clinic`,
      });
      setFooterSavedMsg('Invoice footer notes and calligraphy signature saved successfully!');
      setTimeout(() => setFooterSavedMsg(null), 4000);
    } catch (err: any) {
      console.error('Footer save error:', err);
    } finally {
      setSavingFooter(false);
    }
  };

  // Sample data for the Live Invoice Preview Modal
  const sampleInvoiceData: Invoice = {
    id: 'sample-inv-01',
    clinicId: clinic?.id || DEFAULT_CLINIC_ID,
    patientId: 'P-000123',
    patientName: 'Rahat Ahmed',
    invoiceNumber: `${invoicePrefix || 'ADC'}-2026-00124`,
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    items: [
      { id: '1', description: 'Comprehensive Dental Examination', toothOrArea: '—', quantity: 1, unitPrice: 1000, total: 1000 },
      { id: '2', description: 'Digital X-Ray (Intraoral)', toothOrArea: '—', quantity: 1, unitPrice: 800, total: 800 },
      { id: '3', description: 'Scaling & Polishing', toothOrArea: '—', quantity: 1, unitPrice: 2500, total: 2500 },
      { id: '4', description: 'Composite Filling', toothOrArea: 'Tooth #36', quantity: 1, unitPrice: 3500, total: 3500 },
      { id: '5', description: 'Fluoride Application', toothOrArea: '—', quantity: 1, unitPrice: 800, total: 800 },
    ],
    subtotal: 8600,
    discount: 0,
    tax: 0,
    total: 8600,
    paidAmount: 8600,
    balance: 0,
    status: 'Paid',
    notes: 'Standard clinical dental care package.',
    createdBy: 'Dr. Shihab Hossain',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const samplePatientData: Patient = {
    id: 'P-000123',
    clinicId: clinic?.id || DEFAULT_CLINIC_ID,
    patientIdNumber: 'P-000123',
    fullName: 'Rahat Ahmed',
    dateOfBirth: '1990-08-15',
    gender: 'Male',
    phone: '+880 1812 345678',
    email: 'rahat.ahmed@email.com',
    consentGiven: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" />
            Clinic Configuration & Staff Administration
          </h3>
          <p className="text-xs text-slate-500">
            Manage practice profile, currency settings, operational hours, and role assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && onNavigateToModule && (
            <button
              type="button"
              onClick={() => onNavigateToModule('log_history')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <History className="w-4 h-4 text-amber-700" />
              <span>Practice Log History</span>
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('cloud-backup-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el.classList.add('ring-2', 'ring-teal-500', 'ring-offset-2');
                  setTimeout(() => el.classList.remove('ring-2', 'ring-teal-500', 'ring-offset-2'), 2000);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="Jump to Cloud Backup & JSON Data Export"
            >
              <CloudDownload className="w-4 h-4 text-teal-600" />
              <span>Cloud Backup (.JSON)</span>
            </button>
          )}
        </div>
      </div>

      {/* Consolidated Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'practice'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Practice Details & Custom Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'invoice'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Invoice Configuration (Header, Footer & Billing)</span>
        </button>
      </div>

      {/* TAB 2: INVOICE CONFIGURATION */}
      {activeTab === 'invoice' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-600" />
                Invoice Configuration & Customization
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure patient invoice header branding, footer clinical notes, calligraphy greeting, and financial billing rules.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isOwner && (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200 shrink-0">
                  Read Only (Requires Clinic Owner)
                </span>
              )}
              {isOwner && (
                <button
                  type="button"
                  disabled={savingInvoice}
                  onClick={handleSaveInvoiceConfig}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                  title="Save Invoice Configuration"
                >
                  {savingInvoice ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Invoice Setup...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Invoice Configuration</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {invoiceSavedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{invoiceSavedMsg}</span>
            </div>
          )}

          {/* Live Interactive Header Previews */}
          <div className="space-y-4">
            {/* Patient Invoice Header (Red-Circled Customizable Section) */}
            <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-rose-400 bg-rose-50/10 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    Patient Invoice Header (Red-Circled Customizable Section)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingHeader(!isEditingHeader)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer border border-slate-300"
                    title={isEditingHeader ? 'Hide Header Customization Form' : 'Show Header Customization Form'}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isEditingHeader ? 'Hide Header Editor' : 'Edit Header'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowInvoicePreviewModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Open Full Printable Invoice Preview Modal"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Live Invoice Preview</span>
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      disabled={savingHeader}
                      onClick={handleSaveHeader}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      title="Save Header Settings"
                    >
                      {savingHeader ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Header...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Header</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {headerSavedMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{headerSavedMsg}</span>
                </div>
              )}

              {/* Simulated Live Invoice Header */}
              <div className="overflow-x-auto pb-1">
                <div className="min-w-[500px] sm:min-w-0 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-3">
                    {/* Left: Logo + Name + Subtitle + Slogan */}
                    <div className="flex items-start gap-3">
                      <DentalInvoiceLogo
                        logoUrl={logoUrl}
                        clinicName={name}
                        className="w-14 h-14 sm:w-16 sm:h-16 shrink-0"
                      />
                      <div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-[#008f8a] leading-none">
                          {name || 'Bright Smiles'}
                        </h3>
                        <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-[#00a896] uppercase mt-1">
                          {badgeText || 'DENTAL CLINIC'}
                        </div>
                        <p className="text-[11px] text-[#0f766e] font-medium mt-1">
                          {slogan || 'Healthy Teeth • Brighter Smiles • Better Lives'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Address, Phone, Email, Website */}
                    <div className="space-y-1 text-right text-[11px] text-slate-600 sm:text-right shrink-0 w-full sm:w-auto">
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span className="text-slate-700">{address || '123 Wellness Drive, Dhaka 1205, Bangladesh'}</span>
                        <MapPin className="w-3 h-3 text-[#00a896] shrink-0" />
                      </div>
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span className="font-medium text-slate-700">{phone || '+880 1711 223344'}</span>
                        <Phone className="w-3 h-3 text-[#00a896] shrink-0" />
                      </div>
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span className="text-slate-700">{email || 'info@brightsmiles.com'}</span>
                        <Mail className="w-3 h-3 text-[#00a896] shrink-0" />
                      </div>
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span className="font-medium text-[#00a896]">{website || 'www.brightsmiles.com'}</span>
                        <Globe className="w-3 h-3 text-[#00a896] shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Full-width teal divider line */}
                  <div className="w-full h-[1.5px] bg-[#00a896]/70 mt-1" />
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500">
                * Any changes to clinic logo, name, slogan, phone, email, address, and website below will instantly reflect across patient invoices, PDF downloads, and printed slips.
              </p>

              {/* Interactive Customization Inputs for Header */}
              {isEditingHeader && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4 animate-in fade-in">
                  <div className="border-b border-slate-200/70 pb-2">
                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Customize Header Branding, Logo, Slogan & Contact Information</span>
                    </h5>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                      Edit header fields directly. Real-time updates reflect in the preview above and on all patient invoices.
                    </p>
                  </div>

                  {/* Header Logo Upload */}
                  <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-white space-y-2">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Invoice Header Logo / Brand Icon
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="relative group shrink-0">
                        {logoUrl ? (
                          <div className="relative">
                            <img
                              src={logoUrl}
                              alt="Logo Preview"
                              className="w-14 h-14 rounded-lg object-contain bg-white border border-slate-300 p-1 shadow-xs"
                            />
                            {isOwner && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs cursor-pointer"
                                title="Remove custom logo"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-teal-700 text-white flex items-center justify-center border border-teal-800 shadow-xs">
                            <ToothIcon className="w-7 h-7 text-teal-100" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 flex-1">
                        {isOwner && (
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-teal-600" />
                              <span>Upload Logo Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </label>
                            {logoUrl && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Reset to Default Icon
                              </button>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400">
                          Recommended: Square PNG, SVG, or JPG (max 2MB).
                        </p>
                        {logoError && (
                          <p className="text-[10px] text-rose-600 font-semibold">{logoError}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clinic Name & Tagline & Slogan */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Registered Clinic / Practice Name *
                      </label>
                      <input
                        type="text"
                        disabled={!isOwner}
                        value={name}
                        placeholder="e.g. Apex Dental Care & Implant Center"
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-bold bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Primary headline at top of invoice
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Header Tagline / Badge *
                      </label>
                      <input
                        type="text"
                        disabled={!isOwner}
                        value={badgeText}
                        placeholder="e.g. CLINICAL SUITE or DENTAL CLINIC"
                        onChange={(e) => setBadgeText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase tracking-wider font-semibold bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Small uppercase badge under clinic name
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Practice Slogan / Mission *
                      </label>
                      <input
                        type="text"
                        disabled={!isOwner}
                        value={slogan}
                        placeholder="e.g. Healthy Teeth • Brighter Smiles • Better Lives"
                        onChange={(e) => setSlogan(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Subheading motto below the badge
                      </span>
                    </div>
                  </div>

                  {/* Contact & Address Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/70">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Direct Phone</label>
                      <input
                        type="text"
                        disabled={!isOwner}
                        value={phone}
                        placeholder="e.g. +880 1711 223344"
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Clinic Email</label>
                      <input
                        type="email"
                        disabled={!isOwner}
                        value={email}
                        placeholder="e.g. info@brightsmiles.com"
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Website URL</label>
                      <input
                        type="text"
                        disabled={!isOwner}
                        value={website}
                        placeholder="e.g. www.brightsmiles.com"
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Physical Address</label>
                      <input
                        type="text"
                        disabled={!isOwner}
                        value={address}
                        placeholder="e.g. 123 Wellness Drive, Dhaka"
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[10.5px] text-slate-500">
                    <span>Changes to clinic logo, name, slogan, and contact info reflect immediately on patient invoices.</span>
                    <span className="text-teal-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      Save changes using "Save Header" above
                    </span>
                  </div>
                </div>
              )}
            </div>

          {/* Patient Invoice Footer (Red-Circled Customizable Section) */}
          <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-rose-400 bg-rose-50/10 shadow-xs space-y-4 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  Patient Invoice Footer (Red-Circled Customizable Section)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-bold">
                  Live Footer Preview
                </span>
                {isOwner && (
                  <button
                    type="button"
                    disabled={savingFooter}
                    onClick={handleSaveFooter}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    title="Save Footer Settings"
                  >
                    {savingFooter ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Footer...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Footer</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {footerSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{footerSavedMsg}</span>
              </div>
            )}

            {/* Simulated Live Invoice Footer (matching the user's attached invoice) */}
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[500px] sm:min-w-0 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  {/* Notes Column */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[#00a896] font-bold text-xs">
                      <Info className="w-4 h-4" />
                      <span>Notes</span>
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
                      {invoiceNotes.map((note, nIdx) => (
                        <li key={nIdx}>{note}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Right: Signature & "Thank you!" Calligraphy */}
                  <div className="text-center sm:text-right flex flex-col items-center sm:items-end justify-center">
                    <div className="relative mb-1">
                      <span
                        style={{
                          fontFamily: "'Dancing Script', 'Caveat', 'Brush Script MT', 'Segoe Script', cursive",
                        }}
                        className="text-4xl text-[#00a896] font-bold tracking-wide italic select-none inline-block transform -rotate-2"
                      >
                        {invoiceThankYouMessage}
                      </span>
                      <svg
                        viewBox="0 0 160 20"
                        className="w-36 h-3 text-[#00a896] -mt-1 mx-auto sm:ml-auto"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="M 5 8 Q 80 18 155 6" />
                      </svg>
                    </div>

                    <p className="text-[11.5px] text-slate-600 font-medium">
                      {invoiceFollowUpMessage}
                    </p>

                    <div className="w-44 h-[1px] bg-[#00a896]/50 my-2 mx-auto sm:ml-auto sm:mr-0" />

                    <p className="text-xs font-semibold text-[#009688]">
                      {invoiceFooterClinicName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Customization Inputs for Footer */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
              <h5 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                <span>Customize Footer Notes, Thank You Text & Signatures</span>
                <span className="text-[10.5px] font-normal text-slate-500">
                  Reflects instantly in invoice previews, PDF downloads, and prints
                </span>
              </h5>

              {/* Editable Bullet Points */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700 text-[11px]">
                    Clinical Advisory & Care Notes (Bullet Points)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceNotes([
                        "Please follow the dentist's care instructions for a faster recovery.",
                        'The next appointment is recommended in 6 months for a regular check-up.',
                        `For any questions, please contact us at ${phone || '+880 1711 223344'}.`,
                      ]);
                    }}
                    className="text-[10.5px] text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
                  >
                    Reset Standard Notes
                  </button>
                </div>

                <div className="space-y-2">
                  {invoiceNotes.map((noteText, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-teal-600 font-bold">•</span>
                      <input
                        type="text"
                        disabled={!isOwner}
                        value={noteText}
                        onChange={(e) => {
                          const updated = [...invoiceNotes];
                          updated[idx] = e.target.value;
                          setInvoiceNotes(updated);
                        }}
                        placeholder={`Note point #${idx + 1}`}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                      />
                      {invoiceNotes.length > 1 && isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceNotes(invoiceNotes.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Remove note bullet point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setInvoiceNotes([...invoiceNotes, ''])}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-teal-300 hover:bg-teal-50 text-teal-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                    <span>Add Note Bullet Point</span>
                  </button>
                )}
              </div>

              {/* Thank You & Subtext Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                    Thank You Cursive Title *
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={invoiceThankYouMessage}
                    placeholder="e.g. Thank you!"
                    onChange={(e) => setInvoiceThankYouMessage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Large script handwriting heading
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                    Follow-Up Subtitle *
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={invoiceFollowUpMessage}
                    placeholder="e.g. We look forward to seeing you again!"
                    onChange={(e) => setInvoiceFollowUpMessage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Subtitle beneath the greeting
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                    Footer Practice Signature *
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={invoiceFooterClinicName}
                    placeholder="e.g. Bright Smiles Dental Clinic"
                    onChange={(e) => setInvoiceFooterClinicName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Clinic title beneath the divider stroke
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[10.5px] text-slate-500">
                <span>Changes to clinical notes and signature apply immediately across patient invoices.</span>
                <span className="text-teal-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Save changes using "Save Footer" above
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Financial Configuration */}
        <div className="pt-4 border-t border-slate-200">
          <div className="mb-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-600" />
              Financial & Invoicing Configuration
            </h4>
            <p className="text-[11px] text-slate-500">
              Configure practice transaction currency, billing symbols, invoice numbering prefix, and tax rates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clinic Currency *</label>
              <select
                disabled={!isOwner}
                value={currency}
                onChange={(e) => {
                  const selectedCode = e.target.value;
                  setCurrency(selectedCode);
                  const opt = CURRENCY_OPTIONS.find((c) => c.code === selectedCode);
                  if (opt) setCurrencySymbol(opt.symbol);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol *</label>
              <input
                type="text"
                disabled={!isOwner}
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-bold bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Code Prefix *</label>
              <input
                type="text"
                disabled={!isOwner}
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax / VAT Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                disabled={!isOwner}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono bg-white"
              />
            </div>
          </div>
        </div>

        {/* Tab 2 Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            All invoice branding, clinical notes, calligraphy signatures, currency, and tax rates are applied across patient invoices and receipts.
          </div>
          {isOwner && (
            <button
              type="button"
              disabled={savingInvoice}
              onClick={handleSaveInvoiceConfig}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
              title="Save Invoice Configuration"
            >
              {savingInvoice ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Invoice Setup...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-teal-100" />
                  <span>Save Invoice Configuration</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      )}

      {/* TAB 1: PRACTICE DETAILS & CUSTOM BRANDING */}
      {activeTab === 'practice' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-teal-600" />
                Practice Details & Custom Branding
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Customize practice identity, logo, brand name, header slogan, and badge shown on the landing page and navigation header.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isOwner && (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200 shrink-0">
                  Read Only (Requires Clinic Owner)
                </span>
              )}
              {isOwner && (
                <button
                  type="button"
                  disabled={savingPractice}
                  onClick={handleSavePractice}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                  title="Save Practice Details"
                >
                  {savingPractice ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Practice Details...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Practice Details</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {practiceSavedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{practiceSavedMsg}</span>
            </div>
          )}

        {/* Logo Upload Section */}
        <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-3">
          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
            Clinic Logo / Brand Image
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group shrink-0">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-300 p-1 shadow-xs"
                  />
                  {isOwner && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-xs shadow-xs cursor-pointer"
                      title="Remove custom logo"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-teal-700 text-white flex items-center justify-center border border-teal-800 shadow-xs">
                  <ToothIcon className="w-8 h-8 text-teal-100" />
                </div>
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              {isOwner && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-teal-600" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reset to Default Icon
                    </button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Recommended: Square PNG, SVG, or JPG with transparent or clean background (max 2MB). Automatically optimized.
              </p>
              {logoError && (
                <p className="text-[11px] text-rose-600 font-semibold">{logoError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Branding & Clinic Name Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              System / Brand Name *
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={brandName}
              placeholder="e.g. DentFlow"
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Main brand title (e.g. DentFlow or your dental practice brand)
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Header Badge / Tagline *
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={badgeText}
              placeholder="e.g. CLINICAL SUITE"
              onChange={(e) => setBadgeText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold uppercase bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Badge next to brand (e.g. CLINICAL SUITE, DENTAL CARE, SURGERY)
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Clinic Registered Name *
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={name}
              placeholder="e.g. Apex Dental Care & Implant Center"
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Official legal/registered practice name
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Clinic Slogan / Header Tagline *
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={slogan}
              placeholder="e.g. Healthy Teeth • Brighter Smiles • Better Lives"
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Tagline displayed beneath the clinic name in the invoice header
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone</label>
            <input
              type="text"
              disabled={!isOwner}
              value={phone}
              placeholder="e.g. +880 1711 223344"
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Clinic Email</label>
            <input
              type="email"
              disabled={!isOwner}
              value={email}
              placeholder="e.g. info@brightsmiles.com"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#00a896]" />
              <span>Official Clinic Website *</span>
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={website}
              placeholder="e.g. www.brightsmiles.com"
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Website URL displayed in invoice header and patient communications
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Physical Practice Address</label>
            <input
              type="text"
              disabled={!isOwner}
              value={address}
              placeholder="e.g. 123 Wellness Drive, Dhaka 1205, Bangladesh"
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Physical address rendered at top-right of the patient invoice
            </span>
          </div>
        </div>

        {/* Operational Schedule & Chairs */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            Scheduling & Chair Allocations
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Slot Duration</label>
              <select
                disabled={!isOwner}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Treatment Rooms / Operatories</label>
              <div className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                Operatory 1 (General Chair) • Operatory 2 (Surgical Suite) • Operatory 3 (Hygiene Bay)
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1 Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            Changes to practice name, header slogan, logo, phone, email, address, and website apply immediately to your clinic portal and invoices.
          </div>
          {isOwner && (
            <button
              type="button"
              disabled={savingPractice}
              onClick={handleSavePractice}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
              title="Save Practice Details"
            >
              {savingPractice ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Practice Details...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-teal-100" />
                  <span>Save Practice Details</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      )}

      {/* Assigned Clinical / Administrative Roles Management (Owner Create, Add & Delete) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                OWNER ROLE GOVERNANCE
              </span>
            </div>
            <h4 className="font-bold text-slate-800 text-sm mt-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Assigned Clinical / Administrative Roles ({allRoles.length})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Create, add, or delete clinical and administrative staff roles. Newly configured roles immediately appear in staff registration and permission rosters.
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsAddRoleModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Practice Role</span>
            </button>
          )}
        </div>

        {/* Action feedback notifications */}
        {roleActionToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{roleActionToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setRoleActionToast(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {roleActionError && (
          <div className="p-4 bg-rose-50/95 border-2 border-rose-300 text-rose-900 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-300">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs uppercase tracking-wide text-rose-800">
                    Authorization & Permission Notice
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/90 text-rose-900 border border-rose-300">
                    Active Role: {activeRole}
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {roleActionError}
                </p>
                {!hasAdminOrOwner && (
                  <p className="text-[11px] text-rose-700 font-semibold">
                    💡 Clinical and administrative practice roles are restricted to Clinic Owners & Practice Administrators to protect practice governance.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {!hasAdminOrOwner && (
                <button
                  type="button"
                  onClick={() => {
                    switchActiveRole('Owner');
                    setRoleActionError(null);
                    setRoleActionToast('Switched to Owner role. You now have full practice governance privileges.');
                    setTimeout(() => setRoleActionToast(null), 4000);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Switch to Owner Role</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setRoleActionError(null)}
                className="text-rose-500 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-100 transition-colors font-bold cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Roles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allRoles.map((role) => {
            const isOwnerRole = role.name === 'Owner';
            const categoryBadge =
              role.category === 'Clinical'
                ? 'border-sky-300 bg-sky-50/70 text-sky-900'
                : role.category === 'Financial'
                ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900'
                : role.category === 'Front Desk'
                ? 'border-amber-300 bg-amber-50/70 text-amber-900'
                : role.category === 'Administrative'
                ? 'border-teal-300 bg-teal-50/70 text-teal-900'
                : 'border-violet-300 bg-violet-50/70 text-violet-900';

            return (
              <div
                key={role.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-bold text-slate-900 text-xs truncate" title={role.name}>
                      {role.name}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${categoryBadge}`}
                    >
                      {role.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {role.isSystemRole ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        System Default
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        Custom Role
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-3">
                    {role.description}
                  </p>

                  <div className="pt-1.5 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Allowed Modules ({role.permissions.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map((modId) => {
                        const modDef = DASHBOARD_MODULE_DEFINITIONS.find((m) => m.id === modId);
                        return (
                          <span
                            key={modId}
                            className="text-[9.5px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                          >
                            {modDef?.name.split(' ')[0] || modId}
                          </span>
                        );
                      })}
                      {role.permissions.length > 3 && (
                        <span className="text-[9.5px] font-bold text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                          +{role.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  {isOwnerRole ? (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Locked
                    </span>
                  ) : (
                    isOwner && (
                      <button
                        type="button"
                        onClick={() => setRoleToDelete(role)}
                        className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition-colors cursor-pointer ml-auto"
                        title={`Delete ${role.name}`}
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cloud-Based Backup & Full JSON Snapshot Manager (Clinic Owner Only) */}
      <div id="cloud-backup-section" className="transition-all duration-300 rounded-xl">
        <CloudBackupManager />
      </div>

      {/* Account Recovery, Ownership Verification & Administrative Handover Process */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
        <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-teal-600" />
          Administrative Handover & Disaster Recovery Protocol
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block text-xs">1. Ownership Verification</span>
            <p className="text-[11px] leading-relaxed">
              Clinic root governance is tied to the registered clinic owner. Primary administrative email: <strong className="text-slate-800">shihab.rajshahi@gmail.com</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block text-xs">2. Administrative Handover</span>
            <p className="text-[11px] leading-relaxed">
              To transfer clinic ownership, the current Owner updates the clinic <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded">ownerId</code> field via verified Firestore security rules.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block text-xs">3. Security Auditing</span>
            <p className="text-[11px] leading-relaxed">
              All clinical notes and invoice modifications generate timestamped audit entries. Former staff access can be revoked immediately by toggling active status.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW PRACTICE ROLE (Inside Clinic Settings)                     */}
      {/* ========================================================================= */}
      {isAddRoleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="bg-[#0F3942] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-700/80 text-teal-200 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">Create New Practice Role</h3>
                    <span
                      className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border ${
                        hasAdminOrOwner
                          ? 'bg-teal-800/90 text-teal-200 border-teal-500/40'
                          : 'bg-rose-500/30 text-rose-200 border-rose-400/50'
                      }`}
                    >
                      {hasAdminOrOwner ? `Authorized (${activeRole})` : `Requires Owner/Admin (Current: ${activeRole})`}
                    </span>
                  </div>
                  <p className="text-xs text-teal-200/80">
                    Define role title, category, and baseline dashboard permissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoleModalOpen(false)}
                className="text-teal-300 hover:text-white p-1 rounded-lg hover:bg-teal-800/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-modal Permission or Validation Error Alert */}
            {roleActionError && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-xl space-y-2 animate-in fade-in shrink-0">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-medium space-y-1">
                    <span className="font-bold text-rose-900 block">
                      Permission Verification Failed
                    </span>
                    <p className="text-rose-800 leading-snug">{roleActionError}</p>
                  </div>
                </div>

                {!hasAdminOrOwner && (
                  <div className="pt-2 border-t border-rose-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-rose-700 font-medium">
                      Current role: <strong>{activeRole}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        switchActiveRole('Owner');
                        setRoleActionError(null);
                        setRoleActionToast('Switched to Owner role. You can now create this practice role.');
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Switch to Owner Role</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Role Title */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                  Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dental Assistant, Oral Hygienist, Treatment Coordinator"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              {/* Classification */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                  Role Classification / Category *
                </label>
                <select
                  value={newRoleForm.category}
                  onChange={(e) =>
                    setNewRoleForm({
                      ...newRoleForm,
                      category: e.target.value as PracticeRoleDefinition['category'],
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="Clinical">Clinical (Surgeons, Associate Dentists, Dental Assistants)</option>
                  <option value="Front Desk">Front Desk (Patient Reception, Scheduling, Queue)</option>
                  <option value="Financial">Financial (Billing, Cashier, Practice Margins)</option>
                  <option value="Support">Support (Sterilization, Dental Supplies, Technicians)</option>
                  <option value="Administrative">Administrative (Office Governance & Management)</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                  Scope & Responsibilities
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe clinical or operational duties for this role..."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 resize-none"
                />
              </div>

              {/* Baseline Permissions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                    Baseline Dashboard Modules ({newRoleForm.permissions.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNewRoleForm({
                          ...newRoleForm,
                          permissions: DASHBOARD_MODULE_DEFINITIONS.filter((m) => !m.ownerOnly).map((m) => m.id),
                        })
                      }
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setNewRoleForm({ ...newRoleForm, permissions: ['dashboard'] })}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Minimal
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {DASHBOARD_MODULE_DEFINITIONS.filter((m) => !m.ownerOnly).map((mod) => {
                    const checked = newRoleForm.permissions.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-teal-50/80 border-teal-300 text-teal-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRoleForm({
                                ...newRoleForm,
                                permissions: [...newRoleForm.permissions, mod.id],
                              });
                            } else {
                              setNewRoleForm({
                                ...newRoleForm,
                                permissions: newRoleForm.permissions.filter((p) => p !== mod.id),
                              });
                            }
                          }}
                          className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <span className="text-[11px] truncate">{mod.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 shrink-0">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 self-start sm:self-center">
                  {hasAdminOrOwner ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Privileged session ({activeRole})
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      Requires Owner or Admin to deploy
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end">
                  {!hasAdminOrOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        switchActiveRole('Owner');
                        setRoleActionError(null);
                        setRoleActionToast('Switched to Owner role. You can now save and deploy.');
                      }}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Switch to Owner</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddRoleModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-semibold cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingNewRole}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {savingNewRole ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving Role...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Save & Deploy Role
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE PRACTICE ROLE CONFIRMATION (Inside Clinic Settings)          */}
      {/* ========================================================================= */}
      {roleToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Role: {roleToDelete.name}?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to delete this staff role from your practice? This role will no longer appear in staff registration or permission assignment dropdowns.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deletingRole}
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deletingRole}
                onClick={handleConfirmDeleteRole}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingRole ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Interactive Printable Invoice Preview Modal */}
      {showInvoicePreviewModal && (
        <InvoicePreviewModal
          isOpen={showInvoicePreviewModal}
          onClose={() => setShowInvoicePreviewModal(false)}
          invoice={sampleInvoiceData}
          patient={samplePatientData}
          clinic={{
            ...(clinic || ({} as any)),
            name,
            brandName,
            slogan,
            badgeText,
            logoUrl,
            phone,
            email,
            address,
            website,
            currency,
            currencySymbol,
            taxRate,
            invoicePrefix,
            invoiceNotes,
            invoiceThankYouMessage,
            invoiceFollowUpMessage,
            invoiceFooterClinicName,
          }}
        />
      )}
    </div>
  );
};
